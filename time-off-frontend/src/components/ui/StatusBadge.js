import { statusBadgeClass } from '../../utils';

export default function StatusBadge({ status }) {
  const dots = { PENDING: '◐', APPROVED: '●', REJECTED: '✕', CANCELLED: '○' };
  return (
    <span className={statusBadgeClass(status)}>
      {dots[status] || '●'} {status}
    </span>
  );
}
