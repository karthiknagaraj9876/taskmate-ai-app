
import bcrypt from "bcrypt";
import { pool } from "../config/database.js";

// Check which users the logged-in user can access.
const getUserAccessCondition = (user, position = 1) => {
  if (user.role === "ADMIN") {
    return {
      sql: "TRUE",
      values: []
    };
  }

  if (user.role === "MANAGER") {
    return {
      sql: `(u.id = $${position} OR u.manager_id = $${position})`,
      values: [user.id]
    };
  }

  return {
    sql: `u.id = $${position}`,
    values: [user.id]
  };
};

// CREATE USER
export const createUser = async (data, currentUser) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let managerId = data.managerId ?? null;

    if (currentUser.role === "MANAGER") {
      if (data.role !== "EMPLOYEE") {
        const error = new Error(
          "Managers can create only Employee accounts"
        );
        error.statusCode = 403;
        throw error;
      }

      // A Manager can create only their own direct reports.
      managerId = currentUser.id;
    }

    if (data.role === "EMPLOYEE" && !managerId) {
      const error = new Error(
        "A Manager must be assigned to an Employee"
      );
      error.statusCode = 400;
      throw error;
    }

    if (managerId) {
      const managerResult = await client.query(
        `SELECT id
         FROM taskmate.app_users
         WHERE id = $1
           AND role = 'MANAGER'
           AND is_active = TRUE`,
        [managerId]
      );

      if (managerResult.rowCount === 0) {
        const error = new Error(
          "The specified Manager does not exist or is inactive"
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const insertResult = await client.query(
      `INSERT INTO taskmate.app_users (
        full_name,
        email,
        password_hash,
        role,
        manager_id,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING id, full_name, email, role, manager_id, is_active, created_at`,
      [
        data.fullName,
        data.email.toLowerCase(),
        passwordHash,
        data.role,
        managerId
      ]
    );

    const newUser = insertResult.rows[0];

    await client.query(
      `INSERT INTO taskmate.audit_logs (
        actor_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, 'USER', $2, 'USER_CREATED', $3::jsonb)`,
      [
        currentUser.id,
        newUser.id,
        JSON.stringify({
          fullName: newUser.full_name,
          email: newUser.email,
          role: newUser.role,
          managerId: newUser.manager_id
        })
      ]
    );

    await client.query("COMMIT");

    return newUser;
  } catch (error) {
    await client.query("ROLLBACK");

    // Convert duplicate email into a readable client error.
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "A user with this email already exists";
    }

    throw error;
  } finally {
    client.release();
  }
};

// GET USERS
export const getUsers = async (currentUser) => {
  const access = getUserAccessCondition(currentUser);

  const result = await pool.query(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.role,
       u.manager_id,
       u.is_active,
       u.created_at,
       m.full_name AS manager_name
     FROM taskmate.app_users u
     LEFT JOIN taskmate.app_users m
       ON m.id = u.manager_id
     WHERE ${access.sql}
     ORDER BY u.created_at DESC`,
    access.values
  );

  return result.rows;
};

// GET USER BY ID
export const getUserById = async (userId, currentUser) => {
  const access = getUserAccessCondition(currentUser, 2);

  const result = await pool.query(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.role,
       u.manager_id,
       u.is_active,
       u.created_at,
       m.full_name AS manager_name
     FROM taskmate.app_users u
     LEFT JOIN taskmate.app_users m
       ON m.id = u.manager_id
     WHERE u.id = $1
       AND (${access.sql})
     LIMIT 1`,
    [userId, ...access.values]
  );

  return result.rows[0] || null;
};

// UPDATE USER PROFILE
export const updateUser = async (userId, data, currentUser) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const access = getUserAccessCondition(currentUser, 2);

    const existingResult = await client.query(
      `SELECT u.*
       FROM taskmate.app_users u
       WHERE u.id = $1
         AND (${access.sql})
       FOR UPDATE`,
      [userId, ...access.values]
    );

    const existingUser = existingResult.rows[0];

    if (!existingUser) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const assignments = [];
    const values = [];

    if (Object.hasOwn(data, "fullName")) {
      values.push(data.fullName);
      assignments.push(`full_name = $${values.length}`);
    }

    if (Object.hasOwn(data, "email")) {
      values.push(data.email.toLowerCase());
      assignments.push(`email = $${values.length}`);
    }

    if (assignments.length === 0) {
      const error = new Error("No valid fields supplied");
      error.statusCode = 400;
      throw error;
    }

    values.push(userId);

    const updateResult = await client.query(
      `UPDATE taskmate.app_users
       SET ${assignments.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, full_name, email, role, manager_id, is_active, updated_at`,
      values
    );

    const updatedUser = updateResult.rows[0];

    await client.query(
      `INSERT INTO taskmate.audit_logs (
        actor_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, 'USER', $2, 'USER_UPDATED', $3::jsonb)`,
      [
        currentUser.id,
        userId,
        JSON.stringify({
          before: {
            fullName: existingUser.full_name,
            email: existingUser.email
          },
          after: {
            fullName: updatedUser.full_name,
            email: updatedUser.email
          }
        })
      ]
    );

    await client.query("COMMIT");

    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "A user with this email already exists";
    }

    throw error;
  } finally {
    client.release();
  }
};

// ACTIVATE / DEACTIVATE USER
export const setUserActiveStatus = async (
  userId,
  isActive,
  currentUser
) => {
  if (userId === currentUser.id) {
    const error = new Error(
      "You cannot change your own account status"
    );
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const access = getUserAccessCondition(currentUser, 2);

    const existingResult = await client.query(
      `SELECT u.id, u.is_active
       FROM taskmate.app_users u
       WHERE u.id = $1
         AND (${access.sql})
       FOR UPDATE`,
      [userId, ...access.values]
    );

    const existingUser = existingResult.rows[0];

    if (!existingUser) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const updateResult = await client.query(
      `UPDATE taskmate.app_users
       SET is_active = $1
       WHERE id = $2
       RETURNING id, full_name, email, role, is_active`,
      [isActive, userId]
    );

    const updatedUser = updateResult.rows[0];

    await client.query(
      `INSERT INTO taskmate.audit_logs (
        actor_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, 'USER', $2, 'USER_STATUS_UPDATED', $3::jsonb)`,
      [
        currentUser.id,
        userId,
        JSON.stringify({
          previousStatus: existingUser.is_active,
          newStatus: isActive
        })
      ]
    );

    await client.query("COMMIT");

    return updatedUser;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
