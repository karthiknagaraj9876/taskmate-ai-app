
import "../config/env.js";

import { randomBytes, createHash } from "node:crypto";

import { pool } from "../config/database.js";

import {
  createDelegationReference,
  resolveDelegationReference
} from "../services/taskmateDelegation.service.js";

const createdHashes = [];

const hashReference = (reference) =>
  createHash("sha256").update(reference).digest("hex");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }

  console.log(`PASSED: ${message}`);
};

const main = async () => {
  try {
    // Find an active user for test references.
    const activeResult = await pool.query(`
      SELECT id, full_name, email, role
      FROM taskmate.app_users
      WHERE is_active = TRUE
      ORDER BY role
      LIMIT 1
    `);

    assert(
      activeResult.rowCount > 0,
      "An active test user exists"
    );

    const user = activeResult.rows[0];

    // Test 1: Invalid reference.
    const invalidReference = randomBytes(32).toString("base64url");

    const invalidResult =
      await resolveDelegationReference(invalidReference);

    assert(
      invalidResult === null,
      "Invalid delegation reference is rejected"
    );

    // Test 2: Expired reference.
    const expiredReference =
      await createDelegationReference(user);

    const expiredHash = hashReference(expiredReference);
    createdHashes.push(expiredHash);

    await pool.query(
      `UPDATE taskmate.ai_delegations
       SET expires_at = NOW() - INTERVAL '1 minute'
       WHERE reference_hash = $1`,
      [expiredHash]
    );

    const expiredResult =
      await resolveDelegationReference(expiredReference);

    assert(
      expiredResult === null,
      "Expired delegation reference is rejected"
    );

    // Test 3: Five-call usage limit.
    const limitedReference =
      await createDelegationReference(user);

    const limitedHash = hashReference(limitedReference);
    createdHashes.push(limitedHash);

    let successfulCalls = 0;

    for (let i = 0; i < 5; i += 1) {
      const result =
        await resolveDelegationReference(limitedReference);

      if (result) {
        successfulCalls += 1;
      }
    }

    const sixthCall =
      await resolveDelegationReference(limitedReference);

    assert(
      successfulCalls === 5 && sixthCall === null,
      "Delegation allows exactly five successful resolutions"
    );

    // Test 4: Inactive-user rejection.
    const inactiveResult = await pool.query(`
      SELECT id
      FROM taskmate.app_users
      WHERE is_active = FALSE
      LIMIT 1
    `);

    if (inactiveResult.rowCount > 0) {
      const inactiveReference =
        randomBytes(32).toString("base64url");

      const inactiveHash = hashReference(inactiveReference);
      createdHashes.push(inactiveHash);

      await pool.query(
        `INSERT INTO taskmate.ai_delegations (
          reference_hash,
          user_id,
          expires_at,
          remaining_calls
        )
        VALUES (
          $1,
          $2,
          NOW() + INTERVAL '2 minutes',
          5
        )`,
        [inactiveHash, inactiveResult.rows[0].id]
      );

      const result =
        await resolveDelegationReference(inactiveReference);

      assert(
        result === null,
        "Inactive user delegation is rejected"
      );
    } else {
      console.log(
        "SKIPPED: No inactive user exists for this test"
      );
    }

    // Test 5: Cleanup of expired and exhausted records.
    await pool.query(`
      DELETE FROM taskmate.ai_delegations
      WHERE expires_at <= NOW()
         OR remaining_calls <= 0
    `);

    const cleanupResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM taskmate.ai_delegations
       WHERE reference_hash = ANY($1::char(64)[])`,
      [createdHashes]
    );

    assert(
      cleanupResult.rows[0].count === 0,
      "Expired and exhausted test delegations are cleaned up"
    );

    console.log(
      "\nAll applicable delegation security tests passed."
    );

  } finally {
    // Remove any remaining temporary test records.
    if (createdHashes.length > 0) {
      await pool.query(
        `DELETE FROM taskmate.ai_delegations
         WHERE reference_hash = ANY($1::char(64)[])`,
        [createdHashes]
      );
    }

    await pool.end();
  }
};

main().catch((error) => {
  console.error(
    "\nDelegation security test failed:",
    error.message
  );

  process.exitCode = 1;
});
