export default function StatCard({ label, value, hint }) {
  return (
    <div className="card stat-card">
      <div className="eyebrow">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="muted">{hint}</div>}
    </div>
  );
}
