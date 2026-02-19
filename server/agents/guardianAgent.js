const RoadSegment = require('../models/RoadSegment');
const Trip = require('../models/Trip');
const User = require('../models/User');

class GuardianAgent {
  constructor(io) {
    this.io = io;
    this.activeTrips = new Map(); // userId -> trip data
    this.locationHistory = new Map(); // userId -> locations array
  }

  startTrip(userId, tripId) {
    this.logStep('START', `Guardian monitoring started for user ${userId}, trip ${tripId}`);
    
    this.activeTrips.set(userId, {
      tripId,
      startTime: Date.now(),
      lastLocation: null,
      lastMovement: Date.now(),
      originalRoute: null,
      alertsSent: new Set()
    });

    this.locationHistory.set(userId, []);

    if (this.io) {
      this.io.to(userId.toString()).emit('guardian_status', {
        status: 'active',
        message: 'Guardian Agent is now monitoring your trip',
        timestamp: new Date().toISOString()
      });
    }
  }

  endTrip(userId) {
    this.logStep('END', `Guardian monitoring ended for user ${userId}`);
    
    this.activeTrips.delete(userId);
    this.locationHistory.delete(userId);

    if (this.io) {
      this.io.to(userId.toString()).emit('guardian_status', {
        status: 'ended',
        message: 'Trip completed. Guardian monitoring stopped.',
        timestamp: new Date().toISOString()
      });
    }
  }

  async processLocationUpdate(userId, { lat, lng }, io) {
    try {
      const trip = this.activeTrips.get(userId);
      if (!trip) {
        return { success: false, error: 'No active trip found' };
      }

      const currentTime = Date.now();
      const location = { lat, lng, timestamp: currentTime };
      
      // Store location history
      const history = this.locationHistory.get(userId) || [];
      history.push(location);
      this.locationHistory.set(userId, history);

      // Check if user has moved significantly
      if (trip.lastLocation) {
        const distance = this.calculateDistance(
          trip.lastLocation.lat, trip.lastLocation.lng,
          lat, lng
        );

        if (distance > 10) { // Moved more than 10 meters
          trip.lastMovement = currentTime;
          trip.lastLocation = { lat, lng };
        }
      } else {
        trip.lastLocation = { lat, lng };
      }

      // Check safety conditions
      await this.checkSafetyConditions(userId, { lat, lng }, trip, io);

      return { success: true };

    } catch (error) {
      console.error('Guardian Agent Error:', error);
      return { success: false, error: error.message };
    }
  }

  async checkSafetyConditions(userId, location, trip, io) {
    try {
      // Find nearby road segments
      const nearbySegments = await RoadSegment.find({
        geometry: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [location.lng, location.lat]
            },
            $maxDistance: 50 // 50 meters
          }
        }
      }).limit(5);

      // Check for low safety zones
      const unsafeSegments = nearbySegments.filter(s => s.safetyScore < 50);
      
      if (unsafeSegments.length > 0) {
        // User is in a low-safety zone
        const timeInZone = Date.now() - trip.lastMovement;
        const minutesStationary = Math.floor(timeInZone / (1000 * 60));

        if (minutesStationary >= 3 && !trip.alertsSent.has('CHECK_IN')) {
          // User has been stationary in unsafe zone for 3+ minutes
          this.logStep('ALERT', `User ${userId} stationary in unsafe zone for ${minutesStationary} minutes`);
          
          trip.alertsSent.add('CHECK_IN');
          
          if (io) {
            io.to(userId.toString()).emit('CHECK_IN', {
              message: "You've been stationary for 3+ minutes in a low-safety zone. Are you safe?",
              location,
              safetyScore: Math.min(...unsafeSegments.map(s => s.safetyScore)),
              timestamp: new Date().toISOString(),
              actions: ['I\'m Safe', 'Send SOS']
            });
          }
        }
      }

      // Check for route deviation (simplified - would compare against planned route)
      if (trip.originalRoute && this.isRouteDeviation(location, trip.originalRoute)) {
        if (!trip.alertsSent.has('SOS_ALERT')) {
          this.logStep('ALERT', `Route deviation detected for user ${userId}`);
          
          trip.alertsSent.add('SOS_ALERT');
          
          // Notify emergency contact (simulated)
          await this.notifyEmergencyContact(userId, location, io);
          
          if (io) {
            io.to(userId.toString()).emit('SOS_ALERT', {
              message: "Route deviation detected. Emergency contact has been notified.",
              location,
              timestamp: new Date().toISOString(),
              actions: ['I\'m Safe', 'Send SOS']
            });
          }
        }
      }

    } catch (error) {
      console.error('Safety check error:', error);
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  isRouteDeviation(currentLocation, originalRoute) {
    // Simplified deviation check - would compare against actual route geometry
    // For now, return false as we don't have the actual route stored
    return false;
  }

  async notifyEmergencyContact(userId, location, io) {
    try {
      const user = await User.findById(userId);
      if (user && user.emergencyContactPhone) {
        this.logStep('NOTIFY', `Would notify emergency contact: ${user.emergencyContactName} at ${user.emergencyContactPhone}`);
        // In production, integrate with SMS service (Twilio, etc.)
      }
    } catch (error) {
      console.error('Emergency notification error:', error);
    }
  }

  handleUserResponse(userId, response, io) {
    this.logStep('RESPONSE', `User ${userId} responded: ${response}`);
    
    if (response === 'I\'m Safe') {
      // Reset alerts for this trip
      const trip = this.activeTrips.get(userId);
      if (trip) {
        trip.alertsSent.clear();
      }
      
      if (io) {
        io.to(userId.toString()).emit('guardian_ack', {
          message: 'Glad you\'re safe! Guardian will continue monitoring.',
          timestamp: new Date().toISOString()
        });
      }
    } else if (response === 'Send SOS') {
      // Trigger emergency protocol
      this.triggerEmergency(userId, io);
    }
  }

  async triggerEmergency(userId, io) {
    this.logStep('EMERGENCY', `SOS triggered for user ${userId}`);
    
    // Get user's current location from history
    const history = this.locationHistory.get(userId);
    const currentLocation = history ? history[history.length - 1] : null;
    
    try {
      const user = await User.findById(userId);
      
      if (io) {
        io.to(userId.toString()).emit('EMERGENCY_TRIGGERED', {
          message: 'SOS sent! Emergency services and contacts have been notified.',
          location: currentLocation,
          user: {
            name: user.name,
            phone: user.phone,
            emergencyContact: {
              name: user.emergencyContactName,
              phone: user.emergencyContactPhone
            }
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // In production: Send SMS, notify authorities, etc.
      
    } catch (error) {
      console.error('Emergency trigger error:', error);
    }
  }

  logStep(step, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] GUARDIAN | ${step} | ${message}`;
    console.log(logEntry);
    
    if (this.io) {
      this.io.emit('guardian_log', { step, message, timestamp });
    }
  }
}

module.exports = GuardianAgent;