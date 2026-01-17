import axios from 'axios';

<<<<<<< HEAD
// URL gốc của API backend - tự động dùng hostname hiện tại
// Cho phép truy cập từ localhost hoặc IP trong mạng LAN
const getAuthUrl = () => {
  const hostname = window.location.hostname
  return `http://${hostname}:8080/api/auth`
}

const API_URL = getAuthUrl();
=======
const API_URL = '/api/auth';
>>>>>>> upstream/main

/**
 * Auth Service
 * Handles authentication API calls
 */

/**
 * Register new user
 */
export const register = async (username, email, password, fullName) => {
  try {
    console.log('Registering user:', { username, email });
    const response = await axios.post(`${API_URL}/register`, {
      username,
      email,
      password,
      fullName
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Register response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra backend có đang chạy không.');
    }
    // Handle 403 Forbidden
    if (error.response && error.response.status === 403) {
      throw new Error('Không có quyền truy cập. Vui lòng kiểm tra cấu hình server.');
    }
    // Handle 400 Bad Request (validation errors)
    if (error.response && error.response.status === 400) {
      const message = error.response.data?.message || 'Dữ liệu không hợp lệ';
      throw new Error(message);
    }
    // Handle other errors
    if (error.response && error.response.data) {
      const message = error.response.data.message || error.response.data;
      throw new Error(typeof message === 'string' ? message : 'Đăng ký thất bại');
    }
    throw error;
  }
};

/**
 * Login user
 */
export const login = async (username, password) => {
  try {
    console.log('Logging in user:', { username });
    const response = await axios.post(`${API_URL}/login`, {
      username,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Login response:', response.data);

    if (response.data.token) {
      // Save token and user info to localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify({
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        fullName: response.data.fullName
      }));
    }

    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra backend có đang chạy không.');
    }
    // Handle 403 Forbidden
    if (error.response && error.response.status === 403) {
      throw new Error('Không có quyền truy cập. Vui lòng kiểm tra cấu hình server.');
    }
    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      const message = error.response.data?.message || error.response.data || 'Tên đăng nhập hoặc mật khẩu không đúng';
      throw new Error(typeof message === 'string' ? message : 'Tên đăng nhập hoặc mật khẩu không đúng');
    }
    // Handle 400 Bad Request
    if (error.response && error.response.status === 400) {
      const message = error.response.data?.message || 'Dữ liệu không hợp lệ';
      throw new Error(message);
    }
    // Handle other errors
    if (error.response && error.response.data) {
      const message = error.response.data.message || error.response.data;
      throw new Error(typeof message === 'string' ? message : 'Đăng nhập thất bại');
    }
    throw error;
  }
};

/**
 * Logout user
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Get current user from localStorage
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

/**
 * Get auth token
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Get current user info from server
 */
export const getMe = async () => {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token');
  }

  try {
    const response = await axios.get(`${API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra backend có đang chạy không.');
    }
    throw error;
  }
};
