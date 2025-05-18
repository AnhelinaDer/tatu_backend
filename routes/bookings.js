const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();
const authenticateToken = require('../middleware/authMiddleware');

router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      slotId,
      sizeId,
      placementId,
      isColor = false,
      referenceURL,
      comment
    } = req.body;

    const userId = req.user.userId;

    // Validate required fields
    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment slot ID is required'
      });
    }

    if (!sizeId) {
      return res.status(400).json({
        success: false,
        message: 'Tattoo size is required'
      });
    }

    if (!placementId) {
      return res.status(400).json({
        success: false,
        message: 'Tattoo placement is required'
      });
    }

    // Create booking and update slot in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Validate and fetch slot
      const slot = await prisma.appointmentslots.findUnique({
        where: { slotId: parseInt(slotId) },
        include: {
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

      if (!slot) {
        throw new Error('Appointment slot not found');
      }

      if (slot.isBooked) {
        throw new Error('This appointment slot is already booked');
      }

      const now = new Date();
      if (new Date(slot.dateTime) <= now) {
        throw new Error('You can only book future appointment slots');
      }

      // Create the booking
      const booking = await prisma.bookings.create({
        data: {
          userId,
          artistId: slot.users.artistId,
          slotId,
          statusId: 1, // Initial status (pending)
          sizeId: parseInt(sizeId),
          placementId: parseInt(placementId),
          isColor,
          referenceURL,
          comment,
          createdAt: new Date()
        },
        select: {
          bookingId: true,
          createdAt: true,
          statusId: true,
          isColor: true,
          referenceURL: true,
          comment: true,
          // Include appointment details
          appointmentslots: {
            select: {
              dateTime: true,
              duration: true
            }
          },
          // Include artist details
          users_bookings_artistIdTousers: {
            select: {
              artistId: true,
              users: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              imageURL: true
            }
          },
          // Include placement details
          placements: {
            select: {
              placement: true
            }
          },
          // Include size details
          sizes: {
            select: {
              size: true
            }
          },
          // Include status details
          bookingstatuses: {
            select: {
              status: true
            }
          }
        }
      });

      // Mark slot as booked
      await prisma.appointmentslots.update({
        where: { slotId: parseInt(slotId) },
        data: { isBooked: true }
      });

      return booking;
    });

    // Format the response
    const formattedBooking = {
      id: result.bookingId,
      createdAt: result.createdAt,
      status: result.bookingstatuses.status,
      details: {
        size: result.sizes.size,
        placement: result.placements.placement,
        isColor: result.isColor,
        referenceURL: result.referenceURL,
        comment: result.comment
      },
      appointment: {
        dateTime: result.appointmentslots.dateTime,
        duration: result.appointmentslots.duration
      },
      artist: {
        artistId: result.users_bookings_artistIdTousers.artistId,
        firstName: result.users_bookings_artistIdTousers.users.firstName,
        lastName: result.users_bookings_artistIdTousers.users.lastName,
        imageURL: result.users_bookings_artistIdTousers.imageURL
      }
    };

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Awaiting artist confirmation.',
      booking: formattedBooking
    });

  } catch (err) {
    console.error('POST /bookings error:', err);

    // Handle specific error messages
    if (err.message === 'Appointment slot not found') {
      return res.status(404).json({
        success: false,
        message: 'Appointment slot not found'
      });
    }

    if (err.message === 'This appointment slot is already booked') {
      return res.status(409).json({
        success: false,
        message: 'This appointment slot is already booked'
      });
    }

    if (err.message === 'You can only book future appointment slots') {
      return res.status(400).json({
        success: false,
        message: 'You can only book future appointment slots'
      });
    }

    // Handle Prisma errors
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid size, placement, or slot ID provided'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;