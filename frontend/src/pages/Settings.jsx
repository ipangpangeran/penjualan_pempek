import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatDateIndo, getLocalDateString } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import {
  Lock,
  Database,
  Download,
  Upload,
  History,
  Search,
  Key,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';

const Settings = () => {
  const { showToast } = useToast();

  // Change Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // DB Restore state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Audit Logs state
  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchAuditLogs = async (page = 1) => {
    setIsLoadingLogs(true);
    try {
      const response = await api.get('/db/audit-logs', {
        params: {
          page,
          limit: 15,
          search: logSearch,
        },
      });
      setLogs(response.data.logs);
      setLogPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.totalPages);
      setTotalLogs(response.data.pagination.total);
    } catch (error) {
      console.error(error);
      showToast('Gagal memuat log audit.', 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(logPage);
  }, [logPage]);

  const handleSearchLogs = (e) => {
    e.preventDefault();
    setLogPage(1);
    fetchAuditLogs(1);
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Semua kolom password harus diisi.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password baru tidak cocok.', 'warning');
      return;
    }

    setIsChangingPass(true);
    try {
      await api.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });

      showToast('Password admin berhasil diubah.', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchAuditLogs(1);
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Gagal mengubah password.', 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  // DB Backup handler
  const handleDownloadBackup = async () => {
    try {
      const response = await api.get('/db/backup', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pempek_gf_backup_${getLocalDateString()}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Backup database berhasil diunduh.', 'success');
      fetchAuditLogs(1);
    } catch (error) {
      console.error(error);
      showToast('Gagal mengunduh backup database.', 'error');
    }
  };

  // DB Restore handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.db')) {
        showToast('Harap pilih file database SQLite (.db) yang valid.', 'warning');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRestoreBackup = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      showToast('Harap pilih file backup terlebih dahulu.', 'warning');
      return;
    }

    const confirmRestore = window.confirm(
      'PERINGATAN: Restorasi database akan menghapus dan menimpa seluruh data saat ini dengan data dari file backup. Pastikan file valid. Lanjutkan?'
    );
    if (!confirmRestore) return;

    const formData = new FormData();
    formData.append('backup', selectedFile);

    setIsRestoring(true);
    try {
      await api.post('/db/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('Restorasi database berhasil! Halaman akan dimuat ulang.', 'success');
      setSelectedFile(null);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Gagal merestore database.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Clear Audit Logs handler
  const handleClearAuditLogs = async () => {
    const confirmClear = window.confirm(
      'Apakah Anda yakin ingin menghapus seluruh riwayat log audit untuk menghemat ruang penyimpanan server? Tindakan ini permanen dan tidak dapat dibatalkan.'
    );
    if (!confirmClear) return;

    try {
      await api.delete('/db/audit-logs');
      showToast('Riwayat log audit berhasil dibersihkan.', 'success');
      setLogPage(1);
      fetchAuditLogs(1);
    } catch (error) {
      console.error(error);
      showToast('Gagal membersihkan log audit.', 'error');
    }
  };

  return (
    <div className="space-y-8 text-brand-text">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Change Password Panel */}
        <div className="bg-brand-card p-6 rounded-3xl border border-brand-border shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-brand-border pb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/10 animate-transition">
              <Key className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-brand-text">Ubah Password Admin</h3>
              <p className="text-[10px] text-brand-text-muted font-medium">Ganti kredensial masuk akun ipangpangeran</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-text-muted block">Password Lama</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-brand-emerald rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-text-muted block">Password Baru</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-brand-emerald rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-text-muted block">Konfirmasi Password Baru</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-brand-emerald rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald/10"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-[#10B981] hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors flex items-center gap-1.5"
              disabled={isChangingPass}
            >
              <span>Ubah Password</span>
            </button>
          </form>
        </div>

        {/* Database Maintenance Panel */}
        <div className="bg-brand-card p-6 rounded-3xl border border-brand-border shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-brand-border pb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/10">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-brand-text">Pemeliharaan Database</h3>
              <p className="text-[10px] text-brand-text-muted font-medium">Backup dan restore file data pembukuan SQLite</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Backup Widget */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-brand-text">Unduh Backup Database</h4>
                  <p className="text-[9px] text-brand-text-muted mt-0.5 font-medium">
                    Ambil salinan cadangan file database SQLite saat ini.
                  </p>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 transition-all shadow-md shadow-emerald-600/10"
                >
                  <Download className="w-4 h-4" />
                  <span>Backup</span>
                </button>
              </div>
            </div>

            {/* Restore Widget */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-3">
              <div>
                <h4 className="text-xs font-bold text-brand-text">Pulihkan dari File Backup</h4>
                <p className="text-[9px] text-rose-500 mt-0.5 flex items-center gap-1 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Perhatian: Data saat ini akan sepenuhnya tertimpa!</span>
                </p>
              </div>

              <form onSubmit={handleRestoreBackup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                <input
                  type="file"
                  accept=".db"
                  onChange={handleFileChange}
                  className="flex-1 bg-brand-card border border-brand-border rounded-xl p-1 text-xs text-brand-text file:bg-brand-bg-input file:border-none file:py-1.5 file:px-3 file:rounded-lg file:text-xs file:font-semibold file:text-brand-text-muted cursor-pointer"
                />
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  disabled={!selectedFile || isRestoring}
                >
                  {isRestoring ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Restoring...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Restore</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Panel */}
      <div className="bg-brand-card p-6 rounded-3xl border border-brand-border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-550 flex items-center justify-center shrink-0 border border-emerald-500/10">
              <History className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-brand-text">Audit Log Aplikasi</h3>
              <p className="text-[10px] text-brand-text-muted font-medium">Total {totalLogs} riwayat aktivitas admin tercatat</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Clear Audit Logs Button */}
            <button
              onClick={handleClearAuditLogs}
              className="bg-rose-500/10 border border-rose-500/25 hover:bg-rose-600 hover:text-white text-rose-500 font-bold py-1.5 px-3.5 rounded-xl text-xs transition-all flex items-center gap-1"
              title="Hapus Seluruh Audit Log"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Log</span>
            </button>

            {/* Audit Log Search */}
            <form onSubmit={handleSearchLogs} className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Cari log..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="bg-brand-bg-input border border-brand-border focus:border-emerald-500 rounded-xl py-1.5 pl-9 pr-3 text-xs focus:outline-none w-52 text-brand-text"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs"
              >
                Cari
              </button>
            </form>
          </div>
        </div>

        {isLoadingLogs ? (
          <div className="flex flex-col items-center justify-center p-12 text-brand-text-muted gap-2">
            <svg className="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs">Memuat log...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border border-dashed border-brand-border rounded-2xl text-brand-text-muted gap-2">
            <History className="w-6 h-6 opacity-45" />
            <span className="text-xs">Tidak ditemukan riwayat log audit.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto transition-colors duration-200">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                    <th className="p-3 w-48">Waktu</th>
                    <th className="p-3 w-32">User</th>
                    <th className="p-3 w-36">Aksi</th>
                    <th className="p-3">Keterangan/Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-brand-border/65 hover:bg-brand-table-hover/30 text-brand-text transition-colors duration-200">
                      <td className="p-3 font-mono text-[10px] text-brand-text-muted">
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 font-semibold text-brand-text">{log.username}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold text-[9px] border ${
                            log.action.startsWith('CREATE')
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : log.action.startsWith('UPDATE') || log.action.startsWith('EDIT')
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : log.action.startsWith('DELETE') || log.action.startsWith('REMOVE') || log.action.startsWith('CLEAR')
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : 'bg-brand-bg-input text-brand-text-muted border border-brand-border'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-brand-text-muted truncate max-w-sm" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-brand-border pt-4 text-xs font-semibold text-brand-text-muted">
                <span>
                  Halaman {logPage} dari {totalPages}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                    className="p-1.5 border border-brand-border rounded-lg hover:bg-brand-table-hover disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setLogPage((p) => Math.min(totalPages, p + 1))}
                    disabled={logPage === totalPages}
                    className="p-1.5 border border-brand-border rounded-lg hover:bg-brand-table-hover disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
