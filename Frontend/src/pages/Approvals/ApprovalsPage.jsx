import { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { CheckCircle, XCircle, Eye, FileText, X, MessageSquare, User, Calendar } from 'lucide-react';

const ReviewModal = ({ submission, onClose, onAction }) => {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(null);

  const handle = async (action) => {
    setLoading(action);
    try { await onAction(submission.id, action, remarks); onClose(); }
    finally { setLoading(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-surface-100">
          <div>
            <h2 className="text-lg font-bold text-surface-900">{submission.title}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded-full">{submission.type}</span>
              <StatusBadge status={submission.status} />
            </div>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Submitter */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-100">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
              {submission.submitted_by?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-800">{submission.submitted_by}
                <span className="ml-1.5 text-xs font-normal text-surface-500">({submission.submitter_role})</span>
              </p>
              <p className="text-xs text-surface-400">{formatDate(submission.created_at)}</p>
            </div>
          </div>

          {submission.description && (
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-surface-700">{submission.description}</p>
            </div>
          )}

          {submission.metadata && Object.keys(submission.metadata).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Details</p>
              <div className="p-3 rounded-xl bg-surface-50 border border-surface-100 grid grid-cols-2 gap-2">
                {Object.entries(submission.metadata).map(([k, v]) => (
                  <div key={k} className="text-sm">
                    <span className="text-surface-400 capitalize">{k.replace(/_/g,' ')}: </span>
                    <span className="text-surface-700 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submission.files?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {submission.files.map(f => (
                  <a key={f.id} href={`http://localhost:5000${f.file_url}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-100">
                    <FileText size={12} /> View File
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="label flex items-center gap-1.5">
              <MessageSquare size={14} />
              Remarks <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Add feedback for the submitter…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
            <p className="text-xs text-surface-400 mt-1">Remarks are saved in the history and shown to the submitter.</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={() => handle('reject')} disabled={!!loading} className="btn-danger flex-1">
            <XCircle size={16} /> {loading === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
          <button onClick={() => handle('approve')} disabled={!!loading} className="btn-success flex-1">
            <CheckCircle size={16} /> {loading === 'approve' ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ApprovalsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);

  const fetchPending = async () => {
    try {
      const r = await api.get('/submissions/admin/pending');
      setSubmissions(r.data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (id, action, remarks) => {
    await api.patch(`/approvals/${id}/${action}`, { remarks });
    await fetchPending();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pending Approvals</h1>
        <p className="page-subtitle">{submissions.length} submission{submissions.length !== 1 ? 's' : ''} waiting for review</p>
      </div>

      {loading ? (
        <div className="card space-y-3 p-4">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}
        </div>
      ) : submissions.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-surface-500 font-medium">All caught up!</p>
          <p className="text-surface-400 text-sm mt-1">No pending submissions to review.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="table-header">Submission</th>
                <th className="table-header">Submitted By</th>
                <th className="table-header">Category</th>
                <th className="table-header">Date</th>
                <th className="table-header text-right pr-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="table-row">
                  <td className="table-cell">
                    <span className="font-medium text-surface-800">{s.title}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                        {s.submitted_by?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-surface-700">{s.submitted_by}</p>
                        <p className="text-xs text-surface-400">{s.submitter_role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs bg-surface-100 text-surface-600 px-2 py-1 rounded-full">{s.type}</span>
                  </td>
                  <td className="table-cell text-surface-500">{formatDate(s.created_at)}</td>
                  <td className="table-cell text-right pr-5">
                    <button onClick={() => setSelected(s)} className="btn-secondary py-1.5 text-xs">
                      <Eye size={14} /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ReviewModal
          submission={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
};

export default ApprovalsPage;
