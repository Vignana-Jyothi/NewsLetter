import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, Send, Download, Eye, CheckCircle } from 'lucide-react';

const PublicationPage = () => {
  const [newsletters, setNewsletters] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [pdfUrl, setPdfUrl]           = useState(null);
  const [generating, setGenerating]   = useState(false);
  const [publishing, setPublishing]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [published, setPublished]     = useState(false);

  useEffect(() => {
    api.get('/newsletters').then(r => {
      setNewsletters((r.data.data || []).filter(n => n.status === 'Draft' && parseInt(n.item_count) > 0));
      setLoading(false);
    });
  }, []);

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const r = await api.post(`/newsletters/${selected.id}/generate-pdf`);
      setPdfUrl(`http://localhost:5000${r.data.data.fileUrl}`);
    } catch (err) {
      alert(err.response?.data?.error || 'PDF generation failed');
    } finally { setGenerating(false); }
  };

  const handlePublish = async () => {
    if (!selected || !pdfUrl) return;
    setPublishing(true);
    try {
      await api.patch(`/newsletters/${selected.id}/publish`);
      setNewsletters(p => p.filter(n => n.id !== selected.id));
      setSelected(null); setPdfUrl(null); setPublished(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Publish failed');
    } finally { setPublishing(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Published Newsletters</h1>
        <p className="page-subtitle">Preview and publish newsletters to your department</p>
      </div>

      {published && (
        <div className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle size={18} className="text-emerald-600" />
          <p className="text-sm text-emerald-700 font-medium">Newsletter published successfully! All department members have been notified.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector */}
        <div>
          <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Ready to Publish</h2>
          {loading ? <div className="text-surface-400 text-sm animate-pulse">Loading…</div>
            : newsletters.length === 0
            ? <p className="text-sm text-surface-400">No newsletters ready. Assemble one in Generation first.</p>
            : newsletters.map(n => (
              <button key={n.id}
                onClick={() => { setSelected(n); setPdfUrl(null); }}
                className={`w-full text-left card-sm mb-2 transition-all hover:shadow-card-md
                  ${selected?.id === n.id ? 'border-primary-300 bg-primary-50' : ''}`}>
                <p className="font-semibold text-surface-800">{n.month} {n.year}</p>
                <p className="text-xs text-surface-400 mt-0.5">{n.item_count} items · {n.department_name}</p>
              </button>
            ))
          }
        </div>

        {/* Preview & publish */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="card h-full min-h-64 flex items-center justify-center">
              <div className="text-center">
                <FileText size={40} className="text-surface-200 mx-auto mb-3" />
                <p className="text-surface-400 text-sm">Select a newsletter to preview and publish</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="card">
                <h2 className="text-lg font-bold text-surface-900 mb-0.5">{selected.month} {selected.year}</h2>
                <p className="text-sm text-surface-500 mb-4">{selected.department_name} · {selected.item_count} items</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleGenerate} disabled={generating} className="btn-primary">
                    <Eye size={16} /> {generating ? 'Generating PDF…' : 'Generate & Preview PDF'}
                  </button>
                  {pdfUrl && (
                    <>
                      <a href={pdfUrl} download className="btn-secondary"><Download size={16} /> Download</a>
                      <button onClick={handlePublish} disabled={publishing} className="btn-primary bg-emerald-600 hover:bg-emerald-700 ml-auto">
                        <Send size={16} /> {publishing ? 'Publishing…' : 'Publish Newsletter'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {pdfUrl && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2 bg-surface-50">
                    <FileText size={15} className="text-surface-500" />
                    <span className="text-sm text-surface-600 font-medium">PDF Preview</span>
                  </div>
                  <iframe src={pdfUrl} className="w-full" style={{ height: '560px' }} title="Newsletter Preview" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicationPage;
