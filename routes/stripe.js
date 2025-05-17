const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      phoneNumber,
      birthDate,
      artistDescription,
      instagramLink,
      portfolioLink,
      imageURL,
      streetAddress,
      cityId,
      styleIds
    } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'TATU Artist Membership'
          },
          unit_amount: 4999
        },
        quantity: 1
      }],
      success_url: `http://localhost:3000/register-artist-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/register-artist-cancelled`,
      metadata: {
        email,
        firstName,
        lastName,
        phoneNumber,
        birthDate,
        artistDescription,
        instagramLink,
        portfolioLink,
        imageURL,
        streetAddress,
        cityId,
        styleIds: styleIds.join(',')
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ message: 'Could not start payment session.' });
  }
});

module.exports = router;
