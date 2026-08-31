import { useEffect, useRef, useState } from 'react'

const MAX_RESULTS = 8

export function StationAutocomplete({ stations, value, onChange, placeholder = 'Rechercher une station...' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const selected = stations.find((s) => s.id === value)
    setQuery(selected ? selected.name : '')
  }, [value, stations])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        const selected = stations.find((s) => s.id === value)
        setQuery(selected ? selected.name : '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value, stations])

  const normalizedQuery = query.trim().toLowerCase()
  const suggestions =
    normalizedQuery.length === 0
      ? []
      : stations.filter((s) => s.name.toLowerCase().includes(normalizedQuery)).slice(0, MAX_RESULTS)

  function handleSelect(station) {
    onChange(station.id)
    setQuery(station.name)
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="station-autocomplete" ref={containerRef}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {value && (
        <button type="button" className="station-autocomplete-clear" onClick={handleClear} title="Effacer">
          ×
        </button>
      )}
      {open && normalizedQuery.length > 0 && (
        <ul className="address-suggestions">
          {suggestions.length === 0 ? (
            <li className="address-suggestion-loading">Aucune station trouvée</li>
          ) : (
            suggestions.map((s) => (
              <li key={s.id} className="address-suggestion" onMouseDown={() => handleSelect(s)}>
                {s.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
