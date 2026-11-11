
import type {
  PriorityItem,
} from "../../services/dashboard.service";

interface PriorityBreakdownProps {
  items: PriorityItem[];
}

const priorityConfig = [
  {
    name: "CRITICAL",
    color: "#dc3545",
  },
  {
    name: "HIGH",
    color: "#f08c35",
  },
  {
    name: "MEDIUM",
    color: "#3157d5",
  },
  {
    name: "LOW",
    color: "#16a05d",
  },
];

const PriorityBreakdown = ({
  items,
}: PriorityBreakdownProps) => {
  const total = items.reduce(
    (sum, item) => sum + Number(item.task_count),
    0
  );

  return (
    <section className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <h3>Task Priority</h3>
          <p>Distribution of tasks by priority</p>
        </div>

        <span className="panel-total">
          {total} tasks
        </span>
      </div>

      <div className="priority-list">
        {priorityConfig.map((priority) => {
          const item = items.find(
            (entry) => entry.priority === priority.name
          );

          const count = Number(item?.task_count ?? 0);

          const percentage =
            total > 0 ? (count / total) * 100 : 0;

          return (
            <div className="priority-item" key={priority.name}>
              <div className="priority-info">
                <span className="priority-name">
                  <span
                    className="priority-dot"
                    style={{ backgroundColor: priority.color }}
                  />
                  {priority.name}
                </span>

                <strong>{count}</strong>
              </div>

              <div className="priority-track">
                <div
                  className="priority-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: priority.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PriorityBreakdown;
