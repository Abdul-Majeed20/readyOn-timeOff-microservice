import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { getMyRequests, approveRequest, rejectRequest } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { formatDate, daysLabel, getErrorMessage } from '../../utils';

const MANAGED_EMPLOYEES = ['emp_001', 'emp_002', 'emp_003', 'emp_004'];
const ALL_STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

export default function AllRequestsPage() {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionTarget, setActionTarget] = useState(null);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);

  const { data, loading, refetch } = useFetch(async () => {
    const results = await Promise.all(
      MANAGED_EMPLOYEES.map(id => getMyRequests(id).then(d => d.requests))
    );
    return results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, []);

  const allRequests = data || [];

  const filtered = allRequests.filter(r => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch = !search || r.employeeId.includes(search) || r.requestId.includes(search);
    return matchStatus && matchSearch;
  });

  async function handleAction() {
    if (!actionTarget) return;
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
        <p>Complete history of all employee time-off requests.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          style={{ width: '220px' }}
          placeholder="Search by employee or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="btn btn-sm"
              style={{
                background: statusFilter === s ? 'var(--accent)' : 'var(--bg-3)',
                color: statusFilter === s ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${statusFilter === s ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              {s}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filtered.length} of {allRequests.length} requests
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading && (
          <div className="loading-screen" style={{ height: '200px' }}>
            <div className="spinner" /><span style={{ fontSize: '0.85rem' }}>Loading requests...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty-state"><p>No requests match your filters.</p></div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Employee</th>
                  <th>Location</th>
                  <th>Days</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Manager</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.requestId}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent)' }}>{r.requestId}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
                          {r.employeeId.slice(-3).toUpperCase()}
                        </div>
                        {r.employeeId}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.locationId}</td>
                    <td style={{ fontWeight: 600 }}>{daysLabel(r.days)}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formatDate(r.startDate)} →<br />{formatDate(r.endDate)}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(r.createdAt)}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.managerId || '—'}</td>
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

      {/* Action modal */}
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
            {actionTarget.type === 'approve' ? 'Approving' : 'Rejecting'} <strong style={{ color: 'var(--text-primary)' }}>{daysLabel(actionTarget.request.days)}</strong> for <strong style={{ color: 'var(--text-primary)' }}>{actionTarget.request.employeeId}</strong>
          </p>
          <div className="form-group">
            <label className="form-label">{actionTarget.type === 'approve' ? 'Notes' : 'Reason'}</label>
            <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </Modal>
      )}
    </>
  );
}
