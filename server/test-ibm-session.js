
import "dotenv/config";
import { createAgentSession } from "./src/services/ibmAas.service.js";

const testSession = async () => {
  try {
    console.log("Requesting IBM agent session...");

    const session = await createAgentSession();

    console.log("IBM session created successfully!");
    console.log("Invocation URL:", session.invocationUrl);
    console.log("Expires at:", session.expiresAt);
    console.log("Session token received:", Boolean(session.token));

    // Never print the actual session token.
  } catch (error) {
    console.error("IBM session test failed:", error.message);
    process.exitCode = 1;
  }
};

testSession();
