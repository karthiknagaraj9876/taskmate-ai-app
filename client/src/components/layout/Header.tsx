
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

import "./Header.scss";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);

  const pageTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/tasks": "Task Management",
    "/projects": "Project Management",
    "/users": "User Management",
  };

  const pageTitle =
    pageTitles[location.pathname] || "TaskMate AI";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = user?.fullName
    ?.split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          ☰
        </button>

        <div className="header-page-info">
          <h1>{pageTitle}</h1>
          <span>Welcome to your workspace</span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-profile">
          <button
            className="profile-trigger"
            onClick={() => setShowProfile((previous) => !previous)}
          >
            <div className="profile-avatar">{initials}</div>

            <div className="profile-info">
              <strong>{user?.fullName || "User"}</strong>
              <span>{user?.role || "EMPLOYEE"}</span>
            </div>

            <span className="profile-arrow">⌄</span>
          </button>

          {showProfile && (
            <>
              <div
                className="profile-dismiss"
                onClick={() => setShowProfile(false)}
              />

              <div className="profile-dropdown">
                <div className="dropdown-user-info">
                  <strong>{user?.fullName}</strong>
                  <span>{user?.email}</span>
                  <span className="dropdown-role">
                    {user?.role}
                  </span>
                </div>

                <button
                  className="logout-button"
                  onClick={handleLogout}
                >
                  <span>↪</span>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
