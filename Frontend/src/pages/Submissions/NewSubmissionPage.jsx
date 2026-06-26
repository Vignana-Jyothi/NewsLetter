import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { SUBMISSION_TYPES } from '../../utils/constants';
import { Upload, X, Send, Save, ArrowLeft } from 'lucide-react';

const NewSubmissionPage = () => {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ type: '', title: '', description: '', metadata: {} });
  const [files, setFiles]   = useState([]);
  const [loading, setLoading] = useState(null);
  const [error, setError]   = useState('');

  const selectedType = SUBMISSION_TYPES[form.type];

  const handleMeta = (key, value) =>
    setForm(p => ({ ...p, metadata: { ...p.metadata, [key]: value } }));

  const handleFileAdd = (e) => {
    const added = Array.from(e.target.files);
    setFiles(p => [...p, ...added].slice(0, 5));
    e.target.value = '';
  };

  const handleSubmit = async (action) => {
    if (!form.type || !form.title.trim()) { setError('Type and Title are required.'); return; }
    setError(''); setLoading(action);
    try {
      const fd = new FormData();
      fd.append('type', form.type);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('metadata', JSON.stringify(form.metadata));
      files.forEach(f => fd.append('files', f));
      const res = await api.post('/submissions', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (action === 'submit') await api.patch(`/submissions/${res.data.data.id}/submit`);
      navigate('/submissions');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(null); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <button onClick={() => navigate('/submissions')} className="btn-ghost mb-3 -ml-2 text-surface-500">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">New Submission</h1>
        <p className="page-subtitle">Share your achievement with the department</p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      <div className="card space-y-6">
        {/* Type */}
        <div>
          <label className="label">Submission Type <span className="text-red-500">*</span></label>
          <select className="select" value={form.type}
            onChange={e => setForm(p => ({ ...p, type: e.target.value, metadata: {} }))}>
            <option value="">Select a type…</option>
            {Object.entries(SUBMISSION_TYPES).map(([k, { label }]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="label">Title <span className="text-red-500">*</span></label>
          <input className="input" placeholder="Give your achievement a clear title"
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={4}
            placeholder="Describe your achievement in detail…"
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>

        {/* Dynamic fields */}
        {selectedType?.fields?.length > 0 && (
          <div className="p-4 rounded-xl bg-primary-50 border border-primary-200 space-y-4">
            <p className="text-sm font-semibold text-primary-700">{selectedType.label} Details</p>
            {selectedType.fields.map(({ key, label, required }) => (
              <div key={key}>
                <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input className="input" placeholder={label}
                  value={form.metadata[key] || ''}
                  onChange={e => handleMeta(key, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        {/* File Upload */}
        <div>
          <label className="label">Supporting Documents / Images <span className="text-surface-400">(max 5)</span></label>
          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-surface-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all">
            <Upload size={22} className="text-surface-400 mb-1.5" />
            <span className="text-sm text-surface-400">Click to upload files</span>
            <span className="text-xs text-surface-300 mt-0.5">JPG, PNG, PDF, DOC up to 10MB</span>
            <input type="file" className="hidden" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" onChange={handleFileAdd} />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 border border-surface-200 text-sm">
                  <span className="text-surface-700 truncate mr-2">{f.name}</span>
                  <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-surface-400 hover:text-red-500 flex-shrink-0">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-surface-100">
          <button onClick={() => handleSubmit('draft')} disabled={!!loading} className="btn-secondary flex-1">
            <Save size={16} /> {loading === 'draft' ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={() => handleSubmit('submit')} disabled={!!loading} className="btn-primary flex-1">
            <Send size={16} /> {loading === 'submit' ? 'Submitting…' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewSubmissionPage;
