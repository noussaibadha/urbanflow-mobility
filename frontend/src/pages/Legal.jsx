export function Legal() {
  return (
    <div className="legal-page">
      <h1>Conditions générales d'utilisation et politique de confidentialité</h1>
      <p className="auth-subtitle">UrbanFlow Mobility</p>

      <div className="white-card">
        <p>
          UrbanFlow Mobility est une plateforme de mobilité urbaine multimodale, développée dans le cadre d'un
          projet d'études. Ces conditions décrivent comment vos données sont utilisées.
        </p>
      </div>

      <div className="section-label">Données collectées</div>
      <div className="white-card">
        <p>
          Nom complet, email, mot de passe (stocké de façon sécurisée, jamais en clair), préférences de transport,
          priorité d'itinéraire, et position géographique uniquement si vous l'autorisez explicitement.
        </p>
      </div>

      <div className="section-label">Finalité</div>
      <div className="white-card">
        <p>
          Ces données servent uniquement à calculer et personnaliser vos itinéraires, gérer votre compte et vos
          favoris. Elles ne sont ni vendues ni partagées avec des tiers.
        </p>
      </div>

      <div className="section-label">Base légale</div>
      <div className="white-card">
        <p>
          Le traitement de vos données repose sur votre consentement, donné à l'inscription et, pour la
          géolocalisation, via une demande d'autorisation séparée que vous pouvez retirer à tout moment dans votre
          profil.
        </p>
      </div>

      <div className="section-label">Conservation</div>
      <div className="white-card">
        <p>
          Vos données sont conservées tant que votre compte est actif. Vous pouvez demander leur suppression à
          tout moment.
        </p>
      </div>

      <div className="section-label">Vos droits</div>
      <div className="white-card">
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de
          portabilité de vos données. Pour exercer ces droits, contactez-nous à{' '}
          <a href="mailto:contact@urbanflow-mobility.fr">contact@urbanflow-mobility.fr</a>.
        </p>
      </div>

      <div className="section-label">Hébergement</div>
      <div className="white-card">
        <p>Le site est hébergé chez Vercel (frontend) et Railway (backend et base de données).</p>
      </div>

      <div className="section-label">Sécurité</div>
      <div className="white-card">
        <p>
          Les connexions sont sécurisées, les mots de passe sont hachés et l'authentification utilise un système
          de jeton (JWT) sans stockage de session côté serveur.
        </p>
      </div>

      <div className="section-label">Cookies et stockage local</div>
      <div className="white-card">
        <p>
          Seul un jeton de connexion est conservé localement dans votre navigateur, nécessaire pour rester
          connecté. Aucun cookie publicitaire ou de tracking n'est utilisé.
        </p>
      </div>

      <p className="auth-subtitle">
        Ce projet est réalisé dans un cadre pédagogique (Titre 6 B3DEV, Digital Campus) et ne constitue pas un
        service commercial.
      </p>
    </div>
  )
}
