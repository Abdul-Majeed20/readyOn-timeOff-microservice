import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useFetch } from '../../hooks/useFetch';
import { apiGetTeam, apiUpdateRole } from '../../api';
import { formatDate, getErrorMessage } from '../../utils';
import Modal from '../../components/ui/Modal';

const ROLE_COLORS = {
  admin:    { bg: 'var(--purple-dim)', color: 'var(--purple)',  border: 'rgba(192,132,252,0.25)' },
  manager:  { bg: 'var(--accent-dim)', color: 'var(--accent)',  border: 'rgba(108,138,255,0.25)' },
  employee: { bg: 'var(--bg-4)',       color: 'var(--text-muted)', border: 'var(--border)' },
};

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.employee;
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize', letterSpacing: '0.03em' }}>
      {role}
    </span>
  );
}

export default function TeamPage() {
  const { user: currentUser, company } = useAuth();
  const { addToast } = useToast();
  const [roleTarget, setRoleTarget] = useState(null); // { user, newRole }
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState('');

  const { data, loading, refetch } = useFetch(apiGetTeam, []);
  const team = (data?.users || []).filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = currentUser?.role === 'admin';

  async function handleRoleChange() {
    if (!roleTarget) return;
    setUpdating(true);
    try {
      await apiUpdateRole(roleTarget.user._id, roleTarget.newRole);
      addToast(`${roleTarget.user.name} is now a ${roleTarget.newRole}`, 'success');
      setRoleTarget(null);
      refetch();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setUpdating(false);
    }
  }

  const managers  = (data?.users || []).filter(u => u.role === 'manager').length;
  const employees = (data?.users || []).filter(u => u.role === 'employee').length;

  return (
    <>
      <div className="page-header">
        <h2>Team Management</h2>
        <p>Manage roles for everyone in <strong style={{ color: 'var(--text-primary)' }}>{company?.name}</strong>.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Members</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{data?.users?.length ?? '—'}</div>
          <div className="stat-sub">in your company</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Managers</div>
          <div className="stat-value" style={{ color: 'var(--purple)' }}>{managers}</div>
          <div className="stat-sub">can approve requests</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Employees</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{employees}</div>
          <div className="stat-sub">active members</div>
        </div>
      </div>

      {/* Join code card — admin only */}
      {isAdmin && company?.joinCode && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
              Company Join Code
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.12em' }}>
              {company.joinCode}
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '260px', lineHeight: 1.6 }}>
            Share this code with new employees so they can join your workspace at the <strong style={{ color: 'var(--text-secondary)' }}>Register</strong> page.
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(company.joinCode); addToast('Join code copied!', 'success'); }}>
            Copy Code
          </button>
        </div>
      )}

      {/* Team table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 600 }}>All Members</h3>
          <input className="form-input" style={{ width: '220px', marginLeft: 'auto' }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading && (
          <div className="loading-screen" style={{ height: '200px' }}>
            <div className="spinner" /><span style={{ fontSize: '0.85rem' }}>Loading team...</span>
          </div>
        )}

        {!loading && team.length === 0 && (
          <div className="empty-state"><p>No members found.</p></div>
        )}

        {!loading && team.length > 0 && (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Employee ID</th>
                  <th>Location</th>
                  <th>Role</th>
                  <th>Joined</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {team.map(u => {
                  const isMe = u._id === currentUser._id;
                  return (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: ROLE_COLORS[u.role]?.bg, border: `1px solid ${ROLE_COLORS[u.role]?.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: ROLE_COLORS[u.role]?.color, flexShrink: 0 }}>
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{u.name}</span>
                          {isMe && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-4)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>you</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent)' }}>{u.employeeId}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.locationId}</td>
                      <td><RoleBadge role={u.role} /></td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(u.createdAt)}</td>
                      {isAdmin && (
                        <td>
                          {!isMe && u.role !== 'admin' && (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              {u.role === 'employee' && (
                                <button className="btn btn-sm" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(108,138,255,0.25)' }} onClick={() => setRoleTarget({ user: u, newRole: 'manager' })}>
                                  Promote
                                </button>
                              )}
                              {u.role === 'manager' && (
                                <button className="btn btn-ghost btn-sm" onClick={() => setRoleTarget({ user: u, newRole: 'employee' })}>
                                  Demote
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role change confirmation modal */}
      {roleTarget && (
        <Modal
          title={roleTarget.newRole === 'manager' ? 'Promote to Manager' : 'Remove Manager Role'}
          onClose={() => setRoleTarget(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setRoleTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRoleChange} disabled={updating}>
                {updating ? <span className="spinner" /> : 'Confirm'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {roleTarget.newRole === 'manager'
              ? <>Promote <strong style={{ color: 'var(--text-primary)' }}>{roleTarget.user.name}</strong> to Manager? They will be able to approve and reject time-off requests.</>
              : <>Remove manager role from <strong style={{ color: 'var(--text-primary)' }}>{roleTarget.user.name}</strong>? They will become a regular employee.</>
            }
          </p>
        </Modal>
      )}
    </>
  );
}