import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { submitRequest } from '../../api';
import { getErrorMessage } from '../../utils';

const LOCATIONS = [
  { id: 'loc_NY', label: 'New York Office' },
  { id: 'loc_LA', label: 'Los Angeles Office' },
];

export default function NewRequestPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    locationId: user.locationId || 'loc_NY',
    days: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  }

  function validate() {
    const errors = {};
    if (!form.locationId) errors.locationId = 'Select a location';
    if (!form.days || Number(form.days) < 0.5) errors.days = 'Minimum 0.5 days';
    if (!form.startDate) errors.startDate = 'Start date is required';
    if (!form.endDate) errors.endDate = 'End date is required';
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errors.endDate = 'End date must be after start date';
    }
    const today = new Date().toISOString().slice(0, 10);
    if (form.startDate && form.startDate < today) errors.startDate = 'Must be today or future';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setSubmitting(true);
    try {
      await submitRequest({
        locationId: form.locationId,
        days: Number(form.days),
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
      addToast('Request submitted successfully!', 'success');
      navigate('/employee');
    } catch (err) {
      const msg = getErrorMessage(err);
      const code = err?.response?.data?.error;
      if (code === 'INSUFFICIENT_BALANCE') {
        const avail = err?.response?.data?.available;
        addToast(`Insufficient balance — you have ${avail} day(s) available`, 'error');
      } else {
        addToast(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="page-header">
        <h2>New Time-Off Request</h2>
        <p>Fill in the details below. Your manager will be notified for approval.</p>
      </div>

      <div style={{ maxWidth: '580px' }}>
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-input" value={form.locationId} onChange={e => set('locationId', e.target.value)}>
                {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              {fieldErrors.locationId && <span style={{ fontSize: '0.78rem', color: 'var(--red)' }}>{fieldErrors.locationId}</span>}
            </div>

            {/* Days */}
            <div className="form-group">
              <label className="form-label">Number of Days</label>
              <input
                type="number" min="0.5" step="0.5" className="form-input"
                placeholder="e.g. 3"
                value={form.days} onChange={e => set('days', e.target.value)}
              />
              {fieldErrors.days && <span style={{ fontSize: '0.78rem', color: 'var(--red)' }}>{fieldErrors.days}</span>}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Minimum 0.5 (half day). Whole and half days only.</span>
            </div>

            {/* Dates */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" min={today} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                {fieldErrors.startDate && <span style={{ fontSize: '0.78rem', color: 'var(--red)' }}>{fieldErrors.startDate}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" min={form.startDate || today} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                {fieldErrors.endDate && <span style={{ fontSize: '0.78rem', color: 'var(--red)' }}>{fieldErrors.endDate}</span>}
              </div>
            </div>

            {/* Reason */}
            <div className="form-group">
              <label className="form-label">Reason <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <textarea className="form-input" rows={3} placeholder="e.g. Family vacation, medical appointment..." value={form.reason} onChange={e => set('reason', e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            {/* Info box */}
            <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(108,138,255,0.2)', borderRadius: 'var(--radius)', padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--accent)', lineHeight: 1.6 }}>
              ℹ Your balance will be checked against the HCM system in real time. Requests exceeding your available balance will be rejected immediately.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate('/employee')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><span className="spinner" /> Submitting...</> : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}