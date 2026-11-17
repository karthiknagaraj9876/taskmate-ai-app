
import "../config/env.js";

import { pool } from "../config/database.js";

import {
  createDelegationReference
} from "../services/taskmateDelegation.service.js";

const MCP_URL = "http://localhost:5000/mcp";
const MCP_TOKEN = process.env.MCP_BEARER_TOKEN;

const main = async () => {
  if (!MCP_TOKEN) {
    throw new Error("MCP_BEARER_TOKEN is not configured.");
  }

  try {
    // Find one active user for each available role.
    const usersResult = await pool.query(`
      SELECT id, full_name, email, role
      FROM taskmate.app_users
      WHERE is_active = TRUE
        AND role IN ('ADMIN', 'MANAGER', 'EMPLOYEE')
      ORDER BY role, full_name
    `);

    const selectedUsers = [];

    for (const role of ["ADMIN", "MANAGER", "EMPLOYEE"]) {
      const user = usersResult.rows.find(
        (item) => item.role === role
      );

      if (user) {
        selectedUsers.push(user);
      } else {
        console.log(`SKIPPED: No active ${role} user found.`);
      }
    }

    if (selectedUsers.length === 0) {
      throw new Error("No active test users were found.");
    }

    for (const user of selectedUsers) {
      console.log(`\n================================`);
      console.log(`Testing role: ${user.role}`);
      console.log(`User: ${user.full_name}`);
      console.log(`================================`);

      // Generate a server-side delegation reference.
      const delegationRef = await createDelegationReference({
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email
      });

      // delegationRef is deliberately NOT included in tool arguments.
      const requestBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_my_tasks",
          arguments: {
            page: 1,
            limit: 5
          }
        }
      };

      const response = await fetch(MCP_URL, {
        method: "POST",

        headers: {
          Authorization: `Bearer ${MCP_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "MCP-Protocol-Version": "2025-03-26",

          // Secure server-to-server delegation header.
          "x-taskmate-delegation": delegationRef
        },

        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `MCP HTTP request failed: ${response.status}`
        );
      }

      const toolResult = responseData?.result;

      const textContent = toolResult?.content?.find(
        (item) => item.type === "text"
      )?.text;

      if (!textContent) {
        throw new Error("MCP returned an unexpected response.");
      }

      if (toolResult.isError) {
        console.log("FAILED:", textContent);
        continue;
      }

      const parsed = JSON.parse(textContent);

      if (!parsed.success) {
        console.log("FAILED: MCP did not return success.");
        continue;
      }

      console.log("Result: PASSED");
      console.log("Role:", user.role);
      console.log("Tasks returned:", parsed.data?.tasks?.length ?? 0);
      console.log(
        "Total matching tasks:",
        parsed.data?.pagination?.total ?? 0
      );
      console.log("Pagination:", parsed.data?.pagination);
    }

    console.log("\n================================");
    console.log("MCP delegation header tests completed.");
    console.log("================================");

  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(
    "MCP delegation test failed:",
    error.message
  );

  process.exitCode = 1;
});
