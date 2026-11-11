
import type {
  ProjectProgressItem,
} from "../../services/dashboard.service";

interface ProjectProgressProps {
  projects: ProjectProgressItem[];
}

const ProjectProgress = ({
  projects,
}: ProjectProgressProps) => {
  return (
    <section className="dashboard-panel">
      <div className="panel-heading">
        <div>
          <h3>Project Progress</h3>
          <p>Completion status of your projects</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          No projects available yet.
        </div>
      ) : (
        <div className="project-list">
          {projects.map((project) => {
            const percentage = Math.min(
              100,
              Math.max(0, Number(project.completion_rate))
            );

            return (
              <div
                className="project-item"
                key={project.project_id}
              >
                <div className="project-info">
                  <div>
                    <h4>{project.project_name}</h4>

                    <span>
                      {project.completed_tasks} of{" "}
                      {project.total_tasks} tasks completed
                    </span>
                  </div>

                  <strong>{percentage.toFixed(0)}%</strong>
                </div>

                <div className="project-progress-track">
                  <div
                    className="project-progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ProjectProgress;
