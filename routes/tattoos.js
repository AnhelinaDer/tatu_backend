const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/tattoos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Get all tattoos for an artist
router.get('/artists/tattoos', async (req, res) => {
  try {
    const artistId = req.user.artistId; // Assuming you have authentication middleware
    const tattoos = await prisma.tattoos.findMany({
      where: { artistId },
      include: {
        tattoostyles: {
          include: {
            styles: true
          }
        }
      }
    });
    res.json(tattoos);
  } catch (error) {
    console.error('Error fetching tattoos:', error);
    res.status(500).json({ message: 'Error fetching tattoos' });
  }
});

// Upload a new tattoo
router.post('/artists/tattoos', upload.single('image'), async (req, res) => {
  try {
    const artistId = req.user.artistId; // Assuming you have authentication middleware
    const { name, styleIds } = req.body;
    const imageURL = `/uploads/tattoos/${req.file.filename}`;

    const tattoo = await prisma.tattoos.create({
      data: {
        artistId,
        tattooName: name,
        imageURL,
        tattoostyles: {
          create: styleIds.map(styleId => ({
            styleId: parseInt(styleId)
          }))
        }
      },
      include: {
        tattoostyles: {
          include: {
            styles: true
          }
        }
      }
    });

    res.status(201).json(tattoo);
  } catch (error) {
    console.error('Error creating tattoo:', error);
    res.status(500).json({ message: 'Error creating tattoo' });
  }
});

// Delete a tattoo
router.delete('/artists/tattoos/:tattooId', async (req, res) => {
  try {
    const { tattooId } = req.params;
    const artistId = req.user.artistId; // Assuming you have authentication middleware

    // Verify the tattoo belongs to the artist
    const tattoo = await prisma.tattoos.findFirst({
      where: {
        tattooId: parseInt(tattooId),
        artistId
      }
    });

    if (!tattoo) {
      return res.status(404).json({ message: 'Tattoo not found' });
    }

    // Delete the image file
    if (tattoo.imageURL) {
      const imagePath = path.join(__dirname, '..', 'public', tattoo.imageURL);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the tattoo and its related records
    await prisma.tattoostyles.deleteMany({
      where: { tattooId: parseInt(tattooId) }
    });

    await prisma.tattoos.delete({
      where: { tattooId: parseInt(tattooId) }
    });

    res.json({ message: 'Tattoo deleted successfully' });
  } catch (error) {
    console.error('Error deleting tattoo:', error);
    res.status(500).json({ message: 'Error deleting tattoo' });
  }
});

module.exports = router;
