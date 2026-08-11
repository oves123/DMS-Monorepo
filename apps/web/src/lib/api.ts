import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dms_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 Unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to home (login) if token is invalid/expired
      // Skip this if the request was actually to the login endpoint, so we can show the error message
      if (!error.config.url.includes('/api/auth/login')) {
        localStorage.removeItem('dms_token');
        localStorage.removeItem('dms_user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
