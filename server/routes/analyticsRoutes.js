const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Incident = require('../models/Incident');
const Feedback = require('../models/Feedback');

// Get user analytics
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get user's trip history
    const trips = await Trip.find({ userId }).sort({ createdAt: -1 });
    
    // Calculate trip stats
    const totalTrips = trips.length;
    const completedTrips = trips.filter(t => t.status === 'completed').length;
    const safestRouteSelections = trips.filter(t => t.routeLabel?.includes('Safest')).length;
    
    // Get user's reports/feedback count
    const feedbackCount = await Feedback.countDocuments({ userId });
    
    // Calculate average safety score from trips
    const avgSafetyScore = trips.length > 0
      ? Math.round(trips.reduce((sum, t) => sum + (t.safetyScore || 0), 0) / trips.length)
      : 0;

    // Get safety trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const safetyTrend = last7Days.map(date => {
      const dayTrips = trips.filter(t => 
        t.createdAt.toISOString().startsWith(date)
      );
      return dayTrips.length > 0
        ? Math.round(dayTrips.reduce((sum, t) => sum + (t.safetyScore || 0), 0) / dayTrips.length)
        : 75; // Default baseline
    });

    // Get incidents by type (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const incidents = await Incident.find({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const incidentsByType = {
      fire: incidents.filter(i => i.type === 'fire').length,
      protest: incidents.filter(i => i.type === 'protest').length,
      flood: incidents.filter(i => i.type === 'flood').length,
      infrastructure: incidents.filter(i => i.type === 'infrastructure').length,
      accident: incidents.filter(i => i.type === 'accident').length,
      crime: incidents.filter(i => i.type === 'crime').length
    };

    // Route comparison data
    const routeComparison = trips.slice(0, 10).map(trip => ({
      tripId: trip._id,
      date: trip.createdAt,
      routeLabel: trip.routeLabel,
      safetyScore: trip.safetyScore,
      estimatedTime: trip.estimatedTime,
      status: trip.status
    }));

    res.json({
      stats: {
        totalTrips,
        completedTrips,
        safestRouteSelections,
        feedbackCount,
        avgSafetyScore,
        trustScore: trips[0]?.userId?.trustScore || 0
      },
      safetyTrend: {
        labels: last7Days.map(d => d.slice(5)), // MM-DD
        data: safetyTrend
      },
      incidentsByType,
      routeComparison,
      recentTrips: trips.slice(0, 5)
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;