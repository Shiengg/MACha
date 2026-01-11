import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Normalize API URL to avoid double host or missing protocol issues
const normalizeApiUrl = (url) => {
  const fallback = 'http://localhost:5000';
  if (!url) return fallback;

  // Remove trailing slash
  let normalized = url.replace(/\/$/, '');

  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = normalized.includes('localhost')
      ? `http://${normalized}`
      : `https://${normalized}`;
  }

  return normalized;
};

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
  }
  
  console.warn('⚠️ EXPO_PUBLIC_API_URL not set in .env, using default localhost');
  return 'http://localhost:8887';
};

const HOST = getApiUrl();

console.log('🌐 API Client initialized with baseURL:', HOST);

const apiClient = axios.create({
  baseURL: HOST,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add token from AsyncStorage
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from AsyncStorage:', error);
    }
    console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ [API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error(`❌ [API] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error(`❌ [API] Network Error - No response received:`, error.message);
    } else {
      console.error(`❌ [API] Error:`, error.message);
    }

    if (error.response && error.response.status === 401) {
      // Clear token on 401
      try {
        await AsyncStorage.removeItem('auth_token');
      } catch (storageError) {
        console.error('Error removing token from AsyncStorage:', storageError);
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn('Warning: Unauthorized access!');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

