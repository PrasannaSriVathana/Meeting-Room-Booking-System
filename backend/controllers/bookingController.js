const bookingService = require('../services/bookingService');
 
// Create new booking
exports.createBooking = async (req, res) => {
  try {
    const {
      userId,
      roomId,
      title,
      startTime,
      endTime,
      attendeeCount,
      requiredEquipment
    } = req.body;
 
    if (!userId || !roomId || !title || !startTime || !endTime || !attendeeCount) {
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }
 
    const booking = await bookingService.createBooking({
      userId,
      roomId,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendeeCount,
      requiredEquipment: requiredEquipment || []
    });
 
    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
 
// Get bookings
exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await bookingService.getBookingsByUser(userId);
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
// Get bookings - on specific date
exports.getRoomBookings = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { date } = req.query;
 
    const bookings = await bookingService.getBookingsByRoom(roomId, date);
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
// Get all bookings - on specific date
exports.getAllBookingsForDate = async (req, res) => {
  try {
    const { date } = req.query;
    const bookings = await bookingService.getAllBookingsForDate(date);
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 
// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
 
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
 
    const booking = await bookingService.cancelBooking(id, userId);
    res.status(200).json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};