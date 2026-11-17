
import "dotenv/config";

import { pool } from "../config/database.js";
import { createDelegationReference } from "../services/taskmateDelegation.service.js";

const managerEmail = process.argv[2];

const MCP_URL =
  process.env.MCP_SERVER_URL || "http://localhost:5000/mcp";

const MCP_TOKEN = process.env.MCP_BEARER_TOKEN;

const runTest = async () => {
  try {
    if (!managerEmail) {
      throw new Error(
        "Please provide the Manager email as a command-line argument."
      );
    }

    if (!MCP_TOKEN) {
      throw new Error("MCP_BEARER_TOKEN is missing from .env");
    }

    // 1. Find the active Manager in PostgreSQL.
    const managerResult = await pool.query(
      `SELECT id, full_name, email, role
       FROM taskmate.app_users
       WHERE email = $1
         AND role = 'MANAGER'
         AND is_active = TRUE`,
      [managerEmail]
    );

    if (managerResult.rowCount !== 1) {
      throw new Error(
        "Active Manager not found. Check the email and role."
      );
    }

    const manager = managerResult.rows[0];

    console.log("\nAuthenticated Manager:");
    console.log(manager.full_name, manager.email);

    // 2. Generate a fresh secure delegation reference.
    const delegationRef =
      await createDelegationReference(manager);

    // 3. Call the get_my_team MCP tool.
    const requestBody = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get_my_team",
        arguments: {}
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
        `MCP request failed: HTTP ${response.status}`
      );
    }

    const responseData = await response.json();

    const toolResult = responseData?.result;

    const textContent = toolResult?.content?.find(
      item => item.type === "text"
    )?.text;

    if (!textContent || toolResult?.isError) {
      throw new Error(
        `MCP tool failed: ${textContent || "Unknown error"}`
      );
    }

    const parsedResult = JSON.parse(textContent);

    console.log("\n========== TEAM RETRIEVAL RESULT ==========\n");

    console.log(
      JSON.stringify(parsedResult, null, 2)
    );

    console.log("\n========== TEST COMPLETED ==========\n");

  } catch (error) {
    console.error("\nTEAM TEST FAILED:");
    console.error(error.message);

    process.exitCode = 1;

  } finally {
    await pool.end();
  }
};

runTest();
