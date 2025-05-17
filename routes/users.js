const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const prisma = new PrismaClient();

// Get authenticated user's information
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.users.findUnique({
      where: {
        userId: userId
      },
      select: {
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        birthDate: true,
        // Get user's artist profile if they have one
        artists: {
          select: {
            artistId: true,
          }
        },
        // Get user's bookings
        bookings_bookings_userIdTousers: {
          select: {
            bookingId: true,
            artistId: true,
            slotId: true,
            statusId: true,
            createdAt: true,
            size: true,
            isColor: true,
            placementId: true,
            referenceURL: true,
            comment: true,
            price: true,
            // Include artist info
            users_bookings_artistIdTousers: {
              select: {
                users: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                },
                imageURL: true
              }
            },
            // Include appointment info
            appointmentslots: {
              select: {
                dateTime: true,
                duration: true
              }
            },
            // Include placement info
            placements: {
              select: {
                placement: true
              }
            },
            // Include booking status
            bookingstatuses: {
              select: {
                status: true
              }
            },
            // Include reviews if any
            reviews: {
              select: {
                reviewId: true,
                rating: true,
                comment: true,
                createdAt: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        // Get user's saved AR images
        savedar: {
          select: {
            savedId: true,
            imageURL: true
          }
        },
        favorites: {
          select: {
            favId: true,
            tattoos: {
              select: {
                tattooId: true,
                tattooName: true,
                imageURL: true,
                tattoostyles: {
                  select: {
                    styles: {
                      select: {
                        styleId: true,
                        styleName: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Format the response
    const formattedUser = {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      birthDate: user.birthDate,
      // Include artist profile if it exists
      artistProfile: user.artists.length > 0 ? {
        artistId: user.artists[0].artistId,
      } : null,
      // Format bookings
      bookings: user.bookings_bookings_userIdTousers.map(booking => ({
        bookingId: booking.bookingId,
        artist: {
          artistId: booking.artistId,
          firstName: booking.users_bookings_artistIdTousers.users.firstName,
          lastName: booking.users_bookings_artistIdTousers.users.lastName,
          imageURL: booking.users_bookings_artistIdTousers.imageURL
        },
        appointment: {
          slotId: booking.slotId,
          dateTime: booking.appointmentslots.dateTime,
          duration: booking.appointmentslots.duration
        },
        details: {
          status: booking.bookingstatuses.status,
          size: booking.size,
          isColor: booking.isColor,
          placement: booking.placements?.placement,
          referenceURL: booking.referenceURL,
          comment: booking.comment,
          price: booking.price
        },
        review: booking.reviews[0] ? {
          reviewId: booking.reviews[0].reviewId,
          rating: booking.reviews[0].rating,
          comment: booking.reviews[0].comment,
          createdAt: booking.reviews[0].createdAt
        } : null,
        createdAt: booking.createdAt
      })),
      // Include saved AR images
      savedAR: user.savedar.map(ar => ({
        id: ar.savedId,
        imageURL: ar.imageURL
      })),
      // Include favorites
      favorites: user.favorites.map(fav => ({
        id: fav.favId,
        imageURL: fav.imageURL,
        tattoos: fav.tattoos.map(tattoo => ({
          id: tattoo.tattooId,
          name: tattoo.tattooName,
          imageURL: tattoo.imageURL,
          styles: tattoo.tattoostyles.map(ts => ({
            id: ts.styles.styleId,
            name: ts.styles.styleName
          }))
        }))
      }))
    };

    res.status(200).json({
      success: true,
      user: formattedUser
    });

  } catch (err) {
    console.error('GET /users/me error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user information',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
