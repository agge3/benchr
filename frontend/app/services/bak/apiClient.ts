import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response:`, response.status);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('[API] Error response:', error.response.data);
    } else if (error.request) {
      console.error('[API] No response received');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
