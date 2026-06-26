import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { Send, FileText, TrendingUp, Clock, CheckCircle, XCircle, MessageSquare, ChevronRight } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub, color, iconBg }) => (
  <div className="stat-card">
    <div className={`stat-icon ${iconBg}`}>
      <Icon size={22} className={color} />
    </div>
    <div>
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
      {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const endpoint = user?.role === 'Admin' ? '/submissions/admin/pending' : '/submissions/mine';
    api.get(endpoint)
      .then(r => setSubmissions(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.role]);

  const counts = {
    total:    submissions.length,
    pending:  submissions.filter(s => s.status === 'Pending').length,
    approved: submissions.filter(s => ['Approved','Selected','Published','Archived'].includes(s.status)).length,
    rejected: submissions.filter(s => s.status === 'Rejected').length,
  };

  const adminStats = [
    { icon: FileText,     label: 'Pending Review', value: counts.total,    iconBg: 'bg-amber-100',   color: 'text-amber-600' },
  ];
  const userStats = [
    { icon: Send,        label: 'Total Submissions', value: counts.total,    iconBg: 'bg-primary-100', color: 'text-primary-600' },
    { icon: Clock,       label: 'Pending',           value: counts.pending,  iconBg: 'bg-amber-100',   color: 'text-amber-600'   },
    { icon: CheckCircle, label: 'Approved',          value: counts.approved, iconBg: 'bg-emerald-100', color: 'text-emerald-600' },
    { icon: XCircle,     label: 'Rejected',          value: counts.rejected, iconBg: 'bg-red-100',     color: 'text-red-500'     },
  ];

  const stats = user?.role === 'Admin' ? adminStats : userStats;

  return (
    <div>
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">
            Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="page-subtitle">{user?.department_name || user?.department} · {user?.role}</p>
        </div>
        {user?.role !== 'Admin' && (
          <Link to="/submissions/new" className="btn-primary">
            <Send size={16} /> New Submission
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Recent submissions */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-surface-800">
            {user?.role === 'Admin' ? 'Pending Submissions' : 'My Recent Submissions'}
          </h2>
          <Link
            to={user?.role === 'Admin' ? '/approvals' : '/submissions'}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-10">
            <Send size={32} className="text-surface-300 mx-auto mb-2" />
            <p className="text-surface-400 text-sm">No submissions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="table-header">Title</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                  {user?.role !== 'Admin' && <th className="table-header">Remarks</th>}
                </tr>
              </thead>
              <tbody>
                {submissions.slice(0, 6).map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell font-medium text-surface-800">{s.title}</td>
                    <td className="table-cell text-surface-500 text-xs">{s.type}</td>
                    <td className="table-cell text-surface-500">{formatDate(s.created_at)}</td>
                    <td className="table-cell"><StatusBadge status={s.status} /></td>
                    {user?.role !== 'Admin' && (
                      <td className="table-cell">
                        {s.admin_remarks ? (
                          <div className="flex items-start gap-1.5 max-w-xs">
                            <MessageSquare size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-amber-700 line-clamp-2">{s.admin_remarks}</span>
                          </div>
                        ) : <span className="text-surface-300 text-xs">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
