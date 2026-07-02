import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Service
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  updateUser: (data) => api.put('/auth/me', data),
  verifyToken: (token) => {
    // Just try to get current user with the token
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };
    return api.get('/auth/me', config);
  }
};

// Water Service
export const waterService = {
  addWater: (amount) => api.post('/water', { amount }),
  getTodayIntakes: () => api.get('/water/today'),
  getHistory: (days = 7) => api.get(`/water/history?days=${days}`),
  deleteIntake: (id) => api.delete(`/water/${id}`)
};

// Stats Service
export const statsService = {
  getTodayStats: () => api.get('/stats/today'),
  getDashboard: () => api.get('/dashboard')
};

// Health Service
export const healthService = {
  check: () => axios.get(`${API_BASE_URL}/health`)
};

export default api;
