import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationDropdown from '../components/NotificationDropdown';
import {
  LayoutDashboard, Send, CheckSquare, FileText,
  Globe, Archive, LogOut, Newspaper, ChevronRight,
} from 'lucide-react';

const NAV = {
  Student: [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/submissions', icon: Send,             label: 'My Submissions' },
    { to: '/archives',    icon: Archive,          label: 'Archives' },
  ],
  Faculty: [
    { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/submissions', icon: Send,             label: 'My Submissions' },
    { to: '/archives',    icon: Archive,          label: 'Archives' },
  ],
  Admin: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/approvals',    icon: CheckSquare,      label: 'Approvals' },
    { to: '/generation',   icon: FileText,         label: 'Newsletter Generation' },
    { to: '/publication',  icon: Globe,            label: 'Published Newsletters' },
    { to: '/archives',     icon: Archive,          label: 'Archive' },
  ],
};

const ROLE_COLOR = {
  Student: 'bg-blue-100 text-blue-700',
  Faculty: 'bg-violet-100 text-violet-700',
  Admin:   'bg-primary-100 text-primary-700',
};

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = NAV[user?.role] || [];

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-surface-200 flex flex-col shadow-card">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-surface-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-purple">
              <Newspaper size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-surface-900 text-sm leading-none">NEWSFLOW</p>
              <p className="text-[11px] text-surface-400 mt-0.5 leading-none">{user?.department_name || user?.department}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hidden">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {/* Active indicator */}
            </NavLink>
          ))}
        </nav>

        {/* User profile footer */}
        <div className="px-3 py-3 border-t border-surface-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-surface-50 transition-colors mb-1">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-surface-800 truncate leading-tight">{user?.name}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLOR[user?.role] || 'bg-gray-100 text-gray-600'}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 mt-0.5"
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────── */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-3.5
                           bg-white/90 backdrop-blur-md border-b border-surface-200 shadow-card">
          <div />
          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
