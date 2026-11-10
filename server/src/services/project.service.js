
import { pool } from "../config/database.js";

const getProjectAccessCondition = (user, position = 1) => {
  if (user.role === "ADMIN") {
    return {
      sql: "TRUE",
      values: []
    };
  }

  if (user.role === "MANAGER") {
    return {
      sql: `p.manager_id = $${position}`,
      values: [user.id]
    };
  }

  return {
    sql: `EXISTS (
      SELECT 1
      FROM taskmate.tasks t
      WHERE t.project_id = p.id
        AND t.assigned_to = $${position}
    )`,
    values: [user.id]
  };
};

// CREATE PROJECT
export const createProject = async (data, currentUser) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Managers automatically become project owners.
    const managerId =
      currentUser.role === "MANAGER"
        ? currentUser.id
        : data.managerId;

    if (!managerId) {
      const error = new Error(
        "A project Manager must be specified"
      );
      error.statusCode = 400;
      throw error;
    }

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

    const insertResult = await client.query(
      `INSERT INTO taskmate.projects (
        project_name,
        description,
        manager_id,
        status
      )
      VALUES ($1, $2, $3, 'ACTIVE')
      RETURNING *`,
      [
        data.projectName,
        data.description ?? null,
        managerId
      ]
    );

    const project = insertResult.rows[0];

    await client.query(
      `INSERT INTO taskmate.audit_logs (
        actor_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, 'PROJECT', $2, 'PROJECT_CREATED', $3::jsonb)`,
      [
        currentUser.id,
        project.id,
        JSON.stringify({
          projectName: project.project_name,
          managerId: project.manager_id
        })
      ]
    );

    await client.query("COMMIT");

    return project;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// GET ACCESSIBLE PROJECTS
export const getProjects = async (currentUser) => {
  const access = getProjectAccessCondition(currentUser);

  const result = await pool.query(
    `SELECT
       p.id,
       p.project_name,
       p.description,
       p.manager_id,
       p.status,
       p.created_at,
       p.updated_at,
       u.full_name AS manager_name,
       COUNT(t.id)::INTEGER AS task_count
     FROM taskmate.projects p
     LEFT JOIN taskmate.app_users u
       ON u.id = p.manager_id
     LEFT JOIN taskmate.tasks t
       ON t.project_id = p.id
     WHERE ${access.sql}
     GROUP BY p.id, u.full_name
     ORDER BY p.created_at DESC`,
    access.values
  );

  return result.rows;
};

// GET PROJECT BY ID
export const getProjectById = async (projectId, currentUser) => {
  const access = getProjectAccessCondition(currentUser, 2);

  const result = await pool.query(
    `SELECT
       p.id,
       p.project_name,
       p.description,
       p.manager_id,
       p.status,
       p.created_at,
       p.updated_at,
       u.full_name AS manager_name,
       COUNT(t.id)::INTEGER AS task_count
     FROM taskmate.projects p
     LEFT JOIN taskmate.app_users u
       ON u.id = p.manager_id
     LEFT JOIN taskmate.tasks t
       ON t.project_id = p.id
     WHERE p.id = $1
       AND (${access.sql})
     GROUP BY p.id, u.full_name
     LIMIT 1`,
    [projectId, ...access.values]
  );

  return result.rows[0] || null;
};

// UPDATE PROJECT
export const updateProject = async (
  projectId,
  data,
  currentUser
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const access = getProjectAccessCondition(currentUser, 2);

    const existingResult = await client.query(
      `SELECT p.*
       FROM taskmate.projects p
       WHERE p.id = $1
         AND (${access.sql})
       FOR UPDATE`,
      [projectId, ...access.values]
    );

    const existingProject = existingResult.rows[0];

    if (!existingProject) {
      const error = new Error("Project not found");
      error.statusCode = 404;
      throw error;
    }

    const columnMap = {
      projectName: "project_name",
      description: "description",
      status: "status"
    };

    const assignments = [];
    const values = [];

    for (const [key, column] of Object.entries(columnMap)) {
      if (Object.hasOwn(data, key)) {
        values.push(data[key]);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length === 0) {
      const error = new Error("No valid fields supplied");
      error.statusCode = 400;
      throw error;
    }

    values.push(projectId);

    const updateResult = await client.query(
      `UPDATE taskmate.projects
       SET ${assignments.join(", ")}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    const updatedProject = updateResult.rows[0];

    await client.query(
      `INSERT INTO taskmate.audit_logs (
        actor_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, 'PROJECT', $2, 'PROJECT_UPDATED', $3::jsonb)`,
      [
        currentUser.id,
        projectId,
        JSON.stringify({
          before: existingProject,
          after: updatedProject
        })
      ]
    );

    await client.query("COMMIT");

    return updatedProject;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
