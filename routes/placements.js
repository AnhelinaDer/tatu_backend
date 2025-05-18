const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all placements
router.get('/', async (req, res) => {
  try {
    const placements = await prisma.placements.findMany({
      select: {
        placementId: true,
        placement: true
      }
    });

    // Format the response
    const formattedPlacements = placements.map(placement => ({
      id: placement.placementId,
      placement: placement.placement,
    }));

    res.status(200).json({
      success: true,
      placements: formattedPlacements
    });

  } catch (err) {
    console.error('GET /placements error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch placements',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
