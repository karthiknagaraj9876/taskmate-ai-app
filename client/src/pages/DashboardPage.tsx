
import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";

import StatCard from "../components/dashboard/StatCard";
import PriorityBreakdown from "../components/dashboard/PriorityBreakdown";
import ProjectProgress from "../components/dashboard/ProjectProgress";
import RecentTasks from "../components/dashboard/RecentTasks";

import {
  dashboardService,
} from "../services/dashboard.service";

import type {
  DashboardSummary,
  PriorityItem,
  ProjectProgressItem,
  RecentTask,
} from "../services/dashboard.service";

import "./DashboardPage.scss";

const DashboardPage = () => {
  const { user, logout } = useAuth();

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [priorities, setPriorities] =
    useState<PriorityItem[]>([]);

  const [projects, setProjects] =
    useState<ProjectProgressItem[]>([]);

  const [recentTasks, setRecentTasks] =
    useState<RecentTask[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError("");

        const data = await dashboardService.getDashboardData();

        setSummary(data.summary);
        setPriorities(data.priorities);
        setProjects(data.projects);
        setRecentTasks(data.recentTasks);
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
          "Unable to load dashboard data. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const getDashboardTitle = () => {
    switch (user?.role) {
      case "ADMIN":
        return "Organization Dashboard";

      case "MANAGER":
        return "Team Dashboard";

      case "EMPLOYEE":
        return "My Dashboard";

      default:
        return "Dashboard";
    }
  };

  const getDashboardDescription = () => {
    switch (user?.role) {
      case "ADMIN":
        return "Overview of organization-wide task performance.";

      case "MANAGER":
        return "Monitor your projects and team productivity.";

      case "EMPLOYEE":
        return "Track your assigned tasks and productivity.";

      default:
        return "Task management overview.";
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>

        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="dashboard-page">

      <main className="dashboard-content">

        <div className="dashboard-welcome">
          <div>
            {/* <h1>{getDashboardTitle()}</h1> */}

            <p>
              Welcome back, {user?.fullName}.{" "}
              {getDashboardDescription()}
            </p>
          </div>

          <span className="role-indicator">
            {user?.role}
          </span>
        </div>

        <section className="stats-grid">

          <StatCard
            title="Total Tasks"
            value={summary.total_tasks}
            description="Tasks in your workspace"
            icon="▤"
            color="blue"
          />

          <StatCard
            title="To Do"
            value={summary.todo_tasks}
            description="Tasks waiting to start"
            icon="◷"
            color="orange"
          />

          <StatCard
            title="In Progress"
            value={summary.in_progress_tasks}
            description="Currently being worked on"
            icon="↗"
            color="purple"
          />

          <StatCard
            title="Completed"
            value={summary.completed_tasks}
            description={`${Number(summary.completion_rate).toFixed(0)}% completion rate`}
            icon="✓"
            color="green"
          />

          <StatCard
            title="Overdue"
            value={summary.overdue_tasks}
            description="Tasks past their deadline"
            icon="!"
            color="red"
          />

          <StatCard
            title="Due Soon"
            value={summary.due_soon_tasks}
            description="Due within the next 7 days"
            icon="◷"
            color="orange"
          />

        </section>

        <section className="dashboard-grid">

          <PriorityBreakdown items={priorities} />

          <ProjectProgress projects={projects} />

        </section>

        <RecentTasks tasks={recentTasks} />

        <footer className="dashboard-footer">
          TaskMate AI · Intelligent Task Management Assistant
        </footer>

      </main>
    </div>
  );
};

export default DashboardPage;
