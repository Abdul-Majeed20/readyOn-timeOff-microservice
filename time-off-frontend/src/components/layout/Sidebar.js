import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const CalendarIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const HomeIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const BalanceIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Sidebar() {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'manager';

  const navItems = isManager
    ? [
        { to: '/manager',          icon: <HomeIcon />,     label: 'Dashboard' },
        { to: '/manager/requests', icon: <UsersIcon />,    label: 'All Requests' },
      ]
    : [
        { to: '/employee',         icon: <HomeIcon />,     label: 'Dashboard' },
        { to: '/employee/request', icon: <CalendarIcon />, label: 'New Request' },
        { to: '/employee/balance', icon: <BalanceIcon />,  label: 'My Balance' },
      ];

  return (
    <aside style={{
      width: '220px', minHeight: '100vh', background: 'var(--bg-2)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', padding: '1.5rem 0', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 1.25rem 2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Ready<span style={{ color: 'var(--accent)' }}>On</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Time-off Portal
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: '0 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ background: isManager ? 'var(--purple-dim)' : 'var(--accent-dim)', border: `1px solid ${isManager ? 'rgba(192,132,252,0.2)' : 'rgba(108,138,255,0.2)'}`, borderRadius: 'var(--radius)', padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: isManager ? 'var(--purple)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#fff', flexShrink: 0 }}>
            {user?.avatar}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div style={{ padding: '0 1.25rem 0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Navigation
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '0 0.75rem' }}>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.65rem',
            padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)',
            marginBottom: '0.15rem', fontSize: '0.875rem', fontWeight: 500,
            color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
            background: isActive ? 'var(--bg-3)' : 'transparent',
            transition: 'all 0.15s',
            borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
          })}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '0 0.75rem' }}>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}>
          <LogoutIcon /> Switch User
        </button>
      </div>
    </aside>
  );
}
