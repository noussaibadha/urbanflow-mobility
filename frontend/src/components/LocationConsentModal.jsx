// RGPD-style explicit consent, shown once before the very first call to
// navigator.geolocation.* anywhere in the app (see lib/geo.js's
// useConsentedLocation, which gates that call on this).
export function LocationConsentModal({ onAllow, onDeny }) {
  return (
    <div className="location-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="location-consent-title">
      <div className="location-consent-modal">
        <h3 id="location-consent-title">Utiliser votre position ?</h3>
        <p>
          UrbanFlow Mobility souhaite accéder à votre position pour calculer un itinéraire depuis
          votre emplacement actuel et l'afficher sur la carte. Vous pouvez refuser et saisir votre
          adresse de départ manuellement.
        </p>
        <div className="location-consent-actions">
          <button type="button" className="location-consent-deny" onClick={onDeny}>
            Refuser
          </button>
          <button type="button" className="location-consent-allow" onClick={onAllow}>
            Autoriser
          </button>
        </div>
      </div>
    </div>
  )
}
