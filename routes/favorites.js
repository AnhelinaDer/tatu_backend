const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const prisma = new PrismaClient();

// Add tattoo to favorites
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tattooId } = req.body;

    if (!tattooId) {
      return res.status(400).json({
        success: false,
        message: 'Tattoo ID is required'
      });
    }

    // Verify the tattoo exists
    const tattoo = await prisma.tattoos.findUnique({
      where: { tattooId: parseInt(tattooId) }
    });

    if (!tattoo) {
      return res.status(404).json({
        success: false,
        message: 'Tattoo not found'
      });
    }

    // Check if already in favorites
    const existingFavorite = await prisma.favorites.findFirst({
      where: {
        userId,
        tattooId: parseInt(tattooId)
      }
    });

    if (existingFavorite) {
      return res.status(409).json({
        success: false,
        message: 'Tattoo is already in favorites'
      });
    }

    // Add to favorites
    const favorite = await prisma.favorites.create({
      data: {
        userId,
        tattooId: parseInt(tattooId)
      },
      select: {
        favId: true,
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
    });

    // Format the response
    const formattedFavorite = {
      id: favorite.favId,
      tattoo: {
        id: favorite.tattoos.tattooId,
        name: favorite.tattoos.tattooName,
        imageURL: favorite.tattoos.imageURL,
        artist: {
          artistId: favorite.tattoos.users.artistId,
          firstName: favorite.tattoos.users.users.firstName,
          lastName: favorite.tattoos.users.users.lastName
        },
        styles: favorite.tattoos.tattoostyles.map(ts => ({
          id: ts.styles.styleId,
          name: ts.styles.styleName
        }))
      }
    };

    res.status(201).json({
      success: true,
      message: 'Tattoo added to favorites',
      favorite: formattedFavorite
    });

  } catch (err) {
    console.error('POST /favorites error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to add tattoo to favorites',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Remove tattoo from favorites
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const favId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(favId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid favorite ID format'
      });
    }

    // Verify the favorite exists and belongs to the user
    const favorite = await prisma.favorites.findUnique({
      where: { favId },
      select: { userId: true }
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    if (favorite.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to remove this favorite'
      });
    }

    // Remove from favorites
    await prisma.favorites.delete({
      where: { favId }
    });

    res.status(200).json({
      success: true,
      message: 'Tattoo removed from favorites'
    });

  } catch (err) {
    console.error('DELETE /favorites/:id error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to remove tattoo from favorites',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
