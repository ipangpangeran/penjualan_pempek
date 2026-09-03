import prisma from '../utils/prisma.js';
import { logAuditAction } from '../middleware/auditLogger.js';

// Get all supplier reconciliation records (filtered optionally by date range)
export const getReconciliations = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const where = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.reconcileDate = {
        gte: start,
        lte: end,
      };
    }

    const reconciliations = await prisma.supplierReconciliation.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        reconcileDate: 'desc',
      },
    });

    return res.status(200).json({ reconciliations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil data rekon.' });
  }
};

// Create a new supplier reconciliation record (Rekon Mba Rere)
export const createReconciliation = async (req, res) => {
  const { reconcileDate, notes, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Rincian rekon harus berisi minimal 1 produk.' });
  }

  const validItems = items.filter((it) => it.productName && it.qty > 0);
  if (validItems.length === 0) {
    return res.status(400).json({ message: 'Semua baris harus memiliki produk dan jumlah (Qty) > 0.' });
  }

  try {
    let totalQty = 0;
    let totalAmount = 0;

    const formattedItems = validItems.map((it) => {
      const qty = parseInt(it.qty) || 0;
      const price = parseFloat(it.price) || 0;
      const subtotal = qty * price;

      totalQty += qty;
      totalAmount += subtotal;

      return {
        buyerName: it.buyerName ? it.buyerName.trim() : '',
        productId: it.productId ? parseInt(it.productId) : null,
        productName: it.productName,
        qty,
        price,
        subtotal,
      };
    });

    const parsedDate = reconcileDate ? new Date(reconcileDate) : new Date();

    const newRecon = await prisma.supplierReconciliation.create({
      data: {
        reconcileDate: parsedDate,
        notes: notes || '',
        totalQty,
        totalAmount,
        items: {
          create: formattedItems,
        },
      },
      include: {
        items: true,
      },
    });

    await logAuditAction(
      req.user?.username || 'admin',
      'CREATE_SUPPLIER_RECONCILIATION',
      `Mencatat Rekon Mba Rere ID ${newRecon.id}: Total Rp ${totalAmount.toLocaleString('id-ID')} (${totalQty} pcs)`
    );

    return res.status(201).json({
      message: 'Catatan rekon Mba Rere berhasil disimpan.',
      reconciliation: newRecon,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat menyimpan data rekon.' });
  }
};

// Delete a supplier reconciliation record
export const deleteReconciliation = async (req, res) => {
  const { id } = req.params;

  try {
    const reconId = parseInt(id);
    const existing = await prisma.supplierReconciliation.findUnique({
      where: { id: reconId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Catatan rekon tidak ditemukan.' });
    }

    await prisma.supplierReconciliation.delete({
      where: { id: reconId },
    });

    await logAuditAction(
      req.user?.username || 'admin',
      'DELETE_SUPPLIER_RECONCILIATION',
      `Menghapus catatan Rekon Mba Rere ID ${reconId}: Rp ${existing.totalAmount.toLocaleString('id-ID')}`
    );

    return res.status(200).json({ message: 'Catatan rekon berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat menghapus rekon.' });
  }
};
