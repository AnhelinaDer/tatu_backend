const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all bookingStatuses
router.get('/', async (req, res) => {
  try {
    const bookingStatuses = await prisma.bookingstatuses.findMany({
      select: {
        statusId: true,
        status: true
      }
    });

    // Format the response
    const formattedBookingStatuses = bookingStatuses.map(bookingStatus => ({
      id: bookingStatus.statusId,
      status: bookingStatus.status,
    }));

    res.status(200).json({
      success: true,
      bookingStatuses: formattedBookingStatuses
    });

  } catch (err) {
    console.error('GET /bookingStatuses error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookingStatuses',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
