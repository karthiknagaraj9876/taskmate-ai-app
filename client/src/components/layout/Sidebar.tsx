
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import "./Sidebar.scss";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useAuth();

  const menuItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: "▦",
      visible: true,
    },
    {
      label: "Tasks",
      path: "/tasks",
      icon: "✓",
      visible: true,
    },
    {
      label: "Projects",
      path: "/projects",
      icon: "▤",
      visible: true,
    },
    {
      label: "Users",
      path: "/users",
      icon: "♙",
      visible: true,
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <aside className={`app-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">T</div>

          <div className="brand-details">
            <h2>TaskMate AI</h2>
            <span>Intelligent Workspace</span>
          </div>

          <button
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        <div className="sidebar-section-label">
          WORKSPACE
        </div>

        <nav className="sidebar-navigation">
          {menuItems
            .filter((item) => item.visible)
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <span className="sidebar-icon">
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {user?.fullName?.charAt(0).toUpperCase() || "U"}
            </div>

            <div className="sidebar-user-details">
              <strong>{user?.fullName || "User"}</strong>
              <span>{user?.role || "EMPLOYEE"}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
