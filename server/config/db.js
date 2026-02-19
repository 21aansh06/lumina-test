const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Initialize some road segments if none exist
    const RoadSegment = require('../models/RoadSegment');
    const count = await RoadSegment.countDocuments();
    
    if (count === 0) {
      console.log('Initializing sample road segments...');
      await initializeSampleRoads();
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const initializeSampleRoads = async () => {
  const RoadSegment = require('../models/RoadSegment');
  const { calculateSafety } = require('../utils/calculateSafety');
  
  // Sample road segments for major cities
  const sampleRoads = [
    // New York
    {
      geometry: {
        type: 'LineString',
        coordinates: [[-74.006, 40.7128], [-73.9857, 40.7484]]
      },
      name: 'Manhattan Main Route',
      lightingScore: 85,
      crowdScore: 90,
      openShops: 80,
      incidentImpact: 0
    },
    {
      geometry: {
        type: 'LineString',
        coordinates: [[-74.006, 40.7128], [-74.0445, 40.6892]]
      },
      name: 'Downtown Connector',
      lightingScore: 70,
      crowdScore: 60,
      openShops: 65,
      incidentImpact: 0
    },
    // Los Angeles
    {
      geometry: {
        type: 'LineString',
        coordinates: [[-118.2437, 34.0522], [-118.2428, 34.0535]]
      },
      name: 'LA Central Avenue',
      lightingScore: 75,
      crowdScore: 70,
      openShops: 75,
      incidentImpact: 0
    },
    // Chicago
    {
      geometry: {
        type: 'LineString',
        coordinates: [[-87.6298, 41.8781], [-87.6278, 41.8805]]
      },
      name: 'Chicago Loop',
      lightingScore: 80,
      crowdScore: 85,
      openShops: 70,
      incidentImpact: 0
    },
    // Generic sample roads
    {
      geometry: {
        type: 'LineString',
        coordinates: [[-74.01, 40.71], [-74.02, 40.72]]
      },
      name: 'Sample Road A',
      lightingScore: 60,
      crowdScore: 55,
      openShops: 50,
      incidentImpact: 0
    },
    {
      geometry: {
        type: 'LineString',
        coordinates: [[-74.015, 40.715], [-74.025, 40.725]]
      },
      name: 'Sample Road B',
      lightingScore: 45,
      crowdScore: 40,
      openShops: 35,
      incidentImpact: 0
    }
  ];

  for (const road of sampleRoads) {
    road.safetyScore = calculateSafety(road);
    await RoadSegment.create(road);
  }
  
  console.log(`Created ${sampleRoads.length} sample road segments`);
};

module.exports = connectDB;