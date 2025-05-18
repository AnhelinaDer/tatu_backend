const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const prisma = new PrismaClient();

// Create new appointment slot
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Verify the user is an artist
    const artist = await prisma.artists.findFirst({
      where: { userId }
    });

    if (!artist) {
      return res.status(403).json({
        success: false,
        message: 'Only artists can create appointment slots'
      });
    }

    const { dateTime, duration } = req.body;

    // Validate required fields
    if (!dateTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Date/time and duration are required'
      });
    }

    // Validate duration (must be positive number)
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be a positive number'
      });
    }

    // Validate date (must be in the future)
    const appointmentDate = new Date(dateTime);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (appointmentDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date must be in the future'
      });
    }

    // Check for overlapping appointments
    const overlappingSlot = await prisma.appointmentslots.findFirst({
      where: {
        artistId: artist.artistId,
        dateTime: {
          lte: appointmentDate
        },
        AND: {
          dateTime: {
            gte: new Date(appointmentDate.getTime() - durationNum * 60000) // Convert duration to milliseconds
          }
        }
      }
    });

    if (overlappingSlot) {
      return res.status(409).json({
        success: false,
        message: 'This time slot overlaps with an existing appointment'
      });
    }

    // Create the appointment slot
    const newSlot = await prisma.appointmentslots.create({
      data: {
        artistId: artist.artistId,
        dateTime: appointmentDate,
        duration: durationNum,
        isBooked: false
      },
      select: {
        slotId: true,
        dateTime: true,
        duration: true,
        isBooked: true,
        users: {
          select: {
            artistId: true,
            users: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Format the response
    const formattedSlot = {
      id: newSlot.slotId,
      dateTime: newSlot.dateTime,
      duration: newSlot.duration,
      isBooked: newSlot.isBooked,
      artist: {
        artistId: newSlot.users.artistId,
        firstName: newSlot.users.users.firstName,
        lastName: newSlot.users.users.lastName
      }
    };

    res.status(201).json({
      success: true,
      message: 'Appointment slot created successfully',
      slot: formattedSlot
    });

  } catch (err) {
    console.error('POST /appointments error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment slot',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Delete appointment slot
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const slotId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(slotId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment slot ID format'
      });
    }

    // Verify the slot exists and belongs to the authenticated artist
    const existingSlot = await prisma.appointmentslots.findUnique({
      where: { slotId },
      select: {
        isBooked: true,
        users: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!existingSlot) {
      return res.status(404).json({
        success: false,
        message: 'Appointment slot not found'
      });
    }

    if (existingSlot.users.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this appointment slot'
      });
    }

    // Check if the slot is already booked
    if (existingSlot.isBooked) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete a booked appointment slot'
      });
    }

    // Delete the appointment slot
    await prisma.appointmentslots.delete({
      where: { slotId }
    });

    res.status(200).json({
      success: true,
      message: 'Appointment slot deleted successfully'
    });

  } catch (err) {
    console.error('DELETE /appointments/:id error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete appointment slot',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
