import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, requireOnboarded = false, requireAdmin = false }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyber-cyan"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireOnboarded && !user?.isOnboarded) {
    return <Navigate to="/onboard" replace />;
  }

  if (requireAdmin && !user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;