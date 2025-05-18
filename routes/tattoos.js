const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const prisma = new PrismaClient();

// Create new tattoo
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Verify the user is an artist
    const artist = await prisma.artists.findFirst({
      where: { userId }
    });

    if (!artist) {
      return res.status(403).json({
        success: false,
        message: 'Only artists can create tattoos'
      });
    }

    const {
      tattooName,
      imageURL,
      styleIds
    } = req.body;

    // Validate required fields
    if (!imageURL) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    if (!styleIds || !Array.isArray(styleIds) || styleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one style must be specified'
      });
    }

    // Create tattoo and assign styles in a transaction
    const newTattoo = await prisma.$transaction(async (prisma) => {
      // Create the tattoo
      const tattoo = await prisma.tattoos.create({
        data: {
          artistId: artist.artistId,
          tattooName: tattooName || null,
          imageURL
        }
      });

      // Create style associations
      const styleLinks = styleIds.map(styleId => ({
        tattooId: tattoo.tattooId,
        styleId: parseInt(styleId)
      }));

      await prisma.tattoostyles.createMany({
        data: styleLinks
      });

      // Fetch the complete tattoo data with related information
      return await prisma.tattoos.findUnique({
        where: {
          tattooId: tattoo.tattooId
        },
        select: {
          tattooId: true,
          tattooName: true,
          imageURL: true,
          artistId: true,
          users: {
            select: {
              artistId: true,
              users: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              imageURL: true
            }
          },
          tattoostyles: {
            select: {
              styles: {
                select: {
                  styleId: true,
                  styleName: true,
                  description: true
                }
              }
            }
          }
        }
      });
    });

    // Format the response
    const formattedTattoo = {
      id: newTattoo.tattooId,
      name: newTattoo.tattooName,
      imageURL: newTattoo.imageURL,
      artist: {
        artistId: newTattoo.users.artistId,
        firstName: newTattoo.users.users.firstName,
        lastName: newTattoo.users.users.lastName,
        imageURL: newTattoo.users.imageURL
      },
      styles: newTattoo.tattoostyles.map(ts => ({
        id: ts.styles.styleId,
        name: ts.styles.styleName,
        description: ts.styles.description
      }))
    };

    res.status(201).json({
      success: true,
      message: 'Tattoo created successfully',
      tattoo: formattedTattoo
    });

  } catch (err) {
    console.error('POST /tattoos error:', err);

    // Handle specific Prisma errors
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'One or more style IDs are invalid'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create tattoo',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
