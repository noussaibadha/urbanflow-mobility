import { useState } from 'react'

const CONSENT_KEY = 'urbanflow_location_consent'

export function readLocationConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY)
  } catch {
    return null
  }
}

function writeLocationConsent(value) {
  try {
    if (value == null) localStorage.removeItem(CONSENT_KEY)
    else localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // localStorage unavailable (private mode, disabled storage) — consent
    // just won't persist across reloads, the app still works either way.
  }
}

// RGPD: 'granted' | 'denied' | null (no choice made yet, so nothing has been
// asked of the browser's geolocation API). Persisted so the consent prompt
// (see components/LocationConsentModal.jsx) isn't shown on every visit, and
// changeable later from the Profile page's "Confidentialité" section.
export function useLocationConsent() {
  const [consent, setConsentState] = useState(readLocationConsent)

  function setConsent(value) {
    writeLocationConsent(value)
    setConsentState(value)
  }

  return [consent, setConsent]
}
