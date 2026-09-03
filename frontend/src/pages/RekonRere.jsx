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

  // Form states
  const [reconcileDate, setReconcileDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { buyerName: '', productId: '', productName: '', qty: 1, price: 0, subtotal: 0 },
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

  // Add row (defaults buyerName to previous row for fast entry)
  const addRow = () => {
    const lastBuyerName = items.length > 0 ? items[items.length - 1].buyerName : '';
    setItems([
      ...items,
      { buyerName: lastBuyerName, productId: '', productName: '', qty: 1, price: 0, subtotal: 0 },
    ]);
  };

  // Remove row
  const removeRow = (index) => {
    if (items.length === 1) {
      showToast('Form harus memiliki minimal 1 produk.', 'warning');
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // Handle row change
  const handleRowChange = (index, field, value) => {
    const newItems = [...items];
    const row = newItems[index];

    if (field === 'buyerName') {
      row.buyerName = value;
    } else if (field === 'productId') {
      const prodId = parseInt(value);
      row.productId = prodId;

      const product = products.find((p) => p.id === prodId);
      if (product) {
        row.productName = product.name;
        // Lookup from MBA_RERE_PRICES table, fallback to product.cogs
        const defaultPrice = MBA_RERE_PRICES[product.name] ?? product.cogs ?? 0;
        row.price = defaultPrice;
      } else {
        row.productName = '';
        row.price = 0;
      }
    } else if (field === 'qty') {
      row.qty = parseInt(value) || 0;
    } else if (field === 'price') {
      row.price = parseFloat(value) || 0;
    }

    row.subtotal = (row.qty || 0) * (row.price || 0);
    setItems(newItems);
  };

  // Calculations: Total Qty and Total Amount
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  // Grouping 1: Total Rekap per Produk (For supplier fulfillment)
  const productSummary = {};
  items.forEach((it) => {
    if (it.productName && it.qty > 0) {
      if (!productSummary[it.productName]) {
        productSummary[it.productName] = { qty: 0, total: 0, price: it.price };
      }
      productSummary[it.productName].qty += it.qty;
      productSummary[it.productName].total += it.subtotal;
    }
  });

  // Grouping 2: Total Rekap per Pembeli
  const buyerSummary = {};
  items.forEach((it) => {
    if (it.productName && it.qty > 0) {
      const name = it.buyerName ? it.buyerName.trim() : 'Tanpa Nama';
      if (!buyerSummary[name]) {
        buyerSummary[name] = { qty: 0, total: 0, items: [] };
      }
      buyerSummary[name].qty += it.qty;
      buyerSummary[name].total += it.subtotal;
      buyerSummary[name].items.push(it);
    }
  });

  // Reset form
  const handleReset = () => {
    setReconcileDate(getLocalDateString());
    setNotes('');
    setItems([{ buyerName: '', productId: '', productName: '', qty: 1, price: 0, subtotal: 0 }]);
  };

  // Save reconciliation
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validItems = items.filter((item) => item.productName && item.qty > 0);
    if (validItems.length === 0) {
      showToast('Pilih minimal 1 produk dengan jumlah (Qty) lebih dari 0.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reconciliations', {
        reconcileDate,
        notes,
        items: validItems,
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

  // Build WhatsApp text from items
  const generateWAText = (targetItems, targetDate, targetNotes, targetTotal) => {
    const valid = targetItems.filter((it) => it.productName && it.qty > 0);
    if (valid.length === 0) return '';

    const dateStr = formatDateIndo(targetDate);
    let text = `*Rekon Pembayaran - Mba Rere*\n`;
    text += `----------------------------------\n`;
    text += `Tanggal: ${dateStr}\n`;
    if (targetNotes && targetNotes.trim()) {
      text += `Keterangan: ${targetNotes.trim()}\n`;
    }

    // List order items with Buyer Name
    text += `\n*Rincian Pesanan:*\n`;
    valid.forEach((d) => {
      const buyer = d.buyerName && d.buyerName.trim() ? `${d.buyerName.trim()}: ` : '';
      text += `- ${buyer}${d.productName} x${d.qty} pcs (${formatRupiah(d.subtotal)})\n`;
    });

    // Summary of products to prepare
    const prodMap = {};
    let totalPcs = 0;
    valid.forEach((d) => {
      prodMap[d.productName] = (prodMap[d.productName] || 0) + d.qty;
      totalPcs += d.qty;
    });

    text += `\n*Rekap Total Barang Disiapkan:*\n`;
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

    const text = generateWAText(targetItems, targetDate, targetNotes, targetTotal);
    setShareData({
      items: valid,
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
            Catat nama pemesan, produk, dan jumlahnya untuk rekap total belanja yang harus dibayar ke penjual asli (Mba Rere).
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

          {/* Product Items Table with Nama column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                Daftar Pesanan & Harga Mba Rere
              </h3>
              <span className="text-[10px] text-brand-text-muted">
                Nama pemesan, produk yang dibeli, dan qty.
              </span>
            </div>

            <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3 w-48">Nama Pemesan / Pembeli</th>
                    <th className="p-3">Produk</th>
                    <th className="p-3 w-24 text-center">Qty</th>
                    <th className="p-3 w-36 text-right">Harga Satuan</th>
                    <th className="p-3 w-36 text-right">Subtotal</th>
                    <th className="p-3 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-brand-border/60 hover:bg-brand-table-hover/40 text-brand-text"
                    >
                      <td className="p-3 text-center font-mono text-brand-text-muted">{index + 1}</td>
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="Nama..."
                          value={item.buyerName}
                          onChange={(e) => handleRowChange(index, 'buyerName', e.target.value)}
                          className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-semibold"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={item.productId}
                          onChange={(e) => handleRowChange(index, 'productId', e.target.value)}
                          className="w-full min-w-[200px] bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none"
                        >
                          <option value="">-- Pilih Produk --</option>
                          {products.map((p) => {
                            const defaultPrice = MBA_RERE_PRICES[p.name] ?? p.cogs ?? 0;
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} (Rp {defaultPrice.toLocaleString('id-ID')})
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleRowChange(index, 'qty', e.target.value)}
                          className="w-20 bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none text-center mx-auto block font-semibold"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleRowChange(index, 'price', e.target.value)}
                          className="w-28 bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none text-right font-mono ml-auto block font-semibold"
                        />
                      </td>
                      <td className="p-3 text-right font-black text-brand-text font-mono">
                        {formatRupiah(item.subtotal)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="p-1 text-brand-text-muted hover:text-rose-500 transition-colors"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tambah Baris Button below table */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-450 active:text-emerald-600 transition-colors bg-brand-bg-input hover:bg-brand-table-hover/40 border border-brand-border/65 py-2 px-4 rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Baris</span>
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
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(buyerSummary).map(([name, data]) => (
                    <div key={name} className="flex justify-between items-center text-xs py-1 border-b border-brand-border/40">
                      <span className="font-semibold text-brand-text">{name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-indigo-400 font-mono">{data.qty} pcs</span>
                        <span className="text-[11px] font-black text-brand-text font-mono">{formatRupiah(data.total)}</span>
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
                onClick={() => openShareModal(items, reconcileDate, notes, totalAmount)}
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
                <h4 className="font-extrabold uppercase tracking-wider text-sm">REKON MBA RERE</h4>
                <p className="text-[10px] text-brand-text-muted">Tagihan Penjual Asli / Supplier Pempek</p>
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

              {/* Receipt Items with Buyer */}
              <div className="py-4 space-y-2.5 border-b border-dashed border-brand-border">
                <span className="text-[10px] text-brand-text-muted font-bold block uppercase tracking-wider">
                  Daftar Pesanan:
                </span>
                {shareData.items.map((d, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span className="truncate pr-2">
                        {d.buyerName && d.buyerName.trim() ? `${d.buyerName.trim()}: ` : ''}
                        {d.productName}
                      </span>
                      <span>{formatRupiah(d.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-brand-text-muted">
                      <span>Qty: {d.qty} pcs</span>
                      <span>@{formatRupiah(d.price)}</span>
                    </div>
                  </div>
                ))}
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
