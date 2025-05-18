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

// Update booking status and price
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { price, action } = req.body;

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    // Fetch the booking with related data
    const booking = await prisma.bookings.findUnique({
      where: { bookingId },
      include: {
        users_bookings_artistIdTousers: {
          select: {
            userId: true,
            artistId: true
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is either the artist or the client
    const isArtist = booking.users_bookings_artistIdTousers.userId === userId;
    const isClient = booking.userId === userId;

    if (!isArtist && !isClient) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this booking'
      });
    }

    // Handle artist actions (setting price)
    if (isArtist) {
      if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid price is required'
        });
      }

      // Check if price is already set
      if (booking.price) {
        return res.status(400).json({
          success: false,
          message: 'Price is already set'
        });
      }

      // Calculate commission (10% of price)
      const commissionAmount = price * 0.10;

      // Update booking with price and commission
      const updatedBooking = await prisma.bookings.update({
        where: { bookingId },
        data: {
          price,
          commissionAmount,
          statusId: 2 // Status: Quoted (awaiting client confirmation)
        },
        select: {
          bookingId: true,
          createdAt: true,
          statusId: true,
          price: true,
          commissionAmount: true,
          isColor: true,
          referenceURL: true,
          comment: true,
          appointmentslots: {
            select: {
              dateTime: true,
              duration: true
            }
          },
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
          placements: {
            select: {
              placement: true
            }
          },
          sizes: {
            select: {
              size: true
            }
          },
          bookingstatuses: {
            select: {
              status: true
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Price set successfully. Awaiting client confirmation.',
        booking: formatBookingResponse(updatedBooking)
      });
    }

    // Handle client actions (confirm/decline)
    if (isClient) {
      if (!action || !['confirm', 'decline'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Valid action (confirm/decline) is required'
        });
      }

      // Verify booking has a price set
      if (!booking.price) {
        return res.status(400).json({
          success: false,
          message: 'Cannot confirm/decline booking without a price set'
        });
      }

      const newStatusId = action === 'confirm' ? 3 : 4; // 3: Confirmed, 4: Declined

      const updatedBooking = await prisma.bookings.update({
        where: { bookingId },
        data: {
          statusId: newStatusId
        },
        select: {
          bookingId: true,
          createdAt: true,
          statusId: true,
          price: true,
          commissionAmount: true,
          isColor: true,
          referenceURL: true,
          comment: true,
          appointmentslots: {
            select: {
              dateTime: true,
              duration: true
            }
          },
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
          placements: {
            select: {
              placement: true
            }
          },
          sizes: {
            select: {
              size: true
            }
          },
          bookingstatuses: {
            select: {
              status: true
            }
          }
        }
      });

      // If declined, free up the appointment slot
      if (action === 'decline') {
        await prisma.appointmentslots.update({
          where: { slotId: booking.slotId },
          data: { isBooked: false }
        });
      }

      const message = action === 'confirm' 
        ? 'Booking confirmed successfully'
        : 'Booking declined successfully';

      return res.status(200).json({
        success: true,
        message,
        booking: formatBookingResponse(updatedBooking)
      });
    }

  } catch (err) {
    console.error('PATCH /bookings/:id error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Helper function to format booking response
function formatBookingResponse(booking) {
  return {
    id: booking.bookingId,
    createdAt: booking.createdAt,
    status: booking.bookingstatuses.status,
    details: {
      size: booking.sizes.size,
      placement: booking.placements.placement,
      isColor: booking.isColor,
      referenceURL: booking.referenceURL,
      comment: booking.comment,
      price: booking.price,
      commissionAmount: booking.commissionAmount
    },
    appointment: {
      dateTime: booking.appointmentslots.dateTime,
      duration: booking.appointmentslots.duration
    },
    artist: {
      artistId: booking.users_bookings_artistIdTousers.artistId,
      firstName: booking.users_bookings_artistIdTousers.users.firstName,
      lastName: booking.users_bookings_artistIdTousers.users.lastName,
      imageURL: booking.users_bookings_artistIdTousers.imageURL
    }
  };
}

module.exports = router;