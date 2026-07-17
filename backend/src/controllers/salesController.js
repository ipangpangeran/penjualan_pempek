import prisma from '../utils/prisma.js';
import { logAuditAction } from '../middleware/auditLogger.js';

// Get single sale detail (handles all Lapaks)
export const getSaleById = async (req, res) => {
  const { id } = req.params;
  try {
    const sale = await prisma.salesHeader.findUnique({
      where: { id: parseInt(id) },
      include: {
        details: {
          include: {
            product: true,
          },
        },
      },
    });
    if (!sale) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    }
    return res.status(200).json({ sale });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// Create Sale (handles Lapak 1, 2, and 3)
export const createSale = async (req, res) => {
  const { lapakId, saleDate, buyerName, items } = req.body;

  const targetLapakId = parseInt(lapakId);
  if (targetLapakId !== 1 && targetLapakId !== 2 && targetLapakId !== 3) {
    return res.status(400).json({ message: 'ID Lapak tidak valid.' });
  }

  if (!buyerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Nama pembeli/reseller dan produk belanja harus diisi.' });
  }

  try {
    const parsedDate = saleDate ? new Date(saleDate) : new Date();

    // Generate unique invoice prefix based on lapakId
    const timestamp = Date.now();
    const invoiceNumber = `INV-L${targetLapakId}-${timestamp}`;

    let totalAmount = 0; // Omzet kotor
    let totalHakIpang = 0; // Bersih untuk Ipang
    let totalFee = 0; // Fee sharing
    let totalProfit = 0; // Untung bersih
    const detailsData = [];

    // Fetch fee settings (7%)
    const feeSetting = await prisma.setting.findUnique({ where: { key: 'reseller_fee_percentage' } });
    const feePercentage = parseFloat(feeSetting?.value || '7.0') / 100.0;

    for (const item of items) {
      const qty = parseInt(item.qty) || 0;
      if (qty <= 0) continue; // skip zero/negative qtys

      const product = await prisma.product.findUnique({
        where: { id: parseInt(item.productId) },
        include: { prices: { where: { lapakId: targetLapakId } } },
      });

      if (!product || !product.isActive) {
        return res.status(400).json({ message: `Produk ID ${item.productId} tidak aktif atau tidak ditemukan.` });
      }

      const priceRecord = product.prices[0] || {};
      const cogs = product.cogs || 0;
      
      let price = 0;
      let target = 0;
      let het = 0;
      let fee = 0;
      let hakIpang = 0;
      let omzet = 0;

      if (targetLapakId === 1) {
        // Direct sale: price is basic price
        price = priceRecord.price || 0;
        target = 0;
        het = 0;
        fee = 0;
        hakIpang = price * qty;
        omzet = price * qty;
      } else {
        // Reseller: price is HET
        target = priceRecord.target || 0;
        het = priceRecord.het || 0;
        price = het;
        fee = het * feePercentage * qty;
        hakIpang = target * qty;
        omzet = het * qty;
      }

      // Net profit = Hak Ipang - (Harga Modal * Qty)
      const profit = hakIpang - (cogs * qty);

      totalAmount += omzet;
      totalHakIpang += hakIpang;
      totalFee += fee;
      totalProfit += profit;

      detailsData.push({
        productId: product.id,
        qty,
        price,
        target,
        het,
        fee,
        hakIpang,
        omzet,
        cogs,
        profit,
        subtotal: price * qty, // equals omzet
      });
    }

    if (detailsData.length === 0) {
      return res.status(400).json({ message: 'Jumlah produk terjual harus lebih besar dari 0.' });
    }

    // Write to database in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const header = await tx.salesHeader.create({
        data: {
          invoiceNumber,
          buyerName,
          saleDate: parsedDate,
          lapakId: targetLapakId,
          totalAmount,
          totalHakIpang,
          totalFee,
          totalProfit,
          details: {
            create: detailsData.map((d) => ({
              productId: d.productId,
              qty: d.qty,
              price: d.price,
              target: d.target,
              het: d.het,
              fee: d.fee,
              hakIpang: d.hakIpang,
              omzet: d.omzet,
              cogs: d.cogs,
              profit: d.profit,
              subtotal: d.subtotal,
            })),
          },
        },
        include: {
          details: true,
        },
      });
      return header;
    });

    const lapakNames = { 1: 'Lapak Ipang', 2: 'Kang Asep PJP', 3: 'Kang Asep RDTX & GRHA' };
    await logAuditAction(
      req.user.username,
      'CREATE_SALE',
      `Input penjualan ${lapakNames[targetLapakId]}. Invoice: ${invoiceNumber}, Pembeli: ${buyerName}, Untung Bersih: Rp ${totalProfit.toLocaleString('id-ID')}`
    );

    return res.status(201).json({
      message: `Penjualan ${lapakNames[targetLapakId]} berhasil disimpan.`,
      sale: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat menyimpan penjualan.' });
  }
};

