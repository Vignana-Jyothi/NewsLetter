/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Constants — evaluated once at module load, never change
const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';
const AUTH_URL    = import.meta.env.VITE_AUTH_URL || 'http://localhost:3115';

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      if (IS_DEV_MODE) {
        // devSession httpOnly cookie is sent automatically — no external server needed
        const res = await api.get('/auth/profile');
        setUser(res.data.success ? res.data.data : null);
      } else {
        const authRes = await fetch(`${AUTH_URL}/check-auth`, { credentials: 'include' });
        if (!authRes.ok) { setUser(null); return; }
        const res = await api.get('/auth/profile');
        setUser(res.data.success ? res.data.data : null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []); // stable — no external deps that change

  // Run once on mount
  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Listen for 401s from the api interceptor — log out silently
  useEffect(() => {
    const handle = () => { setUser(null); setLoading(false); };
    window.addEventListener('auth:expired', handle);
    return () => window.removeEventListener('auth:expired', handle);
  }, []);

  const devLogin = useCallback(async (email) => {
    const res = await api.post('/auth/dev-login', { email });
    if (!res.data.success) throw new Error('Dev login failed');
    const u = res.data.data;
    setUser({
      id:              u.id,
      name:            u.name,
      email:           u.email,
      role:            u.role,
      department:      u.department,
      department_name: u.department,
      department_id:   u.department_id,
    });
  }, []);

  const login = useCallback(async (googleToken) => {
    const authRes = await fetch(`${AUTH_URL}/auth/google`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: googleToken }),
      credentials: 'include',
    });
    if (!authRes.ok) throw new Error('Central login failed');

    const res = await api.get('/auth/profile');
    if (!res.data.success) throw new Error('Failed to fetch user profile');
    setUser(res.data.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (IS_DEV_MODE) {
        await api.post('/auth/dev-logout');
      } else {
        await fetch(`${AUTH_URL}/logout`, { method: 'POST', credentials: 'include' });
      }
    } catch { /* best-effort */ }
    finally { setUser(null); }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, devLogin, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
