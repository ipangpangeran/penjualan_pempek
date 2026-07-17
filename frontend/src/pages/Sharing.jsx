import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatRupiah, formatDateIndo, getLocalDateString } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Coins,
  Store,
  Info,
  TrendingUp,
} from 'lucide-react';

const Sharing = () => {
  const { showToast } = useToast();

  // Date Range Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return getLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSharingData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/reports/query', {
        params: {
          startDate,
          endDate,
          lapakId: 'all',
        },
      });
      setReportData(response.data);
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

  const totalOwedFromAsep = targetLapak2 + targetLapak3; // Kang Asep bayar ke Ipang

  // 2. Calculate HPP (Harga Modal) to be paid to Supplier / Seller
  let hppLapak1 = 0;
  let hppLapak2 = 0;
  let hppLapak3 = 0;

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
    }
  });

  const totalHppToSupplier = hppLapak1 + hppLapak2 + hppLapak3; // Ipang bayar ke Supplier

  // 3. Calculate Ipang's clean net profit
  let totalHakIpangAll = 0; // Ipang's gross revenue from all lapaks
  allSales.forEach((s) => {
    totalHakIpangAll += s.totalHakIpang || 0;
  });

  const cleanProfitIpang = totalHakIpangAll - totalHppToSupplier;

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
              <p>• **Lapak 1 (Eceran)**: Pembeli langsung membayar ke Ipang. Ipang memegang uang kotor (`Omzet`).</p>
              <p>• **Lapak 2 & 3 (Reseller)**: Pembeli membayar ke Kang Asep. Kang Asep memegang uang kotor (`HET`), lalu menyetorkan uang target (`Harga Dasar / Hak Ipang`) ke Ipang.</p>
              <p>• **Pembayaran HPP (Ipang ke Seller)**: Untuk semua produk yang laku terjual, Ipang harus membayar ke Produsen/Supplier Pempek sebesar harga modal (`Harga Asli / HPP`).</p>
            </div>
          </div>

          {/* Main Sharing Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Kang Asep bayar ke Ipang (Lapak 2 & 3) */}
            <div className="bg-brand-card p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.02] shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-brand-emerald bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <ArrowDownLeft className="w-4.5 h-4.5" />
                    Setoran Reseller
                  </span>
                  <Coins className="w-5 h-5 text-brand-text-muted" />
                </div>
                <h3 className="text-sm font-extrabold text-brand-text">Kang Asep bayar ke Ipang (Lapak 2 & 3)</h3>
                <p className="text-[11px] text-brand-text-muted leading-relaxed">
                  Total dana hasil penjualan pempek yang harus ditransfer oleh Kang Asep ke Ipang (berdasarkan Harga Dasar / Target Masuk).
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-brand-border/60">
                <div className="text-3xl font-black text-brand-emerald tracking-tight">
                  {formatRupiah(totalOwedFromAsep)}
                </div>
                
                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="bg-brand-bg-input p-3 rounded-xl border border-brand-border">
                    <span className="text-[10px] text-brand-text-muted block font-bold">Lapak 2 (PJP)</span>
                    <span className="text-brand-text font-extrabold mt-1 block">{formatRupiah(targetLapak2)}</span>
                    <span className="text-[9px] text-brand-text-muted block mt-0.5">{countLapak2} Transaksi</span>
                  </div>
                  <div className="bg-brand-bg-input p-3 rounded-xl border border-brand-border">
                    <span className="text-[10px] text-brand-text-muted block font-bold">Lapak 3 (RDTX)</span>
                    <span className="text-brand-text font-extrabold mt-1 block">{formatRupiah(targetLapak3)}</span>
                    <span className="text-[9px] text-brand-text-muted block mt-0.5">{countLapak3} Transaksi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Ipang bayar ke Seller (HPP / Harga Asli) */}
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
                  Total harga modal (HPP) yang harus dibayar Ipang ke produsen/pembuat pempek untuk seluruh produk yang terjual.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-brand-border/60">
                <div className="text-3xl font-black text-amber-500 tracking-tight">
                  {formatRupiah(totalHppToSupplier)}
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  <div className="bg-brand-bg-input p-2 rounded-xl border border-brand-border text-center">
                    <span className="text-[9px] text-brand-text-muted block font-bold">Lapak 1</span>
                    <span className="text-brand-text font-bold mt-1 block truncate">{formatRupiah(hppLapak1)}</span>
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

          {/* Transaksi Itemized List */}
          <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-brand-text">Daftar Rincian Transaksi Penjualan</h3>
              <p className="text-[10px] text-brand-text-muted">Histori target setoran dan beban modal HPP dari seluruh transaksi</p>
            </div>

            {allSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-brand-border rounded-2xl text-brand-text-muted gap-2">
                <Coins className="w-6 h-6 opacity-45" />
                <span className="text-xs">Tidak ditemukan transaksi pada periode ini.</span>
              </div>
            ) : (
              <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">No Invoice</th>
                      <th className="p-3">Lapak / Outlet</th>
                      <th className="p-3">Nama Pembeli</th>
                      <th className="p-3 text-right">Uang Masuk Ipang</th>
                      <th className="p-3 text-right">Harga Modal (HPP)</th>
                      <th className="p-3 text-right">Untung Bersih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSales.map((tx) => {
                      let txHpp = 0;
                      tx.details.forEach((d) => {
                        txHpp += (d.cogs || 0) * d.qty;
                      });

                      return (
                        <tr key={tx.id} className="border-b border-brand-border/60 hover:bg-brand-table-hover/30 text-brand-text font-medium">
                          <td className="p-3">{formatDateIndo(tx.saleDate)}</td>
                          <td className="p-3 font-mono font-semibold text-brand-text-muted">{tx.invoiceNumber}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.lapakId === 1 ? 'bg-emerald-500/10 text-emerald-500' :
                              tx.lapakId === 2 ? 'bg-blue-500/10 text-blue-500' :
                              'bg-purple-500/10 text-purple-500'
                            }`}>
                              {getLapakName(tx.lapakId)}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-brand-text">{tx.buyerName}</td>
                          <td className="p-3 text-right font-bold text-brand-text font-mono">{formatRupiah(tx.totalHakIpang)}</td>
                          <td className="p-3 text-right font-bold text-brand-text-muted font-mono">{formatRupiah(txHpp)}</td>
                          <td className="p-3 text-right font-bold text-brand-emerald font-mono bg-emerald-500/5">{formatRupiah(tx.totalHakIpang - txHpp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const getLapakName = (id) => {
  if (id === 1) return 'Lapak Ipang';
  if (id === 2) return 'Kang Asep PJP';
  if (id === 3) return 'Kang Asep RDTX';
  return '';
};

export default Sharing;
