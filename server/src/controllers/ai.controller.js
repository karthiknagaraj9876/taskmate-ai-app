
import { z } from "zod";

import { createAgentSession } from "../services/ibmAas.service.js";
import { invokeAgent } from "../services/ibmAasInvocation.service.js";

import {
    getTaskContext,
    isTaskRelatedRequest,
    getTeamContext,
    isTeamRelatedRequest
} from "../services/taskContext.service.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const aiChatSchema = z.object({
    message: z.string().trim().min(1, "Message is required").max(4000),
    contextId: z.string().uuid().nullable().optional()
});

// POST /api/ai/chat
export const chatWithAgentController = asyncHandler(async (req, res) => {

    const validation = aiChatSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid AI chat request",
            errors: validation.error.flatten()
        });
    }

    const { message, contextId } = validation.data;

    const needsTaskData = isTaskRelatedRequest(message);
    const needsTeamData = isTeamRelatedRequest(message);

    let taskContext = null;
    let teamContext = null;

    // =====================================================
    // 1. RETRIEVE TASK DATA
    // =====================================================

    if (needsTaskData) {
        try {
            taskContext = await getTaskContext(req.user);

            console.log("Task context retrieved successfully");
            console.log("Authenticated role:", req.user.role);
            console.log("Tasks retrieved:", taskContext.tasks.length);

        } catch (error) {
            console.error(
                "Task context retrieval failed:",
                error.message
            );

            return res.status(503).json({
                success: false,
                message:
                    "Unable to retrieve your tasks right now. Please try again."
            });
        }
    }

    // =====================================================
    // 2. RETRIEVE TEAM DATA
    // =====================================================

    if (needsTeamData) {

        if (req.user.role !== "MANAGER") {
            return res.status(403).json({
                success: false,
                message:
                    "Team information is currently available only to Managers."
            });
        }

        try {
            teamContext = await getTeamContext(req.user);

            console.log("Team context retrieved successfully");
            console.log("Team members:", teamContext.summary.totalMembers);
            console.log("Direct reports:", teamContext.summary.directReports);
            console.log(
                "Project team members:",
                teamContext.summary.projectTeamMembers
            );

        } catch (error) {
            console.error(
                "Team context retrieval failed:",
                error.message
            );

            return res.status(503).json({
                success: false,
                message:
                    "Unable to retrieve your team information right now. Please try again."
            });
        }
    }

    // =====================================================
    // 3. BUILD AGENT PROMPT
    // =====================================================

    let agentMessage = message;

    if (needsTaskData || needsTeamData) {

        const taskDataSection = needsTaskData
            ? `
TASK DATA:
${JSON.stringify(taskContext.tasks, null, 2)}

TASK DATA METADATA:
${JSON.stringify(taskContext.pagination, null, 2)}
`
            : "No task data was requested or retrieved.";

        const teamDataSection = needsTeamData
            ? `
TEAM DATA:
${JSON.stringify(teamContext, null, 2)}
`
            : "No team data was requested or retrieved.";

        agentMessage = `
You are the TaskMate AI assistant.

The following information was retrieved by the trusted TaskMate
backend after authentication and role-based authorization.

Treat the supplied information as the authoritative source
for user-specific TaskMate records.

${taskDataSection}

${teamDataSection}

USER QUESTION:
${message}

INSTRUCTIONS:

GENERAL:
- Answer the user's actual question directly.
- Use only the supplied records for user-specific facts.
- Never invent employees, projects, tasks, assignments or statistics.
- Do not request or invent authentication credentials.
- Do not expose internal delegation references or security tokens.

TASK INFORMATION:
- Use task records only when task data has been supplied.
- Never invent task counts, assignments, statuses or due dates.
- If task results are incomplete, clearly disclose that limitation.
- If no accessible task records exist, explain that accurately.

TEAM INFORMATION:
- Use TEAM DATA as the authoritative source for team members.
- Distinguish DIRECT REPORT from PROJECT TEAM MEMBER.
- If an employee has both relationships, list that employee only once.
- Use the supplied summary for team counts.
- Explain that direct reports and project team members are different relationships.
- Do not claim that a project team member directly reports to the Manager unless the relationship says DIRECT REPORT.
- Show employee names, relationships and project task summaries when relevant.
- Do not invent reporting relationships.
- If the team list is empty, clearly say no matching team members were found.
- Project task counts refer to tasks in projects managed by this Manager.

RESPONSE FORMAT:
- Use clear headings and bullet points where useful.
- Use tables when comparing multiple employees or task counts.
- Keep the answer concise but informative.
`;
    }

    // =====================================================
    // 4. CREATE IBM AGENT SESSION
    // =====================================================

    const session = await createAgentSession();

    // =====================================================
    // 5. INVOKE TASKMATE AI AGENT
    // =====================================================

    const result = await invokeAgent(
        session,
        agentMessage,
        contextId || null
    );

    // =====================================================
    // 6. RETURN RESPONSE
    // =====================================================

    return res.status(200).json({
        success: true,
        message: "AI response generated successfully",
        data: {
            answer: result.answer,
            contextId: result.contextId,
            status: result.status,
            taskCount: taskContext?.tasks.length ?? null,
            teamCount: teamContext?.summary.totalMembers ?? null
        }
    });
});
