import prisma from '../utils/prisma.js';

export const logAuditAction = async (username, action, details) => {
  try {
    await prisma.auditLog.create({
      data: {
        username: username || 'System',
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
      },
    });
  } catch (error) {
    console.error('Gagal menulis audit log:', error);
  }
};
