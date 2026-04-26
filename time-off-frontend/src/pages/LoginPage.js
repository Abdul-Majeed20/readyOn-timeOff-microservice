import { DEMO_USERS, useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg)', backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(108,138,255,0.1) 0%, transparent 70%)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 300, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Ready<span style={{ color: 'var(--accent)' }}>On</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Select a user to continue</p>
        </div>

        {/* User cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Employee section */}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem', marginBottom: '0.25rem', marginTop: '0.5rem' }}>
            Employees
          </div>
          {DEMO_USERS.filter(u => u.role === 'employee').map((u) => (
            <button key={u.employeeId} onClick={() => login(u)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.2s', color: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-2)'; }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                {u.avatar}
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{u.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.employeeId} · {u.location}</div>
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</div>
            </button>
          ))}

          {/* Manager section */}
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem', marginBottom: '0.25rem', marginTop: '1rem' }}>
            Managers
          </div>
          {DEMO_USERS.filter(u => u.role === 'manager').map((u) => (
            <button key={u.employeeId} onClick={() => login(u)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.2s', color: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.background = 'var(--purple-dim)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-2)'; }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                {u.avatar}
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{u.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.employeeId} · Manager</div>
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</div>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem' }}>
          Demo mode — no real authentication
        </p>
      </div>
    </div>
  );
}
