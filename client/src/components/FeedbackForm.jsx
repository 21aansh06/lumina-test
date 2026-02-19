import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const FeedbackForm = ({ trip, onClose }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [textFeedback, setTextFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const tags = [
    { id: 'poor_lighting', label: 'Poor Lighting', type: 'negative' },
    { id: 'high_traffic', label: 'High Traffic', type: 'negative' },
    { id: 'felt_unsafe', label: 'Felt Unsafe', type: 'negative' },
    { id: 'incident_not_shown', label: 'Incident Not Shown', type: 'negative' },
    { id: 'good_lighting', label: 'Good Lighting', type: 'positive' },
    { id: 'safe_area', label: 'Safe Area', type: 'positive' },
    { id: 'well_monitored', label: 'Well Monitored', type: 'positive' }
  ];

  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async () => {
    try {
      await api.post('/api/feedback', {
        userId: user._id,
        routeId: trip?.route?.routeId || 'unknown',
        routeLabel: trip?.route?.label || 'Unknown Route',
        origin: 'Start Location',
        destination: 'End Location',
        rating,
        textFeedback,
        tags: selectedTags
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Feedback submission failed:', error);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="glass rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-cyber-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-cyber-green" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="text-cyber-light mb-6">
            Your feedback helps improve safety recommendations for everyone.
          </p>
          <button onClick={onClose} className="btn-primary">Close</button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass rounded-2xl p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyber-cyan" />
            Route Feedback
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm text-cyber-light mb-3">
              How accurate was the safety recommendation?
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-cyber-cyan text-cyber-cyan'
                        : 'text-white/20'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-cyber-light mb-3">
              What did you experience?
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedTags.includes(tag.id)
                      ? tag.type === 'negative'
                        ? 'bg-cyber-red/20 border border-cyber-red/50 text-cyber-red'
                        : 'bg-cyber-green/20 border border-cyber-green/50 text-cyber-green'
                      : 'bg-white/5 border border-white/10 text-cyber-light hover:border-white/30'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Feedback */}
          <div>
            <label className="block text-sm text-cyber-light mb-2">
              Additional comments
            </label>
            <textarea
              value={textFeedback}
              onChange={(e) => setTextFeedback(e.target.value)}
              placeholder="Describe your experience..."
              className="input-cyber w-full h-24 resize-none"
            />
          </div>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={rating === 0}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Submit Feedback
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FeedbackForm;