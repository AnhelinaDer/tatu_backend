const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const prisma = new PrismaClient();

// Add to saved AR images
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { imageURL } = req.body;

    // Validate required fields
    if (!imageURL) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    // Check if image is already saved
    const existingSaved = await prisma.savedar.findFirst({
      where: {
        userId,
        imageURL
      }
    });

    if (existingSaved) {
      return res.status(409).json({
        success: false,
        message: 'Image is already saved'
      });
    }

    // Add to saved
    const saved = await prisma.savedar.create({
      data: {
        userId,
        imageURL
      },
      select: {
        savedId: true,
        imageURL: true,
        users: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Format the response
    const formattedSaved = {
      id: saved.savedId,
      imageURL: saved.imageURL,
      user: {
        firstName: saved.users.firstName,
        lastName: saved.users.lastName
      }
    };

    res.status(201).json({
      success: true,
      message: 'AR image saved successfully',
      saved: formattedSaved
    });

  } catch (err) {
    console.error('POST /savedars error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to save AR image',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Delete saved AR image
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const savedId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(savedId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid saved AR ID format'
      });
    }

    // Verify the saved AR exists and belongs to the user
    const saved = await prisma.savedar.findUnique({
      where: { savedId },
      select: { userId: true }
    });

    if (!saved) {
      return res.status(404).json({
        success: false,
        message: 'Saved AR image not found'
      });
    }

    if (saved.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own saved AR images'
      });
    }

    // Delete the saved AR
    await prisma.savedar.delete({
      where: { savedId }
    });

    res.status(200).json({
      success: true,
      message: 'Saved AR image deleted successfully'
    });

  } catch (err) {
    console.error('DELETE /savedars/:id error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete saved AR image',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
