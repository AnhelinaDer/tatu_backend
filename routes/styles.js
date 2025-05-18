const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Get all styles
router.get('/', async (req, res) => {
  try {
    const styles = await prisma.styles.findMany({
      select: {
        styleId: true,
        styleName: true,
        description: true
      }
    });

    // Format the response
    const formattedStyles = styles.map(style => ({
      id: style.styleId,
      name: style.styleName,
      description: style.description
    }));

    res.status(200).json({
      success: true,
      styles: formattedStyles
    });

  } catch (err) {
    console.error('GET /styles error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch styles',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
