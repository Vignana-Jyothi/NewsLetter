import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

// Poll interval: 60 seconds — long enough to avoid hammering the DB,
// short enough that users see notifications reasonably quickly.
const POLL_INTERVAL_MS = 60_000;

/**
 * useNotifications — fetches notifications once on mount,
 * then polls every 60 s. Returns stable callbacks so consumers
 * don't trigger unnecessary re-renders.
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const timerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data.notifications || []);
      setUnreadCount(res.data.data.unreadCount     || 0);
    } catch {
      // silently ignore — user might not be authenticated yet
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling — clean up on unmount
  useEffect(() => {
    fetchNotifications();
    timerRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      // Optimistic update — avoid a full refetch
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  return { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead };
};
