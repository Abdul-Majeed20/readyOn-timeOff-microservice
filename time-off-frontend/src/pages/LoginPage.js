import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils';

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { addToast('Email and password are required', 'error'); return; }
    setLoading(true);
    try {
      const { user } = await login(form.email, form.password);
      navigate(user.role === 'employee' ? '/employee' : '/manager', { replace: true });
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(108,138,255,0.1) 0%, transparent 70%)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem', maxWidth: '480px' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, marginBottom: '0.5rem' }}>
            Ready<span style={{ color: 'var(--accent)' }}>On</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Welcome back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', justifyContent: 'center', padding: '0.75rem' }}>
            {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="divider" style={{ margin: 0 }} />
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Have a company code?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>Join your team →</Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            New company?{' '}
            <Link to="/company/signup" style={{ color: 'var(--accent)', fontWeight: 500 }}>Create workspace →</Link>
          </p>
        </div>
      </div>

      <div style={{ flex: 1, background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem', gap: '2rem' }}>
        <div style={{ maxWidth: '340px', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Manage time off,<br />effortlessly.
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7 }}>
            Real-time balance sync with your HCM, instant manager approvals, and full visibility for your whole team.
          </p>
        </div>
        {[{ icon: '⚡', label: 'Real-time HCM sync' }, { icon: '🔒', label: 'Role-based access' }, { icon: '📊', label: 'Full audit trail' }].map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem 1.25rem', width: '100%', maxWidth: '280px' }}>
            <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}