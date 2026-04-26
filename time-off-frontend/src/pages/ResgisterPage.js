import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils';

const LOCATIONS = [
  { id: 'loc_NY', label: 'New York Office' },
  { id: 'loc_LA', label: 'Los Angeles Office' },
  { id: 'loc_HQ', label: 'Headquarters' },
  { id: 'loc_remote', label: 'Remote' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    joinCode: '', locationId: 'loc_NY',
  });
  const [loading, setLoading] = useState(false);

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.joinCode) {
      addToast('All fields are required', 'error'); return;
    }
    if (form.password !== form.confirmPassword) {
      addToast('Passwords do not match', 'error'); return;
    }
    if (form.password.length < 6) {
      addToast('Password must be at least 6 characters', 'error'); return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        joinCode: form.joinCode,
        locationId: form.locationId,
      });
      addToast('Welcome to ReadyOn!', 'success');
      navigate('/employee', { replace: true });
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(108,138,255,0.08) 0%, transparent 70%)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/login" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
            ← Back to login
          </Link>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 300, marginBottom: '0.4rem' }}>
            Ready<span style={{ color: 'var(--accent)' }}>On</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
            Join your team
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Ask your company admin for the join code, then create your account.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Join code — most important field, at top */}
            <div className="form-group">
              <label className="form-label">Company Join Code</label>
              <input
                className="form-input"
                placeholder="e.g. A1B2C3D4"
                value={form.joinCode}
                onChange={e => set('joinCode', e.target.value.toUpperCase())}
                style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Get this from your company admin
              </span>
            </div>

            <div className="divider" style={{ margin: '0.25rem 0' }} />

            <div className="form-group">
              <label className="form-label">Your Full Name</label>
              <input className="form-input" placeholder="Alex Johnson" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input className="form-input" type="email" placeholder="alex@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-input" value={form.locationId} onChange={e => set('locationId', e.target.value)}>
                {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm</label>
                <input className="form-input" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem', justifyContent: 'center', padding: '0.75rem' }}>
              {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}