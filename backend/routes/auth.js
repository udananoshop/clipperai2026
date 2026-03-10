// 🔒 LOCKED MODULE - OVERLORD STABLE VERSION
// Auth System - FINAL
// DO NOT MODIFY WITHOUT ISOLATED TEST ENVIRONMENT

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* =========================================================
   ENV VALIDATION
========================================================= */
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET missing in .env");
  process.exit(1);
}

/* =========================================================
   REGISTER
========================================================= */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Password minimum 4 characters'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username
      }
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/* =========================================================
   LOGIN - WITH DEBUG LOGGING
========================================================= */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("🔐 LOGIN ATTEMPT:", { username, passwordLength: password?.length });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials'
      });
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { username }
    });

    console.log("🔍 User found:", user ? `ID: ${user.id}, Username: ${user.username}` : "NULL");
    console.log("🔍 Stored password hash:", user?.password ? "EXISTS" : "NULL");

    if (!user) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Compare password with bcrypt
    const valid = await bcrypt.compare(password, user.password);
    console.log("🔍 bcrypt.compare result:", valid);

    if (!valid) {
      console.log("❌ Wrong password");
      return res.status(401).json({
        success: false,
        error: 'Wrong password'
      });
    }

    console.log("✅ Login successful for:", username);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username
        }
      }
    });

  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/* =========================================================
   GET CURRENT USER (PROTECTED)
========================================================= */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

module.exports = router;
