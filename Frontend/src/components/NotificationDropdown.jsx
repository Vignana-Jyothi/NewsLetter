import { useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from '../utils/formatters';

const TYPE_STYLES = {
  APPROVAL:    { dot: 'bg-emerald-500', bg: 'bg-emerald-50',  label: 'Approved'   },
  REJECTION:   { dot: 'bg-red-500',     bg: 'bg-red-50',      label: 'Rejected'   },
  PUBLICATION: { dot: 'bg-primary-500', bg: 'bg-primary-50',  label: 'Published'  },
  SYSTEM:      { dot: 'bg-blue-500',    bg: 'bg-blue-50',     label: 'System'     },
};

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl border border-surface-200 hover:bg-surface-50 hover:border-surface-300 transition-all"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-surface-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[1.1rem] px-1 bg-primary-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 z-50 card shadow-card-lg border-surface-200 max-h-[420px] flex flex-col p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
              <h3 className="font-semibold text-surface-800 text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
                  >
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-surface-400 hover:text-surface-600">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto scrollbar-hidden flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <Bell size={28} className="text-surface-300 mb-2" />
                  <p className="text-sm text-surface-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const style = TYPE_STYLES[n.type] || TYPE_STYLES.SYSTEM;
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={`flex gap-3 px-4 py-3 border-b border-surface-50 transition-colors
                        ${n.is_read ? 'opacity-60' : `${style.bg} cursor-pointer hover:brightness-95`}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-700 leading-snug">{n.message}</p>
                        <p className="text-xs text-surface-400 mt-0.5">{formatDistanceToNow(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationDropdown;
