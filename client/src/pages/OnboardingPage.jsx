import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Users, Bell, Shield, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    profileType: 'General User',
    alertMode: 'In-App'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await completeOnboarding(formData);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      alert(result.error);
    }
    
    setLoading(false);
  };

  const profileTypes = [
    'General User',
    'Student',
    'Delivery Worker',
    'Night Worker'
  ];

  const alertModes = [
    { value: 'In-App', label: 'In-App Notifications', icon: Bell },
    { value: 'SMS', label: 'SMS Alerts', icon: Phone },
    { value: 'Both', label: 'Both', icon: Check }
  ];

  return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-purple/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Shield className="w-8 h-8 text-cyber-cyan" />
            <span className="text-2xl font-display font-bold text-gradient">Lumina</span>
          </motion.div>
          <h1 className="text-3xl font-display font-bold mb-2">Complete Your Profile</h1>
          <p className="text-cyber-light">Help us keep you safe by providing some essential information</p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-8 space-y-6"
        >
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-cyber-cyan/20 flex items-center justify-center">
                <User className="w-6 h-6 text-cyber-cyan" />
              </div>
            )}
            <div>
              <div className="font-semibold">{user?.name}</div>
              <div className="text-sm text-cyber-light">{user?.email}</div>
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Phone className="w-4 h-4 text-cyber-cyan" />
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              className="input-cyber w-full"
              required
            />
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="flex items-center gap-2 text-cyber-cyan font-medium">
              <Users className="w-5 h-5" />
              Emergency Contact
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-cyber-light">Contact Name</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  className="input-cyber w-full"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-cyber-light">Contact Phone</label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="+1 (555) 987-6543"
                  className="input-cyber w-full"
                  required
                />
              </div>
            </div>
          </div>

          {/* Profile Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Type</label>
            <select
              name="profileType"
              value={formData.profileType}
              onChange={handleChange}
              className="input-cyber w-full"
            >
              {profileTypes.map(type => (
                <option key={type} value={type} className="bg-cyber-dark">
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Alert Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Alert Mode</label>
            <div className="grid grid-cols-3 gap-3">
              {alertModes.map(mode => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, alertMode: mode.value })}
                  className={`p-4 rounded-lg border transition-all ${
                    formData.alertMode === mode.value
                      ? 'border-cyber-cyan bg-cyber-cyan/10'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <mode.icon className={`w-5 h-5 mx-auto mb-2 ${
                    formData.alertMode === mode.value ? 'text-cyber-cyan' : 'text-cyber-light'
                  }`} />
                  <div className={`text-sm ${
                    formData.alertMode === mode.value ? 'text-white' : 'text-cyber-light'
                  }`}>
                    {mode.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                Complete Setup
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;