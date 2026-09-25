import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

// Request interceptor: sisipkan JWT Token dari localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: tangani status 401 Unauthorized (token invalid / sesi diputus admin)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Jika URL bukan login itu sendiri, hapus token dan trigger relogin
      if (!error.config.url.includes('/auth/login')) {
        console.warn('[API 401]: Sesi kedaluwarsa atau diputus oleh Administrator');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth_logout'));
      }
    }
    return Promise.reject(error);
  }
);
