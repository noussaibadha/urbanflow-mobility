export function TransportPicker({
  options,
  value,
  onChange,
  gridClassName = 'transport-grid',
  itemClassName = 'transport-option',
}) {
  return (
    <div className={gridClassName}>
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          className={`${itemClassName}${value === opt.value ? ' selected' : ''}`}
          style={{ '--transport-color': opt.color }}
          onClick={() => onChange(opt.value)}
        >
          <span className="dot" style={{ background: opt.color }} />
          <span className="label">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
