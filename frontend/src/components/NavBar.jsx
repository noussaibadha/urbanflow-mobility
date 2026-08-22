import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function HomeIcon({ color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path d="M4 11.5L12 4l8 7.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5v8a1 1 0 001 1h10a1 1 0 001-1v-8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlannerIcon({ color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s7-7.2 7-12.2A7 7 0 105 8.8C5 13.8 12 21 12 21z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="8.6" r="2.4" stroke={color} strokeWidth="2" />
    </svg>
  )
}

function DashboardIcon({ color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="12" width="4" height="8" rx="1" fill={color} />
      <rect x="10" y="7" width="4" height="13" rx="1" fill={color} />
      <rect x="16" y="3" width="4" height="17" rx="1" fill={color} />
    </svg>
  )
}

function FavoritesIcon({ color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5 6 5c2 0 3.5 1.2 4 2.3.5-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.65 12 20 12 20z"
        fill={color}
      />
    </svg>
  )
}

function ProfileIcon({ color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.4" fill={color} />
      <path d="M5 20c0-4 3.6-6.4 7-6.4s7 2.4 7 6.4" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function NavItem({ to, label, Icon, active, onClick }) {
  const color = active ? '#52B788' : 'rgba(26,58,42,0.4)'
  const content = (
    <>
      <Icon color={color} />
      <span>{label}</span>
    </>
  )

  if (onClick) {
    return (
      <button className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
        {content}
      </button>
    )
  }

  return (
    <Link className={`nav-item${active ? ' active' : ''}`} to={to}>
      {content}
    </Link>
  )
}

export function NavBar() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path

  function goProtected(path, message) {
    if (user) {
      navigate(path)
    } else {
      navigate('/login', { state: { message } })
    }
  }

  return (
    <nav className="nav-bar">
      <div className="nav-bar-inner">
        <Link to="/" className="nav-brand">
          UrbanFlow Mobility
        </Link>
        <div className="nav-items">
          <NavItem to="/" label="Accueil" Icon={HomeIcon} active={isActive('/')} />
          <NavItem to="/planner" label="Itinéraire" Icon={PlannerIcon} active={isActive('/planner')} />
          <NavItem
            label="Tableau"
            Icon={DashboardIcon}
            active={isActive('/dashboard')}
            onClick={() => goProtected('/dashboard', 'Connectez-vous pour accéder à votre tableau de bord.')}
          />
          <NavItem
            label="Favoris"
            Icon={FavoritesIcon}
            active={isActive('/favorites')}
            onClick={() => goProtected('/favorites', 'Connectez-vous pour accéder à vos favoris.')}
          />
          <NavItem
            to={user ? '/profile' : '/login'}
            label="Profil"
            Icon={ProfileIcon}
            active={isActive('/profile') || isActive('/login') || isActive('/register')}
          />
        </div>
      </div>
    </nav>
  )
}
