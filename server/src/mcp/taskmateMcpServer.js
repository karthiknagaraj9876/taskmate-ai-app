
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getTasks } from "../services/task.service.js";
import { pool } from "../config/database.js";

import {
  resolveDelegationReference
} from "../services/taskmateDelegation.service.js";

// Shared helper: resolve the authenticated user from the MCP request.
const resolveMcpUser = async (extra) => {
  const rawDelegation =
    extra?.requestInfo?.headers?.["x-taskmate-delegation"];

  const delegationRef = Array.isArray(rawDelegation)
    ? rawDelegation[0]
    : rawDelegation;

  if (
    typeof delegationRef !== "string" ||
    !delegationRef.trim()
  ) {
    throw new Error("TASKMATE_DELEGATION_MISSING");
  }

  const user = await resolveDelegationReference(delegationRef);

  if (!user) {
    throw new Error("TASKMATE_DELEGATION_INVALID_OR_EXPIRED");
  }

  return user;
};

export const createTaskmateMcpServer = () => {
  const server = new McpServer({
    name: "taskmate-mcp-server",
    version: "1.0.0"
  });

  // =====================================================
  // TOOL 1: GET MY TASKS
  // Existing functionality - preserved
  // =====================================================

  server.registerTool(
    "get_my_tasks",
    {
      title: "Get My Tasks",

      description:
        "Retrieves tasks accessible to the authenticated TaskMate user. " +
        "User authorization is supplied securely through the MCP request context.",

      inputSchema: {
        status: z.enum([
          "TODO",
          "IN_PROGRESS",
          "COMPLETED",
          "BLOCKED"
        ]).optional(),

        priority: z.enum([
          "LOW",
          "MEDIUM",
          "HIGH",
          "CRITICAL"
        ]).optional(),

        page: z.number().int().min(1).default(1),

        limit: z.number().int().min(1).max(50).default(10)
      },

      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },

    async (
      {
        status,
        priority,
        page = 1,
        limit = 10
      },
      extra
    ) => {
      try {
        const user = await resolveMcpUser(extra);

        const result = await getTasks({
          user,
          page,
          limit,
          status,
          priority
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              data: result
            })
          }]
        };

      } catch (error) {
        console.error(
          "MCP get_my_tasks error:",
          error.message
        );

        return {
          isError: true,
          content: [{
            type: "text",
            text: error.message.startsWith("TASKMATE_DELEGATION_")
              ? error.message
              : "TASKMATE_TASK_RETRIEVAL_FAILED"
          }]
        };
      }
    }
  );

  // =====================================================
  // TOOL 2: GET MY TEAM
  // New functionality
  // =====================================================

  server.registerTool(
    "get_my_team",
    {
      title: "Get My Team",

      description:
        "Retrieves the authenticated Manager's direct reports " +
        "and employees assigned to projects managed by that Manager. " +
        "Combines both relationships without duplicate employees. " +
        "Includes project task summaries.",

      inputSchema: {},

      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },

    async (_args, extra) => {
      try {
        const user = await resolveMcpUser(extra);

        // This tool is intended for Managers.
        if (user.role !== "MANAGER") {
          return {
            isError: true,
            content: [{
              type: "text",
              text: "TASKMATE_MANAGER_ACCESS_REQUIRED"
            }]
          };
        }

        const result = await pool.query(
          `
          WITH direct_reports AS (
              SELECT
                  u.id AS employee_id,
                  u.full_name,
                  u.email,
                  u.role,
                  'DIRECT REPORT' AS relationship
              FROM taskmate.app_users u
              WHERE u.manager_id = $1
                AND u.is_active = TRUE
          ),

          project_team AS (
              SELECT DISTINCT
                  u.id AS employee_id,
                  u.full_name,
                  u.email,
                  u.role,
                  'PROJECT TEAM MEMBER' AS relationship
              FROM taskmate.projects p
              JOIN taskmate.tasks t
                  ON t.project_id = p.id
              JOIN taskmate.app_users u
                  ON u.id = t.assigned_to
              WHERE p.manager_id = $1
                AND u.is_active = TRUE
          ),

          combined_team AS (
              SELECT * FROM direct_reports
              UNION ALL
              SELECT * FROM project_team
          )

          SELECT
              ct.employee_id,
              ct.full_name,
              ct.email,
              ct.role,

              ARRAY_AGG(DISTINCT ct.relationship)
                  AS relationships,

              COUNT(DISTINCT t.id)::INTEGER
                  AS project_task_count,

              COUNT(DISTINCT t.id) FILTER (
                  WHERE t.status = 'TODO'
              )::INTEGER AS todo_count,

              COUNT(DISTINCT t.id) FILTER (
                  WHERE t.status = 'IN_PROGRESS'
              )::INTEGER AS in_progress_count,

              COUNT(DISTINCT t.id) FILTER (
                  WHERE t.status = 'COMPLETED'
              )::INTEGER AS completed_count,

              COUNT(DISTINCT t.id) FILTER (
                  WHERE t.status = 'BLOCKED'
              )::INTEGER AS blocked_count,

              COALESCE(
                  JSONB_AGG(
                      DISTINCT JSONB_BUILD_OBJECT(
                          'taskId', t.id,
                          'title', t.title,
                          'projectName', p.project_name,
                          'status', t.status,
                          'priority', t.priority,
                          'dueDate', t.due_date
                      )
                  ) FILTER (WHERE t.id IS NOT NULL),
                  '[]'::jsonb
              ) AS tasks

          FROM combined_team ct

          LEFT JOIN taskmate.tasks t
              ON t.assigned_to = ct.employee_id

          LEFT JOIN taskmate.projects p
              ON p.id = t.project_id
             AND p.manager_id = $1

          WHERE
              t.id IS NULL
              OR p.id IS NOT NULL

          GROUP BY
              ct.employee_id,
              ct.full_name,
              ct.email,
              ct.role

          ORDER BY ct.full_name;
          `,
          [user.id]
        );

        const teamMembers = result.rows;

        const summary = {
          totalMembers: teamMembers.length,

          directReports: teamMembers.filter(
            member => member.relationships.includes("DIRECT REPORT")
          ).length,

          projectTeamMembers: teamMembers.filter(
            member => member.relationships.includes("PROJECT TEAM MEMBER")
          ).length,

          totalProjectTasks: teamMembers.reduce(
            (total, member) => total + member.project_task_count,
            0
          )
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              data: {
                manager: {
                  id: user.id,
                  fullName: user.fullName,
                  email: user.email,
                  role: user.role
                },
                summary,
                teamMembers
              }
            })
          }]
        };

      } catch (error) {
        console.error(
          "MCP get_my_team error:",
          error.message
        );

        return {
          isError: true,
          content: [{
            type: "text",
            text: error.message.startsWith("TASKMATE_DELEGATION_")
              ? error.message
              : "TASKMATE_TEAM_RETRIEVAL_FAILED"
          }]
        };
      }
    }
  );

  return server;
};
