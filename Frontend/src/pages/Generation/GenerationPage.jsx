import { useState, useEffect } from 'react';
import api from '../../services/api';
import { MONTHS, SUBMISSION_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import { Plus, Eye, Check, X as XIcon, FileText } from 'lucide-react';

const PreviewModal = ({ submission, onClose, onSelect, isSelected }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
      <div className="flex items-start justify-between p-6 border-b border-surface-100">
        <div>
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1">
            {SUBMISSION_TYPES[submission.type]?.section || 'General'}
          </p>
          <h2 className="text-lg font-bold text-surface-900">{submission.title}</h2>
        </div>
        <button onClick={onClose} className="text-surface-400 hover:text-surface-600 p-1"><XIcon size={20} /></button>
      </div>
      <div className="p-6 space-y-3">
        {submission.description && <p className="text-sm text-surface-700">{submission.description}</p>}
        {submission.metadata && Object.keys(submission.metadata).length > 0 && (
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-50 border border-surface-100">
            {Object.entries(submission.metadata).map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="text-surface-400 capitalize">{k.replace(/_/g,' ')}: </span>
                <span className="text-surface-700 font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}
        {submission.files?.length > 0 && (
          <div className="flex gap-2">
            {submission.files.map(f => (
              <a key={f.id} href={`http://localhost:5000${f.file_url}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-100">
                <FileText size={12} /> View File
              </a>
            ))}
          </div>
        )}
        <p className="text-xs text-surface-400">By {submission.submitted_by} · {formatDate(submission.created_at)}</p>
      </div>
      <div className="p-6 pt-0">
        <button onClick={() => { onSelect(); onClose(); }} disabled={isSelected} className="btn-primary w-full">
          <Check size={16} /> {isSelected ? 'Already Selected' : 'Add to Newsletter'}
        </button>
      </div>
    </div>
  </div>
);

const GenerationPage = () => {
  const [newsletters, setNewsletters]       = useState([]);
  const [approved, setApproved]             = useState([]);
  const [selected, setSelected]             = useState(null);
  const [items, setItems]                   = useState([]);
  const [creating, setCreating]             = useState(false);
  const [month, setMonth]                   = useState('');
  const [year, setYear]                     = useState(new Date().getFullYear());
  const [loading, setLoading]               = useState(true);
  const [preview, setPreview]               = useState(null);
  const [error, setError]                   = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [nlRes, apRes] = await Promise.all([
      api.get('/newsletters'),
      api.get('/submissions/admin/approved'),
    ]);
    setNewsletters(nlRes.data.data || []);
    setApproved(apRes.data.data || []);
    setLoading(false);
  };

  const fetchItems = async (id) => {
    const r = await api.get(`/newsletters/${id}/items`);
    setItems(r.data.data || []);
  };

  const handleCreate = async () => {
    if (!month || !year) return;
    setError('');
    try {
      const r = await api.post('/newsletters', { month, year });
      const nl = r.data.data;
      setNewsletters(p => [nl, ...p]);
      setSelected(nl); fetchItems(nl.id); setCreating(false);
    } catch (err) { setError(err.response?.data?.error || 'Failed to create'); }
  };

  const handleSelect = async (sub) => {
    const section = SUBMISSION_TYPES[sub.type]?.section || 'General';
    await api.post(`/newsletters/${selected.id}/items`, { submissionId: sub.id, section, position: items.length + 1 });
    fetchItems(selected.id); fetchAll();
  };

  const handleDeselect = async (sub) => {
    await api.delete(`/newsletters/${selected.id}/items`, { data: { submissionId: sub.id } });
    fetchItems(selected.id); fetchAll();
  };

  const selectedIds = new Set(items.map(i => i.submission_id));

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Newsletter Generation</h1>
          <p className="page-subtitle">Curate approved submissions into a newsletter</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> New Newsletter</button>
      </div>

      {creating && (
        <div className="card mb-6">
          <h2 className="font-semibold text-surface-800 mb-4">Create New Newsletter</h2>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="flex gap-3 flex-wrap">
            <select className="select flex-1 min-w-40" value={month} onChange={e => setMonth(e.target.value)}>
              <option value="">Select Month</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" className="input w-28" placeholder="Year" value={year}
              onChange={e => setYear(e.target.value)} />
            <button onClick={handleCreate} className="btn-primary">Create</button>
            <button onClick={() => setCreating(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Newsletters list */}
        <div>
          <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Your Newsletters</h2>
          {newsletters.filter(n => n.status === 'Draft').length === 0
            ? <p className="text-sm text-surface-400">No draft newsletters. Create one above.</p>
            : newsletters.filter(n => n.status === 'Draft').map(n => (
              <button key={n.id}
                onClick={() => { setSelected(n); fetchItems(n.id); }}
                className={`w-full text-left card-sm mb-2 transition-all hover:shadow-card-md
                  ${selected?.id === n.id ? 'border-primary-300 bg-primary-50 shadow-card' : ''}`}>
                <p className="font-semibold text-surface-800 text-sm">{n.month} {n.year}</p>
                <p className="text-xs text-surface-400 mt-0.5">{n.item_count || 0} items · Draft</p>
              </button>
            ))
          }
        </div>

        {/* Approved submissions */}
        <div>
          <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Approved Submissions</h2>
          {loading ? <div className="text-surface-400 text-sm animate-pulse">Loading…</div>
            : approved.length === 0 ? <p className="text-sm text-surface-400">No approved submissions yet.</p>
            : <div className="space-y-2">
              {approved.map(s => (
                <div key={s.id} className={`card-sm flex items-center gap-3 ${selectedIds.has(s.id) ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{s.title}</p>
                    <p className="text-xs text-surface-400">{s.type}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setPreview(s)}
                      className="p-1.5 rounded-lg border border-surface-200 hover:border-primary-300 text-surface-400 hover:text-primary-600 transition-all">
                      <Eye size={14} />
                    </button>
                    {selectedIds.has(s.id)
                      ? <button onClick={() => handleDeselect(s)} disabled={!selected}
                          className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100">
                          <XIcon size={14} />
                        </button>
                      : <button onClick={() => selected && handleSelect(s)} disabled={!selected}
                          className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 disabled:opacity-30">
                          <Check size={14} />
                        </button>
                    }
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Selected items */}
        <div>
          <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
            Contents {selected ? `(${items.length})` : ''}
          </h2>
          {!selected ? <p className="text-sm text-surface-400">Select a newsletter first</p>
            : items.length === 0 ? <p className="text-sm text-surface-400">No items yet. Add from approved submissions.</p>
            : <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="card-sm flex items-center gap-3">
                  <span className="text-surface-300 text-xs w-5 text-right font-mono flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{item.title}</p>
                    <p className="text-xs text-surface-400">{item.section}</p>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {preview && (
        <PreviewModal submission={preview} onClose={() => setPreview(null)}
          onSelect={() => selected && handleSelect(preview)}
          isSelected={selectedIds.has(preview.id)} />
      )}
    </div>
  );
};

export default GenerationPage;
