const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
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
            sizes: {
              select: {
                size: true
              }
            },
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
        // Get user's favorite tattoos with their details
        favorites: {
          select: {
            favId: true,
            tattooId: true,
            tattoos: {
              select: {
                tattooId: true,
                tattooName: true,
                imageURL: true,
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
                },
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
          size: booking.sizes.size,
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
      // Format favorites
      favorites: user.favorites.map(fav => ({
        id: fav.favId,
        tattoo: {
          id: fav.tattoos.tattooId,
          name: fav.tattoos.tattooName,
          imageURL: fav.tattoos.imageURL,
          artist: {
            artistId: fav.tattoos.users.artistId,
            firstName: fav.tattoos.users.users.firstName,
            lastName: fav.tattoos.users.users.lastName
          },
          styles: fav.tattoos.tattoostyles.map(ts => ({
            id: ts.styles.styleId,
            name: ts.styles.styleName
          }))
        }
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

// Delete user account and all associated data
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Start a transaction to ensure all related data is deleted
    await prisma.$transaction(async (prisma) => {
      // If user is an artist, delete artist-related data first
      const artist = await prisma.artists.findFirst({
        where: { userId }
      });

      if (artist) {
        // Delete artist styles
        await prisma.artiststyles.deleteMany({
          where: { artistId: artist.artistId }
        });

        // Delete artist's tattoos and their styles
        const tattoos = await prisma.tattoos.findMany({
          where: { artistId: artist.artistId }
        });

        for (const tattoo of tattoos) {
          // Delete tattoo styles
          await prisma.tattoostyles.deleteMany({
            where: { tattooId: tattoo.tattooId }
          });

          // Delete favorites referencing this tattoo
          await prisma.favorites.deleteMany({
            where: { tattooId: tattoo.tattooId }
          });
        }

        // Delete all tattoos
        await prisma.tattoos.deleteMany({
          where: { artistId: artist.artistId }
        });

        // Delete appointment slots
        await prisma.appointmentslots.deleteMany({
          where: { artistId: artist.artistId }
        });

        // Delete artist profile
        await prisma.artists.delete({
          where: { artistId: artist.artistId }
        });
      }

      // Delete user's bookings and related data
      const bookings = await prisma.bookings.findMany({
        where: { userId }
      });

      for (const booking of bookings) {
        // Delete reviews for the booking
        await prisma.reviews.deleteMany({
          where: { bookingId: booking.bookingId }
        });
      }

      // Delete all bookings
      await prisma.bookings.deleteMany({
        where: { userId }
      });

      // Delete saved AR images
      await prisma.savedar.deleteMany({
        where: { userId }
      });

      // Delete favorites
      await prisma.favorites.deleteMany({
        where: { userId }
      });

      // Finally, delete the user
      await prisma.users.delete({
        where: { userId }
      });
    });

    res.status(200).json({
      success: true,
      message: 'Account and all associated data successfully deleted'
    });

  } catch (err) {
    console.error('DELETE /users/me error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Update user information
router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      birthDate
    } = req.body;

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Check if email is already in use by another user
      const existingUser = await prisma.users.findFirst({
        where: {
          email,
          NOT: {
            userId: userId
          }
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Prepare update data
    const updateData = {};

    // Only include fields that are provided
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (birthDate) updateData.birthDate = new Date(birthDate);
    
    // Handle password update separately with hashing
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = password;//hashedPassword;
    }

    // Update user
    const updatedUser = await prisma.users.update({
      where: {
        userId: userId
      },
      data: updateData,
      select: {
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        birthDate: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'User information updated successfully',
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        birthDate: updatedUser.birthDate
      }
    });

  } catch (err) {
    console.error('PATCH /users/me error:', err);
    
    // Handle specific Prisma errors
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Email is already in use'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user information',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
