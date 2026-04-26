import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const icons = {
  home:    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  cal:     <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  balance: <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  users:   <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  list:    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  logout:  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const ROLE_STYLE = {
  admin:    { bg: 'var(--purple-dim)', border: 'rgba(192,132,252,0.2)', avatar: 'var(--purple)', label: 'Admin' },
  manager:  { bg: 'var(--accent-dim)', border: 'rgba(108,138,255,0.2)', avatar: 'var(--accent)',  label: 'Manager' },
  employee: { bg: 'var(--bg-3)',       border: 'var(--border)',         avatar: '#4b5563',         label: 'Employee' },
};

function NavItem({ to, icon, label, end = false }) {
  return (
    <NavLink to={to} end={end} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: '0.65rem',
      padding: '0.55rem 0.75rem', borderRadius: 'var(--radius)',
      marginBottom: '0.1rem', fontSize: '0.865rem', fontWeight: 500,
      color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
      background: isActive ? 'var(--bg-3)' : 'transparent',
      borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
      transition: 'all 0.15s',
    })}>
      {icon}{label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, company, logout } = useAuth();
  const rs = ROLE_STYLE[user?.role] || ROLE_STYLE.employee;
  const isManagerLevel = user?.role === 'manager' || user?.role === 'admin';
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <aside style={{ width: '220px', minHeight: '100vh', background: 'var(--bg-2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '1.5rem 0', flexShrink: 0 }}>

      {/* Logo */}
      <div style={{ padding: '0 1.25rem 1.75rem' }}>
        <Link to={isManagerLevel ? '/manager' : '/employee'} style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Ready<span style={{ color: 'var(--accent)' }}>On</span>
        </Link>
        {company && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {company.name}
          </div>
        )}
      </div>

      {/* User card */}
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: rs.bg, border: `1px solid ${rs.border}`, borderRadius: 'var(--radius)', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: rs.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{rs.label}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 0.75rem' }}>

        {/* Manager / Admin nav */}
        {isManagerLevel && (
          <>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.75rem', marginBottom: '0.4rem' }}>Management</div>
            <NavItem to="/manager"          icon={icons.home}  label="Dashboard"    end />
            <NavItem to="/manager/requests" icon={icons.list}  label="All Requests" />
            <NavItem to="/manager/team"     icon={icons.users} label="Team"         />
            <div style={{ height: '1rem' }} />
          </>
        )}

        {/* Employee nav — visible to everyone (admins/managers can also take leave) */}
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.75rem', marginBottom: '0.4rem' }}>My Leave</div>
        <NavItem to="/employee"         icon={icons.home}    label="My Requests" end />
        <NavItem to="/employee/request" icon={icons.cal}     label="New Request" />
        <NavItem to="/employee/balance" icon={icons.balance} label="My Balance"  />
      </nav>

      {/* Logout */}
      <div style={{ padding: '0 0.75rem', marginTop: '0.5rem' }}>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius)', width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.865rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}>
          {icons.logout} Sign Out
        </button>
      </div>
    </aside>
  );
}