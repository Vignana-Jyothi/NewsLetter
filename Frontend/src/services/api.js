import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL:         API_BASE,
  withCredentials: true,
  timeout:         10000, // 10s — prevents requests hanging indefinitely
});

// Response interceptor: on 401 the session has expired — clear local state
// (the AuthContext will notice user is null and redirect to /login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Dispatch a custom event so AuthContext can react without tight coupling
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
