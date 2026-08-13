import axios from 'axios';
import * as SecureStore from './storage';
import { Platform } from 'react-native';

// We fallback to localhost if the env var is not found for some reason, 
// though on device this should be the actual IP or domain.
export let API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

// If running in browser (web), 10.0.2.2 will fail, so override it to localhost
if (Platform.OS === 'web' && API_URL.includes('10.0.2.2')) {
  API_URL = API_URL.replace('10.0.2.2', 'localhost');
}

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('dms_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('Error reading token from SecureStore', err);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const setupInterceptors = (navigation: any) => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response && error.response.status === 401) {
        // Token expired or invalid
        console.log('401 Unauthorized - clearing token and redirecting to Login');
        try {
          await SecureStore.deleteItemAsync('dms_token');
          await SecureStore.deleteItemAsync('dms_user');
          // Navigate to Login if navigation object is provided
          if (navigation) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        } catch (e) {
          console.error('Error clearing secure store on 401', e);
        }
      }
      return Promise.reject(error);
    }
  );
};

export default api;
