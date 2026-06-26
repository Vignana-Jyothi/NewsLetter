import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { SUBMISSION_TYPES } from '../../utils/constants';
import { Upload, X, Send, Save, MessageSquare, ArrowLeft, FileText } from 'lucide-react';

const EditSubmissionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [form, setForm]   = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/submissions/${id}`)
      .then(r => {
        const s = r.data.data;
        if (!['Draft', 'Rejected'].includes(s.status)) { navigate('/submissions'); return; }
        setSubmission(s);
        setForm({ type: s.type, title: s.title, description: s.description || '', metadata: s.metadata || {} });
      })
      .catch(() => navigate('/submissions'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading || !form) return (
    <div className="max-w-2xl mx-auto">
      <div className="h-8 bg-surface-100 rounded-xl animate-pulse w-48 mb-4" />
      <div className="card h-96 animate-pulse bg-surface-50" />
    </div>
  );

  const isRejected = submission.status === 'Rejected';
  const selectedType = SUBMISSION_TYPES[form.type];

  const handleSave = async (action) => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setError(''); setSaving(action);
    try {
      if (isRejected) await api.patch(`/submissions/${id}/reopen`);
      await api.put(`/submissions/${id}`, { title: form.title, description: form.description, metadata: form.metadata });
      if (action === 'submit') await api.patch(`/submissions/${id}/submit`);
      navigate('/submissions');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally { setSaving(null); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <button onClick={() => navigate('/submissions')} className="btn-ghost mb-3 -ml-2 text-surface-500">
          <ArrowLeft size={16} /> Back to My Submissions
        </button>
        <h1 className="page-title">{isRejected ? 'Edit & Resubmit' : 'Edit Submission'}</h1>
        <p className="page-subtitle">
          {isRejected ? 'Address the admin remarks below and resubmit when ready.' : 'Update your draft before submitting.'}
        </p>
      </div>

      {/* Admin Remarks banner */}
      {submission.admin_remarks && (
        <div className="remarks-banner mb-5">
          <MessageSquare size={17} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700 mb-1 uppercase tracking-wide">Admin Remarks</p>
            <p className="text-sm text-amber-800 leading-relaxed">{submission.admin_remarks}</p>
          </div>
        </div>
      )}

      {error && <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

      <div className="card space-y-6">
        {/* Type (read-only) */}
        <div>
          <label className="label">Submission Type</label>
          <div className="input bg-surface-50 text-surface-500 cursor-not-allowed">
            {SUBMISSION_TYPES[form.type]?.label || form.type}
          </div>
        </div>

        <div>
          <label className="label">Title <span className="text-red-500">*</span></label>
          <input className="input" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={4} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>

        {selectedType?.fields?.length > 0 && (
          <div className="p-4 rounded-xl bg-primary-50 border border-primary-200 space-y-4">
            <p className="text-sm font-semibold text-primary-700">{selectedType.label} Details</p>
            {selectedType.fields.map(({ key, label, required }) => (
              <div key={key}>
                <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input" placeholder={label} value={form.metadata[key] || ''}
                  onChange={e => setForm(p => ({ ...p, metadata: { ...p.metadata, [key]: e.target.value } }))} />
              </div>
            ))}
          </div>
        )}

        {/* Existing files */}
        {submission.files?.length > 0 && (
          <div>
            <label className="label">Existing Attachments</label>
            <div className="flex flex-wrap gap-2">
              {submission.files.map(f => (
                <a key={f.id} href={`http://localhost:5000${f.file_url}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors">
                  <FileText size={12} /> View File
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Additional file upload */}
        <div>
          <label className="label">Add More Documents <span className="text-surface-400">(max 5 total)</span></label>
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-surface-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all">
            <Upload size={20} className="text-surface-400 mb-1" />
            <span className="text-sm text-surface-400">Click to upload additional files</span>
            <input type="file" className="hidden" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              onChange={e => { setFiles(p => [...p, ...Array.from(e.target.files)].slice(0,5)); e.target.value=''; }} />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 border border-surface-200 text-sm">
                  <span className="text-surface-700 truncate">{f.name}</span>
                  <button onClick={() => setFiles(p => p.filter((_,j) => j !== i))} className="text-surface-400 hover:text-red-500 ml-2">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2 border-t border-surface-100">
          <button onClick={() => handleSave('draft')} disabled={!!saving} className="btn-secondary flex-1">
            <Save size={16} /> {saving === 'draft' ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={() => handleSave('submit')} disabled={!!saving} className="btn-primary flex-1">
            <Send size={16} /> {saving === 'submit' ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSubmissionPage;
