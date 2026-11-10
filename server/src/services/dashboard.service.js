
import { pool } from "../config/database.js";

const getTaskAccessCondition = (user, position = 1) => {
  if (user.role === "ADMIN") {
    return {
      sql: "TRUE",
      values: [],
    };
  }

  if (user.role === "MANAGER") {
    return {
      sql: `
        EXISTS (
          SELECT 1
          FROM taskmate.projects p
          WHERE p.id = t.project_id
          AND p.manager_id = $${position}
        )
      `,
      values: [user.id],
    };
  }

  return {
    sql: `t.assigned_to = $${position}`,
    values: [user.id],
  };
};

// 1. Dashboard summary
export const getDashboardSummary = async (user) => {
  const access = getTaskAccessCondition(user);

  const query = `
    SELECT
      COUNT(*)::INTEGER AS total_tasks,

      COUNT(*) FILTER (
        WHERE t.status = 'TODO'
      )::INTEGER AS todo_tasks,

      COUNT(*) FILTER (
        WHERE t.status = 'IN_PROGRESS'
      )::INTEGER AS in_progress_tasks,

      COUNT(*) FILTER (
        WHERE t.status = 'COMPLETED'
      )::INTEGER AS completed_tasks,

      COUNT(*) FILTER (
        WHERE t.due_date < CURRENT_DATE
        AND t.status <> 'COMPLETED'
      )::INTEGER AS overdue_tasks,

      COUNT(*) FILTER (
        WHERE t.due_date >= CURRENT_DATE
        AND t.due_date < CURRENT_DATE + INTERVAL '7 days'
        AND t.status <> 'COMPLETED'
      )::INTEGER AS due_soon_tasks,

      COALESCE(
        ROUND(
          COUNT(*) FILTER (
            WHERE t.status = 'COMPLETED'
          ) * 100.0 / NULLIF(COUNT(*), 0),
          2
        ),
        0
      ) AS completion_rate

    FROM taskmate.tasks t
    WHERE ${access.sql}
  `;

  const result = await pool.query(query, access.values);

  return result.rows[0];
};

// 2. Priority breakdown
export const getPriorityBreakdown = async (user) => {
  const access = getTaskAccessCondition(user);

  const query = `
    SELECT
      priorities.priority,
      COUNT(t.id)::INTEGER AS task_count

    FROM (
      VALUES
        ('LOW'),
        ('MEDIUM'),
        ('HIGH'),
        ('CRITICAL')
    ) AS priorities(priority)

    LEFT JOIN taskmate.tasks t
      ON t.priority = priorities.priority
      AND ${access.sql}

    GROUP BY priorities.priority

    ORDER BY
      CASE priorities.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
      END
  `;

  const result = await pool.query(query, access.values);

  return result.rows;
};

// 3. Project progress
export const getProjectProgress = async (user) => {
  let projectCondition = "TRUE";
  let projectValues = [];
  let taskJoinCondition = "TRUE";

  if (user.role === "MANAGER") {
    projectCondition = "p.manager_id = $1";
    projectValues = [user.id];
  }

  if (user.role === "EMPLOYEE") {
    projectCondition = `
      EXISTS (
        SELECT 1
        FROM taskmate.tasks assigned_tasks
        WHERE assigned_tasks.project_id = p.id
        AND assigned_tasks.assigned_to = $1
      )
    `;

    taskJoinCondition = "t.assigned_to = $1";
    projectValues = [user.id];
  }

  const query = `
    SELECT
      p.id AS project_id,
      p.project_name,
      p.status AS project_status,

      COUNT(t.id)::INTEGER AS total_tasks,

      COUNT(t.id) FILTER (
        WHERE t.status = 'COMPLETED'
      )::INTEGER AS completed_tasks,

      COUNT(t.id) FILTER (
        WHERE t.status <> 'COMPLETED'
      )::INTEGER AS pending_tasks,

      COALESCE(
        ROUND(
          COUNT(t.id) FILTER (
            WHERE t.status = 'COMPLETED'
          ) * 100.0 / NULLIF(COUNT(t.id), 0),
          2
        ),
        0
      ) AS completion_rate

    FROM taskmate.projects p

    LEFT JOIN taskmate.tasks t
      ON t.project_id = p.id
      AND ${taskJoinCondition}

    WHERE ${projectCondition}

    GROUP BY p.id, p.project_name, p.status

    ORDER BY p.created_at DESC
  `;

  const result = await pool.query(query, projectValues);

  return result.rows;
};

// 4. Recent tasks
export const getRecentTasks = async (user) => {
  const access = getTaskAccessCondition(user);

  const query = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.due_date,
      t.created_at,
      t.updated_at,

      p.project_name,

      assigned_user.full_name AS assigned_to_name

    FROM taskmate.tasks t

    LEFT JOIN taskmate.projects p
      ON p.id = t.project_id

    LEFT JOIN taskmate.app_users assigned_user
      ON assigned_user.id = t.assigned_to

    WHERE ${access.sql}

    ORDER BY t.updated_at DESC

    LIMIT 10
  `;

  const result = await pool.query(query, access.values);

  return result.rows;
};
