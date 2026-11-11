
import type {
  RecentTask,
} from "../../services/dashboard.service";

interface RecentTasksProps {
  tasks: RecentTask[];
}

const RecentTasks = ({ tasks }: RecentTasksProps) => {
  const formatDate = (date: string | null) => {
    if (!date) return "No deadline";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <section className="dashboard-panel recent-tasks-panel">
      <div className="panel-heading">
        <div>
          <h3>Recent Tasks</h3>
          <p>Recently updated tasks</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          No recent tasks found.
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="recent-tasks-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                  </td>

                  <td>
                    {task.project_name || "-"}
                  </td>

                  <td>
                    {task.assigned_to_name || "-"}
                  </td>

                  <td>
                    <span
                      className={`priority-badge priority-${task.priority.toLowerCase()}`}
                    >
                      {task.priority}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`status-badge status-${task.status.toLowerCase()}`}
                    >
                      {task.status.replace("_", " ")}
                    </span>
                  </td>

                  <td>{formatDate(task.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default RecentTasks;
