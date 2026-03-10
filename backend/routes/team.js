/**
 * Team Management Routes
 * API endpoints for managing team members
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../utils/asyncHandler');
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Default permissions by role
const DEFAULT_PERMISSIONS = {
  owner: {
    upload_video: true,
    generate_clips: true,
    view_analytics: true,
    manage_team: true,
    export_data: true
  },
  admin: {
    upload_video: true,
    generate_clips: true,
    view_analytics: true,
    manage_team: true,
    export_data: true
  },
  editor: {
    upload_video: true,
    generate_clips: true,
    view_analytics: false,
    manage_team: false,
    export_data: false
  },
  viewer: {
    upload_video: false,
    generate_clips: false,
    view_analytics: true,
    manage_team: false,
    export_data: false
  }
};

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1
};

// Check if current user can manage target user
function canManageMember(currentUser, targetUser) {
  // Owner can manage anyone
  if (currentUser.role === 'owner') return true;
  
  // Admin can only manage editors and viewers
  if (currentUser.role === 'admin') {
    return targetUser.role !== 'owner' && targetUser.role !== 'admin';
  }
  
  return false;
}

// GET /api/team/members - Get all team members with pagination
router.get('/members', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Cap at 50 for performance
  const skip = (pageNum - 1) * limitNum;

  // Get total count for pagination
  const totalMembers = await prisma.user.count();

  // Get paginated members - optimized query
  const members = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      permissions: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    },
    skip,
    take: limitNum
  });

  // Parse permissions JSON for each member
  const formattedMembers = members.map(member => ({
    ...member,
    permissions: JSON.parse(member.permissions || '{}'),
    videosProcessed: 0, // Placeholder - would need join with videos table
    status: 'active' // Placeholder for status
  }));

  res.json({
    success: true,
    data: formattedMembers,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalMembers,
      pages: Math.ceil(totalMembers / limitNum)
    }
  });
}));

// GET /api/team/member/:id - Get a specific member
router.get('/member/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Get target member
  const member = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      username: true,
      role: true,
      permissions: true,
      createdAt: true
    }
  });

  if (!member) {
    return res.status(404).json({
      success: false,
      error: 'Member not found'
    });
  }

  res.json({
    success: true,
    data: {
      ...member,
      permissions: JSON.parse(member.permissions || '{}')
    }
  });
}));

// PATCH /api/team/member/:id/role - Change member role
router.patch('/member/:id/role', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const currentUserId = req.user.id;

  // Validate role
  const validRoles = ['owner', 'admin', 'editor', 'viewer'];
  if (!role || !validRoles.includes(role.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role. Must be one of: owner, admin, editor, viewer'
    });
  }

  const newRole = role.toLowerCase();

  // Get current user with their role
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, role: true }
  });

  // Get target user
  const targetUser = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, role: true }
  });

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: 'Member not found'
    });
  }

  // Prevent self-demotion from owner
  if (currentUserId === parseInt(id) && currentUser.role === 'owner' && newRole !== 'owner') {
    return res.status(400).json({
      success: false,
      error: 'Cannot change your own role as owner'
    });
  }

  // Check permissions
  if (!canManageMember(currentUser, targetUser)) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to manage this member'
    });
  }

  // Prevent promoting to owner
  if (newRole === 'owner' && currentUser.role !== 'owner') {
    return res.status(403).json({
      success: false,
      error: 'Only owner can promote to owner role'
    });
  }

  // Update role
  const updatedMember = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { role: newRole },
    select: {
      id: true,
      username: true,
      role: true,
      permissions: true,
      createdAt: true
    }
  });

  // Update permissions based on new role
  const defaultPerms = DEFAULT_PERMISSIONS[newRole];
  await prisma.user.update({
    where: { id: parseInt(id) },
    data: { permissions: JSON.stringify(defaultPerms) }
  });

  res.json({
    success: true,
    message: `Role changed to ${newRole}`,
    data: {
      ...updatedMember,
      permissions: defaultPerms
    }
  });
}));

// PATCH /api/team/member/:id/permissions - Update member permissions
router.patch('/member/:id/permissions', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  const currentUserId = req.user.id;

  // Validate permissions object
  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Permissions must be an object'
    });
  }

  // Validate permission keys
  const validPerms = ['upload_video', 'generate_clips', 'view_analytics', 'manage_team', 'export_data'];
  for (const key of Object.keys(permissions)) {
    if (!validPerms.includes(key)) {
      return res.status(400).json({
        success: false,
        error: `Invalid permission key: ${key}`
      });
    }
  }

  // Get current user
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, role: true }
  });

  // Only owner and admin can manage permissions
  if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only owner and admin can manage permissions'
    });
  }

  // Get target user
  const targetUser = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, role: true }
  });

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: 'Member not found'
    });
  }

  // Admin cannot modify owner or admin permissions
  if (currentUser.role === 'admin' && (targetUser.role === 'owner' || targetUser.role === 'admin')) {
    return res.status(403).json({
      success: false,
      error: 'Admin cannot modify owner or admin permissions'
    });
  }

  // Merge with default permissions for the user's role
  const currentPerms = JSON.parse(targetUser.permissions || '{}');
  const mergedPerms = { ...DEFAULT_PERMISSIONS[targetUser.role], ...currentPerms, ...permissions };

  // Update permissions
  const updatedMember = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { permissions: JSON.stringify(mergedPerms) },
    select: {
      id: true,
      username: true,
      role: true,
      permissions: true,
      createdAt: true
    }
  });

  res.json({
    success: true,
    message: 'Permissions updated',
    data: {
      ...updatedMember,
      permissions: mergedPerms
    }
  });
}));

// DELETE /api/team/member/:id - Remove member
router.delete('/member/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Prevent self-removal
  if (currentUserId === parseInt(id)) {
    return res.status(400).json({
      success: false,
      error: 'Cannot remove yourself from the team'
    });
  }

  // Get current user
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { id: true, role: true }
  });

  // Get target user
  const targetUser = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    select: { id: true, role: true }
  });

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: 'Member not found'
    });
  }

  // Check permissions
  if (!canManageMember(currentUser, targetUser)) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to remove this member'
    });
  }

  // Delete member
  await prisma.user.delete({
    where: { id: parseInt(id) }
  });

  res.json({
    success: true,
    message: 'Member removed successfully'
  });
}));

// POST /api/team/invite - Invite a new team member (placeholder for future implementation)
router.post('/invite', asyncHandler(async (req, res) => {
  const { email, role = 'viewer' } = req.body;

  // Validate email
  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Valid email is required'
    });
  }

  // Validate role
  const validRoles = ['admin', 'editor', 'viewer'];
  if (!validRoles.includes(role.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role for invitation'
    });
  }

  // Get current user
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, role: true }
  });

  // Only owner and admin can invite
  if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only owner and admin can invite team members'
    });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { username: email.split('@')[0] }
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'User already exists'
    });
  }

  // In a real implementation, this would create an invitation record
  // and send an email. For now, we return a placeholder response.
  res.status(201).json({
    success: true,
    message: 'Invitation sent (placeholder - implement email logic)',
    data: {
      email,
      role: role.toLowerCase(),
      status: 'pending'
    }
  });
}));

module.exports = router;

