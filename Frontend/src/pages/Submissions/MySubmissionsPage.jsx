import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { Plus, Search, MessageSquare, FileText, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';

const STATUSES = ['All', 'Draft', 'Pending', 'Approved', 'Rejected', 'Selected', 'Published', 'Archived'];

const MySubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState(null);
  const [search,   setSearch]         = useState('');
  const [filter,   setFilter]         = useState('All');
  const [sort,     setSort]           = useState('date_desc'); // date_desc | date_asc | status

  useEffect(() => {
    api.get('/submissions/mine')
      .then(r => { setSubmissions(r.data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = submissions;
    if (filter !== 'All') list = list.filter(s => s.status === filter);
    if (search.trim())    list = list.filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === 'date_desc') list = [...list].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    if (sort === 'date_asc')  list = [...list].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    if (sort === 'status')    list = [...list].sort((a,b) => a.status.localeCompare(b.status));
    return list;
  }, [submissions, filter, search, sort]);

  const toggle = (id) => setExpanded(e => e === id ? null : id);

  return (
    <div>
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">My Submissions</h1>
          <p className="page-subtitle">{submissions.length} total submissions</p>
        </div>
        <Link to="/submissions/new" className="btn-primary">
          <Plus size={16} /> New Submission
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-5 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-9 py-2"
              placeholder="Search by title or type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 flex-wrap">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
                  ${filter === s
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-surface-600 border-surface-200 hover:border-primary-300 hover:text-primary-600'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal size={14} className="text-surface-400" />
            <select className="select py-2 text-xs w-40" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="status">By status</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={36} className="text-surface-300 mx-auto mb-3" />
          <p className="text-surface-500 mb-4">
            {submissions.length === 0 ? 'No submissions yet' : 'No results match your filters'}
          </p>
          {submissions.length === 0 && (
            <Link to="/submissions/new" className="btn-primary">
              <Plus size={16} /> Create First Submission
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="card p-0 overflow-hidden hover:shadow-card-md transition-shadow">
              {/* Summary row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => toggle(s.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="font-semibold text-surface-800 text-sm truncate">{s.title}</h3>
                    <StatusBadge status={s.status} />
                    {s.admin_remarks && (
                      <span title="Has admin remarks">
                        <MessageSquare size={14} className="text-amber-500 flex-shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-surface-400">
                    <span className="px-2 py-0.5 bg-surface-100 rounded-full">{s.type}</span>
                    <span>Submitted {formatDate(s.created_at)}</span>
                    {s.updated_at !== s.created_at && (
                      <span>Updated {formatDate(s.updated_at)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.status === 'Draft' && (
                    <Link to={`/submissions/edit/${s.id}`} onClick={e => e.stopPropagation()} className="btn-secondary py-1.5 text-xs">
                      Edit
                    </Link>
                  )}
                  {s.status === 'Rejected' && (
                    <Link to={`/submissions/edit/${s.id}`} onClick={e => e.stopPropagation()} className="btn-secondary py-1.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
                      Edit &amp; Resubmit
                    </Link>
                  )}
                  {expanded === s.id ? <ChevronUp size={16} className="text-surface-400" /> : <ChevronDown size={16} className="text-surface-400" />}
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === s.id && (
                <div className="border-t border-surface-100 px-5 py-4 bg-surface-50 space-y-4">
                  {/* Description */}
                  {s.description && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-surface-700">{s.description}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  {s.metadata && Object.keys(s.metadata).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Details</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                        {Object.entries(s.metadata).map(([k, v]) => (
                          <div key={k} className="flex gap-2 text-sm">
                            <span className="text-surface-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                            <span className="text-surface-700 font-medium">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  {s.files?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Attachments</p>
                      <div className="flex flex-wrap gap-2">
                        {s.files.map(f => (
                          <a key={f.id} href={`http://localhost:5000${f.file_url}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-lg transition-colors">
                            <FileText size={12} /> View File
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Remarks */}
                  {s.admin_remarks && (
                    <div className="remarks-banner">
                      <MessageSquare size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-700 mb-0.5 uppercase tracking-wide">Admin Remarks</p>
                        <p className="text-sm text-amber-800 leading-relaxed">{s.admin_remarks}</p>
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex gap-6 text-xs text-surface-400 pt-1">
                    <span>Submitted: <strong className="text-surface-600">{formatDate(s.created_at)}</strong></span>
                    {s.updated_at && s.updated_at !== s.created_at && (
                      <span>
                        {s.status === 'Approved' ? 'Approved' : s.status === 'Rejected' ? 'Rejected' : 'Updated'}:
                        <strong className="text-surface-600 ml-1">{formatDate(s.updated_at)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySubmissionsPage;
