import api from './config';

export const bookingApi = {
  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },
  
  getUserBookings: async (userId) => {
    const response = await api.get(`/bookings/user/${userId}`);
    return response.data;
  },
  
  getRoomBookings: async (roomId, date) => {
    const response = await api.get(`/bookings/room/${roomId}`, {
      params: { date }
    });
    return response.data;
  },
  
  cancelBooking: async (bookingId) => {
    const response = await api.delete(`/bookings/${bookingId}`);
    return response.data;
  }
};