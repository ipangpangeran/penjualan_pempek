import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatRupiah, getLocalDateString } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  User,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Store,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

const InputSales = () => {
  const { showToast } = useToast();
  const [activeLapak, setActiveLapak] = useState(null); // null, 1, 2, or 3
  const [activeProducts, setActiveProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unified Cashier Form State
  const [saleDate, setSaleDate] = useState(getLocalDateString());
  const [buyerName, setBuyerName] = useState('');
  const [items, setItems] = useState([{ productId: '', qty: 1, price: 0, target: 0, het: 0, fee: 0, hakIpang: 0, subtotal: 0 }]);

  // Fetch active products
  const fetchActiveProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await api.get('/products/active');
      setActiveProducts(response.data.products);
    } catch (error) {
      console.error(error);
      showToast('Gagal memuat produk aktif.', 'error');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchActiveProducts();
  }, []);

  // Reset form states when lapak selection changes
  useEffect(() => {
    setSaleDate(getLocalDateString());
    setBuyerName('');
    setItems([{ productId: '', qty: 1, price: 0, target: 0, het: 0, fee: 0, hakIpang: 0, subtotal: 0 }]);
  }, [activeLapak]);

  // Add row to cashier shopping list
  const addRow = () => {
    setItems([...items, { productId: '', qty: 1, price: 0, target: 0, het: 0, fee: 0, hakIpang: 0, subtotal: 0 }]);
  };

  // Remove row from cashier shopping list
  const removeRow = (index) => {
    if (items.length === 1) {
      showToast('Transaksi harus berisi minimal 1 produk.', 'warning');
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // Handle cashier row change
  const handleRowChange = (index, field, value) => {
    const newItems = [...items];
    const row = newItems[index];

    if (field === 'productId') {
      const prodId = parseInt(value);
      row.productId = prodId;

      const product = activeProducts.find((p) => p.id === prodId);
      const priceRecord = product?.prices?.find((pr) => pr.lapakId === activeLapak) || {};
      
      row.price = activeLapak === 1 ? (priceRecord.price || 0) : (priceRecord.het || 0);
      row.target = priceRecord.target || 0;
      row.het = priceRecord.het || 0;
    } else if (field === 'qty') {
      row.qty = parseInt(value) || 0;
    }

    // Calculations
    row.subtotal = row.price * row.qty;
    row.fee = activeLapak === 1 ? 0 : row.het * 0.07 * row.qty;
    row.hakIpang = activeLapak === 1 ? row.subtotal : row.target * row.qty;

    setItems(newItems);
  };

  // Calculate totals of items in checkout list
  const getTotals = () => {
    let qty = 0;
    let omzet = 0;
    let fee = 0;
    let hakIpang = 0;

    items.forEach((it) => {
      qty += it.qty || 0;
      omzet += it.subtotal || 0;
      fee += it.fee || 0;
      hakIpang += it.hakIpang || 0;
    });

    return { qty, omzet, fee, hakIpang };
  };

  // Handle submit save
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!buyerName.trim()) {
      showToast('Nama pembeli harus diisi.', 'warning');
      return;
    }

    const invalidItem = items.find((item) => !item.productId || item.qty <= 0);
    if (invalidItem) {
      showToast('Semua baris harus berisi produk dan jumlah (Qty) lebih dari 0.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/sales', {
        lapakId: activeLapak,
        saleDate,
        buyerName,
        items: items.map((it) => ({
          productId: it.productId,
          qty: it.qty,
        })),
      });

      const lapakNames = { 1: 'Lapak Ipang', 2: 'Kang Asep PJP', 3: 'Kang Asep RDTX & GRHA' };
      showToast(`Penjualan ${lapakNames[activeLapak]} berhasil disimpan.`, 'success');
      
      // Reset & go back to chooser
      setActiveLapak(null);
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Gagal menyimpan transaksi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = getTotals();

  // If no lapak is selected, render Lapak Selector Cards
  if (activeLapak === null) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-brand-text tracking-tight">Pilih Lapak Penjualan</h2>
          <p className="text-xs text-brand-text-muted">
            Pilih jenis lapak transaksi yang ingin Anda bukukan saat ini.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Lapak 1 Card */}
          <button
            onClick={() => setActiveLapak(1)}
            className="bg-brand-card p-8 rounded-3xl border border-brand-border shadow-sm text-center flex flex-col items-center gap-4 hover:shadow-lg hover:border-emerald-500/20 hover:translate-y-[-2px] transition-all group duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-brand-text tracking-tight text-sm">Lapak Ipang</h3>
              <p className="text-[10px] text-brand-text-muted mt-1.5 leading-relaxed">
                Penjualan langsung ke konsumen. Harga jual = harga dasar. Tanpa bagi hasil.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-brand-emerald mt-2">
              <span>Buka Kasir</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Lapak 2 Card */}
          <button
            onClick={() => setActiveLapak(2)}
            className="bg-brand-card p-8 rounded-3xl border border-brand-border shadow-sm text-center flex flex-col items-center gap-4 hover:shadow-lg hover:border-emerald-500/20 hover:translate-y-[-2px] transition-all group duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-brand-text tracking-tight text-sm">Kang Asep PJP</h3>
              <p className="text-[10px] text-brand-text-muted mt-1.5 leading-relaxed">
                Konsinyasi / reseller PJP. target masuk Ipang + HET dengan fee sharing 7% dari HET.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-brand-emerald mt-2">
              <span>Buka Kasir</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Lapak 3 Card */}
          <button
            onClick={() => setActiveLapak(3)}
            className="bg-brand-card p-8 rounded-3xl border border-brand-border shadow-sm text-center flex flex-col items-center gap-4 hover:shadow-lg hover:border-emerald-500/20 hover:translate-y-[-2px] transition-all group duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-450 border border-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-brand-text tracking-tight text-sm">Kang Asep RDTX & GRHA</h3>
              <p className="text-[10px] text-brand-text-muted mt-1.5 leading-relaxed">
                Konsinyasi / reseller perkantoran. Selisih target/HET lebih besar, sharing fee 7%.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-brand-emerald mt-2">
              <span>Buka Kasir</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  const lapakName =
    activeLapak === 1
      ? 'Lapak Ipang (Eceran)'
      : activeLapak === 2
      ? 'Kang Asep PJP (Reseller)'
      : 'Kang Asep RDTX & GRHA (Reseller)';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button
        onClick={() => setActiveLapak(null)}
        className="flex items-center gap-2 text-xs font-semibold text-brand-text-muted hover:text-brand-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Pilihan Lapak</span>
      </button>

      <div className="bg-brand-card rounded-3xl border border-brand-border shadow-sm p-6 space-y-6">
        <div className="border-b border-brand-border pb-4">
          <h3 className="text-sm font-bold text-brand-text tracking-tight">Form Kasir: {lapakName}</h3>
          <p className="text-[10px] text-brand-text-muted">Masukkan tanggal transaksi, nama pembeli di lapak, dan daftar belanjaan.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-text-muted block">Tanggal Transaksi</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-text-muted">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Buyer Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-text-muted block">Nama Pembeli</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-text-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Masukkan nama pembeli..."
                  className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-bold text-brand-text">Daftar Belanja</h4>
            </div>

            <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                    <th className="p-3">Produk</th>
                    <th className="p-3 w-28 text-center">Qty</th>
                    {activeLapak === 1 ? (
                      <>
                        <th className="p-3 w-40 text-right">Harga Satuan</th>
                        <th className="p-3 w-44 text-right">Subtotal</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3 w-28 text-right">Target</th>
                        <th className="p-3 w-28 text-right">HET</th>
                        <th className="p-3 w-32 text-right">Fee (7%)</th>
                        <th className="p-3 w-32 text-right">Hak Ipang</th>
                        <th className="p-3 w-32 text-right">Omzet Kotor</th>
                      </>
                    )}
                    <th className="p-3 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b border-brand-border/60 hover:bg-brand-table-hover/40 text-brand-text">
                      <td className="p-3">
                        <select
                          value={item.productId}
                          onChange={(e) => handleRowChange(index, 'productId', e.target.value)}
                          className="w-full min-w-[150px] bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none"
                        >
                          <option value="">-- Pilih Produk --</option>
                          {activeProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
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
                      {activeLapak === 1 ? (
                        <>
                          <td className="p-3 text-right font-medium text-brand-text-muted">
                            {formatRupiah(item.price)}
                          </td>
                          <td className="p-3 text-right font-black text-brand-text">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-right font-medium text-brand-text-muted font-mono">{formatRupiah(item.target)}</td>
                          <td className="p-3 text-right font-medium text-brand-text-muted font-mono">{formatRupiah(item.het)}</td>
                          <td className="p-3 text-right font-bold text-amber-500 font-mono bg-amber-500/5">{formatRupiah(item.fee)}</td>
                          <td className="p-3 text-right font-bold text-brand-emerald font-mono bg-emerald-500/5">{formatRupiah(item.hakIpang)}</td>
                          <td className="p-3 text-right font-black text-brand-text font-mono">{formatRupiah(item.subtotal)}</td>
                        </>
                      )}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="p-1 text-brand-text-muted hover:text-rose-500 transition-colors"
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
            <div className="pt-2">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-450 active:text-emerald-600 transition-colors bg-brand-bg-input hover:bg-brand-table-hover/40 border border-brand-border/65 py-2 px-4 rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Baris</span>
              </button>
            </div>
          </div>

          {/* Bottom Total Block */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-brand-border pt-6 gap-4">
            <div>
              <span className="text-[10px] text-brand-text-muted font-semibold uppercase block">Rekapitulasi Keuangan</span>
              {activeLapak === 1 ? (
                <span className="text-xl font-black text-brand-emerald leading-tight">
                  {formatRupiah(totals.omzet)}
                </span>
              ) : (
                <div className="flex flex-wrap gap-4 mt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-brand-text-muted block">Omzet HET (Kotor)</span>
                    <span className="font-extrabold text-brand-text text-sm">{formatRupiah(totals.omzet)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-text-muted block font-semibold text-amber-500">Fee Reseller (7%)</span>
                    <span className="font-extrabold text-amber-500 text-sm">{formatRupiah(totals.fee)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-text-muted block font-semibold text-brand-emerald">Hak Ipang (Bersih)</span>
                    <span className="font-extrabold text-brand-emerald text-sm">{formatRupiah(totals.hakIpang)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 text-xs"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Transaksi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InputSales;