// Update Sale (handles Lapak 1, 2, and 3)
export const updateSale = async (req, res) => {
  const { id } = req.params;
  const { saleDate, buyerName, items } = req.body;

  if (!buyerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Nama pembeli/reseller dan produk belanja harus diisi.' });
  }

  try {
    const saleId = parseInt(id);
    const existing = await prisma.salesHeader.findUnique({ where: { id: saleId } });
    if (!existing) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    }

    const parsedDate = saleDate ? new Date(saleDate) : existing.saleDate;
    const targetLapakId = existing.lapakId;

    let totalAmount = 0;
    let totalHakIpang = 0;
    let totalFee = 0;
    let totalProfit = 0;
    const detailsData = [];

    // Fetch fee settings (7%)
    const feeSetting = await prisma.setting.findUnique({ where: { key: 'reseller_fee_percentage' } });
    const feePercentage = parseFloat(feeSetting?.value || '7.0') / 100.0;

    for (const item of items) {
      const qty = parseInt(item.qty) || 0;
      if (qty <= 0) continue;

      const product = await prisma.product.findUnique({
        where: { id: parseInt(item.productId) },
        include: { prices: { where: { lapakId: targetLapakId } } },
      });

      if (!product) {
        return res.status(400).json({ message: `Produk ID ${item.productId} tidak ditemukan.` });
      }

      const priceRecord = product.prices[0] || {};
      const cogs = product.cogs || 0;
      
      let price = 0;
      let target = 0;
      let het = 0;
      let fee = 0;
      let hakIpang = 0;
      let omzet = 0;

      if (targetLapakId === 1) {
        price = priceRecord.price || 0;
        target = 0;
        het = 0;
        fee = 0;
        hakIpang = price * qty;
        omzet = price * qty;
      } else {
        target = priceRecord.target || 0;
        het = priceRecord.het || 0;
        price = het;
        fee = het * feePercentage * qty;
        hakIpang = target * qty;
        omzet = het * qty;
      }

      // Net profit
      const profit = hakIpang - (cogs * qty);

      totalAmount += omzet;
      totalHakIpang += hakIpang;
      totalFee += fee;
      totalProfit += profit;

      detailsData.push({
        productId: product.id,
        qty,
        price,
        target,
        het,
        fee,
        hakIpang,
        omzet,
        cogs,
        profit,
        subtotal: price * qty,
      });
    }

    if (detailsData.length === 0) {
      return res.status(400).json({ message: 'Transaksi harus berisi minimal 1 produk dengan Qty > 0.' });
    }

    // Update inside transaction: delete details, recreate details, update header
    const result = await prisma.$transaction(async (tx) => {
      // Delete old details
      await tx.salesDetail.deleteMany({ where: { salesHeaderId: saleId } });

      // Update header
      const updated = await tx.salesHeader.update({
        where: { id: saleId },
        data: {
          buyerName,
          saleDate: parsedDate,
          totalAmount,
          totalHakIpang,
          totalFee,
          totalProfit,
          details: {
            create: detailsData.map((d) => ({
              productId: d.productId,
              qty: d.qty,
              price: d.price,
              target: d.target,
              het: d.het,
              fee: d.fee,
              hakIpang: d.hakIpang,
              omzet: d.omzet,
              cogs: d.cogs,
              profit: d.profit,
              subtotal: d.subtotal,
            })),
          },
        },
        include: {
          details: true,
        },
      });
      return updated;
    });

    const lapakNames = { 1: 'Lapak Ipang', 2: 'Kang Asep PJP', 3: 'Kang Asep RDTX & GRHA' };
    await logAuditAction(
      req.user.username,
      'UPDATE_SALE',
      `Edit penjualan ${lapakNames[targetLapakId]}. Invoice: ${existing.invoiceNumber}, Pembeli: ${buyerName}, Untung Bersih: Rp ${totalProfit.toLocaleString('id-ID')}`
    );

    return res.status(200).json({
      message: 'Transaksi penjualan berhasil diperbarui.',
      sale: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat memperbarui transaksi.' });
  }
};

// Delete Sale (handles Lapak 1, 2, and 3)
export const deleteSale = async (req, res) => {
  const { id } = req.params;
  try {
    const saleId = parseInt(id);
    const sale = await prisma.salesHeader.findUnique({ where: { id: saleId } });
    if (!sale) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    }

    await prisma.salesHeader.delete({ where: { id: saleId } });

    const lapakNames = { 1: 'Lapak Ipang', 2: 'Kang Asep PJP', 3: 'Kang Asep RDTX & GRHA' };
    await logAuditAction(
      req.user.username,
      'DELETE_SALE',
      `Hapus penjualan ${lapakNames[sale.lapakId]}. Invoice: ${sale.invoiceNumber}, Pembeli: ${sale.buyerName}`
    );

    return res.status(200).json({ message: 'Transaksi penjualan berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};
