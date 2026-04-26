import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { getMyRequests, cancelRequest } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { formatDate, daysLabel, getErrorMessage } from '../../utils';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { data, loading, error, refetch } = useFetch(
    () => getMyRequests(user.employeeId),
    [user.employeeId]
  );

  const requests = data?.requests || [];
  const pending  = requests.filter(r => r.status === 'PENDING').length;
  const approved = requests.filter(r => r.status === 'APPROVED').length;
  const totalDaysUsed = requests
    .filter(r => ['PENDING','APPROVED'].includes(r.status))
    .reduce((sum, r) => sum + r.days, 0);

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelRequest(cancelTarget.requestId);
      addToast('Request cancelled successfully', 'success');
      setCancelTarget(null);
      refetch();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <h2>My Dashboard</h2>
        <p>Welcome back, {user.name}. Here's your leave overview.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">Total Requests</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{requests.length}</div>
          <div className="stat-sub">all time</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>{pending}</div>
          <div className="stat-sub">awaiting approval</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{approved}</div>
          <div className="stat-sub">confirmed leaves</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Days Scheduled</div>
          <div className="stat-value" style={{ color: 'var(--purple)' }}>{totalDaysUsed}</div>
          <div className="stat-sub">pending + approved</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Link to="/employee/request" className="btn btn-primary">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Request
        </Link>
        <Link to="/employee/balance" className="btn btn-ghost">
          View Balance →
        </Link>
      </div>

      {/* Requests table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--text-primary)' }}>My Requests</h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{requests.length} total</span>
        </div>

        {loading && (
          <div className="loading-screen" style={{ height: '200px' }}>
            <div className="spinner" />
            <span style={{ fontSize: '0.85rem' }}>Loading requests...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)', fontSize: '0.875rem' }}>
            Failed to load: {error}
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <h3>No requests yet</h3>
            <p>Submit your first time-off request to get started.</p>
            <Link to="/employee/request" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>New Request</Link>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Location</th>
                  <th>Days</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.requestId}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent)' }}>{r.requestId}</td>
                    <td>{r.locationId}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{daysLabel(r.days)}</td>
                    <td>{formatDate(r.startDate)}</td>
                    <td>{formatDate(r.endDate)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      {['PENDING', 'APPROVED'].includes(r.status) && (
                        <button className="btn btn-danger btn-sm" onClick={() => setCancelTarget(r)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <Modal
          title="Cancel Request"
          onClose={() => setCancelTarget(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setCancelTarget(null)}>Keep it</button>
              <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? <span className="spinner" /> : 'Yes, Cancel'}
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Are you sure you want to cancel your request for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{daysLabel(cancelTarget.days)}</strong>{' '}
            starting <strong style={{ color: 'var(--text-primary)' }}>{formatDate(cancelTarget.startDate)}</strong>?
          </p>
          <div style={{ background: 'var(--amber-dim)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--amber)' }}>
            ⚠ Your balance will be restored after cancellation.
          </div>
        </Modal>
      )}
    </>
  );
}
