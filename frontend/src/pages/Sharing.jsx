import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatRupiah, formatDateIndo, getLocalDateString } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import Modal from '../components/UI/Modal';
import {
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Coins,
  Store,
  Info,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Save,
} from 'lucide-react';

const Sharing = () => {
  const { showToast } = useToast();

  // Date Range Filters
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [reportData, setReportData] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Settlement Modal State
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [settlementDate, setSettlementDate] = useState(getLocalDateString());
  const [settlementAmount, setSettlementAmount] = useState(0);
  const [settlementMethod, setSettlementMethod] = useState('TF');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  const fetchSharingData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch sales query report
      const salesRes = await api.get('/reports/query', {
        params: { startDate, endDate, lapakId: 'all' },
      });
      setReportData(salesRes.data);

      // 2. Fetch Kang Asep settlements
      const setresRes = await api.get('/settlements', {
        params: { startDate, endDate },
      });
      setSettlements(setresRes.data.settlements);
    } catch (error) {
      console.error(error);
      showToast('Gagal memuat rekap bagi hasil.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSharingData();
  }, [startDate, endDate]);

  const directSales = reportData?.directSales || [];
  const resellerSales = reportData?.resellerSales || [];
  const allSales = [...directSales, ...resellerSales];

  // 1. Calculate Kang Asep (Lapak 2 & 3) Owed to Ipang
  let targetLapak2 = 0;
  let countLapak2 = 0;
  let targetLapak3 = 0;
  let countLapak3 = 0;

  resellerSales.forEach((s) => {
    if (s.lapakId === 2) {
      targetLapak2 += s.totalHakIpang || 0;
      countLapak2++;
    } else if (s.lapakId === 3) {
      targetLapak3 += s.totalHakIpang || 0;
      countLapak3++;
    }
  });

  const totalOwedFromAsep = targetLapak2 + targetLapak3; // Total target Hak Ipang dari reseller

  // Calculate Kang Asep total paid settlements
  const totalPaidByAsep = settlements.reduce((sum, s) => sum + (s.amount || 0), 0);
  const settlementDiff = totalPaidByAsep - totalOwedFromAsep;

  // 2. Calculate HPP (Harga Modal) to be paid to Supplier / Seller
  let hppLapak1 = 0;
  let hppLapak2 = 0;
  let hppLapak3 = 0;
  let hppLapak4 = 0;

  allSales.forEach((s) => {
    let transactionHpp = 0;
    s.details.forEach((d) => {
      transactionHpp += (d.cogs || 0) * d.qty;
    });

    if (s.lapakId === 1) {
      hppLapak1 += transactionHpp;
    } else if (s.lapakId === 2) {
      hppLapak2 += transactionHpp;
    } else if (s.lapakId === 3) {
      hppLapak3 += transactionHpp;
    } else if (s.lapakId === 4) {
      hppLapak4 += transactionHpp;
    }
  });

  const totalHppToSupplier = hppLapak1 + hppLapak2 + hppLapak3 + hppLapak4; // Ipang bayar ke Supplier

  // 3. Calculate Ipang's clean net profit
  let totalHakIpangAll = 0; // Ipang's gross revenue from all lapaks
  allSales.forEach((s) => {
    totalHakIpangAll += s.totalHakIpang || 0;
  });

  const cleanProfitIpang = totalHakIpangAll - totalHppToSupplier;

  // Create Settlement Record Submit
  const handleAddSettlement = async (e) => {
    e.preventDefault();

    if (!settlementAmount || Number(settlementAmount) <= 0) {
      showToast('Nominal setoran harus lebih dari 0.', 'warning');
      return;
    }

    setIsSubmittingSettlement(true);
    try {
      await api.post('/settlements', {
        settlementDate: settlementDate,
        amount: settlementAmount,
        paymentMethod: settlementMethod,
        notes: settlementNotes,
      });

      showToast('Catatan setoran Kang Asep berhasil disimpan.', 'success');
      setIsSettlementOpen(false);
      setSettlementAmount(0);
      setSettlementNotes('');
      fetchSharingData();
    } catch (error) {
      console.error(error);
      showToast('Gagal menyimpan setoran.', 'error');
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Delete Settlement Record
  const handleDeleteSettlement = async (id, amount) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus catatan setoran Rp ${amount.toLocaleString('id-ID')} ini?`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/settlements/${id}`);
      showToast('Catatan setoran berhasil dihapus.', 'success');
      fetchSharingData();
    } catch (error) {
      console.error(error);
      showToast('Gagal menghapus setoran.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-brand-text">
      {/* Date Range Selector Header */}
      <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm flex flex-col md:flex-row items-end gap-4">
        <div className="w-full md:w-auto flex-1 space-y-2">
          <label className="text-xs font-bold text-brand-text-muted block">Tanggal Awal</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 px-9 text-xs focus:outline-none font-semibold"
            />
          </div>
        </div>

        <div className="w-full md:w-auto flex-1 space-y-2">
          <label className="text-xs font-bold text-brand-text-muted block">Tanggal Akhir</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 px-9 text-xs focus:outline-none font-semibold"
            />
          </div>
        </div>

        <button
          onClick={fetchSharingData}
          className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors"
        >
          Terapkan
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-brand-text-muted gap-2">
          <svg className="animate-spin h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs font-semibold">Menghitung rekap pembayaran...</span>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Info Banner */}
          <div className="bg-brand-card border border-brand-border p-4 rounded-2xl flex gap-3 items-start">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-brand-text-muted space-y-1">
              <p className="font-semibold text-brand-text">Cara Pembagian Pembayaran & Aliran Kas:</p>
              <p>• **Lapak 1 & 4 (Eceran)**: Pembeli langsung membayar ke Ipang / Zahra secara tunai/transfer/QRIS.</p>
              <p>• **Lapak 2 & 3 (Reseller Kang Asep)**: Pembeli membayar ke Kang Asep. Ipang hanya mencatat setoran uang yang diserahkan Kang Asep ke Ipang.</p>
              <p>• **Pembayaran HPP (Ipang ke Seller)**: Untuk semua produk yang laku terjual, Ipang harus membayar ke Produsen/Supplier Pempek sebesar harga modal (`Harga Asli / HPP`).</p>
            </div>
          </div>

          {/* Section: Rekonsiliasi & Verification Setoran Kang Asep */}
          <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-brand-emerald" />
                  <h3 className="text-sm font-extrabold text-brand-text">Setoran Kang Asep (Lapak 2 & 3)</h3>
                </div>
                <p className="text-[10px] text-brand-text-muted mt-0.5">
                  Verifikasi kecocokan antara total target penjualan reseller dengan nominal yang disetorkan Kang Asep.
                </p>
              </div>

              <button
                onClick={() => setIsSettlementOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/10 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Setoran Kang Asep</span>
              </button>
            </div>

            {/* Reconciliation Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Target Seharusnya */}
              <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-2">
                <span className="text-[10px] text-brand-text-muted font-bold block uppercase">Total Target Seharusnya</span>
                <span className="text-xl font-black text-brand-text block">{formatRupiah(totalOwedFromAsep)}</span>
                <span className="text-[9px] text-brand-text-muted block">
                  PJP: {formatRupiah(targetLapak2)} | RDTX: {formatRupiah(targetLapak3)}
                </span>
              </div>

              {/* Card 2: Total Realisasi Setoran */}
              <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-2">
                <span className="text-[10px] text-brand-text-muted font-bold block uppercase">Total Realisasi Setoran Kang Asep</span>
                <span className="text-xl font-black text-emerald-400 block">{formatRupiah(totalPaidByAsep)}</span>
                <span className="text-[9px] text-brand-text-muted block">
                  Dari {settlements.length} transaksi setoran
                </span>
              </div>

              {/* Card 3: Status Matching Verifikasi */}
              <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 ${
                settlementDiff >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase block tracking-wider text-brand-text-muted">Status Verifikasi</span>
                  {settlementDiff >= 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div>
                  <span className={`text-base font-black tracking-tight block ${
                    settlementDiff >= 0 ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {settlementDiff >= 0 ? 'LUNAS / SESUAI' : `KURANG BAYAR: ${formatRupiah(Math.abs(settlementDiff))}`}
                  </span>
                  <span className="text-[10px] text-brand-text-muted font-medium block mt-0.5">
                    {settlementDiff >= 0
                      ? `Setoran pas / surplus +${formatRupiah(settlementDiff)}`
                      : `Kang Asep kurang menyetor ${formatRupiah(Math.abs(settlementDiff))}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Table: Log Setoran Kang Asep */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-brand-text">Histori Catatan Setoran Kang Asep</h4>
              {settlements.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-brand-border rounded-2xl text-brand-text-muted gap-2">
                  <Coins className="w-6 h-6 opacity-45" />
                  <span className="text-xs">Belum ada catatan setoran dari Kang Asep pada periode ini.</span>
                </div>
              ) : (
                <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                        <th className="p-3">Tanggal Setoran</th>
                        <th className="p-3 text-right">Nominal Setoran</th>
                        <th className="p-3 text-center">Via / Metode</th>
                        <th className="p-3">Catatan</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((s) => (
                        <tr key={s.id} className="border-b border-brand-border/60 hover:bg-brand-table-hover/30 text-brand-text">
                          <td className="p-3 font-medium">{formatDateIndo(s.settlementDate)}</td>
                          <td className="p-3 text-right font-black text-brand-emerald font-mono">
                            {formatRupiah(s.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-brand-bg-input border border-brand-border font-bold text-[10px]">
                              {s.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3 text-brand-text-muted font-medium italic">
                            {s.notes || '-'}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteSettlement(s.id, s.amount)}
                              className="p-1 text-brand-text-muted hover:text-rose-500 transition-colors"
                              title="Hapus Catatan Setoran"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Main HPP Modal Payment to Supplier Card */}
          <div className="bg-brand-card p-6 rounded-3xl border border-amber-500/20 bg-amber-500/[0.02] shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <ArrowUpRight className="w-4.5 h-4.5" />
                  Harga Modal (HPP)
                </span>
                <Store className="w-5 h-5 text-brand-text-muted" />
              </div>
              <h3 className="text-sm font-extrabold text-brand-text">Ipang bayar ke Seller (Harga Asli)</h3>
              <p className="text-[11px] text-brand-text-muted leading-relaxed">
                Total harga modal (HPP) yang harus dibayar Ipang ke produsen/pembuat pempek untuk seluruh produk yang terjual di 4 lapak.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-brand-border/60">
              <div className="text-3xl font-black text-amber-500 tracking-tight">
                {formatRupiah(totalHppToSupplier)}
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-semibold">
                <div className="bg-brand-bg-input p-2 rounded-xl border border-brand-border text-center">
                  <span className="text-[9px] text-brand-text-muted block font-bold">Lapak 1</span>
                  <span className="text-brand-text font-bold mt-1 block truncate">{formatRupiah(hppLapak1)}</span>
                </div>
                <div className="bg-brand-bg-input p-2 rounded-xl border border-brand-border text-center">
                  <span className="text-[9px] text-brand-text-muted block font-bold">Lapak 4</span>
                  <span className="text-brand-text font-bold mt-1 block truncate">{formatRupiah(hppLapak4)}</span>
                </div>
                <div className="bg-brand-bg-input p-2 rounded-xl border border-brand-border text-center">
                  <span className="text-[9px] text-brand-text-muted block font-bold">Lapak 2</span>
                  <span className="text-brand-text font-bold mt-1 block truncate">{formatRupiah(hppLapak2)}</span>
                </div>
                <div className="bg-brand-bg-input p-2 rounded-xl border border-brand-border text-center">
                  <span className="text-[9px] text-brand-text-muted block font-bold">Lapak 3</span>
                  <span className="text-brand-text font-bold mt-1 block truncate">{formatRupiah(hppLapak3)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Profit Banner */}
          <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-brand-emerald" />
              <h3 className="text-xs font-extrabold text-brand-text uppercase tracking-wider">Rekapitulasi Bersih Pendapatan Ipang</h3>
            </div>
            <div className="bg-brand-bg-input border border-brand-border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-brand-text-muted">
                  Estimasi keuntungan bersih yang diperoleh Ipang dari seluruh lapak setelah dikurangi kewajiban pembayaran HPP ke produsen:
                </p>
                <p className="text-[10px] text-brand-text-muted font-mono mt-1">
                  Rumus: Total Uang Masuk ({formatRupiah(totalHakIpangAll)}) - Total Modal HPP ({formatRupiah(totalHppToSupplier)})
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-wider block">Sisa Untung Bersih Ipang</span>
                <span className="text-xl font-black text-brand-emerald mt-1 block animate-transition">{formatRupiah(cleanProfitIpang)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD KANG ASEP SETTLEMENT */}
      <Modal isOpen={isSettlementOpen} onClose={() => setIsSettlementOpen(false)} title="Catat Setoran Kang Asep" size="md">
        <form onSubmit={handleAddSettlement} className="space-y-4 text-brand-text">
          {/* Settlement Date */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-text-muted block">Tanggal Setoran / Transfer</label>
            <input
              type="date"
              required
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs focus:outline-none"
            />
          </div>

          {/* Nominal Amount */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-text-muted block">Nominal Setoran (Rp)</label>
            <input
              type="number"
              min="1"
              required
              value={settlementAmount}
              onChange={(e) => setSettlementAmount(e.target.value)}
              placeholder="Contoh: 500000"
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs focus:outline-none font-bold text-brand-emerald"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-text-muted block">Metode Pembayaran (Via)</label>
            <select
              value={settlementMethod}
              onChange={(e) => setSettlementMethod(e.target.value)}
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs focus:outline-none font-bold"
            >
              <option value="TF">TF (Bank Transfer)</option>
              <option value="QRIS">QRIS</option>
              <option value="CASH">CASH (Tunai)</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-text-muted block">Catatan / Keterangan (Opsional)</label>
            <textarea
              rows="2"
              value={settlementNotes}
              onChange={(e) => setSettlementNotes(e.target.value)}
              placeholder="Contoh: Setoran sebagian lapak PJP tanggal 15-17 Juli"
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl p-3 text-xs focus:outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
            <button
              type="submit"
              disabled={isSubmittingSettlement}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-md shadow-emerald-600/10"
            >
              {isSubmittingSettlement ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Catatan Setoran</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsSettlementOpen(false)}
              className="bg-brand-bg-input hover:bg-brand-table-hover border border-brand-border text-brand-text font-bold py-2.5 px-4 rounded-xl text-xs"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Sharing;
