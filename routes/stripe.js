const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticateToken = require('../middleware/authMiddleware');

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { email, firstName, lastName, artistDescription, cityId, styleIds } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Artist Membership',
              description: 'One-time payment for TATU artist membership',
            },
            unit_amount: 4999, // €49.99
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:8080/register-artist-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:8080/profile`,
      customer_email: email,
      metadata: {
        firstName,
        lastName,
        artistDescription,
        cityId,
        styleIds: styleIds.join(',')
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe session creation error:', err);
    res.status(500).json({ message: 'Failed to create checkout session' });
  }
});

// Create checkout session for booking payment
router.post('/create-booking-payment', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Get booking details
    const booking = await prisma.bookings.findUnique({
      where: { bookingId: parseInt(bookingId) },
      include: {
        users_bookings_userIdTousers: true,
        users_bookings_artistIdTousers: {
          include: {
            users: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        appointmentslots: true,
        sizes: true,
        placements: true
      }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is authorized
    if (booking.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to pay for this booking' });
    }

    // Check if booking has a price
    if (!booking.price) {
      return res.status(400).json({ message: 'Booking has no price set' });
    }

    // Check if booking is in quoted status
    if (booking.statusId !== 2) { // 2 is the status ID for "Quoted"
      return res.status(400).json({ message: 'Booking is not in quoted status' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Tattoo Booking with ${booking.users_bookings_artistIdTousers.users.firstName} ${booking.users_bookings_artistIdTousers.users.lastName}`,
              description: `${booking.sizes.size} tattoo on ${booking.placements.placement}${booking.isColor ? ' (Color)' : ''}`,
            },
            unit_amount: Math.round(booking.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:8080/booking/${bookingId}?payment_status=success`,
      cancel_url: `http://localhost:8080/booking/${bookingId}?payment_status=cancelled`,
      metadata: {
        bookingId: bookingId
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating payment session:', err);
    res.status(500).json({ message: 'Failed to create payment session' });
  }
});

// Confirm payment and update booking status
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Get booking details
    const booking = await prisma.bookings.findUnique({
      where: { bookingId: parseInt(bookingId) }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is authorized
    if (booking.userId !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to confirm this booking' });
    }

    // Update booking status to confirmed
    await prisma.bookings.update({
      where: { bookingId: parseInt(bookingId) },
      data: { statusId: 3 } // 3 is the status ID for "Confirmed"
    });

    res.json({ message: 'Booking confirmed successfully' });
  } catch (err) {
    console.error('Error confirming payment:', err);
    res.status(500).json({ message: 'Failed to confirm payment' });
  }
});

module.exports = router;
