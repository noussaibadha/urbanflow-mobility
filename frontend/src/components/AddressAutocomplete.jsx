import { useEffect, useRef, useState } from 'react'
import { searchAddresses } from '../lib/geo'

const DEBOUNCE_MS = 350
const MIN_QUERY_LENGTH = 3

export function AddressAutocomplete({ value, onChange, onSelect, placeholder, required, ariaLabel }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  function handleInputChange(e) {
    const text = e.target.value
    onChange(text)
    setOpen(true)

    clearTimeout(debounceRef.current)
    if (text.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddresses(text)
      setSuggestions(results)
      setLoading(false)
    }, DEBOUNCE_MS)
  }

  function handleSelect(suggestion) {
    onChange(suggestion.label)
    setSuggestions([])
    setOpen(false)
    onSelect?.(suggestion)
  }

  const showDropdown = open && (loading || suggestions.length > 0)

  return (
    <div className="address-autocomplete" ref={containerRef}>
      <input
        value={value}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        required={required}
        autoComplete="off"
      />
      {showDropdown && (
        <ul className="address-suggestions">
          {loading && <li className="address-suggestion-loading">Recherche...</li>}
          {!loading &&
            suggestions.map((s, i) => (
              <li key={i} className="address-suggestion" onMouseDown={() => handleSelect(s)}>
                {s.label}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
