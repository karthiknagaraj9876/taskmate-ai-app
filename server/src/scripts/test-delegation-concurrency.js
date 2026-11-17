
import "../config/env.js";

import { createHash } from "node:crypto";
import { pool } from "../config/database.js";

import {
  createDelegationReference,
  resolveDelegationReference
} from "../services/taskmateDelegation.service.js";

const hashReference = (reference) =>
  createHash("sha256").update(reference).digest("hex");

const main = async () => {
  let referenceHash;

  try {
    // Find an active user.
    const userResult = await pool.query(`
      SELECT id, full_name, email, role
      FROM taskmate.app_users
      WHERE is_active = TRUE
      ORDER BY role
      LIMIT 1
    `);

    if (userResult.rowCount === 0) {
      throw new Error("No active test user found.");
    }

    // Create one delegation reference.
    const reference = await createDelegationReference(
      userResult.rows[0]
    );

    referenceHash = hashReference(reference);

    console.log("Created test delegation.");
    console.log("Sending 20 concurrent requests...\n");

    // Execute 20 requests simultaneously.
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        resolveDelegationReference(reference)
      )
    );

    const successfulCalls = results.filter(Boolean).length;
    const rejectedCalls = results.length - successfulCalls;

    console.log("Total requests:", results.length);
    console.log("Successful resolutions:", successfulCalls);
    console.log("Rejected resolutions:", rejectedCalls);

    if (successfulCalls !== 5 || rejectedCalls !== 15) {
      throw new Error(
        "Concurrency test failed: expected exactly 5 successful and 15 rejected requests."
      );
    }

    // Verify the delegation is exhausted.
    const finalAttempt =
      await resolveDelegationReference(reference);

    if (finalAttempt !== null) {
      throw new Error(
        "An additional request was accepted after the usage limit."
      );
    }

    console.log("\nPASSED: Concurrent requests respect the five-call limit.");
    console.log("PASSED: No additional calls are accepted.");
  } finally {
    // Remove the temporary test record.
    if (referenceHash) {
      await pool.query(
        `DELETE FROM taskmate.ai_delegations
         WHERE reference_hash = $1`,
        [referenceHash]
      );
    }

    await pool.end();
  }
};

main().catch((error) => {
  console.error("\nConcurrency test failed:", error.message);
  process.exitCode = 1;
});
