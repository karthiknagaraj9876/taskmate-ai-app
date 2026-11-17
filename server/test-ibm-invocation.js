
import "dotenv/config";
import { createAgentSession } from "./src/services/ibmAas.service.js";
import { invokeAgent } from "./src/services/ibmAasInvocation.service.js";

const testInvocation = async () => {
  try {
    console.log("Step 1: Creating IBM session...");

    const session = await createAgentSession();

    console.log("Step 2: Invoking TaskMate AI agent...");

    const result = await invokeAgent(
      session,
      "Show me all my overdue tasks and recommend which ones I should prioritize."
    );

    console.log("\nAgent invocation successful!");
    console.log("Context ID:", result.contextId || "Not returned");

    console.log("\nRaw IBM response:");
    console.dir(result.response, { depth: 8 });

  } catch (error) {
    console.error("Agent invocation failed:", error.message);
    process.exitCode = 1;
  }
};

testInvocation();
