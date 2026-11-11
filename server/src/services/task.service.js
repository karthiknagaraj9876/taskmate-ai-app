import { pool } from "../config/database.js";

const getTaskAccessCondition = (role, userId, position = 1) => {
    if (role === "ADMIN") {
        return {
            sql: "TRUE",
            values: []
        };
    }

    if (role === "MANAGER") {
        return {
            sql: `EXISTS (
        SELECT 1
        FROM taskmate.projects p
        WHERE p.id = t.project_id
          AND p.manager_id = $${position}
      )`,
            values: [userId]
        };
    }

    return {
        sql: `t.assigned_to = $${position}`,
        values: [userId]
    };
};

const getTaskByIdQuery = `
  SELECT
    t.id,
    t.title,
    t.description,
    t.project_id,
    t.assigned_to,
    t.created_by,
    t.status,
    t.priority,
    t.due_date,
    t.completed_at,
    t.created_at,
    t.updated_at,
    u.full_name AS assigned_to_name,
    p.project_name
  FROM taskmate.tasks t
  LEFT JOIN taskmate.app_users u
    ON u.id = t.assigned_to
  LEFT JOIN taskmate.projects p
    ON p.id = t.project_id
`;

export const getTasks = async ({
    user,
    page = 1,
    limit = 10,
    status,
    priority
}) => {
    const access = getTaskAccessCondition(user.role, user.id);

    const conditions = [access.sql];
    const values = [...access.values];

    if (status) {
        values.push(status);
        conditions.push(`t.status = $${values.length}`);
    }

    if (priority) {
        values.push(priority);
        conditions.push(`t.priority = $${values.length}`);
    }

    const whereClause = conditions.join(" AND ");

    const countQuery = `
    SELECT COUNT(*)::INTEGER AS total
    FROM taskmate.tasks t
    WHERE ${whereClause}
  `;

    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    const offset = (page - 1) * limit;

    values.push(limit);
    const limitPosition = values.length;

    values.push(offset);
    const offsetPosition = values.length;

    const dataQuery = `
    ${getTaskByIdQuery}
    WHERE ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${limitPosition}
    OFFSET $${offsetPosition}
  `;

    const result = await pool.query(dataQuery, values);

    return {
        tasks: result.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const getTaskById = async (taskId, user) => {
  const access = getTaskAccessCondition(user.role, user.id, 2);

  const result = await pool.query(
    `${getTaskByIdQuery}
     WHERE t.id = $1
       AND (${access.sql})
     LIMIT 1`,
    [taskId, ...access.values]
  );

  return result.rows[0] || null;
};

export const createTask = async (data, user) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check that the project exists and is active.
    const projectResult = await client.query(
      `SELECT id, manager_id
       FROM taskmate.projects
       WHERE id = $1
         AND status = 'ACTIVE'
       FOR UPDATE`,
      [data.projectId]
    );

    const project = projectResult.rows[0];

    if (!project) {
      const error = new Error("Active project not found");
      error.statusCode = 400;
      throw error;
    }

    // Managers can create tasks only in their own projects.
    if (
      user.role === "MANAGER" &&
      project.manager_id !== user.id
    ) {
      const error = new Error(
        "You can create tasks only in your own projects"
      );
      error.statusCode = 403;
      throw error;
    }

    // Verify the assignee is active and eligible.
    const assigneeResult = await client.query(
      `SELECT id
       FROM taskmate.app_users
       WHERE id = $1
         AND is_active = TRUE
         AND (
           $2 = 'ADMIN'
           OR (
             $2 = 'MANAGER'
             AND (manager_id = $3 OR id = $3)
           )
         )`,
      [data.assignedTo, user.role, user.id]
    );

    if (assigneeResult.rowCount === 0) {
      const error = new Error(
        "Assignee is not active or is not part of your team"
      );
      error.statusCode = 400;
      throw error;
    }

    const insertResult = await client.query(
      `INSERT INTO taskmate.tasks (
        title,
        description,
        project_id,
        assigned_to,
        created_by,
        status,
        priority,
        due_date
      )
      VALUES ($1, $2, $3, $4, $5, 'TODO', $6, $7)
      RETURNING *`,
      [
        data.title,
        data.description ?? null,
        data.projectId,
        data.assignedTo,
        user.id,
        data.priority ?? "MEDIUM",
        data.dueDate ?? null
      ]
    );

    const task = insertResult.rows[0];

    await client.query(
      `INSERT INTO taskmate.audit_logs (
        actor_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, 'TASK', $2, 'TASK_CREATED', $3::jsonb)`,
      [
        user.id,
        task.id,
        JSON.stringify({
          title: task.title,
          assignedTo: task.assigned_to,
          projectId: task.project_id
        })
      ]
    );

    await client.query("COMMIT");

    return task;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateTask = async (taskId, data, user) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const access = getTaskAccessCondition(user.role, user.id, 2);

    const taskResult = await client.query(
      `SELECT t.*
       FROM taskmate.tasks t
       WHERE t.id = $1
         AND (${access.sql})
       FOR UPDATE`,
      [taskId, ...access.values]
    );

    const existingTask = taskResult.rows[0];

    if (!existingTask) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (data.projectId) {
      const projectResult = await client.query(
        `SELECT id, manager_id
         FROM taskmate.projects
         WHERE id = $1
           AND status = 'ACTIVE'
         FOR UPDATE`,
        [data.projectId]
      );

      const project = projectResult.rows[0];

      if (!project) {
        const error = new Error("Active project not found");
        error.statusCode = 400;
        throw error;
      }

      if (
        user.role === "MANAGER" &&
        project.manager_id !== user.id
      ) {
        const error = new Error(
          "You can assign tasks only to your own projects"
        );
        error.statusCode = 403;
        throw error;
      }
    }

    if (data.assignedTo) {
      const assigneeResult = await client.query(
        `SELECT id
         FROM taskmate.app_users
         WHERE id = $1
           AND is_active = TRUE
           AND (
             $2 = 'ADMIN'
             OR (
               $2 = 'MANAGER'
               AND (manager_id = $3 OR id = $3)
             )
           )`,
        [data.assignedTo, user.role, user.id]
      );

      if (assigneeResult.rowCount === 0) {
        const error = new Error(
          "Assignee is not active or is not part of your team"
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // Only explicitly permitted columns can be updated.
    const columnMap = {
      title: "title",
      description: "description",
      projectId: "project_id",
      assignedTo: "assigned_to",
      priority: "priority",
      dueDate: "due_date"
    };

    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(columnMap)) {
      if (Object.hasOwn(data, key)) {
        values.push(data[key]);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length === 0) {
      const error = new Error("No valid fields supplied for update");
      error.statusCode = 400;
      throw error;
    }

    values.push(taskId);

    const updateResult = await client.query(
      `UPDATE taskmate.tasks
       SET ${assignments.join(", ")}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    const updatedTask = updateResult.rows[0];

    await client.query(
      `INSERT INTO taskmate.audit_logs (
        actor_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, 'TASK', $2, 'TASK_UPDATED', $3::jsonb)`,
      [
        user.id,
        taskId,
        JSON.stringify({
          before: existingTask,
          after: updatedTask
        })
      ]
    );

    await client.query("COMMIT");

    return updatedTask;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateTaskStatus = async (taskId, status, user) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const access = getTaskAccessCondition(user.role, user.id, 2);

    const taskResult = await client.query(
      `SELECT t.*
       FROM taskmate.tasks t
       WHERE t.id = $1
         AND (${access.sql})
       FOR UPDATE`,
      [taskId, ...access.values]
    );

    const existingTask = taskResult.rows[0];

    if (!existingTask) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    const result = await client.query(
      `UPDATE taskmate.tasks
       SET status = $1::text,
           completed_at = CASE
             WHEN $1::text = 'COMPLETED' THEN COALESCE(completed_at, NOW())
             ELSE NULL
           END
       WHERE id = $2
       RETURNING *`,
      [status, taskId]
    );

    const updatedTask = result.rows[0];

    await client.query(
      `INSERT INTO taskmate.audit_logs (
        actor_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, 'TASK', $2, 'TASK_STATUS_UPDATED', $3::jsonb)`,
      [
        user.id,
        taskId,
        JSON.stringify({
          previousStatus: existingTask.status,
          newStatus: updatedTask.status
        })
      ]
    );

    await client.query("COMMIT");

    return updatedTask;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deleteTask = async (taskId, user) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const access = getTaskAccessCondition(user.role, user.id, 2);

    const taskResult = await client.query(
      `SELECT t.*
       FROM taskmate.tasks t
       WHERE t.id = $1
         AND (${access.sql})
       FOR UPDATE`,
      [taskId, ...access.values]
    );

    const task = taskResult.rows[0];

    if (!task) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `INSERT INTO taskmate.audit_logs (
        actor_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, 'TASK', $2, 'TASK_DELETED', $3::jsonb)`,
      [
        user.id,
        taskId,
        JSON.stringify({
          title: task.title,
          projectId: task.project_id,
          assignedTo: task.assigned_to
        })
      ]
    );

    await client.query(
      `DELETE FROM taskmate.tasks
       WHERE id = $1`,
      [taskId]
    );

    await client.query("COMMIT");

    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};