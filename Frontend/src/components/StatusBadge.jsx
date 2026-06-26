const STATUS_MAP = {
  Draft:     'badge-draft',
  Pending:   'badge-pending',
  Approved:  'badge-approved',
  Rejected:  'badge-rejected',
  Selected:  'badge-selected',
  Published: 'badge-published',
  Archived:  'badge-archived',
};

const StatusBadge = ({ status }) => (
  <span className={STATUS_MAP[status] || 'badge bg-surface-100 text-surface-500'}>
    {status}
  </span>
);

export default StatusBadge;
