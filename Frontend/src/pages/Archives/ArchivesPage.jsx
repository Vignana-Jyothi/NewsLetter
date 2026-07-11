import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Download, FileText, Eye, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { MONTHS } from '../../utils/constants';

const BACKEND = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

// ─── Single newsletter row ────────────────────────────────────────────────────
const NewsletterRow = ({ newsletter: initial, isAdmin }) => {
  const [nl,           setNl]           = useState(initial);
  const [regenerating, setRegenerating] = useState(false);
  const [error,        setError]        = useState('');

  // Keep in sync if parent reloads the list
  useEffect(() => { setNl(initial); }, [initial]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    setError('');
    try {
      const res = await api.post(`/newsletters/${nl.id}/regenerate-pdf`);
      const newFileUrl = res.data.data.fileUrl;
      // Update local state so the row immediately shows View/Download
      setNl(prev => ({
        ...prev,
        latest_file: { file_url: newFileUrl },
        pdf_available: true,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Regeneration failed. Please try again.');
    } finally {
      setRegenerating(false);
    }
  }, [nl.id]);

  const fileUrl = nl.latest_file?.file_url ?? null;
  const fullUrl = fileUrl ? `${BACKEND}${fileUrl}` : null;

  return (
    <>
      <tr className="table-row">
        <td className="table-cell font-medium text-surface-800">{nl.month} {nl.year}</td>
        <td className="table-cell text-surface-500 text-sm">{nl.department_name}</td>
        <td className="table-cell">
          <span className={`badge ${nl.status === 'Published' ? 'badge-published' : 'badge-archived'}`}>
            {nl.status}
          </span>
        </td>
        <td className="table-cell text-surface-400 text-sm">{nl.item_count ?? '—'}</td>
        <td className="table-cell text-right pr-5">
          {nl.pdf_available && fullUrl ? (
            /* PDF exists on disk — show View + Download */
            <div className="flex justify-end gap-2">
              <a
                href={fullUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-1.5 text-xs"
              >
                <Eye size={12} /> View
              </a>
              <a
                href={fullUrl}
                download
                className="btn-primary py-1.5 text-xs"
              >
                <Download size={12} /> Download
              </a>
            </div>
          ) : isAdmin ? (
            /* PDF missing, user is Admin — show Regenerate button */
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-secondary py-1.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-60"
              title="PDF file is missing locally. Click to regenerate."
            >
              <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
              {regenerating ? 'Generating…' : 'Regenerate PDF'}
            </button>
          ) : (
            /* PDF missing, non-admin — inform them */
            <span className="flex items-center gap-1 text-xs text-surface-400 justify-end">
              <AlertCircle size={13} className="text-amber-400" />
              PDF not available
            </span>
          )}
        </td>
      </tr>

      {/* Inline error row */}
      {error && (
        <tr>
          <td colSpan={5} className="px-5 pb-3 pt-0">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
              <AlertCircle size={13} />
              {error}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const ArchivesPage = () => {
  const { user }                    = useAuth();
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');
  const [month, setMonth]             = useState('');
  const [year,  setYear]              = useState('');

  const isAdmin = user?.role === 'Admin';

  const load = useCallback(() => {
    setLoading(true);
    setFetchError('');
    api.get('/newsletters/archives')
      .then(r => { setNewsletters(r.data.data || []); })
      .catch(() => setFetchError('Failed to load archives. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const years = useMemo(
    () => [...new Set(newsletters.map(n => n.year))].sort((a, b) => b - a),
    [newsletters]
  );

  const filtered = useMemo(() => {
    let list = newsletters;
    if (month) list = list.filter(n => n.month === month);
    if (year)  list = list.filter(n => String(n.year) === String(year));
    return list;
  }, [newsletters, month, year]);

  // Count how many PDFs are missing so admin can see at a glance
  const missingCount = useMemo(
    () => newsletters.filter(n => !n.pdf_available).length,
    [newsletters]
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Newsletter Archive</h1>
          <p className="page-subtitle">
            Browse and download all published department newsletters
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-surface-500 text-sm" title="Refresh list">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Admin notice when PDFs are missing */}
      {isAdmin && missingCount > 0 && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle size={17} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {missingCount} newsletter PDF{missingCount !== 1 ? 's are' : ' is'} missing on this machine
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              PDFs are excluded from git. Click <strong>Regenerate PDF</strong> on each row to recreate
              them locally. This re-reads the submission data already in the database — no data is lost.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-5 p-4">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="label">Month</label>
            <select className="select w-40" value={month} onChange={e => setMonth(e.target.value)}>
              <option value="">All months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="select w-28" value={year} onChange={e => setYear(e.target.value)}>
              <option value="">All years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {(month || year) && (
            <button
              onClick={() => { setMonth(''); setYear(''); }}
              className="btn-ghost text-surface-500 self-end"
            >
              <X size={14} /> Clear
            </button>
          )}
          <span className="text-sm text-surface-400 self-end ml-auto">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="mb-4 flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <AlertCircle size={16} /> {fetchError}
          <button onClick={load} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card space-y-2.5 p-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={40} className="text-surface-200 mx-auto mb-3" />
          <p className="text-surface-400 text-sm">
            {newsletters.length === 0 ? 'No newsletters published yet.' : 'No results match your filters.'}
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="table-header">Newsletter</th>
                <th className="table-header">Department</th>
                <th className="table-header">Status</th>
                <th className="table-header">Items</th>
                <th className="table-header text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(n => (
                <NewsletterRow key={n.id} newsletter={n} isAdmin={isAdmin} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend for non-admins when PDFs are missing */}
      {!isAdmin && newsletters.some(n => !n.pdf_available) && (
        <p className="mt-4 text-xs text-surface-400 text-center">
          Some newsletters are not yet available for download. Please check back later.
        </p>
      )}
    </div>
  );
};

export default ArchivesPage;
