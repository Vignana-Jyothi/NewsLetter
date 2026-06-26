import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { Download, Search, FileText, Eye, X } from 'lucide-react';
import { MONTHS } from '../../utils/constants';

const ArchivesPage = () => {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [month, setMonth]             = useState('');
  const [year,  setYear]              = useState('');

  useEffect(() => {
    api.get('/newsletters/archives').then(r => {
      setNewsletters(r.data.data || []);
      setLoading(false);
    });
  }, []);

  const years = useMemo(() =>
    [...new Set(newsletters.map(n => n.year))].sort((a,b) => b - a), [newsletters]);

  const filtered = useMemo(() => {
    let list = newsletters;
    if (month) list = list.filter(n => n.month === month);
    if (year)  list = list.filter(n => String(n.year) === String(year));
    return list;
  }, [newsletters, month, year]);

  const reset = () => { setMonth(''); setYear(''); };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Newsletter Archive</h1>
        <p className="page-subtitle">Browse and download all published department newsletters</p>
      </div>

      {/* Search bar */}
      <div className="card mb-6 p-4">
        <div className="flex gap-3 items-end flex-wrap">
          <div className="w-44">
            <label className="label">Month</label>
            <select className="select" value={month} onChange={e => setMonth(e.target.value)}>
              <option value="">All Months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="label">Year</label>
            <select className="select" value={year} onChange={e => setYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {(month || year) && (
            <button onClick={reset} className="btn-ghost text-surface-500">
              <X size={14} /> Clear
            </button>
          )}
          <span className="text-sm text-surface-400 ml-auto self-center">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Results table */}
      {loading ? (
        <div className="card">
          {[1,2,3,4].map(i => <div key={i} className="h-12 bg-surface-100 rounded-xl mb-3 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={40} className="text-surface-200 mx-auto mb-3" />
          <p className="text-surface-400">No newsletters found</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="table-header">Month</th>
                <th className="table-header">Year</th>
                <th className="table-header">Department</th>
                <th className="table-header">Status</th>
                <th className="table-header">Items</th>
                <th className="table-header text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(n => (
                <tr key={n.id} className="table-row">
                  <td className="table-cell font-medium text-surface-800">{n.month}</td>
                  <td className="table-cell text-surface-600">{n.year}</td>
                  <td className="table-cell text-surface-500">{n.department_name}</td>
                  <td className="table-cell">
                    <span className={`badge ${n.status === 'Published' ? 'badge-published' : 'badge-archived'}`}>{n.status}</span>
                  </td>
                  <td className="table-cell text-surface-500">{n.item_count ?? '—'}</td>
                  <td className="table-cell text-right pr-5">
                    {n.files?.length > 0 ? (
                      <div className="flex justify-end gap-2">
                        <a href={`http://localhost:5000${n.files[0].file_url}`} target="_blank" rel="noreferrer"
                          className="btn-secondary py-1.5 text-xs">
                          <Eye size={13} /> View
                        </a>
                        <a href={`http://localhost:5000${n.files[0].file_url}`} download
                          className="btn-primary py-1.5 text-xs">
                          <Download size={13} /> Download
                        </a>
                      </div>
                    ) : <span className="text-xs text-surface-300">No PDF</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ArchivesPage;
