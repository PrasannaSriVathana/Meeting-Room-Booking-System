const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const emailService = require('./emailService');
const moment = require('moment');
 
// Helper function to check for booking conflicts
const checkForConflicts = async (roomId, startTime, endTime, excludeBookingId = null) => {
  const query = {
    roomId,
    status: 'active',
    $or: [
      // New booking starts during an existing booking
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  };
 
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
 
  const conflictingBookings = await Booking.find(query);
  return conflictingBookings.length > 0;
};
 
// Validate booking time constraints
const validateBookingTime = (startTime, endTime) => {
  const start = moment(startTime);
  const end = moment(endTime);
 
  // Check if booking is in the past
  if (start.isBefore(moment())) {
    throw new Error('Cannot book for past time slots');
  }
 
  // Check minimum and maximum duration
  const durationMinutes = end.diff(start, 'minutes');
  if (durationMinutes < 30) {
    throw new Error('Booking must be at least 30 minutes');
  }
  if (durationMinutes > 240) {
    throw new Error('Booking cannot exceed 4 hours');
  }
 
  // Check business hours (9 AM to 6 PM)
  const startHour = start.hour();
  const endHour = end.hour();
  const endMinutes = end.minutes();
 
  if (startHour < 9 || (endHour > 18 || (endHour === 18 && endMinutes > 0))) {
    throw new Error('Bookings are only allowed between 9 AM and 6 PM');
  }
 
  // Check if booking is for current day only
  if (!start.isSame(moment(), 'day')) {
    throw new Error('Bookings are only allowed for the current day');
  }
 
  return true;
};
 
exports.createBooking = async (bookingData) => {
  try {
    // Get user and room details for denormalization
    const user = await User.findById(bookingData.userId);
    if (!user) {
      throw new Error('User not found');
    }
 
    const room = await Room.findById(bookingData.roomId);
    if (!room) {
      throw new Error('Room not found');
    }
 
    // Validate booking time constraints
    validateBookingTime(bookingData.startTime, bookingData.endTime);
 
    // Check room capacity
    if (bookingData.attendeeCount > room.capacity) {
      throw new Error(`Room capacity (${room.capacity}) exceeded`);
    }
 
    // Check for conflicts
    const hasConflicts = await checkForConflicts(
      bookingData.roomId,
      bookingData.startTime,
      bookingData.endTime
    );
 
    if (hasConflicts) {
      throw new Error('Room is already booked for this time slot');
    }
 
    // Prepare booking with denormalized data
    const booking = new Booking({
      ...bookingData,
      userName: user.name,
      userEmail: user.email,
      roomName: room.name,
      date: moment(bookingData.startTime).startOf('day').toDate(),
      duration: moment(bookingData.endTime).diff(moment(bookingData.startTime), 'minutes')
    });
 
    await booking.save();
 
    // Send confirmation email
    await emailService.sendBookingConfirmation(booking, user.email);
 
    return booking;
  } catch (error) {
    throw new Error(`Error creating booking: ${error.message}`);
  }
};
 
exports.getBookingsByUser = async (userId) => {
  try {
    const bookings = await Booking.find({ userId, status: 'active' })
      .sort({ startTime: 1 });
    return bookings;
  } catch (error) {
    throw new Error(`Error retrieving bookings: ${error.message}`);
  }
};
 
exports.getBookingsByRoom = async (roomId, date) => {
  try {
    const dateObj = date ? new Date(date) : new Date();
    const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
    const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));
 
    const bookings = await Booking.find({
      roomId,
      status: 'active',
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ startTime: 1 });
 
    return bookings;
  } catch (error) {
    throw new Error(`Error retrieving room bookings: ${error.message}`);
  }
};
 
exports.getAllBookingsForDate = async (date) => {
  try {
    const dateObj = date ? new Date(date) : new Date();
    const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
    const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));
 
    const bookings = await Booking.find({
      status: 'active',
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ startTime: 1 });
 
    return bookings;
  } catch (error) {
    throw new Error(`Error retrieving daily bookings: ${error.message}`);
  }
};
 
exports.cancelBooking = async (bookingId, userId) => {
  try {
    // Find booking and verify ownership
    const booking = await Booking.findById(bookingId);
 
    if (!booking) {
      throw new Error('Booking not found');
    }
 
    if (booking.userId.toString() !== userId.toString()) {
      throw new Error('You can only cancel your own bookings');
    }
 
    // Update booking status
    booking.status = 'cancelled';
    await booking.save();
 
    // Send cancellation email
    await emailService.sendCancellationNotification(booking, booking.userEmail);
 
    return booking;
  } catch (error) {
    throw new Error(`Error cancelling booking: ${error.message}`);
  }
};