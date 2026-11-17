
import { randomUUID } from "node:crypto";

import {
  createDelegationReference
} from "./taskmateDelegation.service.js";

const MCP_URL =
  process.env.MCP_SERVER_URL || "http://localhost:5000/mcp";

const MCP_TOKEN = process.env.MCP_BEARER_TOKEN;

const PAGE_SIZE = 10;
const MAX_PAGES = 3;

// Identify requests that require task records.
export const isTaskRelatedRequest = (message) => {
  const pattern =
    /\b(tasks?|overdue|due dates?|assigned|assignees?|priorit(y|ies)|workload|blocked work|task status|pending work)\b/i;

  return pattern.test(message);
};

// Identify requests that require team information.
export const isTeamRelatedRequest = (message) => {
  const pattern =
    /\b(team|teams|employees|employee|staff|direct reports?|reporting|working under me|who works under|who is working under|my people|team members|project team)\b/i;

  return pattern.test(message);
};

// Common MCP tool caller.
const callTaskmateMcp = async (
  delegationRef,
  toolName,
  args = {}
) => {
  const requestBody = {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args
    }
  };

  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MCP_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-03-26",
      "x-taskmate-delegation": delegationRef
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    throw new Error(
      `MCP request failed with HTTP ${response.status}`
    );
  }

  const responseData = await response.json();

  const toolResult = responseData?.result;

  const textContent = toolResult?.content?.find(
    item => item.type === "text"
  )?.text;

  if (!textContent || toolResult?.isError) {
    throw new Error(
      `${toolName} MCP retrieval failed: ${textContent || "Unknown error"}`
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(textContent);
  } catch {
    throw new Error("MCP returned an unreadable response.");
  }

  if (!parsed.success || !parsed.data) {
    throw new Error(`${toolName} MCP retrieval was unsuccessful.`);
  }

  return parsed.data;
};

// =====================================================
// GET TASK CONTEXT
// Existing functionality, now using common MCP caller.
// =====================================================

export const getTaskContext = async (user) => {
  if (!MCP_TOKEN) {
    throw new Error("MCP_BEARER_TOKEN is not configured.");
  }

  if (!user?.id) {
    throw new Error("Authenticated TaskMate user is required.");
  }

  const delegationRef =
    await createDelegationReference(user);

  const allTasks = [];

  let pagination = null;
  let pagesFetched = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await callTaskmateMcp(
      delegationRef,
      "get_my_tasks",
      {
        page,
        limit: PAGE_SIZE
      }
    );

    allTasks.push(...(result.tasks || []));

    pagination = result.pagination;
    pagesFetched++;

    if (
      !pagination ||
      page >= pagination.totalPages
    ) {
      break;
    }
  }

  return {
    tasks: allTasks,
    pagination: {
      ...pagination,
      pagesFetched,
      truncated:
        (pagination?.totalPages || 0) > pagesFetched
    }
  };
};

// =====================================================
// GET TEAM CONTEXT
// New functionality.
// =====================================================

export const getTeamContext = async (user) => {
  if (!MCP_TOKEN) {
    throw new Error("MCP_BEARER_TOKEN is not configured.");
  }

  if (!user?.id) {
    throw new Error("Authenticated TaskMate user is required.");
  }

  if (user.role !== "MANAGER") {
    throw new Error(
      "Team information is currently available only to Managers."
    );
  }

  const delegationRef =
    await createDelegationReference(user);

  const result = await callTaskmateMcp(
    delegationRef,
    "get_my_team"
  );

  return result;
};
