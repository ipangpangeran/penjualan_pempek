import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatRupiah } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import {
  TrendingUp,
  DollarSign,
  UserCheck,
  Percent,
  Plus,
  Flame,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const Dashboard = ({ setActivePage }) => {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/reports/dashboard');
      setData(response.data);
    } catch (error) {
      console.error(error);
      showToast('Gagal memuat data dashboard.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <svg
          className="animate-spin h-10 w-10 text-emerald-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-brand-text-muted font-semibold text-sm">Memuat data analisis...</span>
      </div>
    );
  }

  const { today, month, overall, topSellingProducts = [], chartData = [] } = data || {};

  const stats = [
    {
      title: 'Omzet Hari Ini',
      value: formatRupiah(today?.omzet),
      desc: 'Semua Lapak Hari Ini',
      icon: Calendar,
      color: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      title: 'Omzet Bulan Ini',
      value: formatRupiah(month?.omzet),
      desc: 'Bulan Berjalan',
      icon: TrendingUp,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: 'Total Omzet',
      value: formatRupiah(overall?.omzet),
      desc: 'Seluruh Penjualan',
      icon: DollarSign,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      title: 'Hak Ipang',
      value: formatRupiah(overall?.hakIpang),
      desc: 'Total Masuk Bersih',
      icon: UserCheck,
      color: 'bg-indigo-500/10 text-indigo-500',
    },
    {
      title: 'Fee Reseller',
      value: formatRupiah(overall?.fee),
      desc: 'Fee Kang Asep (7%)',
      icon: Percent,
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      title: 'Produk Terlaris',
      value: overall?.topProduct || '-',
      desc: 'Volume Penjualan Tertinggi',
      icon: Flame,
      color: 'bg-rose-500/10 text-rose-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-xl border border-slate-800/60 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-5%] w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl font-black">Halo, Ipang Pangeran! 👋</h2>
          <p className="text-xs text-slate-350">
            Berikut ringkasan performa penjualan lapak pempek gluten free Anda.
          </p>
        </div>
        <button
          onClick={() => setActivePage('input-sales')}
          className="relative z-10 shrink-0 bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group text-sm"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
          <span>Input Penjualan</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-brand-card p-6 rounded-3xl border border-brand-border shadow-sm flex items-center gap-5 hover:shadow-md hover:border-brand-text-muted/20 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider block">
                  {stat.title}
                </span>
                <h3 className="text-base font-extrabold text-brand-text tracking-tight mt-1 truncate">
                  {stat.value}
                </h3>
                <span className="text-[10px] text-brand-text-muted font-medium block mt-0.5">
                  {stat.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Action Callout Center (Big Button Area) */}
      <div className="bg-brand-card rounded-3xl border border-brand-border p-8 shadow-sm flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-sm">
          <Layers className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h3 className="text-sm font-bold text-brand-text tracking-tight">Catat Transaksi Penjualan Baru</h3>
          <p className="text-xs text-brand-text-muted mt-1">
            Simpan laporan omzet harian Anda baik dari penjualan langsung (Lapak Ipang) maupun reseller (Kang Asep PJP / RDTX).
          </p>
        </div>
        <button
          onClick={() => setActivePage('input-sales')}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-emerald-600/25 transition-all text-xs mt-2 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Mulai Input Penjualan</span>
        </button>
      </div>

      {/* Charts & Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart 30 Days */}
        <div className="bg-brand-card p-6 rounded-3xl border border-brand-border shadow-sm lg:col-span-2 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-brand-border pb-4">
            <div>
              <h3 className="text-sm font-bold text-brand-text tracking-tight">Grafik Penjualan 30 Hari Terakhir</h3>
              <p className="text-[10px] text-brand-text-muted font-medium">Menampilkan tren omzet harian gabungan</p>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              Live Data
            </span>
          </div>

          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--brand-border)" />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--brand-text-muted)', fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--brand-text-muted)', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--brand-card)',
                    border: '1px solid var(--brand-border)',
                    borderRadius: '12px',
                    color: 'var(--brand-text)',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [formatRupiah(value), 'Omzet']}
                />
                <Area
                  type="monotone"
                  dataKey="omzet"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOmzet)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products List */}
        <div className="bg-brand-card p-6 rounded-3xl border border-brand-border shadow-sm flex flex-col">
          <div className="border-b border-brand-border pb-4 mb-4">
            <h3 className="text-sm font-bold text-brand-text tracking-tight">Produk Terlaris</h3>
            <p className="text-[10px] text-brand-text-muted">Berdasarkan volume penjualan kuantitas</p>
          </div>

          {topSellingProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-brand-text-muted gap-2">
              <Layers className="w-8 h-8 opacity-45" />
              <span className="text-xs">Belum ada data penjualan tercatat.</span>
            </div>
          ) : (
            <div className="flex-1 space-y-3.5">
              {topSellingProducts.map((p, index) => (
                <div key={p.id} className="flex items-center justify-between p-3.5 bg-brand-bg-input border border-brand-border rounded-2xl transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-450 font-bold flex items-center justify-center text-xs border border-emerald-500/10">
                      {index + 1}
                    </div>
                    <span className="text-xs font-bold text-brand-text truncate max-w-[130px]">
                      {p.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-brand-text block">
                      {p.qty} <span className="text-[10px] text-brand-text-muted font-normal">pcs</span>
                    </span>
                    <span className="text-[9px] text-brand-text-muted block mt-0.5">Terjual</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
