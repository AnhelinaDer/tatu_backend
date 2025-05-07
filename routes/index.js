const { Prisma } = require('@prisma/client');
const express = require('express');
const router = express.Router();
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

/* GET home page. */
router.get('/', async(req, res, next) => {
  const users = prisma.user.findMany();
  res.render('index', { title: 'Express' });
});

module.exports = router;
