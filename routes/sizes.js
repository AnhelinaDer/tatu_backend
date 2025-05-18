const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all sizes
router.get('/', async (req, res) => {
  try {
    const sizes = await prisma.sizes.findMany({
      select: {
        sizeId: true,
        size: true
      }
    });

    // Format the response
    const formattedSizes = sizes.map(size => ({
      id: size.sizeId,
      size: size.size,
    }));

    res.status(200).json({
      success: true,
      sizes: formattedSizes
    });

  } catch (err) {
    console.error('GET /sizes error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sizes',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
