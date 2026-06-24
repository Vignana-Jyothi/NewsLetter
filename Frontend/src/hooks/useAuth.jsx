/* eslint-disable react-refresh/only-export-components -- AuthProvider + useAuth are intentionally co-located (context module pattern) */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import api from '../services/api';

const AuthContext = createContext(null);

// Cookie options — shared domain so all localhost ports share it
// Per Explanation.md: cookies are set for `localhost`, not a specific port
const getCookieOptions = () => ({
  domain: window.location.hostname === 'localhost' ? 'localhost' : '.vjstartup.com',
  secure: window.location.protocol === 'https:',
  sameSite: 'lax',
  expires: 7, // 7 days
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:3115';

  // useCallback keeps reference stable so it can be listed in useEffect deps
  const checkAuth = useCallback(async () => {
    try {
      const authRes = await fetch(`${AUTH_URL}/check-auth`, {
        credentials: 'include',
      });

      if (authRes.ok) {
        const profileRes = await api.get('/auth/profile');
        if (profileRes.data.success) {
          setUser(profileRes.data.data);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [AUTH_URL]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch-on-mount is standard React pattern
    checkAuth();
  }, [checkAuth]);

  const login = async (googleToken) => {
    try {
      const authRes = await fetch(`${AUTH_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: googleToken }),
        credentials: 'include',
      });

      if (!authRes.ok) {
        throw new Error('Central login failed');
      }

      const profileRes = await api.get('/auth/profile');
      if (!profileRes.data.success) {
        throw new Error('Failed to fetch user profile');
      }

      const localUser = profileRes.data.data;
      setUser(localUser);

      // Set readable user cookie for UI display across all localhost ports
      // Per Explanation.md: user cookie is for UI (name, email, picture), not auth
      const userForCookie = {
        name: localUser.name,
        email: localUser.email,
        picture: localUser.picture,
      };
      Cookies.set('user', JSON.stringify(userForCookie), getCookieOptions());
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      Cookies.remove('user', { domain: getCookieOptions().domain });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
