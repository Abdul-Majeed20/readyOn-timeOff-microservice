import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils';

export default function CompanySignupPage() {
  const { companySignup } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // holds { joinCode, companyName } after success

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.companyName || !form.name || !form.email || !form.password) {
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
      const { company } = await companySignup({
        companyName: form.companyName,
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setDone({ joinCode: company.joinCode, companyName: company.name });
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  // Success screen — show join code
  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '2rem' }}>
        <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
            {done.companyName} is ready!
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Share this code with your employees so they can join your workspace.
          </p>

          <div style={{ background: 'var(--bg-2)', border: '2px dashed var(--accent)', borderRadius: 'var(--radius-lg)', padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              Your Company Join Code
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.15em' }}>
              {done.joinCode}
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} onClick={() => navigate('/manager', { replace: true })}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(108,138,255,0.08) 0%, transparent 70%)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/login" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>← Back to login</Link>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 300, marginBottom: '0.4rem' }}>
            Ready<span style={{ color: 'var(--accent)' }}>On</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>Create your workspace</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Set up ReadyOn for your entire company in seconds.</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-input" placeholder="Acme Inc." value={form.companyName} onChange={e => set('companyName', e.target.value)} />
            </div>

            <div className="divider" style={{ margin: '0.25rem 0' }} />

            <div className="form-group">
              <label className="form-label">Your Full Name</label>
              <input className="form-input" placeholder="Jordan Taylor" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input className="form-input" type="email" placeholder="jordan@acme.com" value={form.email} onChange={e => set('email', e.target.value)} />
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
              {loading ? <><span className="spinner" /> Creating workspace...</> : 'Create Workspace →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.25rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}