
import { randomBytes, createHash } from "node:crypto";
import { pool } from "../config/database.js";

const DELEGATION_TTL_SECONDS = 120;
const MAX_TOOL_CALLS = 5;

const hashReference = (reference) =>
    createHash("sha256").update(reference).digest("hex");

/**
 * Creates a short-lived delegation reference.
 * Only its SHA-256 hash is stored in PostgreSQL.
 */
export const createDelegationReference = async (user) => {
    if (!user?.id) {
        throw new Error("Authenticated TaskMate user is required.");
    }

    const reference = randomBytes(32).toString("base64url");
    const referenceHash = hashReference(reference);

    // Remove expired or exhausted delegation records.
    await pool.query(`
    DELETE FROM taskmate.ai_delegations
    WHERE expires_at <= NOW()
       OR remaining_calls <= 0
  `);

    await pool.query(
        `INSERT INTO taskmate.ai_delegations (
       reference_hash,
       user_id,
       expires_at,
       remaining_calls
     )
     SELECT $1, u.id,
            NOW() + ($2 * INTERVAL '1 second'),
            $3
     FROM taskmate.app_users u
     WHERE u.id = $4
       AND u.is_active = TRUE`,
        [
            referenceHash,
            DELEGATION_TTL_SECONDS,
            MAX_TOOL_CALLS,
            user.id
        ]
    ).then((result) => {
        if (result.rowCount !== 1) {
            throw new Error("Active TaskMate user could not be verified.");
        }
    });

    return reference;
};

/**
 * Atomically consumes one permitted call and resolves
 * the current active user and role from PostgreSQL.
 */
export const resolveDelegationReference = async (reference) => {
    if (
        typeof reference !== "string" ||
        reference.length < 40 ||
        reference.length > 100
    ) {
        return null;
    }

    const referenceHash = hashReference(reference);

    const result = await pool.query(
        `UPDATE taskmate.ai_delegations d
     SET remaining_calls = d.remaining_calls - 1
     FROM taskmate.app_users u
     WHERE d.reference_hash = $1
       AND d.user_id = u.id
       AND u.is_active = TRUE
       AND d.expires_at > NOW()
       AND d.remaining_calls > 0
     RETURNING
       u.id,
       u.full_name,
       u.email,
       u.role,
       d.remaining_calls`,
        [referenceHash]
    );

    if (result.rowCount !== 1) {
        return null;
    }

    const user = result.rows[0];

    return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
    };
};
