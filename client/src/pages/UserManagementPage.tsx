
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
  createUser,
  getUsers,
  updateUser,
  updateUserStatus,
} from "../services/user.service";

import type {
  AppUser,
  CreateUserPayload,
  UserRole,
} from "../types/user.types";

import "./UserManagementPage.scss";

const initialForm: CreateUserPayload = {
  fullName: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
  managerId: "",
};

const UserManagementPage = () => {
  const { user } = useAuth();

  const [users, setUsers] = useState<AppUser[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<CreateUserPayload>(initialForm);

  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";

  const canManageUsers = isAdmin || isManager;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getUsers();

      setUsers(result);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const managers = useMemo(
    () =>
      users.filter(
        (item) =>
          item.role === "MANAGER" && item.is_active
      ),
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const matchesSearch =
        item.full_name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" || item.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.is_active) ||
        (statusFilter === "INACTIVE" && !item.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const openCreateForm = () => {
    setEditingUserId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (selectedUser: AppUser) => {
    setEditingUserId(selectedUser.id);

    setEditForm({
      fullName: selectedUser.full_name,
      email: selectedUser.email,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUserId(null);
    setForm(initialForm);
    setEditForm({ fullName: "", email: "" });
    setError("");
  };

  const handleCreateChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleEditChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingUserId) {
        if (
          editForm.fullName.trim().length < 2 ||
          !editForm.email.trim()
        ) {
          setError("Please enter a valid name and email.");
          return;
        }

        await updateUser(editingUserId, {
          fullName: editForm.fullName.trim(),
          email: editForm.email.trim(),
        });

        setSuccess("User updated successfully.");
      } else {
        if (form.password.length < 8) {
          setError("Password must contain at least 8 characters.");
          return;
        }

        const payload: CreateUserPayload = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        };

        if (isAdmin && form.role === "EMPLOYEE") {
          if (!form.managerId) {
            setError("Please select a manager for this employee.");
            return;
          }

          payload.managerId = form.managerId;
        }

        await createUser(payload);

        setSuccess("User created successfully.");
      }

      closeForm();
      await loadUsers();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (
    selectedUser: AppUser
  ) => {
    if (selectedUser.id === user?.id) {
      setError("You cannot change your own account status.");
      return;
    }

    const action = selectedUser.is_active
      ? "deactivate"
      : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${selectedUser.full_name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await updateUserStatus(selectedUser.id, {
        isActive: !selectedUser.is_active,
      });

      setSuccess(`User ${action}d successfully.`);

      await loadUsers();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to update user status."
      );
    }
  };

  const getRoleClass = (role: UserRole) =>
    role.toLowerCase();

  return (
    <div className="users-page">
      <div className="users-header">

        {canManageUsers && (
          <button
            className="primary-button"
            onClick={openCreateForm}
          >
            + Create User
          </button>
        )}
      </div>

      {error && (
        <div className="alert error-alert">{error}</div>
      )}

      {success && (
        <div className="alert success-alert">{success}</div>
      )}

      <div className="user-summary">
        <div className="summary-card">
          <span>Total Users</span>
          <strong>{users.length}</strong>
        </div>

        <div className="summary-card">
          <span>Admins</span>
          <strong>
            {users.filter((item) => item.role === "ADMIN").length}
          </strong>
        </div>

        <div className="summary-card">
          <span>Managers</span>
          <strong>
            {users.filter((item) => item.role === "MANAGER").length}
          </strong>
        </div>

        <div className="summary-card">
          <span>Employees</span>
          <strong>
            {users.filter((item) => item.role === "EMPLOYEE").length}
          </strong>
        </div>
      </div>

      <div className="user-list-panel">
        <div className="user-list-heading">
          <h2>Users</h2>

          <div className="user-filters">
            <input
              type="text"
              placeholder="Search name or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All Accounts</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="user-message">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="user-message">
            <h3>No users found</h3>
            <p>Try changing your search or filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Manager</th>
                  <th>Status</th>
                  {canManageUsers && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="user-name">
                        <strong>{item.full_name}</strong>
                        <span>{item.email}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`role-badge ${getRoleClass(item.role)}`}
                      >
                        {item.role}
                      </span>
                    </td>

                    <td>{item.manager_name || "—"}</td>

                    <td>
                      <span
                        className={`account-status ${
                          item.is_active ? "active" : "inactive"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {canManageUsers && (
                      <td>
                        <div className="user-actions">
                          <button
                            className="text-button"
                            onClick={() => openEditForm(item)}
                          >
                            Edit
                          </button>

                          {item.id !== user?.id && (
                            <button
                              className={`text-button ${
                                item.is_active ? "danger" : "activate"
                              }`}
                              onClick={() => handleStatusToggle(item)}
                            >
                              {item.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          )}
                        </div>
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
          <div className="user-modal">
            <div className="modal-header">
              <h2>
                {editingUserId ? "Edit User" : "Create New User"}
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
              {editingUserId ? (
                <>
                  <div className="form-group">
                    <label htmlFor="editFullName">Full Name *</label>

                    <input
                      id="editFullName"
                      name="fullName"
                      value={editForm.fullName}
                      onChange={handleEditChange}
                      required
                      minLength={2}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="editEmail">Email *</label>

                    <input
                      id="editEmail"
                      name="email"
                      type="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name *</label>

                    <input
                      id="fullName"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleCreateChange}
                      placeholder="Enter full name"
                      required
                      minLength={2}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email *</label>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleCreateChange}
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password *</label>

                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleCreateChange}
                      placeholder="Minimum 8 characters"
                      minLength={8}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="role">Role *</label>

                    <select
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={handleCreateChange}
                    >
                      {isAdmin && (
                        <>
                          <option value="ADMIN">Admin</option>
                          <option value="MANAGER">Manager</option>
                        </>
                      )}

                      <option value="EMPLOYEE">Employee</option>
                    </select>
                  </div>

                  {isAdmin && form.role === "EMPLOYEE" && (
                    <div className="form-group">
                      <label htmlFor="managerId">
                        Assign Manager *
                      </label>

                      <select
                        id="managerId"
                        name="managerId"
                        value={form.managerId}
                        onChange={handleCreateChange}
                        required
                      >
                        <option value="">Select Manager</option>

                        {managers.map((manager) => (
                          <option
                            key={manager.id}
                            value={manager.id}
                          >
                            {manager.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isManager && (
                    <div className="manager-info">
                      This employee will automatically be assigned
                      to you as their manager.
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="alert error-alert">{error}</div>
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
                    : editingUserId
                      ? "Update User"
                      : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
