import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api')
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto log frontend errors to the backend
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Prevent infinite loop if the log endpoint itself fails
    if (error.config && !error.config.url.includes('/api/logs')) {
      const errorDetails = {
        message: error.message,
        url: error.config.url,
        method: error.config.method,
        status: error.response?.status,
        data: error.response?.data
      };
      
      // Async fire-and-forget log
      axios.post((import.meta.env.DEV ? 'http://localhost:3001/api' : '/api') + '/logs', {
        level: 'ERROR',
        source: 'ADMIN',
        action: `API Error: ${error.config.method.toUpperCase()} ${error.config.url}`,
        details: errorDetails
      }).catch(err => console.error('Error logging to backend', err));
    }
    return Promise.reject(error);
  }
);

export default api;
