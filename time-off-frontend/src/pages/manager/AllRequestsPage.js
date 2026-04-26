import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { apiGetTeam, getMyRequests, approveRequest, rejectRequest } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { formatDate, daysLabel, getErrorMessage } from '../../utils';

const ALL_STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

export default function AllRequestsPage() {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionTarget, setActionTarget] = useState(null);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);

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
  const filtered = requests.filter(r => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const term = search.toLowerCase();
    const matchSearch = !search || (r.userName || '').toLowerCase().includes(term) || r.requestId.toLowerCase().includes(term) || r.employeeId.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const loading = teamLoading || reqLoading;

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
        <h2>All Requests</h2>
        <p>Complete history of all employee time-off requests across your company.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" style={{ width: '220px' }} placeholder="Search name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {ALL_STATUSES.map(s => (
            <button key={s} className="btn btn-sm" onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? 'var(--accent)' : 'var(--bg-3)', color: statusFilter === s ? '#fff' : 'var(--text-muted)', border: `1px solid ${statusFilter === s ? 'var(--accent)' : 'var(--border)'}` }}>
              {s}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filtered.length} of {requests.length}
        </span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading && <div className="loading-screen" style={{ height: '200px' }}><div className="spinner" /></div>}
        {!loading && filtered.length === 0 && <div className="empty-state"><p>No requests match your filters.</p></div>}
        {!loading && filtered.length > 0 && (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Request ID</th>
                  <th>Days</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.requestId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid rgba(108,138,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                          {(r.userName || r.employeeId).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.userName || r.employeeId}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.locationId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent)' }}>{r.requestId}</td>
                    <td style={{ fontWeight: 600 }}>{daysLabel(r.days)}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(r.startDate)} →<br />{formatDate(r.endDate)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</td>
                    <td>
                      {r.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-success btn-sm" onClick={() => { setActionTarget({ request: r, type: 'approve' }); setNotes(''); }}>✓</button>
                          <button className="btn btn-danger btn-sm"  onClick={() => { setActionTarget({ request: r, type: 'reject'  }); setNotes(''); }}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {actionTarget && (
        <Modal
          title={actionTarget.type === 'approve' ? 'Approve Request' : 'Reject Request'}
          onClose={() => setActionTarget(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setActionTarget(null)}>Cancel</button>
              <button className={`btn ${actionTarget.type === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={handleAction} disabled={acting}>
                {acting ? <span className="spinner" /> : 'Confirm'}
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
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </Modal>
      )}
    </>
  );
}