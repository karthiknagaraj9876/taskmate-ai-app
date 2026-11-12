
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createTask,
  deleteTask,
  getProjects,
  getTasks,
  getUsers,
  updateTask,
  updateTaskStatus,
} from "../services/task.service";
import type {
  Task,
  TaskPayload,
  TaskPriority,
  TaskStatus,
  ProjectOption,
  UserOption,
} from "../types/task.types";
import "./TaskManagementPage.scss";

const PAGE_SIZE = 10;

const initialForm: TaskPayload = {
  title: "",
  description: "",
  projectId: "",
  assignedTo: "",
  priority: "MEDIUM",
  dueDate: null,
};

const TaskManagementPage = () => {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [page, setPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<TaskPayload>(initialForm);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageTasks =
    user?.role === "ADMIN" || user?.role === "MANAGER";

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getTasks({
        page,
        limit: PAGE_SIZE,
        status: statusFilter as TaskStatus | "",
        priority: priorityFilter as TaskPriority | "",
        search,
      });

      setTasks(result.tasks);
      setTotalTasks(result.count);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to load tasks."
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, search]);

  const loadFormOptions = async () => {
    try {
      const [projectData, userData] = await Promise.all([
        getProjects(),
        getUsers(),
      ]);

      setProjects(projectData);
      setUsers(userData);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to load project and user options."
      );
    }
  };

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const openCreateForm = async () => {
    setEditingTaskId(null);
    setForm(initialForm);
    setShowForm(true);
    setSuccess("");
    setError("");
    await loadFormOptions();
  };

  const openEditForm = async (task: Task) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      projectId: task.project_id,
      assignedTo: task.assigned_to,
      priority: task.priority,
      dueDate: task.due_date
        ? task.due_date.substring(0, 10)
        : null,
    });

    setShowForm(true);
    setSuccess("");
    setError("");
    await loadFormOptions();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTaskId(null);
    setForm(initialForm);
  };

  const handleFormChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "dueDate" ? value || null : value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!form.projectId || !form.assignedTo) {
      setError("Please select a project and an assignee.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: TaskPayload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate || null,
      };

      if (editingTaskId) {
        await updateTask(editingTaskId, payload);
        setSuccess("Task updated successfully.");
      } else {
        await createTask(payload);
        setSuccess("Task created successfully.");
      }

      closeForm();
      setPage(1);

      // Refresh the task list after the operation.
      await loadTasks();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to save task."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    taskId: string,
    status: TaskStatus
  ) => {
    try {
      setError("");
      setSuccess("");

      await updateTaskStatus(taskId, status);
      setSuccess("Task status updated successfully.");
      await loadTasks();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to update task status."
      );
    }
  };

  const handleDelete = async (taskId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deleteTask(taskId);
      setSuccess("Task deleted successfully.");

      if (tasks.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadTasks();
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to delete task."
      );
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalTasks / PAGE_SIZE));

  const getPriorityClass = (priority: string) =>
    priority.toLowerCase();

  const getUserName = (task: Task) =>
    task.assigned_to_name || task.assigned_to || "Unassigned";

  const getProjectName = (task: Task) =>
    task.project_name ||
    projects.find((project) => project.id === task.project_id)
      ?.project_name ||
    "—";

  return (
    <div className="tasks-page">
      <header className="tasks-header">

        {canManageTasks && (
          <button
            className="primary-button"
            onClick={openCreateForm}
          >
            + Create Task
          </button>
        )}
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success">{success}</div>
      )}

      <section className="task-filters">
        <input
          type="search"
          placeholder="Search tasks..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => {
            setPriorityFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </section>

      <section className="task-list-panel">
        <div className="task-list-heading">
          <div>
            <h2>All Tasks</h2>
            <span>{totalTasks} tasks found</span>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <h3>No tasks found</h3>
            <p>Try changing your filters or create a new task.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      <small>
                        {task.description || "No description"}
                      </small>
                    </td>

                    <td>{getProjectName(task)}</td>
                    <td>{getUserName(task)}</td>

                    <td>
                      <span
                        className={`priority-badge ${getPriorityClass(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    <td>
                      {task.due_date
                        ? new Date(
                            `${task.due_date.substring(0, 10)}T00:00:00`
                          ).toLocaleDateString()
                        : "—"}
                    </td>

                    <td>
                      <select
                        className="status-select"
                        value={task.status}
                        onChange={(event) =>
                          handleStatusChange(
                            task.id,
                            event.target.value as TaskStatus
                          )
                        }
                      >
                        <option value="TODO">To do</option>
                        <option value="IN_PROGRESS">
                          In progress
                        </option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </td>

                    <td>
                      <div className="action-buttons">
                        {canManageTasks && (
                          <>
                            <button
                              className="text-button"
                              onClick={() => openEditForm(task)}
                            >
                              Edit
                            </button>

                            <button
                              className="text-button danger"
                              onClick={() => handleDelete(task.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalTasks > 0 && (
          <div className="pagination">
            <span>
              Page {page} of {totalPages}
            </span>

            <div>
              <button
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {showForm && (
        <div className="modal-backdrop">
          <section className="task-modal">
            <div className="modal-heading">
              <div>
                <h2>
                  {editingTaskId ? "Edit Task" : "Create New Task"}
                </h2>
                <p>Enter the task details below.</p>
              </div>

              <button
                className="close-button"
                onClick={closeForm}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Task Title *
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Enter task title"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Enter task description"
                  rows={3}
                />
              </label>

              <label>
                Project *
                <select
                  name="projectId"
                  value={form.projectId}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project_name || project.projectName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Assign To *
                <select
                  name="assignedTo"
                  value={form.assignedTo}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select employee</option>
                  {users
                    .filter(
                      (option) =>
                        option.role === "EMPLOYEE" ||
                        option.id === user?.id
                    )
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.fullName ||
                          option.full_name ||
                          option.email}
                      </option>
                    ))}
                </select>
              </label>

              <div className="form-row">
                <label>
                  Priority
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </label>

                <label>
                  Due Date
                  <input
                    type="date"
                    name="dueDate"
                    value={form.dueDate || ""}
                    onChange={handleFormChange}
                  />
                </label>
              </div>

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
                    : editingTaskId
                    ? "Update Task"
                    : "Create Task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default TaskManagementPage;
