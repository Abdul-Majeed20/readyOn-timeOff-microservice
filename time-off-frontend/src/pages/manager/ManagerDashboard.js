import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { apiGetTeam, getMyRequests, approveRequest, rejectRequest } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { formatDate, daysLabel, getErrorMessage } from '../../utils';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [actionTarget, setActionTarget] = useState(null);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);

  // First fetch team members, then their requests
  const { data: teamData, loading: teamLoading } = useFetch(apiGetTeam, []);

  const { data: allRequests, loading: reqLoading, refetch } = useFetch(async () => {
    const team = teamData?.users || [];
    if (!team.length) return [];
    const results = await Promise.all(
      team.map(u => getMyRequests(u.employeeId).then(d => d.requests.map(r => ({ ...r, userName: u.name }))))
    );
    return results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [teamData]);

  const requests = allRequests || [];
  const pending  = requests.filter(r => r.status === 'PENDING');
  const approved = requests.filter(r => r.status === 'APPROVED').length;
  const rejected = requests.filter(r => r.status === 'REJECTED').length;
  const loading  = teamLoading || reqLoading;

  async function handleAction() {
    setActing(true);
    try {
      if (actionTarget.type === 'approve') {
        await approveRequest(actionTarget.request.requestId, { notes });
        addToast('Request approved', 'success');
      } else {
        await rejectRequest(actionTarget.request.requestId, { reason: notes });
        addToast('Request rejected', 'info');
      }
      setActionTarget(null);
      setNotes('');
      refetch();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome, {user.name}. Review pending requests and team activity below.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card amber">
          <div className="stat-label">Pending Review</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{pending.length}</div>
          <div className="stat-sub">requires your action</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{approved}</div>
          <div className="stat-sub">this period</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{rejected}</div>
          <div className="stat-sub">this period</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Team Size</div>
          <div className="stat-value" style={{ color: 'var(--purple)' }}>{teamData?.users?.length ?? '—'}</div>
          <div className="stat-sub">members</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Pending Requests</h3>
        <Link to="/manager/requests" className="btn btn-ghost btn-sm">View All →</Link>
      </div>

      {loading && <div className="loading-screen" style={{ height: '180px' }}><div className="spinner" /></div>}

      {!loading && pending.length === 0 && (
        <div className="card">
          <div className="empty-state" style={{ padding: '3rem' }}>
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <h3>All caught up!</h3>
            <p>No pending requests at the moment.</p>
          </div>
        </div>
      )}

      {!loading && pending.map(r => (
        <div key={r.requestId} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid rgba(108,138,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
            {(r.userName || r.employeeId).slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              {r.userName || r.employeeId}
              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.6rem' }}>{r.requestId}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--amber)' }}>{daysLabel(r.days)}</strong>
              {' · '}{formatDate(r.startDate)} → {formatDate(r.endDate)}
              {r.reason && <em style={{ marginLeft: '0.5rem' }}>"{r.reason}"</em>}
            </div>
          </div>
          <StatusBadge status={r.status} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-success btn-sm" onClick={() => { setActionTarget({ request: r, type: 'approve' }); setNotes(''); }}>✓ Approve</button>
            <button className="btn btn-danger btn-sm"  onClick={() => { setActionTarget({ request: r, type: 'reject' });  setNotes(''); }}>✕ Reject</button>
          </div>
        </div>
      ))}

      {actionTarget && (
        <Modal
          title={actionTarget.type === 'approve' ? 'Approve Request' : 'Reject Request'}
          onClose={() => setActionTarget(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setActionTarget(null)}>Cancel</button>
              <button className={`btn ${actionTarget.type === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={handleAction} disabled={acting}>
                {acting ? <span className="spinner" /> : actionTarget.type === 'approve' ? '✓ Confirm' : '✕ Confirm'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {actionTarget.type === 'approve' ? 'Approving' : 'Rejecting'}{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{daysLabel(actionTarget.request.days)}</strong>{' '}
            for <strong style={{ color: 'var(--text-primary)' }}>{actionTarget.request.userName || actionTarget.request.employeeId}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">{actionTarget.type === 'approve' ? 'Notes' : 'Reason'} (optional)</label>
            <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </Modal>
      )}
    </>
  );
}