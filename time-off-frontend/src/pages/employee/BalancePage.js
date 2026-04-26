import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { getBalance, syncBalance, getSyncLogs } from '../../api';
import { formatDateTime, getErrorMessage } from '../../utils';

const LOCATIONS = [
  { id: 'loc_NY', label: 'New York Office' },
  { id: 'loc_LA', label: 'Los Angeles Office' },
];

export default function BalancePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [locationId, setLocationId] = useState(user.locationId || 'loc_NY');
  const [syncing, setSyncing] = useState(false);

  const { data: balance, loading: balLoading, error: balError, refetch: refetchBalance } = useFetch(
    () => getBalance(user.employeeId, locationId),
    [user.employeeId, locationId]
  );

  const { data: logsData, loading: logsLoading, refetch: refetchLogs } = useFetch(
    () => getSyncLogs(user.employeeId, locationId),
    [user.employeeId, locationId]
  );

  const logs = logsData?.logs || [];

  async function handleSync() {
    setSyncing(true);
    try {
      await syncBalance(user.employeeId, locationId);
      addToast('Balance synced from HCM', 'success');
      refetchBalance();
      refetchLogs();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setSyncing(false);
    }
  }

  // Percentage bar calculation
  const available = balance?.availableDays ?? 0;
  const pending   = balance?.pendingDays ?? 0;
  const effective = balance?.effectiveDays ?? 0;
  const total     = available > 0 ? available : 1;
  const pendingPct  = Math.min((pending / total) * 100, 100);
  const effectivePct = Math.min((effective / total) * 100, 100);

  return (
    <>
      <div className="page-header">
        <h2>My Balance</h2>
        <p>Live leave balance synced directly from the HCM system.</p>
      </div>

      {/* Location selector + sync button */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="form-input" style={{ width: 'auto' }} value={locationId} onChange={e => setLocationId(e.target.value)}>
          {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={handleSync} disabled={syncing}>
          {syncing
            ? <><span className="spinner" /> Syncing...</>
            : <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                Sync Now
              </>}
        </button>
      </div>

      {/* Balance card */}
      <div className="card" style={{ marginBottom: '1.5rem', maxWidth: '580px' }}>
        {balLoading && (
          <div className="loading-screen" style={{ height: '160px' }}>
            <div className="spinner" />
          </div>
        )}
        {balError && (
          <div style={{ color: 'var(--red)', fontSize: '0.875rem', padding: '1rem' }}>
            Failed to load balance: {balError}
          </div>
        )}
        {!balLoading && balance && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 600, color: 'var(--green)', lineHeight: 1 }}>{effective}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 600, color: 'var(--amber)', lineHeight: 1 }}>{pending}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 600, color: 'var(--accent)', lineHeight: 1 }}>{available}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
              </div>
            </div>

            {/* Visual bar */}
            <div style={{ height: '8px', background: 'var(--bg-4)', borderRadius: '99px', overflow: 'hidden', marginBottom: '0.5rem' }}>
              <div style={{ height: '100%', borderRadius: '99px', background: `linear-gradient(90deg, var(--green) ${effectivePct}%, var(--amber) ${effectivePct}% ${effectivePct + pendingPct}%, var(--bg-4) ${effectivePct + pendingPct}%)`, transition: 'all 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span><span style={{ color: 'var(--green)' }}>●</span> Available</span>
              <span><span style={{ color: 'var(--amber)' }}>●</span> Pending approval</span>
            </div>

            <div className="divider" />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Last synced: <span style={{ color: 'var(--text-secondary)' }}>{formatDateTime(balance.lastSyncedAt)}</span>
            </div>
          </>
        )}
      </div>

      {/* Sync history */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Sync History</h3>
        </div>

        {logsLoading && (
          <div className="loading-screen" style={{ height: '120px' }}>
            <div className="spinner" />
          </div>
        )}

        {!logsLoading && logs.length === 0 && (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <p>No sync history yet. Sync your balance to see logs here.</p>
          </div>
        )}

        {!logsLoading && logs.length > 0 && (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Triggered By</th>
                  <th>Previous</th>
                  <th>New Balance</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontSize: '0.78rem' }}>
                      <span style={{ background: 'var(--bg-4)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--accent)' }}>
                        {log.syncType}
                      </span>
                    </td>
                    <td>{log.triggeredBy}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{log.previousBalance ?? '—'}</td>
                    <td style={{ color: log.newBalance > log.previousBalance ? 'var(--green)' : 'var(--text-primary)', fontWeight: 600 }}>
                      {log.newBalance ?? '—'}
                      {log.newBalance > log.previousBalance && <span style={{ fontSize: '0.7rem', marginLeft: '0.3rem', color: 'var(--green)' }}>▲</span>}
                    </td>
                    <td>
                      <span style={{ color: log.success ? 'var(--green)' : 'var(--red)', fontSize: '0.8rem' }}>
                        {log.success ? '✓ OK' : '✕ Failed'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}