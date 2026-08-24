export function GreetingCard({ fullName, co2SavedKg }) {
  return (
    <div className="dashboard-header-card">
      <div className="greeting">Bonjour,</div>
      <h1>{fullName}</h1>
      <div className="co2-badge">
        <span className="dot" />
        <span>
          CO₂ économisé : <strong>{(co2SavedKg ?? 0).toFixed(1)} kg</strong>
        </span>
      </div>
    </div>
  )
}
