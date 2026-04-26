import { format, parseISO } from 'date-fns';

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MMM d, yyyy'); }
  catch { return dateStr; }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MMM d, yyyy · h:mm a'); }
  catch { return dateStr; }
}

export function statusBadgeClass(status) {
  return {
    PENDING:   'badge badge-pending',
    APPROVED:  'badge badge-approved',
    REJECTED:  'badge badge-rejected',
    CANCELLED: 'badge badge-cancelled',
  }[status] || 'badge';
}

export function statusDot(status) {
  return { PENDING: '●', APPROVED: '●', REJECTED: '●', CANCELLED: '○' }[status] || '●';
}

export function daysLabel(n) {
  return n === 1 ? '1 day' : `${n} days`;
}

export function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'An unexpected error occurred';
}
