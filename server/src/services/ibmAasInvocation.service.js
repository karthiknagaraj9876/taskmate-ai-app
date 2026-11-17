
import { randomUUID } from "node:crypto";

/**
 * Extracts the complete text response from IBM's A2A response.
 */
const extractAgentAnswer = (responseData) => {
  const parts = responseData?.result?.status?.message?.parts || [];

  return parts
    .filter((part) => part.kind === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();
};

/**
 * Invokes the deployed IBM Agentic App.
 */
export const invokeAgent = async (
  session,
  message,
  contextId = null
) => {
  if (!session?.token || !session?.invocationUrl) {
    throw new Error("A valid IBM agent session is required.");
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    throw new Error("Message cannot be empty.");
  }

  const payload = {
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "message/send",
    params: {
      message: {
        role: "user",
        kind: "message",
        messageId: randomUUID(),
        parts: [
          {
            kind: "text",
            text: message.trim(),
          },
        ],
      },
    },
  };

  if (contextId) {
    payload.params.message.contextId = contextId;
  }

  try {
    const response = await fetch(session.invocationUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        `IBM agent invocation failed with HTTP ${response.status}`
      );
    }

    if (responseData?.error) {
      throw new Error(
        responseData.error.message || "IBM agent returned a JSON-RPC error."
      );
    }

    const agentStatus = responseData?.result?.status?.state;

    if (agentStatus !== "completed") {
      throw new Error(
        `IBM agent execution did not complete. Status: ${agentStatus || "unknown"}`
      );
    }

    const answer = extractAgentAnswer(responseData);

    if (!answer) {
      throw new Error("IBM agent returned an empty response.");
    }

    return {
      answer,
      contextId: responseData?.result?.contextId || null,
      status: agentStatus,
    };
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error("IBM agent invocation timed out.");
    }

    throw error;
  }
};
