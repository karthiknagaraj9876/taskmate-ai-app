
interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: string;
  color: "blue" | "green" | "orange" | "red" | "purple";
}

const StatCard = ({
  title,
  value,
  description,
  icon,
  color,
}: StatCardProps) => {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-card-top">
        <span className="stat-title">{title}</span>
        <span className="stat-icon">{icon}</span>
      </div>

      <div className="stat-value">{value}</div>

      <div className="stat-description">
        {description}
      </div>
    </div>
  );
};

export default StatCard;
