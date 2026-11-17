
const IBM_AAS_API_BASE_URL = process.env.IBM_AAS_API_BASE_URL;
const IBM_AAS_APP_ID = process.env.IBM_AAS_APP_ID;
const IBM_AAS_AGENT_ID = process.env.IBM_AAS_AGENT_ID;
const IBM_AAS_API_KEY = process.env.IBM_AAS_API_KEY;

const SESSION_TTL = Number(process.env.IBM_AAS_SESSION_TTL || 900);
const MAX_TURNS = Number(process.env.IBM_AAS_MAX_TURNS || 50);

/**
 * Creates an authenticated session for the deployed IBM agent.
 */
export const createAgentSession = async () => {
  if (
    !IBM_AAS_API_BASE_URL ||
    !IBM_AAS_APP_ID ||
    !IBM_AAS_AGENT_ID ||
    !IBM_AAS_API_KEY
  ) {
    throw new Error("IBM Agentic App Studio environment configuration is incomplete.");
  }

  const sessionsUrl =
    `${IBM_AAS_API_BASE_URL}/api/v1/apps/${IBM_AAS_APP_ID}` +
    `/agents/${IBM_AAS_AGENT_ID}/sessions`;

  try {
    const response = await fetch(sessionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${IBM_AAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxTurns: MAX_TURNS,
        ttlSeconds: SESSION_TTL,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      // Do not log or expose credentials or response headers.
      const errorMessage =
        responseData?.message ||
        responseData?.error ||
        `IBM session creation failed with HTTP ${response.status}`;

      throw new Error(errorMessage);
    }

    const sessionData = responseData?.data;

    if (
      responseData?.success !== true ||
      !sessionData?.token ||
      !sessionData?.invocationUrl
    ) {
      throw new Error(
        "IBM returned an unexpected session response. Check the API response format."
      );
    }

    return {
      token: sessionData.token,
      invocationUrl: sessionData.invocationUrl,
      expiresAt: sessionData.expiresAt || null,
    };
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error("IBM session request timed out. Please try again.");
    }

    throw error;
  }
};
