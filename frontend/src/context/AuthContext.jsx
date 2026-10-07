import React, { createContext, useContext, useState, useEffect } from 'react';
import { authLogin, getCurrentUser } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('deskdrop_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('deskdrop_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('deskdrop_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('deskdrop_auth_expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('deskdrop_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await getCurrentUser();
        if (res.success && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('deskdrop_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        console.warn('[AuthContext] Verification failed or session expired');
        setUser(null);
        setToken(null);
        localStorage.removeItem('deskdrop_token');
        localStorage.removeItem('deskdrop_user');
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authLogin(email, password);
    if (res.success && res.data) {
      const { user: userData, token: userToken } = res.data;
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('deskdrop_token', userToken);
      localStorage.setItem('deskdrop_user', JSON.stringify(userData));
      return { success: true, user: userData };
    }
    return { success: false, message: res.message || 'Login failed' };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('deskdrop_token');
    localStorage.removeItem('deskdrop_user');
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem('deskdrop_user', JSON.stringify(updatedUserData));
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
