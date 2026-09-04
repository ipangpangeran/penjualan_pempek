import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatRupiah, formatDateIndo, getLocalDateString } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import Modal from '../components/UI/Modal';
import {
  Calendar,
  FileText,
  Plus,
  Trash2,
  Save,
  Share2,
  Eye,
  RotateCcw,
  AlertCircle,
  Receipt,
  UserCheck,
  PackageCheck,
  Users,
} from 'lucide-react';
import QuantityStepper from '../components/UI/QuantityStepper';

const MBA_RERE_PRICES = {
  'Mix isi 50': 90000,
  'Mix isi 20': 45000,
  'Mix isi 10': 23000,
  'Lenjer Jumbo isi 2': 23000,
  'Lenjer isi 10': 23000,
  'Selam isi 10': 23000,
  'Kulit isi 10': 23000,
  'Adaan isi 10': 23000,
  'Selam Jumbo': 17000,
  'Pempek Keju isi 5': 23000,
  'Pempek Keju isi 10': 40000,
  'Tekwan ½ kg': 63000,
  'Tekwan 1 kg': 109000,
  'Tekwan ½ kg (Komplit)': 63000,
  'Tekwan 1 kg (Komplit)': 109000,
};

const RekonRere = () => {
  const { showToast } = useToast();

  // Active products catalog
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Form states: date, notes, and buyers list
  const [reconcileDate, setReconcileDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [buyers, setBuyers] = useState([
    {
      name: '',
      items: [{ productId: '', productName: '', qty: 1, price: 0, subtotal: 0 }],
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History states
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Detail Modal states
  const [selectedRecon, setSelectedRecon] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Share WhatsApp Modal states
  const [shareData, setShareData] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Fetch active products
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await api.get('/products/active');
      setProducts(response.data.products);
    } catch (error) {
      console.error(error);
      showToast('Gagal memuat daftar produk.', 'error');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch reconciliation history
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await api.get('/reconciliations');
      setHistory(response.data.reconciliations);
    } catch (error) {
      console.error(error);
      showToast('Gagal memuat riwayat rekon.', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchHistory();
  }, []);

  // --- Buyer & Product Management ---
  // Add a new buyer card
  const addBuyer = () => {
    setBuyers([
      ...buyers,
      {
        name: '',
        items: [{ productId: '', productName: '', qty: 1, price: 0, subtotal: 0 }],
      },
    ]);
  };

  // Remove a buyer card
  const removeBuyer = (buyerIndex) => {
    if (buyers.length === 1) {
      showToast('Minimal harus ada 1 pemesan.', 'warning');
      return;
    }
    setBuyers(buyers.filter((_, i) => i !== buyerIndex));
  };

  // Update buyer name
  const handleBuyerNameChange = (buyerIndex, name) => {
    const newBuyers = [...buyers];
    newBuyers[buyerIndex].name = name;
    setBuyers(newBuyers);
  };

  // Add a product row under a specific buyer
  const addProductToBuyer = (buyerIndex) => {
    const newBuyers = [...buyers];
    newBuyers[buyerIndex].items.push({
      productId: '',
      productName: '',
      qty: 1,
      price: 0,
      subtotal: 0,
    });
    setBuyers(newBuyers);
  };

  // Remove a product row from a specific buyer
  const removeProductFromBuyer = (buyerIndex, itemIndex) => {
    const newBuyers = [...buyers];
    if (newBuyers[buyerIndex].items.length === 1) {
      showToast('Setiap pemesan minimal memiliki 1 produk.', 'warning');
      return;
    }
    newBuyers[buyerIndex].items = newBuyers[buyerIndex].items.filter((_, i) => i !== itemIndex);
    setBuyers(newBuyers);
  };

  // Handle product row change for a specific buyer
  const handleItemChange = (buyerIndex, itemIndex, field, value) => {
    const newBuyers = [...buyers];
    const item = newBuyers[buyerIndex].items[itemIndex];

    if (field === 'productId') {
      const prodId = parseInt(value);
      item.productId = prodId;

      const product = products.find((p) => p.id === prodId);
      if (product) {
        item.productName = product.name;
        const defaultPrice = MBA_RERE_PRICES[product.name] ?? product.cogs ?? 0;
        item.price = defaultPrice;
      } else {
        item.productName = '';
        item.price = 0;
      }
    } else if (field === 'qty') {
      item.qty = parseInt(value) || 0;
    } else if (field === 'price') {
      item.price = parseFloat(value) || 0;
    }

    item.subtotal = (item.qty || 0) * (item.price || 0);
    setBuyers(newBuyers);
  };

  // Flatten buyers structure into flat items array
  const getFlattenedItems = () => {
    const flat = [];
    buyers.forEach((b) => {
      const bName = b.name.trim();
      b.items.forEach((it) => {
        if (it.productName && it.qty > 0) {
          flat.push({
            buyerName: bName,
            productId: it.productId,
            productName: it.productName,
            qty: it.qty,
            price: it.price,
            subtotal: it.subtotal,
          });
        }
      });
    });
    return flat;
  };

  // Calculations: Total Qty and Total Amount across all buyers
  const totalQty = buyers.reduce(
    (sum, b) => sum + b.items.reduce((iSum, it) => iSum + (it.qty || 0), 0),
    0
  );
  const totalAmount = buyers.reduce(
    (sum, b) => sum + b.items.reduce((iSum, it) => iSum + (it.subtotal || 0), 0),
    0
  );

  // Grouping 1: Total Rekap per Produk (For supplier preparation)
  const productSummary = {};
  buyers.forEach((b) => {
    b.items.forEach((it) => {
      if (it.productName && it.qty > 0) {
        if (!productSummary[it.productName]) {
          productSummary[it.productName] = { qty: 0, total: 0, price: it.price };
        }
        productSummary[it.productName].qty += it.qty;
        productSummary[it.productName].total += it.subtotal;
      }
    });
  });

  // Grouping 2: Total Rekap per Pembeli
  const buyerSummary = {};
  buyers.forEach((b) => {
    const name = b.name.trim() || 'Tanpa Nama';
    const validItems = b.items.filter((it) => it.productName && it.qty > 0);
    if (validItems.length > 0) {
      if (!buyerSummary[name]) {
        buyerSummary[name] = { qty: 0, total: 0, items: [] };
      }
      validItems.forEach((it) => {
        buyerSummary[name].qty += it.qty;
        buyerSummary[name].total += it.subtotal;
        buyerSummary[name].items.push(it);
      });
    }
  });

  // Reset form
  const handleReset = () => {
    setReconcileDate(getLocalDateString());
    setNotes('');
    setBuyers([
      {
        name: '',
        items: [{ productId: '', productName: '', qty: 1, price: 0, subtotal: 0 }],
      },
    ]);
  };

  // Save reconciliation
  const handleSubmit = async (e) => {
    e.preventDefault();

    const flatItems = getFlattenedItems();
    if (flatItems.length === 0) {
      showToast('Pilih minimal 1 produk dengan jumlah (Qty) lebih dari 0.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reconciliations', {
        reconcileDate,
        notes,
        items: flatItems,
      });

      showToast('Catatan Rekon Mba Rere berhasil disimpan!', 'success');
      handleReset();
      fetchHistory();
    } catch (error) {
      console.error(error);
      showToast('Gagal menyimpan rekon Mba Rere.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete reconciliation
  const handleDelete = async (id, amount) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus catatan rekon Rp ${amount.toLocaleString('id-ID')} ini?`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/reconciliations/${id}`);
      showToast('Catatan rekon berhasil dihapus.', 'success');
      fetchHistory();
    } catch (error) {
      console.error(error);
      showToast('Gagal menghapus catatan rekon.', 'error');
    }
  };

  // Build WhatsApp text from items (Grouped by Buyer Name consistently)
  const generateWAText = (targetItems, targetDate, targetNotes, targetTotal) => {
    const valid = targetItems.filter((it) => it.productName && it.qty > 0);
    if (valid.length === 0) return '';

    const dateStr = formatDateIndo(targetDate);
    let text = `*List Order*\n`;
    text += `----------------------------------\n`;
    text += `Tanggal: ${dateStr}\n`;
    if (targetNotes && targetNotes.trim()) {
      text += `Keterangan: ${targetNotes.trim()}\n`;
    }

    // Group items by Buyer Name
    const buyerGroups = {};
    valid.forEach((d) => {
      const buyer = d.buyerName && d.buyerName.trim() ? d.buyerName.trim() : 'Pesanan';
      if (!buyerGroups[buyer]) {
        buyerGroups[buyer] = [];
      }
      buyerGroups[buyer].push(d);
    });

    text += `\n*Rincian Pesanan:*\n`;
    Object.entries(buyerGroups).forEach(([buyer, bItems]) => {
      const buyerSubtotal = bItems.reduce((sum, it) => sum + it.subtotal, 0);
      text += `*${buyer}* (${formatRupiah(buyerSubtotal)})\n`;
      bItems.forEach((item) => {
        text += `• ${item.productName} (${item.qty} pcs) - ${formatRupiah(item.subtotal)}\n`;
      });
      text += `\n`;
    });

    // Summary of products to prepare
    const prodMap = {};
    let totalPcs = 0;
    valid.forEach((d) => {
      prodMap[d.productName] = (prodMap[d.productName] || 0) + d.qty;
      totalPcs += d.qty;
    });

    text += `*Rekap Total Barang Disiapkan:*\n`;
    Object.entries(prodMap).forEach(([pName, pQty]) => {
      text += `• ${pName}: ${pQty} pcs\n`;
    });
    text += `(Total: ${totalPcs} pcs)\n`;

    text += `\n----------------------------------\n`;
    text += `*Total Tagihan Mba Rere: ${formatRupiah(targetTotal)}*\n`;
    text += `----------------------------------\n`;
    text += `Terima kasih Mba Rere! 🙏`;

    return text;
  };

  // Open Share WA Modal
  const openShareModal = (targetItems, targetDate, targetNotes, targetTotal) => {
    const valid = targetItems.filter((it) => it.productName && it.qty > 0);
    if (valid.length === 0) {
      showToast('Belum ada produk yang dipilih untuk dibagikan.', 'warning');
      return;
    }

    const buyerGroups = {};
    valid.forEach((d) => {
      const buyer = d.buyerName && d.buyerName.trim() ? d.buyerName.trim() : 'Pesanan';
      if (!buyerGroups[buyer]) {
        buyerGroups[buyer] = [];
      }
      buyerGroups[buyer].push(d);
    });

    const text = generateWAText(targetItems, targetDate, targetNotes, targetTotal);
    setShareData({
      items: valid,
      buyerGroups,
      date: targetDate,
      notes: targetNotes,
      total: targetTotal,
      text,
    });
    setIsShareOpen(true);
  };

  // Copy text to clipboard
  const handleCopyClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast('Rincian rekon berhasil disalin ke clipboard!', 'success');
      })
      .catch((err) => {
        console.error('Gagal menyalin text: ', err);
        showToast('Gagal menyalin ke clipboard.', 'error');
      });
  };

  return (
    <div className="space-y-8 text-brand-text">
      {/* Header Banner */}
      <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-extrabold text-brand-text">Rekon Mba Rere</h2>
          </div>
          <p className="text-xs text-brand-text-muted mt-1">
            Catat nama pemesan, produk-produk yang dibeli, serta total tagihan yang harus dibayarkan ke penjual asli (Mba Rere).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20">
          <UserCheck className="w-4 h-4" />
          <span>Penjual Asli / Supplier</span>
        </div>
      </div>

      {/* Main Input Form */}
      <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Form Fields: Tanggal & Keterangan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-text-muted block">Tanggal Rekon</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  required
                  value={reconcileDate}
                  onChange={(e) => setReconcileDate(e.target.value)}
                  className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 px-9 text-xs focus:outline-none font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-text-muted block">Keterangan / Catatan (Opsional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
                  <FileText className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Contoh: Orderan batch siang, atau rekap harian..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 px-9 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* List of Buyer Sections */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                Daftar Pesanan Pemesan & Produk
              </h3>
              <span className="text-[10px] text-brand-text-muted">
                {buyers.length} Pemesan Terdaftar
              </span>
            </div>

            {buyers.map((buyer, buyerIndex) => {
              const buyerQty = buyer.items.reduce((s, it) => s + (it.qty || 0), 0);
              const buyerTotal = buyer.items.reduce((s, it) => s + (it.subtotal || 0), 0);

              return (
                <div
                  key={buyerIndex}
                  className="bg-brand-bg-input/60 rounded-2xl border border-brand-border/90 p-4 sm:p-5 space-y-3.5 transition-all shadow-xs"
                >
                  {/* Buyer Card Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
                    <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
                      <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        placeholder={`Nama Pemesan #${buyerIndex + 1} (contoh: Ipang)...`}
                        value={buyer.name}
                        onChange={(e) => handleBuyerNameChange(buyerIndex, e.target.value)}
                        className="w-full bg-brand-card border border-brand-border text-brand-text focus:border-indigo-500 rounded-xl py-1.5 px-3 text-xs focus:outline-none font-bold placeholder:text-brand-text-muted/60"
                      />
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-brand-text-muted block">Subtotal Pemesan</span>
                        <span className="text-xs font-bold text-indigo-400">
                          {formatRupiah(buyerTotal)}
                        </span>
                        <span className="text-[10px] text-brand-text-muted ml-1">({buyerQty} pcs)</span>
                      </div>

                      {buyers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBuyer(buyerIndex)}
                          className="p-1.5 text-brand-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Hapus Pemesan Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Buyer's Products Table */}
                  <div className="border border-brand-border/80 rounded-xl overflow-hidden shadow-sm overflow-x-auto bg-brand-card">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                          <th className="p-2.5 w-10 text-center">No</th>
                          <th className="p-2.5">Produk</th>
                          <th className="p-2.5 w-24 text-center">Qty</th>
                          <th className="p-2.5 w-32 text-right">Harga Satuan</th>
                          <th className="p-2.5 w-36 text-right">Subtotal</th>
                          <th className="p-2.5 w-12 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buyer.items.map((item, itemIndex) => (
                          <tr
                            key={itemIndex}
                            className="border-b border-brand-border/40 hover:bg-brand-table-hover/30 text-brand-text"
                          >
                            <td className="p-2.5 text-center font-mono text-brand-text-muted">{itemIndex + 1}</td>
                            <td className="p-2.5">
                              <select
                                value={item.productId}
                                onChange={(e) =>
                                  handleItemChange(buyerIndex, itemIndex, 'productId', e.target.value)
                                }
                                className="w-full min-w-[200px] bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none"
                              >
                                <option value="">-- Pilih Produk --</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2.5 text-center">
                              <QuantityStepper
                                value={item.qty}
                                onChange={(val) =>
                                  handleItemChange(buyerIndex, itemIndex, 'qty', val)
                                }
                                min={1}
                                size="sm"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) =>
                                  handleItemChange(buyerIndex, itemIndex, 'price', e.target.value)
                                }
                                className="w-28 bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-lg p-1.5 text-xs focus:outline-none text-right font-mono ml-auto block font-semibold"
                              />
                            </td>
                            <td className="p-2.5 text-right font-black text-brand-text font-mono">
                              {formatRupiah(item.subtotal)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeProductFromBuyer(buyerIndex, itemIndex)}
                                className="p-1 text-brand-text-muted hover:text-rose-500 transition-colors"
                                title="Hapus Produk"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Product button for this buyer */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => addProductToBuyer(buyerIndex)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-450 transition-colors bg-brand-card hover:bg-brand-table-hover/50 border border-brand-border/70 py-1.5 px-3 rounded-xl shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Produk untuk {buyer.name ? buyer.name : `Pemesan #${buyerIndex + 1}`}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add New Buyer Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={addBuyer}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 py-2.5 px-5 rounded-2xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pemesan / Pembeli Baru</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-text-muted hover:text-brand-text transition-colors py-1.5 px-3 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>
            </div>
          </div>

          {/* Rekapan Total dalam Satu Halaman: Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Rekap Total Per Produk (Untuk Disiapkan Mba Rere) */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-3">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-brand-text">Rekap Barang Disiapkan (Per Produk)</span>
                </div>
                <span className="text-[10px] text-brand-text-muted font-bold font-mono">
                  {Object.keys(productSummary).length} Jenis
                </span>
              </div>

              {Object.keys(productSummary).length === 0 ? (
                <p className="text-[11px] text-brand-text-muted italic py-2">Belum ada produk yang dipilih.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(productSummary).map(([name, data]) => (
                    <div key={name} className="flex justify-between items-center text-xs py-1 border-b border-brand-border/40">
                      <span className="font-semibold text-brand-text">{name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-500 font-mono">{data.qty} pcs</span>
                        <span className="text-[11px] text-brand-text-muted font-mono">{formatRupiah(data.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rekap Total Per Pembeli */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-3">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-brand-text">Rekap Per Pemesan</span>
                </div>
                <span className="text-[10px] text-brand-text-muted font-bold font-mono">
                  {Object.keys(buyerSummary).length} Orang
                </span>
              </div>

              {Object.keys(buyerSummary).length === 0 ? (
                <p className="text-[11px] text-brand-text-muted italic py-2">Belum ada pemesan yang diinput.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(buyerSummary).map(([name, data]) => (
                    <div key={name} className="p-2.5 rounded-xl bg-brand-card border border-brand-border/60 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-indigo-400">{name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-text font-mono">{data.qty} pcs</span>
                          <span className="font-black text-brand-emerald font-mono">{formatRupiah(data.total)}</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 text-[11px] text-brand-text-muted border-t border-brand-border/40 pt-1">
                        {data.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>• {it.productName} ({it.qty} pcs)</span>
                            <span className="font-mono">{formatRupiah(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Total Block & Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-brand-border pt-6 gap-4">
            <div>
              <span className="text-[10px] text-brand-text-muted font-semibold uppercase block">
                Total Tagihan Yang Harus Dibayar Ke Mba Rere
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-brand-emerald leading-tight">
                  {formatRupiah(totalAmount)}
                </span>
                <span className="text-xs text-brand-text-muted font-semibold">
                  ({totalQty} pcs produk)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => openShareModal(getFlattenedItems(), reconcileDate, notes, totalAmount)}
                className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 text-xs"
                title="Buka menu share WhatsApp dan struk digital"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-md shadow-emerald-600/10"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Catatan Rekon'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Riwayat Catatan Rekon Mba Rere */}
      <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-brand-text">Riwayat Rekon Mba Rere</h3>
          <p className="text-[10px] text-brand-text-muted font-medium">
            Daftar sesi rekon dan rekap pembayaran yang pernah Anda catat sebelumnya ({history.length} catatan)
          </p>
        </div>

        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center p-8 text-brand-text-muted gap-2">
            <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs">Memuat riwayat rekon...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-brand-border rounded-2xl text-brand-text-muted gap-2">
            <AlertCircle className="w-6 h-6 opacity-45" />
            <span className="text-xs">Belum ada catatan rekon Mba Rere yang tersimpan.</span>
          </div>
        ) : (
          <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Keterangan</th>
                  <th className="p-3 text-center">Total Qty</th>
                  <th className="p-3 text-right">Total Tagihan</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {history.map((rec) => (
                  <tr
                    key={rec.id}
                    className="border-b border-brand-border/60 hover:bg-brand-table-hover/30 text-brand-text"
                  >
                    <td className="p-3 font-medium">{formatDateIndo(rec.reconcileDate)}</td>
                    <td className="p-3 text-brand-text-muted font-medium">
                      {rec.notes || '-'}
                    </td>
                    <td className="p-3 text-center font-bold text-brand-text">
                      {rec.totalQty} pcs
                    </td>
                    <td className="p-3 text-right font-black text-brand-emerald font-mono">
                      {formatRupiah(rec.totalAmount)}
                    </td>
                    <td className="p-3 text-center flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedRecon(rec);
                          setIsDetailOpen(true);
                        }}
                        className="p-1 text-brand-text-muted hover:text-brand-emerald transition-colors"
                        title="Lihat Rincian Produk"
                      >
                        <Eye className="w-4.5 h-4.5" />
                      </button>

                      <button
                        onClick={() =>
                          openShareModal(
                            rec.items,
                            rec.reconcileDate,
                            rec.notes,
                            rec.totalAmount
                          )
                        }
                        className="p-1 text-brand-text-muted hover:text-sky-500 transition-colors"
                        title="Bagikan / Salin ke WhatsApp"
                      >
                        <Share2 className="w-4.5 h-4.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(rec.id, rec.totalAmount)}
                        className="p-1 text-brand-text-muted hover:text-rose-500 transition-colors"
                        title="Hapus Catatan Rekon"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detail Rekon Mba Rere"
        size="lg"
      >
        {selectedRecon && (
          <div className="space-y-6 text-brand-text">
            {/* Summary details */}
            <div className="grid grid-cols-2 gap-4 text-xs font-medium bg-brand-bg-input p-4 rounded-xl border border-brand-border">
              <div>
                <span className="text-[10px] text-brand-text-muted block">Tanggal Rekon</span>
                <span className="font-bold">{formatDateIndo(selectedRecon.reconcileDate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-brand-text-muted block">Keterangan</span>
                <span className="font-bold">{selectedRecon.notes || '-'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-brand-border rounded-xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                    <th className="p-2.5">Pemesan</th>
                    <th className="p-2.5">Produk</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Harga Satuan</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecon.items.map((it, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-brand-border/60 hover:bg-brand-table-hover/30 text-brand-text"
                    >
                      <td className="p-2.5 font-bold text-indigo-400">
                        {it.buyerName || '-'}
                      </td>
                      <td className="p-2.5 font-semibold">{it.productName}</td>
                      <td className="p-2.5 text-center font-bold text-brand-text-muted">
                        {it.qty} pcs
                      </td>
                      <td className="p-2.5 text-right font-mono text-brand-text-muted">
                        {formatRupiah(it.price)}
                      </td>
                      <td className="p-2.5 text-right font-black font-mono">
                        {formatRupiah(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center bg-brand-bg-input border border-brand-border p-4 rounded-xl font-bold">
              <span className="text-xs">Total Tagihan Mba Rere</span>
              <span className="text-base text-brand-emerald font-black">
                {formatRupiah(selectedRecon.totalAmount)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
              <button
                onClick={() =>
                  openShareModal(
                    selectedRecon.items,
                    selectedRecon.reconcileDate,
                    selectedRecon.notes,
                    selectedRecon.totalAmount
                  )
                }
                className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-1.5 text-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="bg-brand-bg-input hover:bg-brand-table-hover border border-brand-border text-brand-text font-bold py-2.5 px-4 rounded-xl text-xs transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SHARE WHATSAPP PREVIEW MODAL */}
      <Modal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="Share Rekon ke WhatsApp"
        size="md"
      >
        {shareData && (
          <div className="space-y-6 text-brand-text">
            {/* Digital Receipt Card for Manual Capture / Screenshot */}
            <div className="bg-brand-bg-input p-6 rounded-2xl border border-brand-border/80 shadow-sm relative overflow-hidden font-mono text-xs max-w-sm mx-auto">
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-brand-border">
                <h4 className="font-extrabold uppercase tracking-wider text-sm">LIST ORDER</h4>
                <p className="text-[10px] text-brand-text-muted">Pempek Gluten Free</p>
              </div>

              {/* Receipt Info */}
              <div className="py-4 space-y-1.5 border-b border-dashed border-brand-border text-[11px]">
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Tanggal:</span>
                  <span className="font-bold">{formatDateIndo(shareData.date)}</span>
                </div>
                {shareData.notes && (
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Catatan:</span>
                    <span className="font-bold">{shareData.notes}</span>
                  </div>
                )}
              </div>

              {/* Receipt Items Grouped by Buyer */}
              <div className="py-4 space-y-3 border-b border-dashed border-brand-border">
                <span className="text-[10px] text-brand-text-muted font-bold block uppercase tracking-wider">
                  Daftar Pesanan:
                </span>
                {Object.entries(shareData.buyerGroups || {}).map(([buyer, bItems]) => (
                  <div key={buyer} className="space-y-1 bg-brand-table-hover/20 p-2.5 rounded-xl">
                    <div className="flex justify-between font-bold text-indigo-400 border-b border-dashed border-brand-border/50 pb-1 text-[11px]">
                      <span>{buyer}</span>
                      <span>{formatRupiah(bItems.reduce((s, it) => s + it.subtotal, 0))}</span>
                    </div>
                    {bItems.map((d, i) => (
                      <div key={i} className="flex justify-between text-[10px] pt-0.5">
                        <span className="text-brand-text">{d.productName} ({d.qty} pcs)</span>
                        <span className="font-mono text-brand-text-muted">{formatRupiah(d.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Receipt Items Summary (Barang Disiapkan) */}
              <div className="py-3 space-y-1.5 border-b border-dashed border-brand-border text-[11px]">
                <span className="text-[10px] text-brand-text-muted font-bold block uppercase tracking-wider">
                  Total Barang Disiapkan:
                </span>
                {(() => {
                  const prodMap = {};
                  shareData.items.forEach((d) => {
                    prodMap[d.productName] = (prodMap[d.productName] || 0) + d.qty;
                  });
                  return Object.entries(prodMap).map(([pName, pQty]) => (
                    <div key={pName} className="flex justify-between">
                      <span className="text-brand-text">{pName}</span>
                      <span className="font-bold text-brand-emerald">{pQty} pcs</span>
                    </div>
                  ));
                })()}
              </div>

              {/* Receipt Total */}
              <div className="pt-4 flex justify-between items-center text-sm font-black">
                <span>TOTAL TAGIHAN</span>
                <span className="text-base text-brand-emerald">
                  {formatRupiah(shareData.total)}
                </span>
              </div>

              {/* Receipt Footer */}
              <div className="text-center text-[10px] text-brand-text-muted pt-6 mt-4 border-t border-dashed border-brand-border/60">
                Terima kasih Mba Rere! 🙏
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
              <button
                type="button"
                onClick={() => handleCopyClipboard(shareData.text)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-md shadow-emerald-600/10"
              >
                <Share2 className="w-4 h-4" />
                <span>Salin Teks ke WA</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShareOpen(false)}
                className="bg-brand-bg-input hover:bg-brand-table-hover border border-brand-border text-brand-text font-bold py-2.5 px-4 rounded-xl text-xs transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RekonRere;
