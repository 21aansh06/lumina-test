import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const routeApi = {
  async calculateRoutes(origin, destination) {
    const response = await axios.post(`${API_BASE_URL}/routes/calculate`, {
      origin,
      destination
    });
    return response.data;
  },

  async getRoadSegments() {
    const response = await axios.get(`${API_BASE_URL}/routes/roads`);
    return response.data;
  }
};

export default routeApi;
