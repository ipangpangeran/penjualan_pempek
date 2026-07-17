import prisma from '../utils/prisma.js';
import { logAuditAction } from '../middleware/auditLogger.js';

// Get all products (active and inactive) with pricing
export const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        prices: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    return res.status(200).json({ products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil produk.' });
  }
};

// Get only active products (for selection in forms)
export const getActiveProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        prices: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    return res.status(200).json({ products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil produk aktif.' });
  }
};

// Create a new product and initialize pricing rows
export const createProduct = async (req, res) => {
  const { name, cogs, prices } = req.body; // prices is array: [{lapakId, price, target, het}]

  if (!name) {
    return res.status(400).json({ message: 'Nama produk harus diisi.' });
  }

  try {
    // Check if name exists
    const existing = await prisma.product.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: 'Nama produk sudah digunakan.' });
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        cogs: Number(cogs) || 0,
        isActive: true,
      },
    });

    // Create price records for lapak 1, 2, 3, 4
    const defaultPrices = [
      { lapakId: 1, price: 0, target: 0, het: 0 },
      { lapakId: 4, price: 0, target: 0, het: 0 },
      { lapakId: 2, price: 0, target: 0, het: 0 },
      { lapakId: 3, price: 0, target: 0, het: 0 },
    ];

    // Override defaults if provided
    if (prices && Array.isArray(prices)) {
      prices.forEach((p) => {
        const found = defaultPrices.find((d) => d.lapakId === p.lapakId);
        if (found) {
          found.price = Number(p.price) || 0;
          found.target = Number(p.target) || 0;
          found.het = Number(p.het) || 0;
        }
      });
    }

    for (const dp of defaultPrices) {
      await prisma.lapakPrice.create({
        data: {
          productId: newProduct.id,
          lapakId: dp.lapakId,
          price: dp.price,
          target: dp.target,
          het: dp.het,
        },
      });
    }

    await logAuditAction(req.user.username, 'CREATE_PRODUCT', `Menambahkan produk baru: ${name}`);

    return res.status(201).json({
      message: 'Produk berhasil ditambahkan.',
      product: newProduct,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat membuat produk.' });
  }
};

// Update product name and pricing
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, cogs, prices } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Nama produk harus diisi.' });
  }

  try {
    const productId = parseInt(id);
    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    }

    // Check if name is taken by other product
    if (name !== existingProduct.name) {
      const taken = await prisma.product.findUnique({ where: { name } });
      if (taken) {
        return res.status(400).json({ message: 'Nama produk sudah digunakan.' });
      }
    }

    // Update product name and cogs
    await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        cogs: Number(cogs) || 0,
      },
    });

    // Update prices if provided
    if (prices && Array.isArray(prices)) {
      for (const p of prices) {
        await prisma.lapakPrice.upsert({
          where: {
            productId_lapakId: {
              productId: productId,
              lapakId: p.lapakId,
            },
          },
          update: {
            price: Number(p.price) || 0,
            target: Number(p.target) || 0,
            het: Number(p.het) || 0,
          },
          create: {
            productId: productId,
            lapakId: p.lapakId,
            price: Number(p.price) || 0,
            target: Number(p.target) || 0,
            het: Number(p.het) || 0,
          },
        });
      }
    }

    await logAuditAction(
      req.user.username,
      'UPDATE_PRODUCT',
      `Memperbarui produk ID: ${id} (${name})`
    );

    return res.status(200).json({ message: 'Produk dan harga berhasil diperbarui.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat memperbarui produk.' });
  }
};

// Toggle product active status
export const toggleProductStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  try {
    const productId = parseInt(id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    }

    await prisma.product.update({
      where: { id: productId },
      data: { isActive: !!isActive },
    });

    const statusText = isActive ? 'mengaktifkan' : 'menonaktifkan';
    await logAuditAction(
      req.user.username,
      'TOGGLE_PRODUCT',
      `Berhasil ${statusText} produk ${product.name}`
    );

    return res.status(200).json({ message: `Produk berhasil di-${statusText}.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// Delete product (only if it has no sales history to maintain integrity)
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const productId = parseInt(id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    }

    // Check if product has sales details
    const hasSales = await prisma.salesDetail.findFirst({
      where: { productId },
    });

    if (hasSales) {
      return res.status(400).json({
        message: 'Produk tidak bisa dihapus karena memiliki riwayat penjualan. Silakan nonaktifkan (Deactivate) statusnya saja.',
      });
    }

    // Delete associated lapak prices first
    await prisma.lapakPrice.deleteMany({
      where: { productId },
    });

    // Delete product
    await prisma.product.delete({
      where: { id: productId },
    });

    await logAuditAction(
      req.user.username,
      'DELETE_PRODUCT',
      `Menghapus produk: ${product.name}`
    );

    return res.status(200).json({ message: 'Produk berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server saat menghapus produk.' });
  }
};
