import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma.js';
import { logAuditAction } from '../middleware/auditLogger.js';

// Backup database file
export const backupDatabase = (req, res) => {
  try {
    const dbPath = path.resolve('prisma/dev.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ message: 'File database tidak ditemukan.' });
    }

    // Return the SQLite db file as download
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `pempek_gf_backup_${dateStr}.db`;

    res.download(dbPath, filename, async (err) => {
      if (err) {
        console.error('Gagal mengirim file database:', err);
      } else {
        await logAuditAction(req.user.username, 'BACKUP_DATABASE', 'Melakukan backup database');
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal melakukan backup database.' });
  }
};

// Restore database file
export const restoreDatabase = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File backup (.db) tidak disediakan.' });
  }

  const tempFilePath = req.file.path;
  const dbPath = path.resolve('prisma/dev.db');

  try {
    // 1. Disconnect Prisma
    await prisma.$disconnect();

    // 2. Overwrite the database file
    fs.copyFileSync(tempFilePath, dbPath);

    // 3. Remove the temp file uploaded
    fs.unlinkSync(tempFilePath);

    // Write audit log to the newly restored database
    await logAuditAction(req.user.username, 'RESTORE_DATABASE', 'Berhasil merestore database dari file backup');

    return res.status(200).json({ message: 'Database berhasil direstore.' });
  } catch (error) {
    console.error('Gagal merestore database:', error);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    return res.status(500).json({ message: 'Gagal merestore database. Pastikan file valid.' });
  }
};

// Get system audit logs
export const getAuditLogs = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;

  try {
    const p = parseInt(page);
    const l = parseInt(limit);
    const skip = (p - 1) * l;

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { action: { contains: search } },
        { details: { contains: search } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: l,
    });

    const total = await prisma.auditLog.count({ where });

    return res.status(200).json({
      logs,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil audit log.' });
  }
};

// Clear all audit logs
export const clearAuditLogs = async (req, res) => {
  try {
    await prisma.auditLog.deleteMany({});
    
    // Log the clear action
    await logAuditAction(req.user.username, 'CLEAR_AUDIT_LOG', 'Membersihkan seluruh riwayat audit log untuk menghemat penyimpanan');

    return res.status(200).json({ message: 'Riwayat audit log berhasil dibersihkan.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal membersihkan audit log.' });
  }
};

