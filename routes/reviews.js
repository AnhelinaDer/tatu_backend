const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const prisma = new PrismaClient();

// Create a new review
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookingId, rating, comment } = req.body;

    // Validate required fields
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required and must be between 1 and 5'
      });
    }

    // Verify the booking exists and belongs to the user
    const booking = await prisma.bookings.findUnique({
      where: { bookingId: parseInt(bookingId) },
      include: {
        reviews: true,
        users_bookings_artistIdTousers: {
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

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only review your own bookings'
      });
    }

    // Check if booking is already reviewed
    if (booking.reviews.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    // Check if booking's date is in the past
    const bookingDate = new Date(booking.dateTime);
    const currentDate = new Date();
    if (bookingDate < currentDate) {
      return res.status(400).json({
        success: false,
        message: 'You can only review past bookings'
      });
    }

    // Create the review
    const review = await prisma.reviews.create({
      data: {
        userId,
        bookingId: parseInt(bookingId),
        rating,
        comment: comment || null,
        createdAt: new Date()
      },
      select: {
        reviewId: true,
        rating: true,
        comment: true,
        createdAt: true,
        users: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        bookings: {
          select: {
            users_bookings_artistIdTousers: {
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
        }
      }
    });

    // Format the response
    const formattedReview = {
      id: review.reviewId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewer: {
        firstName: review.users.firstName,
        lastName: review.users.lastName
      },
      artist: {
        artistId: review.bookings.users_bookings_artistIdTousers.artistId,
        firstName: review.bookings.users_bookings_artistIdTousers.users.firstName,
        lastName: review.bookings.users_bookings_artistIdTousers.users.lastName
      }
    };

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: formattedReview
    });

  } catch (err) {
    console.error('POST /reviews error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Delete a review
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID format'
      });
    }

    // Verify the review exists and belongs to the user
    const review = await prisma.reviews.findUnique({
      where: { reviewId },
      select: { userId: true }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
    }

    // Delete the review
    await prisma.reviews.delete({
      where: { reviewId }
    });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (err) {
    console.error('DELETE /reviews/:id error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
