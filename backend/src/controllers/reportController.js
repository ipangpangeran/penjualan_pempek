import prisma from '../utils/prisma.js';

// Local date formatting helper
const getLocalDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

// Get Dashboard Summary Stats
export const getDashboardSummary = async (req, res) => {
  try {
    const todayStr = getLocalDateString(new Date());
    const todayStart = new Date(todayStr + 'T00:00:00.000Z');
    const todayEnd = new Date(todayStr + 'T23:59:59.999Z');

    const firstDayMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // 1. Today stats
    const todayAgg = await prisma.salesHeader.aggregate({
      where: { saleDate: { gte: todayStart, lte: todayEnd } },
      _sum: { totalAmount: true, totalHakIpang: true, totalFee: true, totalProfit: true },
    });

    // 2. Month stats
    const monthAgg = await prisma.salesHeader.aggregate({
      where: { saleDate: { gte: firstDayMonth } },
      _sum: { totalAmount: true, totalHakIpang: true, totalFee: true, totalProfit: true },
    });

    // 3. Overall stats
    const overallAgg = await prisma.salesHeader.aggregate({
      _sum: { totalAmount: true, totalHakIpang: true, totalFee: true, totalProfit: true },
    });

    // 4. Top products by volume
    const topProductsRaw = await prisma.salesDetail.groupBy({
      by: ['productId'],
      _sum: { qty: true },
      orderBy: { _sum: { qty: 'desc' } },
      take: 5,
    });

    const topSellingProducts = [];
    let topProductName = '-';

    for (let i = 0; i < topProductsRaw.length; i++) {
      const entry = topProductsRaw[i];
      const product = await prisma.product.findUnique({ where: { id: entry.productId } });
      if (product) {
        topSellingProducts.push({
          id: product.id,
          name: product.name,
          qty: entry._sum.qty || 0,
        });
        if (i === 0) {
          topProductName = `${product.name} (${entry._sum.qty} pcs)`;
        }
      }
    }

    // 5. Chart data (last 30 days)
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = getLocalDateString(d);
      const dStart = new Date(dStr + 'T00:00:00.000Z');
      const dEnd = new Date(dStr + 'T23:59:59.999Z');

      const dayAgg = await prisma.salesHeader.aggregate({
        where: { saleDate: { gte: dStart, lte: dEnd } },
        _sum: { totalAmount: true },
      });

      const formattedDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      chartData.push({
        date: dStr,
        formattedDate,
        omzet: dayAgg._sum.totalAmount || 0,
      });
    }

    return res.status(200).json({
      today: {
        omzet: todayAgg._sum.totalAmount || 0,
        hakIpang: todayAgg._sum.totalHakIpang || 0,
        fee: todayAgg._sum.totalFee || 0,
        profit: todayAgg._sum.totalProfit || 0,
      },
      month: {
        omzet: monthAgg._sum.totalAmount || 0,
        hakIpang: monthAgg._sum.totalHakIpang || 0,
        fee: monthAgg._sum.totalFee || 0,
        profit: monthAgg._sum.totalProfit || 0,
      },
      overall: {
        omzet: overallAgg._sum.totalAmount || 0,
        hakIpang: overallAgg._sum.totalHakIpang || 0,
        fee: overallAgg._sum.totalFee || 0,
        profit: overallAgg._sum.totalProfit || 0,
        topProduct: topProductName,
      },
      topSellingProducts,
      chartData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal mengambil ringkasan dashboard.' });
  }
};

// Query Filtered Reports
export const queryReport = async (req, res) => {
  const { startDate, endDate, lapakId, search } = req.query;

  try {
    const where = {};

    // Date range filter
    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    // Lapak filter
    if (lapakId && lapakId !== 'all') {
      where.lapakId = parseInt(lapakId);
    }

    // Search filter (buyer name or invoice number)
    if (search) {
      where.OR = [
        { buyerName: { contains: search } },
        { invoiceNumber: { contains: search } },
      ];
    }

    // Fetch all sales headers matching filters
    const sales = await prisma.salesHeader.findMany({
      where,
      include: {
        details: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        saleDate: 'desc',
      },
    });

    // Compute aggregate summary of filtered results
    let totalOmzet = 0;
    let totalHakIpang = 0;
    let totalFee = 0;
    let totalProfit = 0;
    let totalQty = 0;
    const productQtyMap = {};

    sales.forEach((h) => {
      totalOmzet += h.totalAmount;
      totalHakIpang += h.totalHakIpang;
      totalFee += h.totalFee;
      totalProfit += h.totalProfit;

      h.details.forEach((d) => {
        totalQty += d.qty;
        if (!productQtyMap[d.product.name]) {
          productQtyMap[d.product.name] = 0;
        }
        productQtyMap[d.product.name] += d.qty;
      });
    });

    // Find top selling product in filtered results
    let topProduct = '-';
    let maxQty = 0;
    Object.entries(productQtyMap).forEach(([name, qty]) => {
      if (qty > maxQty) {
        maxQty = qty;
        topProduct = `${name} (${qty} pcs)`;
      }
    });

    // Separate direct (Lapak 1 & 4) vs reseller (Lapak 2 & 3)
    const directSales = sales.filter((s) => s.lapakId === 1 || s.lapakId === 4);
    const resellerSales = sales.filter((s) => s.lapakId === 2 || s.lapakId === 3);

    return res.status(200).json({
      summary: {
        totalOmzet,
        totalHakIpang,
        totalFee,
        totalProfit,
        totalQty,
        topProduct,
      },
      directSales,
      resellerSales,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal memproses query laporan.' });
  }
};
