import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { 
  onAuthChange, 
  firebaseSignOut, 
  signInAsGuest,
  getCurrentUserToken 
} from '../config/firebase';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        
        try {
          // Get Firebase ID token
          const token = await firebaseUser.getIdToken();
          
          // Verify token with backend and get/create user in MongoDB
          const response = await axios.post(`${API_URL}/api/auth/firebase-verify`, {
            token,
            user: {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'Anonymous User',
              avatar: firebaseUser.photoURL,
              isAnonymous: firebaseUser.isAnonymous
            }
          });
          
          if (response.data.success) {
            setUser(response.data.user);
            setIsAuthenticated(true);
            localStorage.setItem('token', response.data.token);
          }
        } catch (error) {
          console.error('Firebase auth verification error:', error);
          // Don't logout on error, let user retry
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('token');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await firebaseSignOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setFirebaseUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const completeOnboarding = async (profileData) => {
    try {
      // Use the JWT token stored in localStorage (not Firebase token)
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const response = await axios.post(`${API_URL}/api/auth/onboard`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      console.error('Onboarding error:', error);
      return { success: false, error: error.response?.data?.error || 'Onboarding failed' };
    }
  };

  // Guest/Demo login using Firebase Anonymous Auth
  const loginAsGuest = async () => {
    try {
      setLoading(true);
      const result = await signInAsGuest();
      
      if (result.success) {
        // The onAuthChange listener will handle the rest
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Guest login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      logout,
      updateUser,
      completeOnboarding,
      loginAsGuest,
      firebaseUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;