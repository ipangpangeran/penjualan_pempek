import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatRupiah, formatDateIndo, getLocalDateString } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import Modal from '../components/UI/Modal';
import {
  Calendar,
  Filter,
  Search,
  Eye,
  Edit2,
  Trash2,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Save,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Report = () => {
  const { showToast } = useToast();

  // Filters - Default start date to today
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [lapakId, setLapakId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data State
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal State - Detail Transaction
  const [selectedTx, setSelectedTx] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Modal State - Edit Transaction
  const [editTx, setEditTx] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editBuyerName, setEditBuyerName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  // Fetch report data
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/reports/query', {
        params: {
          startDate,
          endDate,
          lapakId,
          search: searchQuery,
        },
      });
      setReportData(response.data);
    } catch (error) {
      console.error(error);
      showToast('Gagal memuat laporan penjualan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all products (for edit transaction modal selector options)
  const fetchAllProducts = async () => {
    try {
      const response = await api.get('/products');
      setAllProducts(response.data.products);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchAllProducts();
  }, [startDate, endDate, lapakId]); // auto query when these filters change

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReport();
  };

  // Handle transaction delete
  const handleDeleteTx = async (txId, invoice) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini permanen.`
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/sales/${txId}`);
      showToast(`Transaksi berhasil dihapus.`, 'success');
      fetchReport();
      setIsDetailOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Gagal menghapus transaksi.', 'error');
    }
  };

  // Open edit modal
  const openEditModal = (tx) => {
    setEditTx(tx);
    setEditBuyerName(tx.buyerName);
    setEditDate(getLocalDateString(new Date(tx.saleDate)));
    setEditItems(
      tx.details.map((d) => ({
        productId: d.productId,
        qty: d.qty,
        price: d.price,
        target: d.target || 0,
        het: d.het || 0,
        fee: d.fee || 0,
        hakIpang: d.hakIpang || 0,
        subtotal: d.subtotal,
      }))
    );
    setIsEditOpen(true);
    setIsDetailOpen(false);
  };

  const handleEditRowChange = (index, field, value) => {
    const newItems = [...editItems];
    const row = newItems[index];

    if (field === 'productId') {
      const prodId = parseInt(value);
      row.productId = prodId;

      const product = allProducts.find((p) => p.id === prodId);
      const priceRecord = product?.prices?.find((pr) => pr.lapakId === editTx.lapakId);
      
      row.price = editTx.lapakId === 1 ? (priceRecord?.price || 0) : (priceRecord?.het || 0);
      row.target = priceRecord?.target || 0;
      row.het = priceRecord?.het || 0;
    } else if (field === 'qty') {
      row.qty = parseInt(value) || 0;
    }

    row.subtotal = row.price * row.qty;
    row.fee = editTx.lapakId === 1 ? 0 : row.het * 0.07 * row.qty;
    row.hakIpang = editTx.lapakId === 1 ? row.subtotal : row.target * row.qty;
    
    setEditItems(newItems);
  };

  const addEditRow = () => {
    setEditItems([...editItems, { productId: '', qty: 1, price: 0, target: 0, het: 0, fee: 0, hakIpang: 0, subtotal: 0 }]);
  };

  const removeEditRow = (index) => {
    if (editItems.length === 1) {
      showToast('Transaksi harus berisi minimal 1 produk.', 'warning');
      return;
    }
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const getEditTotals = () => {
    let omzet = 0;
    let fee = 0;
    let hakIpang = 0;

    editItems.forEach((it) => {
      omzet += it.subtotal || 0;
      fee += it.fee || 0;
      hakIpang += it.hakIpang || 0;
    });

    return { omzet, fee, hakIpang };
  };

  const submitEditTx = async (e) => {
    e.preventDefault();

    if (!editBuyerName.trim()) {
      showToast('Nama pembeli/reseller harus diisi.', 'warning');
      return;
    }

    const invalidItem = editItems.find((item) => !item.productId || item.qty <= 0);
    if (invalidItem) {
      showToast('Semua baris harus berisi produk dan Qty > 0.', 'warning');
      return;
    }

    try {
      await api.put(`/sales/${editTx.id}`, {
        buyerName: editBuyerName,
        saleDate: editDate,
        items: editItems.map((it) => ({
          productId: it.productId,
          qty: it.qty,
        })),
      });

      showToast('Transaksi berhasil diperbarui.', 'success');
      setIsEditOpen(false);
      fetchReport();
    } catch (error) {
      console.error(error);
      showToast('Gagal memperbarui transaksi.', 'error');
    }
  };

  // Export spreadsheet handler (Excel)
  const handleExportExcel = () => {
    if (!reportData) return;

    const { summary, directSales = [], resellerSales = [] } = reportData;
    const wb = XLSX.utils.book_new();

    // 1. Summary sheet
    const summarySheetData = [
      { Parameter: 'Periode Awal', Nilai: startDate },
      { Parameter: 'Periode Akhir', Nilai: endDate },
      { Parameter: 'Filter Outlet/Lapak', Nilai: lapakId === 'all' ? 'Semua Lapak' : lapakId === 1 ? 'Lapak Ipang' : lapakId === 2 ? 'Kang Asep PJP' : 'Kang Asep RDTX' },
      { Parameter: '', Nilai: '' },
      { Parameter: 'Total Omzet (Kotor)', Nilai: summary.totalOmzet },
      { Parameter: 'Total Hak Ipang (Kotor)', Nilai: summary.totalHakIpang },
      { Parameter: 'Total Fee Reseller (Kang Asep)', Nilai: summary.totalFee },
      { Parameter: 'Total Untung Bersih (Profit)', Nilai: summary.totalProfit },
      { Parameter: 'Jumlah Total Qty Terjual', Nilai: `${summary.totalQty} pcs` },
      { Parameter: 'Produk Terlaris', Nilai: summary.topProduct },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laporan');

    // 2. Lapak Ipang sheet (direct sales)
    if (directSales.length > 0) {
      const l1ExcelRows = directSales.flatMap((h) =>
        h.details.map((d) => ({
          Tanggal: formatDateIndo(h.saleDate),
          Pembeli: h.buyerName,
          Produk: d.product.name,
          Qty: d.qty,
          'Harga Modal (HPP)': d.cogs,
          'Harga Satuan': d.price,
          Untung: d.profit,
          Subtotal: d.subtotal,
        }))
      );
      const wsL1 = XLSX.utils.json_to_sheet(l1ExcelRows);
      XLSX.utils.book_append_sheet(wb, wsL1, 'Lapak Ipang (Eceran)');
    }

    // 3. Reseller rekap sheet (lapak 2 & 3)
    if (resellerSales.length > 0) {
      const resellerExcelRows = resellerSales.flatMap((h) =>
        h.details.map((d) => ({
          Tanggal: formatDateIndo(h.saleDate),
          Pembeli: h.buyerName,
          Lapak: h.lapakId === 2 ? 'Kang Asep PJP' : 'Kang Asep RDTX & GRHA',
          Produk: d.product.name,
          Qty: d.qty,
          'Harga Modal (HPP)': d.cogs,
          'Target Masuk': d.target,
          'HET (Omzet)': d.het,
          'Fee Reseller (7%)': d.fee,
          Untung: d.profit,
          'Subtotal Hak Ipang': d.hakIpang,
          'Subtotal Omzet': d.omzet,
        }))
      );
      const wsReseller = XLSX.utils.json_to_sheet(resellerExcelRows);
      XLSX.utils.book_append_sheet(wb, wsReseller, 'Reseller (Rekapitulasi)');
    }

    XLSX.writeFile(wb, `Laporan_Pempek_GF_${startDate}_s.d_${endDate}.xlsx`);
    showToast('Laporan Excel berhasil diunduh.', 'success');
  };

  // Export PDF layout handler
  const handleExportPDF = () => {
    if (!reportData) return;

    const { summary, directSales = [], resellerSales = [] } = reportData;
    const doc = new jsPDF();

    // Set Document title & headers
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // dark navy
    doc.text('LAPORAN PENJUALAN PEMPEK GF (GLUTEN FREE)', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // gray
    const lapakText =
      lapakId === 'all'
        ? 'Semua Lapak'
        : lapakId === 1
        ? 'Lapak Ipang'
        : lapakId === 2
        ? 'Kang Asep PJP'
        : 'Kang Asep RDTX & GRHA';
    doc.text(`Periode Laporan: ${formatDateIndo(startDate)} s.d ${formatDateIndo(endDate)}`, 14, 26);
    doc.text(`Lapak/Outlet: ${lapakText}`, 14, 31);

    // Summary table layout
    const summaryBody = [
      ['Total Omzet (Kotor)', formatRupiah(summary.totalOmzet)],
      ['Total Hak Ipang (Kotor)', formatRupiah(summary.totalHakIpang)],
      ['Total Fee Reseller (Kang Asep)', formatRupiah(summary.totalFee)],
      ['Total Untung Bersih (Profit)', formatRupiah(summary.totalProfit)],
      ['Jumlah Total Qty Terjual', `${summary.totalQty} pcs`],
      ['Produk Terlaris', summary.topProduct],
    ];

    autoTable(doc, {
      startY: 37,
      head: [['Parameter Ringkasan', 'Total Nilai']],
      body: summaryBody,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }, // emerald
      styles: { fontSize: 9 },
    });

    let currentY = doc.lastAutoTable.finalY + 12;

    // Direct sales details
    if (directSales.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('1. Detail Penjualan Eceran (Lapak Ipang)', 14, currentY);

      const l1Rows = directSales.flatMap((h) =>
        h.details.map((d) => [
          formatDateIndo(h.saleDate),
          h.buyerName,
          d.product.name,
          d.qty,
          formatRupiah(d.price),
          formatRupiah(d.cogs),
          formatRupiah(d.profit),
          formatRupiah(d.subtotal),
        ])
      );

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Tanggal', 'Pembeli', 'Produk', 'Qty', 'Harga', 'Modal HPP', 'Untung', 'Subtotal']],
        body: l1Rows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }, // dark navy
        styles: { fontSize: 8 },
      });

      currentY = doc.lastAutoTable.finalY + 12;
    }

    // Reseller sales details
    if (resellerSales.length > 0) {
      // Check if page overflow
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('2. Detail Penjualan Reseller (Kang Asep PJP / RDTX)', 14, currentY);

      const resellerRows = resellerSales.flatMap((h) =>
        h.details.map((d) => [
          formatDateIndo(h.saleDate),
          h.buyerName,
          h.lapakId === 2 ? 'Kang Asep PJP' : 'Kang Asep RDTX',
          d.product.name,
          d.qty,
          formatRupiah(d.target),
          formatRupiah(d.het),
          formatRupiah(d.fee),
          formatRupiah(d.cogs),
          formatRupiah(d.profit),
        ])
      );

      autoTable(doc, {
        startY: currentY + 4,
        head: [['Tanggal', 'Pembeli', 'Lapak', 'Produk', 'Qty', 'Target', 'HET', 'Fee (7%)', 'Modal HPP', 'Untung']],
        body: resellerRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 },
      });
    }

    doc.save(`Laporan_Penjualan_Pempek_${startDate}_s.d_${endDate}.pdf`);
    showToast('Laporan PDF berhasil diunduh.', 'success');
  };

  const reportSummary = reportData?.summary || {
    totalOmzet: 0,
    totalHakIpang: 0,
    totalFee: 0,
    totalProfit: 0,
    totalQty: 0,
    topProduct: '-',
  };

  const directSales = reportData?.directSales || [];
  const resellerSales = reportData?.resellerSales || [];
  
  // Split reseller transactions into Lapak 2 and Lapak 3
  const l1Sales = directSales.filter((s) => s.lapakId === 1);
  const l4Sales = directSales.filter((s) => s.lapakId === 4);
  const l2Sales = resellerSales.filter((s) => s.lapakId === 2);
  const l3Sales = resellerSales.filter((s) => s.lapakId === 3);

  const editTotals = getEditTotals();

  const getLapakName = (id) => {
    if (id === 1) return 'Lapak Ipang';
    if (id === 4) return 'Lapak Zahra';
    if (id === 2) return 'Kang Asep PJP';
    if (id === 3) return 'Kang Asep RDTX & GRHA';
    return '';
  };

  return (
    <div className="space-y-6 text-brand-text">
      {/* Filters Header bar */}
      <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm flex flex-col md:flex-row items-end gap-4">
        {/* Start Date */}
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
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 px-9 text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* End Date */}
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
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 px-9 text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Lapak Dropdown */}
        <div className="w-full md:w-auto flex-1 space-y-2">
          <label className="text-xs font-bold text-brand-text-muted block">Filter Lapak/Outlet</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
              <Filter className="w-4 h-4" />
            </span>
            <select
              value={lapakId}
              onChange={(e) => setLapakId(e.target.value)}
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none font-semibold animate-transition"
            >
              <option value="all">Semua Lapak</option>
              <option value="1">Lapak Ipang (Eceran)</option>
              <option value="4">Lapak Zahra (Eceran)</option>
              <option value="2">Kang Asep PJP (Reseller)</option>
              <option value="3">Kang Asep RDTX & GRHA (Reseller)</option>
            </select>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2 w-full md:w-auto shrink-0 mt-2 sm:mt-0">
          <button
            onClick={handleExportExcel}
            className="flex-1 md:flex-initial bg-brand-bg-input border border-brand-border hover:bg-brand-table-hover text-brand-text font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4.5 h-4.5 text-brand-emerald" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex-1 md:flex-initial bg-brand-bg-input border border-brand-border hover:bg-brand-table-hover text-brand-text font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4.5 h-4.5 text-rose-500" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Query Search Form */}
      <form onSubmit={handleSearchSubmit} className="max-w-md bg-brand-card border border-brand-border shadow-sm p-4 rounded-2xl flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pembeli..."
            className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all"
        >
          Cari
        </button>
      </form>

      {/* Summary Aggregate Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Omzet */}
        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
          <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-wider block">Omzet Kotor</span>
          <span className="text-xs font-black text-brand-text tracking-tight mt-1 block">
            {formatRupiah(reportSummary.totalOmzet)}
          </span>
        </div>

        {/* Hak Ipang */}
        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
          <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-wider block">Hak Ipang (Kotor)</span>
          <span className="text-xs font-black text-brand-text tracking-tight mt-1 block">
            {formatRupiah(reportSummary.totalHakIpang)}
          </span>
        </div>

        {/* Reseller Fee */}
        <div className="bg-brand-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-sm">
          <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-wider block">Fee Kang Asep (7%)</span>
          <span className="text-xs font-black text-amber-500 tracking-tight mt-1 block">
            {formatRupiah(reportSummary.totalFee)}
          </span>
        </div>

        {/* Total Profit */}
        <div className="bg-brand-card p-4 rounded-2xl border border-brand-emerald/20 bg-brand-emerald/5 shadow-sm">
          <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-wider block">Untung Bersih (Net)</span>
          <span className="text-xs font-black text-brand-emerald tracking-tight mt-1 block animate-transition">
            {formatRupiah(reportSummary.totalProfit)}
          </span>
        </div>

        {/* Total Qty */}
        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
          <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-wider block">Qty Terjual</span>
          <span className="text-xs font-black text-brand-text tracking-tight mt-1 block">
            {reportSummary.totalQty} pcs
          </span>
        </div>

        {/* Top Product */}
        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm">
          <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-wider block">Lapak Terlaris</span>
          <span className="text-xs font-bold text-brand-text tracking-tight mt-1 block truncate">
            {reportSummary.topProduct}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-brand-text-muted gap-2">
          <svg className="animate-spin h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs">Memproses laporan query...</span>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Table 1: Lapak Ipang (Lapak 1) */}
          {(lapakId === 'all' || parseInt(lapakId) === 1) && (
            <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-brand-text">Daftar Transaksi: Lapak Ipang (Lapak 1)</h3>
                <p className="text-[10px] text-brand-text-muted font-medium">Total {l1Sales.length} transaksi ritel</p>
              </div>

              {l1Sales.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-brand-border rounded-2xl text-brand-text-muted gap-2">
                  <AlertCircle className="w-6 h-6 opacity-45" />
                  <span className="text-xs">Tidak ditemukan transaksi Lapak Ipang.</span>
                </div>
              ) : (
                <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Nama Pembeli</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Total Transaksi</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {l1Sales.map((tx) => {
                        const totalQty = tx.details.reduce((sum, d) => sum + d.qty, 0);
                        return (
                          <tr key={tx.id} className="border-b border-brand-border/60 hover:bg-brand-table-hover/30 text-brand-text">
                            <td className="p-3">{formatDateIndo(tx.saleDate)}</td>
                            <td className="p-3 font-semibold text-brand-text">{tx.buyerName}</td>
                            <td className="p-3 text-center font-bold text-brand-text-muted">{totalQty} pcs</td>
                            <td className="p-3 text-right font-black text-brand-text">{formatRupiah(tx.totalAmount)}</td>
                            <td className="p-3 text-center flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedTx(tx);
                                  setIsDetailOpen(true);
                                }}
                                className="p-1 text-brand-text-muted hover:text-brand-emerald transition-colors"
                                title="Lihat Detail"
                              >
                                <Eye className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(tx)}
                                className="p-1 text-brand-text-muted hover:text-indigo-500 transition-colors"
                                title="Edit Transaksi"
                              >
                                <Edit2 className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(tx.id, tx.invoiceNumber)}
                                className="p-1 text-brand-text-muted hover:text-rose-500 transition-colors"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Table 4: Lapak Zahra (Lapak 4) */}
          {(lapakId === 'all' || parseInt(lapakId) === 4) && (
            <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-brand-text">Daftar Transaksi: Lapak Zahra (Lapak 4)</h3>
                <p className="text-[10px] text-brand-text-muted font-medium">Total {l4Sales.length} transaksi ritel</p>
              </div>

              {l4Sales.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-brand-border rounded-2xl text-brand-text-muted gap-2">
                  <AlertCircle className="w-6 h-6 opacity-45" />
                  <span className="text-xs">Tidak ditemukan transaksi Lapak Zahra.</span>
                </div>
              ) : (
                <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Nama Pembeli</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Total Transaksi</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {l4Sales.map((tx) => {
                        const totalQty = tx.details.reduce((sum, d) => sum + d.qty, 0);
                        return (
                          <tr key={tx.id} className="border-b border-brand-border/60 hover:bg-brand-table-hover/30 text-brand-text">
                            <td className="p-3">{formatDateIndo(tx.saleDate)}</td>
                            <td className="p-3 font-semibold text-brand-text">{tx.buyerName}</td>
                            <td className="p-3 text-center font-bold text-brand-text-muted">{totalQty} pcs</td>
                            <td className="p-3 text-right font-black text-brand-text">{formatRupiah(tx.totalAmount)}</td>
                            <td className="p-3 text-center flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedTx(tx);
                                  setIsDetailOpen(true);
                                }}
                                className="p-1 text-brand-text-muted hover:text-brand-emerald transition-colors"
                                title="Lihat Detail"
                              >
                                <Eye className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(tx)}
                                className="p-1 text-brand-text-muted hover:text-indigo-500 transition-colors"
                                title="Edit Transaksi"
                              >
                                <Edit2 className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(tx.id, tx.invoiceNumber)}
                                className="p-1 text-brand-text-muted hover:text-rose-500 transition-colors"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Table 2: Kang Asep PJP (Lapak 2) */}
          {(lapakId === 'all' || parseInt(lapakId) === 2) && (
            <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-brand-text">Daftar Transaksi: Kang Asep PJP (Lapak 2)</h3>
                <p className="text-[10px] text-brand-text-muted font-medium">Total {l2Sales.length} transaksi di reseller PJP</p>
              </div>

              {l2Sales.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-brand-border rounded-2xl text-brand-text-muted gap-2">
                  <AlertCircle className="w-6 h-6 opacity-45" />
                  <span className="text-xs">Tidak ditemukan transaksi Lapak PJP.</span>
                </div>
              ) : (
                <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Nama Pembeli</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Omzet Kotor (HET)</th>
                        <th className="p-3 text-right">Fee Reseller (7%)</th>
                        <th className="p-3 text-right">Hak Ipang (Bersih)</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {l2Sales.map((tx) => {
                        const totalQty = tx.details.reduce((sum, d) => sum + d.qty, 0);
                        return (
                          <tr key={tx.id} className="border-b border-brand-border/60 hover:bg-brand-table-hover/30 text-brand-text">
                            <td className="p-3">{formatDateIndo(tx.saleDate)}</td>
                            <td className="p-3 font-semibold text-brand-text">{tx.buyerName}</td>
                            <td className="p-3 text-center font-bold text-brand-text-muted">{totalQty} pcs</td>
                            <td className="p-3 text-right font-black text-brand-text">{formatRupiah(tx.totalAmount)}</td>
                            <td className="p-3 text-right font-semibold text-amber-500 bg-amber-500/5">{formatRupiah(tx.totalFee)}</td>
                            <td className="p-3 text-right font-bold text-brand-emerald bg-emerald-500/5">{formatRupiah(tx.totalHakIpang)}</td>
                            <td className="p-3 text-center flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedTx(tx);
                                  setIsDetailOpen(true);
                                }}
                                className="p-1 text-brand-text-muted hover:text-brand-emerald transition-colors"
                                title="Lihat Detail"
                              >
                                <Eye className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(tx)}
                                className="p-1 text-brand-text-muted hover:text-indigo-500 transition-colors"
                                title="Edit Transaksi"
                              >
                                <Edit2 className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(tx.id, tx.invoiceNumber)}
                                className="p-1 text-brand-text-muted hover:text-rose-500 transition-colors"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Table 3: Kang Asep RDTX & GRHA (Lapak 3) */}
          {(lapakId === 'all' || parseInt(lapakId) === 3) && (
            <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-brand-text">Daftar Transaksi: Kang Asep RDTX & GRHA (Lapak 3)</h3>
                <p className="text-[10px] text-brand-text-muted font-medium">Total {l3Sales.length} transaksi di reseller RDTX</p>
              </div>

              {l3Sales.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-brand-border rounded-2xl text-brand-text-muted gap-2">
                  <AlertCircle className="w-6 h-6 opacity-45" />
                  <span className="text-xs">Tidak ditemukan transaksi Lapak RDTX.</span>
                </div>
              ) : (
                <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Nama Pembeli</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Omzet Kotor (HET)</th>
                        <th className="p-3 text-right">Fee Reseller (7%)</th>
                        <th className="p-3 text-right">Hak Ipang (Bersih)</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {l3Sales.map((tx) => {
                        const totalQty = tx.details.reduce((sum, d) => sum + d.qty, 0);
                        return (
                          <tr key={tx.id} className="border-b border-brand-border/60 hover:bg-brand-table-hover/30 text-brand-text">
                            <td className="p-3">{formatDateIndo(tx.saleDate)}</td>
                            <td className="p-3 font-semibold text-brand-text">{tx.buyerName}</td>
                            <td className="p-3 text-center font-bold text-brand-text-muted">{totalQty} pcs</td>
                            <td className="p-3 text-right font-black text-brand-text">{formatRupiah(tx.totalAmount)}</td>
                            <td className="p-3 text-right font-semibold text-amber-500 bg-amber-500/5">{formatRupiah(tx.totalFee)}</td>
                            <td className="p-3 text-right font-bold text-brand-emerald bg-emerald-500/5">{formatRupiah(tx.totalHakIpang)}</td>
                            <td className="p-3 text-center flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedTx(tx);
                                  setIsDetailOpen(true);
                                }}
                                className="p-1 text-brand-text-muted hover:text-brand-emerald transition-colors"
                                title="Lihat Detail"
                              >
                                <Eye className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(tx)}
                                className="p-1 text-brand-text-muted hover:text-indigo-500 transition-colors"
                                title="Edit Transaksi"
                              >
                                <Edit2 className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTx(tx.id, tx.invoiceNumber)}
                                className="p-1 text-brand-text-muted hover:text-rose-500 transition-colors"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: DETAIL TRANSACTION (Handles Lapak 1, 2, and 3) */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detail Transaksi Penjualan" size="lg">
        {selectedTx && (
          <div className="space-y-6 text-brand-text">
            <div className="grid grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <span className="text-brand-text-muted font-semibold block uppercase">Nama Pembeli</span>
                <span className="text-brand-text font-bold mt-0.5 block">{selectedTx.buyerName}</span>
              </div>
              <div>
                <span className="text-brand-text-muted font-semibold block uppercase">Tanggal</span>
                <span className="text-brand-text font-bold mt-0.5 block">{formatDateIndo(selectedTx.saleDate)}</span>
              </div>
              <div>
                <span className="text-brand-text-muted font-semibold block uppercase">No Invoice</span>
                <span className="text-brand-text-muted font-mono font-semibold mt-0.5 block">{selectedTx.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-brand-text-muted font-semibold block uppercase">Lapak Penjualan</span>
                <span className="text-brand-emerald font-bold mt-0.5 block">{getLapakName(selectedTx.lapakId)}</span>
              </div>
            </div>

            <div className="border border-brand-border rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                    <th className="p-3">Produk</th>
                    <th className="p-3 text-center">Qty</th>
                    {selectedTx.lapakId === 1 ? (
                      <>
                        <th className="p-3 text-right">Harga Jual</th>
                        <th className="p-3 text-right">Modal (HPP)</th>
                        <th className="p-3 text-right">Untung Bersih</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3 text-right">Target</th>
                        <th className="p-3 text-right">HET</th>
                        <th className="p-3 text-right">Fee (7%)</th>
                        <th className="p-3 text-right">Hak Ipang</th>
                        <th className="p-3 text-right">Modal (HPP)</th>
                        <th className="p-3 text-right">Untung Bersih</th>
                        <th className="p-3 text-right">Omzet Kotor</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedTx.details.map((d) => (
                    <tr key={d.id} className="border-b border-brand-border text-brand-text">
                      <td className="p-3 font-semibold text-brand-text">{d.product?.name}</td>
                      <td className="p-3 text-center">{d.qty} pcs</td>
                      {selectedTx.lapakId === 1 ? (
                        <>
                          <td className="p-3 text-right text-brand-text-muted">{formatRupiah(d.price)}</td>
                          <td className="p-3 text-right text-brand-text-muted font-mono">{formatRupiah(d.cogs || 0)}</td>
                          <td className="p-3 text-right text-brand-emerald font-bold font-mono">{formatRupiah(d.profit || 0)}</td>
                          <td className="p-3 text-right font-black text-brand-text">{formatRupiah(d.subtotal)}</td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-right text-brand-text-muted font-mono">{formatRupiah(d.target)}</td>
                          <td className="p-3 text-right text-brand-text-muted font-mono">{formatRupiah(d.het)}</td>
                          <td className="p-3 text-right text-amber-500 font-semibold">{formatRupiah(d.fee)}</td>
                          <td className="p-3 text-right text-brand-emerald font-semibold">{formatRupiah(d.hakIpang)}</td>
                          <td className="p-3 text-right text-brand-text-muted font-mono">{formatRupiah(d.cogs || 0)}</td>
                          <td className="p-3 text-right text-brand-emerald font-bold font-mono bg-emerald-500/5">{formatRupiah(d.profit || 0)}</td>
                          <td className="p-3 text-right font-black text-brand-text">{formatRupiah(d.omzet)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Overall Totals breakdown inside detail modal */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-brand-bg-input border border-brand-border p-4 rounded-xl text-center">
              <div>
                <span className="text-[9px] font-bold text-brand-text-muted block uppercase">Total Omzet</span>
                <span className="text-xs font-extrabold text-brand-text block mt-0.5">{formatRupiah(selectedTx.totalAmount)}</span>
              </div>
              {selectedTx.lapakId !== 1 && (
                <>
                  <div>
                    <span className="text-[9px] font-bold text-brand-text-muted block uppercase">Fee Reseller (7%)</span>
                    <span className="text-xs font-bold text-amber-500 block mt-0.5">{formatRupiah(selectedTx.totalFee)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-brand-text-muted block uppercase">Hak Ipang</span>
                    <span className="text-xs font-bold text-brand-emerald block mt-0.5">{formatRupiah(selectedTx.totalHakIpang)}</span>
                  </div>
                </>
              )}
              <div className="bg-brand-emerald/10 border border-brand-emerald/20 rounded-lg py-1.5 col-span-2 md:col-span-1">
                <span className="text-[9px] font-black text-brand-emerald block uppercase">Untung Bersih</span>
                <span className="text-xs font-black text-brand-emerald block mt-0.5">{formatRupiah(selectedTx.totalProfit || 0)}</span>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
              <button
                onClick={() => openEditModal(selectedTx)}
                className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 text-xs hover:bg-indigo-500/20"
              >
                <Edit2 className="w-4.5 h-4.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDeleteTx(selectedTx.id, selectedTx.invoiceNumber)}
                className="bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 text-xs hover:bg-rose-500/20"
              >
                <Trash2 className="w-4.5 h-4.5" />
                <span>Hapus</span>
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="bg-brand-bg-input hover:bg-brand-table-hover border border-brand-border text-brand-text font-bold py-2 px-4 rounded-xl transition-all text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: EDIT TRANSACTION (Handles Lapak 1, 2, and 3) */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Transaksi Penjualan" size="lg">
        {editTx && (
          <form onSubmit={submitEditTx} className="space-y-6 text-brand-text">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Edit Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-text-muted block">Tanggal Transaksi</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 px-3 text-xs focus:outline-none"
                />
              </div>

              {/* Edit Buyer */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-brand-text-muted block">Nama Pembeli</label>
                <input
                  type="text"
                  value={editBuyerName}
                  onChange={(e) => setEditBuyerName(e.target.value)}
                  placeholder="Nama pembeli..."
                  className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 px-3 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Shopping Item rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-brand-text">Daftar Produk</h4>
                <button
                  type="button"
                  onClick={addEditRow}
                  className="flex items-center gap-1 text-xs font-bold text-brand-emerald hover:text-brand-emerald-dark"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              <div className="border border-brand-border rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                      <th className="p-3">Produk</th>
                      <th className="p-3 w-20 text-center">Qty</th>
                      {editTx.lapakId === 1 ? (
                        <>
                          <th className="p-3 w-28 text-right">Harga</th>
                          <th className="p-3 w-32 text-right">Subtotal</th>
                        </>
                      ) : (
                        <>
                          <th className="p-3 w-24 text-right">Target</th>
                          <th className="p-3 w-24 text-right">HET</th>
                          <th className="p-3 w-24 text-right">Fee (7%)</th>
                          <th className="p-3 w-24 text-right">Hak Ipang</th>
                          <th className="p-3 w-24 text-right">Omzet</th>
                        </>
                      )}
                      <th className="p-3 w-12 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((item, index) => (
                      <tr key={index} className="border-b border-brand-border text-brand-text">
                        <td className="p-2">
                          <select
                            value={item.productId}
                            onChange={(e) => handleEditRowChange(index, 'productId', e.target.value)}
                            className="w-full min-w-[150px] bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-lg p-1.5 text-xs focus:outline-none"
                          >
                            <option value="">-- Pilih Produk --</option>
                            {allProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleEditRowChange(index, 'qty', e.target.value)}
                            className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-lg p-1.5 text-xs focus:outline-none text-center"
                          />
                        </td>
                        {editTx.lapakId === 1 ? (
                          <>
                            <td className="p-2 text-right text-brand-text-muted font-medium">
                              {formatRupiah(item.price)}
                            </td>
                            <td className="p-2 text-right font-bold text-brand-text">
                              {formatRupiah(item.subtotal)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 text-right text-brand-text-muted font-mono">{formatRupiah(item.target)}</td>
                            <td className="p-2 text-right text-brand-text-muted font-mono">{formatRupiah(item.het)}</td>
                            <td className="p-2 text-right text-amber-500 font-mono font-semibold">{formatRupiah(item.fee)}</td>
                            <td className="p-2 text-right text-brand-emerald font-mono font-bold">{formatRupiah(item.hakIpang)}</td>
                            <td className="p-2 text-right font-mono font-black text-brand-text">{formatRupiah(item.subtotal)}</td>
                          </>
                        )}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeEditRow(index)}
                            className="text-brand-text-muted hover:text-rose-500"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit Total & Submit */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-brand-border pt-6 gap-4">
              <div>
                <span className="text-[10px] text-brand-text-muted font-semibold block uppercase">Total Transaksi</span>
                {editTx.lapakId === 1 ? (
                  <span className="text-lg font-black text-brand-emerald">
                    {formatRupiah(editTotals.omzet)}
                  </span>
                ) : (
                  <div className="flex gap-4 text-xs font-semibold text-brand-text-muted font-mono">
                    <span>Omzet HET: <span className="text-brand-text font-bold">{formatRupiah(editTotals.omzet)}</span></span>
                    <span>Fee: <span className="text-amber-500 font-bold">{formatRupiah(editTotals.fee)}</span></span>
                    <span>Hak Ipang: <span className="text-brand-emerald font-bold">{formatRupiah(editTotals.hakIpang)}</span></span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-md shadow-emerald-600/10"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="bg-brand-bg-input hover:bg-brand-table-hover border border-brand-border text-brand-text font-bold py-2.5 px-4 rounded-xl text-xs"
                >
                  Batal
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Report;
