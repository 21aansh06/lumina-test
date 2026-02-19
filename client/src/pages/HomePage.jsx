import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, MapPin, Zap, Activity, Chrome, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle } from '../config/firebase';

const HomePage = () => {
  const { isAuthenticated, user, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.isOnboarded) {
        navigate('/dashboard');
      } else {
        navigate('/onboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithGoogle();
      
      if (result.success) {
        // AuthContext will handle the user state automatically
        // via the onAuthChange listener
        console.log('Google sign-in successful:', result.user.email);
      } else {
        setError(result.error || 'Sign-in failed');
        console.error('Sign-in error:', result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await loginAsGuest();
      
      if (!result.success) {
        setError(result.error || 'Guest login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Guest login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'AI Safety Score',
      description: 'Real-time safety analysis powered by Google Gemini AI'
    },
    {
      icon: Activity,
      title: '3 AI Agents',
      description: 'Scout, Verifier & Guardian monitoring your safety 24/7'
    },
    {
      icon: Zap,
      title: 'Real-Time Updates',
      description: 'Instant alerts for incidents and route changes'
    }
  ];

  const stats = [
    { value: '50,000+', label: 'Safe Routes' },
    { value: '3', label: 'AI Agents Active' },
    { value: '24/7', label: 'Real-Time Monitoring' }
  ];

  return (
    <div className="min-h-screen bg-cyber-black overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyber-purple/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-cyber-cyan/5 to-transparent opacity-50" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `linear-gradient(rgba(0, 245, 255, 0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0, 245, 255, 0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="py-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-purple flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-gradient">Lumina</span>
          </div>
        </motion.header>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 py-12">
          {/* Left Content */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex-1 max-w-2xl text-center lg:text-left"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-glow mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
              <span className="text-sm text-cyber-light">AI-Powered Safety Navigation</span>
            </motion.div>

            <h1 className="text-5xl lg:text-7xl font-display font-bold mb-6 leading-tight">
              Navigate{' '}
              <span className="text-gradient">Smart.</span>
              <br />
              Stay{' '}
              <span className="text-gradient">Safe.</span>
            </h1>

            <p className="text-xl text-cyber-light mb-8 max-w-lg">
              Lumina doesn't optimize for the fastest route — it calculates the{' '}
              <span className="text-cyber-cyan font-semibold">Safest Route</span>{' '}
              using real-time AI intelligence.
            </p>

            {/* Firebase Auth Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center lg:items-start gap-4"
            >
              {/* Google Sign In Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="btn-primary flex items-center justify-center gap-3 px-8 py-4 text-lg"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Chrome className="w-6 h-6" />
                    Sign in with Google
                  </>
                )}
              </motion.button>

              {/* Guest Login Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGuestSignIn}
                disabled={loading}
                className="btn-secondary flex items-center justify-center gap-3"
              >
                <User className="w-5 h-5" />
                Continue as Guest
              </motion.button>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-cyber-red text-sm bg-cyber-red/10 px-4 py-2 rounded-lg"
                >
                  {error}
                </motion.div>
              )}

              <p className="text-sm text-cyber-light mt-2">
                Secure authentication powered by Firebase
              </p>
              <p className="text-xs text-cyber-amber">
                💡 Use "Continue as Guest" for quick testing without signing in
              </p>
            </motion.div>
          </motion.div>

          {/* Right Content - Feature Cards */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex-1 max-w-md space-y-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: 10 }}
                className="glass glass-hover p-6 rounded-xl cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30">
                    <feature.icon className="w-6 h-6 text-cyber-cyan" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                    <p className="text-sm text-cyber-light">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="py-8 border-t border-white/10"
        >
          <div className="flex justify-center gap-12 lg:gap-24">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl lg:text-4xl font-display font-bold text-cyber-cyan text-glow">
                  {stat.value}
                </div>
                <div className="text-sm text-cyber-light mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;