/**
 * Set default roles for existing users
 * Run this once to initialize user roles
 */

require('dotenv').config();
const prisma = require('./prisma/client');

async function setDefaultRoles() {
  try {
    console.log('🔄 Setting default roles for existing users...');

    // Get all users
    const users = await prisma.user.findMany();
    
    console.log(`Found ${users.length} users`);

    // Set first user as owner, others as viewer by default
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const role = i === 0 ? 'owner' : 'viewer';
      
      // Default permissions based on role
      const permissions = {
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

      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: role,
          permissions: JSON.stringify(permissions[role])
        }
      });

      console.log(`✅ Set user "${user.username}" as ${role}`);
    }

    console.log('🎉 Default roles set successfully!');
  } catch (error) {
    console.error('❌ Error setting default roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setDefaultRoles();

