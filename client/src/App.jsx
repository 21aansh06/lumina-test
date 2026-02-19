import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import HomePage from './pages/HomePage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="min-h-screen bg-cyber-black text-white">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/onboard" element={
                  <PrivateRoute>
                    <OnboardingPage />
                  </PrivateRoute>
                } />
                <Route path="/dashboard" element={
                  <PrivateRoute requireOnboarded>
                    <DashboardPage />
                  </PrivateRoute>
                } />
                <Route path="/map" element={
                  <PrivateRoute requireOnboarded>
                    <MapPage />
                  </PrivateRoute>
                } />
                <Route path="/analytics" element={
                  <PrivateRoute requireOnboarded>
                    <AnalyticsPage />
                  </PrivateRoute>
                } />
                <Route path="/admin" element={
                  <PrivateRoute requireAdmin>
                    <AdminPage />
                  </PrivateRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;