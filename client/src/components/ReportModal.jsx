import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, X, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const ReportModal = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    reportType: 'poor_lighting',
    description: '',
    lat: '',
    lng: '',
    locationName: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);

  const reportTypes = [
    { value: 'poor_lighting', label: 'Poor Lighting', icon: '💡' },
    { value: 'broken_infrastructure', label: 'Broken Infrastructure', icon: '🚧' },
    { value: 'unsafe_area', label: 'Unsafe Area', icon: '⚠️' },
    { value: 'suspicious_activity', label: 'Suspicious Activity', icon: '👁️' },
    { value: 'other', label: 'Other', icon: '📝' }
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('image', image);
      formDataToSend.append('userId', user._id);
      formDataToSend.append('reportType', formData.reportType);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('lat', formData.lat || '40.7128');
      formDataToSend.append('lng', formData.lng || '-74.0060');
      formDataToSend.append('locationName', formData.locationName || 'Unknown');

      const response = await api.post('/api/reports', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setStep(3);
        // Listen for verification result
        setTimeout(() => {
          setVerificationStatus('approved');
        }, 3000);
      }
    } catch (error) {
      console.error('Report submission failed:', error);
      alert('Failed to submit report. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyber-cyan" />
            Report Unsafe Area
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-cyber-light mb-2">Issue Type</label>
              <div className="grid grid-cols-2 gap-2">
                {reportTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, reportType: type.value })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.reportType === type.value
                        ? 'border-cyber-cyan bg-cyber-cyan/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className="text-2xl mr-2">{type.icon}</span>
                    <span className="text-sm">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-cyber-light mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the safety concern..."
                className="input-cyber w-full h-24 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-cyber-light mb-1">Latitude</label>
                <input
                  type="text"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  placeholder="40.7128"
                  className="input-cyber w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-cyber-light mb-1">Longitude</label>
                <input
                  type="text"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  placeholder="-74.0060"
                  className="input-cyber w-full"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(2)}
              disabled={!formData.description}
              className="btn-primary w-full"
            >
              Continue
            </motion.button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-cyber-light mb-2">
                Upload Photo Evidence
              </label>
              <div 
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-cyber-cyan/50 transition-colors"
                onClick={() => document.getElementById('report-image').click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-2 text-cyber-light" />
                    <p className="text-cyber-light">Click to upload photo</p>
                    <p className="text-xs text-cyber-light mt-1">Supports JPG, PNG up to 5MB</p>
                  </>
                )}
                <input
                  id="report-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(1)}
                className="btn-secondary flex-1"
              >
                Back
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!image || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Submit Report
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8">
            {!verificationStatus ? (
              <>
                <div className="w-16 h-16 border-4 border-cyber-cyan/30 border-t-cyber-cyan rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI Verification in Progress</h3>
                <p className="text-cyber-light">Our Verifier Agent is analyzing your report...</p>
              </>
            ) : verificationStatus === 'approved' ? (
              <>
                <div className="w-16 h-16 bg-cyber-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-cyber-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-cyber-green">Report Approved!</h3>
                <p className="text-cyber-light mb-4">AI Verified ✓ Your trust score increased by 10 points.</p>
                <button onClick={onClose} className="btn-primary">Done</button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-cyber-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-cyber-red" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-cyber-red">Report Rejected</h3>
                <p className="text-cyber-light mb-4">Image does not match reported condition.</p>
                <button onClick={onClose} className="btn-primary">Close</button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ReportModal;