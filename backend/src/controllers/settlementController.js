import prisma from '../utils/prisma.js';
import { logAuditAction } from '../middleware/auditLogger.js';

// Get settlement records (optionally filtered by date range)
export const getSettlements = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const where = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.settlementDate = {
        gte: start,
        lte: end,
      };
    }

    const settlements = await prisma.resellerSettlement.findMany({
      where,
      orderBy: {
        settlementDate: 'desc',
      },
    });

    return res.status(200).json({ settlements });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil data setoran.' });
  }
};

// Create a new settlement payment from Kang Asep
export const createSettlement = async (req, res) => {
  const { settlementDate, amount, paymentMethod, notes } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Nominal setoran harus lebih dari 0.' });
  }

  const allowedMethods = ['QRIS', 'TF', 'CASH'];
  const method = allowedMethods.includes(paymentMethod) ? paymentMethod : 'TF';

  try {
    const parsedDate = settlementDate ? new Date(settlementDate) : new Date();

    const settlement = await prisma.resellerSettlement.create({
      data: {
        settlementDate: parsedDate,
        amount: Number(amount),
        paymentMethod: method,
        notes: notes || '',
      },
    });

    await logAuditAction(
      req.user.username,
      'CREATE_SETTLEMENT',
      `Mencatat setoran Kang Asep: Rp ${Number(amount).toLocaleString('id-ID')} via ${method}`
    );

    return res.status(201).json({
      message: 'Catatan setoran Kang Asep berhasil disimpan.',
      settlement,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat menyimpan setoran.' });
  }
};

// Delete a settlement record
export const deleteSettlement = async (req, res) => {
  const { id } = req.params;

  try {
    const settlementId = parseInt(id);
    const existing = await prisma.resellerSettlement.findUnique({ where: { id: settlementId } });

    if (!existing) {
      return res.status(404).json({ message: 'Catatan setoran tidak ditemukan.' });
    }

    await prisma.resellerSettlement.delete({ where: { id: settlementId } });

    await logAuditAction(
      req.user.username,
      'DELETE_SETTLEMENT',
      `Menghapus catatan setoran ID ${id}: Rp ${existing.amount.toLocaleString('id-ID')}`
    );

    return res.status(200).json({ message: 'Catatan setoran berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat menghapus setoran.' });
  }
};
