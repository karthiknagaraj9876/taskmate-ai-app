
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
  createProject,
  getProjects,
  updateProject,
} from "../services/project.service";

import type {
  Project,
  ProjectPayload,
  ProjectStatus,
} from "../types/project.types";

import "./ProjectsPage.scss";

const initialForm: ProjectPayload = {
  projectName: "",
  description: "",
};

const ProjectsPage = () => {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingProjectId, setEditingProjectId] =
    useState<string | null>(null);

  const [form, setForm] = useState<ProjectPayload>(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageProjects =
    user?.role === "ADMIN" || user?.role === "MANAGER";

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getProjects();

      setProjects(result);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to load projects."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.project_name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (project.description || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const openCreateForm = () => {
    setEditingProjectId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (project: Project) => {
    setEditingProjectId(project.id);

    setForm({
      projectName: project.project_name,
      description: project.description || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProjectId(null);
    setForm(initialForm);
    setError("");
  };

  const handleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (form.projectName.trim().length < 3) {
      setError("Project name must contain at least 3 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: ProjectPayload = {
        projectName: form.projectName.trim(),
        description: form.description?.trim() || null,
      };

      if (editingProjectId) {
        await updateProject(editingProjectId, payload);

        setSuccess("Project updated successfully.");
      } else {
        await createProject(payload);

        setSuccess("Project created successfully.");
      }

      closeForm();
      await loadProjects();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to save project."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    project: Project,
    status: ProjectStatus
  ) => {
    try {
      setError("");
      setSuccess("");

      await updateProject(project.id, { status });

      setSuccess("Project status updated successfully.");

      await loadProjects();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to update project status."
      );
    }
  };

  const getStatusClass = (status: ProjectStatus) => {
    return status.toLowerCase().replace("_", "-");
  };

  return (
    <div className="projects-page">
      <div className="projects-header">
       
        {canManageProjects && (
          <button
            className="primary-button"
            onClick={openCreateForm}
          >
            + Create Project
          </button>
        )}
      </div>

      {error && (
        <div className="alert error-alert">{error}</div>
      )}

      {success && (
        <div className="alert success-alert">{success}</div>
      )}

      <div className="project-summary">
        <div className="summary-card">
          <span>Total Projects</span>
          <strong>{projects.length}</strong>
        </div>

        <div className="summary-card">
          <span>Active Projects</span>
          <strong>
            {projects.filter((p) => p.status === "ACTIVE").length}
          </strong>
        </div>

        <div className="summary-card">
          <span>Completed Projects</span>
          <strong>
            {projects.filter((p) => p.status === "COMPLETED").length}
          </strong>
        </div>

        <div className="summary-card">
          <span>On Hold</span>
          <strong>
            {projects.filter((p) => p.status === "ON_HOLD").length}
          </strong>
        </div>
      </div>

      <div className="project-list-panel">
        <div className="project-list-heading">
          <h2>Projects</h2>

          <div className="project-filters">
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="project-message">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="project-message">
            <h3>No projects found</h3>
            <p>
              {search || statusFilter !== "ALL"
                ? "Try changing your search or filters."
                : "Create your first project to get started."}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Manager</th>
                  <th>Tasks</th>
                  <th>Status</th>
                  {canManageProjects && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div className="project-name">
                        <strong>{project.project_name}</strong>

                        <span>
                          {project.description || "No description"}
                        </span>
                      </div>
                    </td>

                    <td>{project.manager_name || "—"}</td>

                    <td>{project.task_count ?? 0}</td>

                    <td>
                      {canManageProjects ? (
                        <select
                          className={`project-status-select ${getStatusClass(
                            project.status
                          )}`}
                          value={project.status}
                          onChange={(event) =>
                            handleStatusChange(
                              project,
                              event.target.value as ProjectStatus
                            )
                          }
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="ON_HOLD">On Hold</option>
                        </select>
                      ) : (
                        <span
                          className={`project-status ${getStatusClass(
                            project.status
                          )}`}
                        >
                          {project.status.replace("_", " ")}
                        </span>
                      )}
                    </td>

                    {canManageProjects && (
                      <td>
                        <button
                          className="text-button"
                          onClick={() => openEditForm(project)}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className="project-modal">
            <div className="modal-header">
              <h2>
                {editingProjectId
                  ? "Edit Project"
                  : "Create New Project"}
              </h2>

              <button
                type="button"
                className="modal-close"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="projectName">
                  Project Name *
                </label>

                <input
                  id="projectName"
                  name="projectName"
                  type="text"
                  value={form.projectName}
                  onChange={handleFormChange}
                  placeholder="Enter project name"
                  minLength={3}
                  maxLength={200}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description || ""}
                  onChange={handleFormChange}
                  placeholder="Enter project description"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              {error && (
                <div className="alert error-alert">
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProjectId
                      ? "Update Project"
                      : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
