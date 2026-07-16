import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatRupiah } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import Modal from '../components/UI/Modal';
import {
  Search,
  Plus,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Package,
  Layers,
  Save,
  Store,
  TrendingUp,
} from 'lucide-react';

const ProductMaster = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form states: New Product
  const [newName, setNewName] = useState('');
  const [newPrices, setNewPrices] = useState({
    price1: 0,
    target2: 0,
    het2: 0,
    target3: 0,
    het3: 0,
  });

  // Form states: Edit Product
  const [editName, setEditName] = useState('');
  const [editPrices, setEditPrices] = useState({
    price1: 0,
    target2: 0,
    het2: 0,
    target3: 0,
    het3: 0,
  });

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/products');
      setProducts(response.data.products);
    } catch (error) {
      console.error(error);
      showToast('Gagal memuat katalog produk.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleStatus = async (product) => {
    const nextStatus = !product.isActive;
    try {
      await api.patch(`/products/${product.id}/status`, { isActive: nextStatus });
      showToast(`Produk ${product.name} berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
      fetchProducts();
    } catch (error) {
      console.error(error);
      showToast('Gagal mengubah status produk.', 'error');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    if (!newName.trim()) {
      showToast('Nama produk harus diisi.', 'warning');
      return;
    }

    try {
      await api.post('/products', {
        name: newName,
        prices: [
          { lapakId: 1, price: newPrices.price1, target: 0, het: 0 },
          { lapakId: 2, price: 0, target: newPrices.target2, het: newPrices.het2 },
          { lapakId: 3, price: 0, target: newPrices.target3, het: newPrices.het3 },
        ],
      });

      showToast('Produk baru berhasil ditambahkan.', 'success');
      setIsAddOpen(false);
      setNewName('');
      setNewPrices({ price1: 0, target2: 0, het2: 0, target3: 0, het3: 0 });
      fetchProducts();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Gagal menambahkan produk.', 'error');
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditName(product.name);

    // Map existing pricing config
    const price1 = product.prices?.find((p) => p.lapakId === 1)?.price || 0;
    const target2 = product.prices?.find((p) => p.lapakId === 2)?.target || 0;
    const het2 = product.prices?.find((p) => p.lapakId === 2)?.het || 0;
    const target3 = product.prices?.find((p) => p.lapakId === 3)?.target || 0;
    const het3 = product.prices?.find((p) => p.lapakId === 3)?.het || 0;

    setEditPrices({ price1, target2, het2, target3, het3 });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editName.trim()) {
      showToast('Nama produk harus diisi.', 'warning');
      return;
    }

    try {
      await api.put(`/products/${editingProduct.id}`, {
        name: editName,
        prices: [
          { lapakId: 1, price: editPrices.price1, target: 0, het: 0 },
          { lapakId: 2, price: 0, target: editPrices.target2, het: editPrices.het2 },
          { lapakId: 3, price: 0, target: editPrices.target3, het: editPrices.het3 },
        ],
      });

      showToast('Produk dan harga berhasil diperbarui.', 'success');
      setIsEditOpen(false);
      fetchProducts();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Gagal memperbarui produk.', 'error');
    }
  };

  // Filter products by search text
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-brand-text">
      {/* Header Controls */}
      <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-muted">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2 px-9 text-xs focus:outline-none"
          />
        </div>

        {/* Add Product Button */}
        <button
          onClick={() => setIsAddOpen(true)}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-brand-text-muted gap-2">
          <svg className="animate-spin h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs">Memuat katalog...</span>
        </div>
      ) : (
        <div className="bg-brand-card rounded-3xl p-6 border border-brand-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-4">
            <div>
              <h3 className="text-sm font-bold text-brand-text">Katalog Master Produk</h3>
              <p className="text-[10px] text-brand-text-muted">Menampilkan {filteredProducts.length} produk terdaftar</p>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-brand-border rounded-2xl text-brand-text-muted gap-2">
              <Package className="w-6 h-6 opacity-45" />
              <span className="text-xs">Produk tidak ditemukan. Silakan tambahkan produk baru.</span>
            </div>
          ) : (
            <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-brand-table-hdr border-b border-brand-border text-brand-text-muted font-semibold font-mono">
                    <th className="p-3">Nama Produk</th>
                    <th className="p-3 text-right">Harga Lapak 1</th>
                    <th className="p-3 text-right">Lapak 2 (Target/HET)</th>
                    <th className="p-3 text-right">Lapak 3 (Target/HET)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const price1 = p.prices?.find((pr) => pr.lapakId === 1)?.price || 0;
                    const target2 = p.prices?.find((pr) => pr.lapakId === 2)?.target || 0;
                    const het2 = p.prices?.find((pr) => pr.lapakId === 2)?.het || 0;
                    const target3 = p.prices?.find((pr) => pr.lapakId === 3)?.target || 0;
                    const het3 = p.prices?.find((pr) => pr.lapakId === 3)?.het || 0;

                    return (
                      <tr key={p.id} className={`border-b border-brand-border/60 hover:bg-brand-table-hover/30 text-brand-text ${!p.isActive ? 'opacity-40' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                            <span className="font-semibold text-brand-text">{p.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-semibold text-brand-text">
                          {formatRupiah(price1)}
                        </td>
                        <td className="p-3 text-right font-medium text-brand-text-muted">
                          <span className="text-[10px] text-brand-text-muted font-bold">Target:</span> {formatRupiah(target2)} <br />
                          <span className="text-[10px] text-brand-text-muted font-bold">HET:</span> {formatRupiah(het2)}
                        </td>
                        <td className="p-3 text-right font-medium text-brand-text-muted">
                          <span className="text-[10px] text-brand-text-muted font-bold">Target:</span> {formatRupiah(target3)} <br />
                          <span className="text-[10px] text-brand-text-muted font-bold">HET:</span> {formatRupiah(het3)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(p)}
                            className="focus:outline-none transition-colors"
                            title={p.isActive ? 'Nonaktifkan Produk' : 'Aktifkan Produk'}
                          >
                            {p.isActive ? (
                              <ToggleRight className="w-7 h-7 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-7 h-7 text-slate-500" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded bg-brand-bg-input border border-brand-border text-brand-text hover:text-indigo-500 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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

      {/* MODAL: ADD PRODUCT */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tambah Produk Baru" size="lg">
        <form onSubmit={handleAddSubmit} className="space-y-6">
          {/* Product Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-text-muted block">Nama Produk</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Pempek Lenjer"
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pricing Lapak 1 */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center gap-1.5 border-b border-brand-border pb-2 text-brand-text">
                <Store className="w-4 h-4 text-brand-emerald" />
                <span className="text-xs font-bold">Lapak Ipang</span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-brand-text-muted font-semibold block">Harga Jual (Eceran)</label>
                <input
                  type="number"
                  min="0"
                  value={newPrices.price1}
                  onChange={(e) => setNewPrices({ ...newPrices, price1: parseInt(e.target.value) || 0 })}
                  className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                />
              </div>
            </div>

            {/* Pricing Lapak 2 */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center gap-1.5 border-b border-brand-border pb-2 text-brand-text">
                <TrendingUp className="w-4 h-4 text-brand-emerald" />
                <span className="text-xs font-bold">Reseller PJP</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-brand-text-muted font-semibold block">Target Masuk Ipang</label>
                  <input
                    type="number"
                    min="0"
                    value={newPrices.target2}
                    onChange={(e) => setNewPrices({ ...newPrices, target2: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-brand-text-muted font-semibold block">HET Jual</label>
                  <input
                    type="number"
                    min="0"
                    value={newPrices.het2}
                    onChange={(e) => setNewPrices({ ...newPrices, het2: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Lapak 3 */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center gap-1.5 border-b border-brand-border pb-2 text-brand-text">
                <TrendingUp className="w-4 h-4 text-brand-emerald" />
                <span className="text-xs font-bold">Reseller RDTX/GRHA</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-brand-text-muted font-semibold block">Target Masuk Ipang</label>
                  <input
                    type="number"
                    min="0"
                    value={newPrices.target3}
                    onChange={(e) => setNewPrices({ ...newPrices, target3: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-brand-text-muted font-semibold block">HET Jual</label>
                  <input
                    type="number"
                    min="0"
                    value={newPrices.het3}
                    onChange={(e) => setNewPrices({ ...newPrices, het3: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-md shadow-emerald-600/10"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Produk</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="bg-brand-bg-input hover:bg-brand-table-hover border border-brand-border text-brand-text font-bold py-2.5 px-4 rounded-xl text-xs"
            >
              Batal
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT PRODUCT */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Produk & Harga" size="lg">
        <form onSubmit={handleEditSubmit} className="space-y-6">
          {/* Edit Product Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-text-muted block">Nama Produk</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-brand-bg-input border border-brand-border text-brand-text focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pricing Lapak 1 */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center gap-1.5 border-b border-brand-border pb-2 text-brand-text">
                <Store className="w-4 h-4 text-brand-emerald" />
                <span className="text-xs font-bold">Lapak Ipang</span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-brand-text-muted font-semibold block">Harga Jual (Eceran)</label>
                <input
                  type="number"
                  min="0"
                  value={editPrices.price1}
                  onChange={(e) => setEditPrices({ ...editPrices, price1: parseInt(e.target.value) || 0 })}
                  className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                />
              </div>
            </div>

            {/* Pricing Lapak 2 */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center gap-1.5 border-b border-brand-border pb-2 text-brand-text">
                <TrendingUp className="w-4 h-4 text-brand-emerald" />
                <span className="text-xs font-bold">Reseller PJP</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-brand-text-muted font-semibold block">Target Masuk Ipang</label>
                  <input
                    type="number"
                    min="0"
                    value={editPrices.target2}
                    onChange={(e) => setEditPrices({ ...editPrices, target2: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-brand-text-muted font-semibold block">HET Jual</label>
                  <input
                    type="number"
                    min="0"
                    value={editPrices.het2}
                    onChange={(e) => setEditPrices({ ...editPrices, het2: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Lapak 3 */}
            <div className="bg-brand-bg-input p-4 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center gap-1.5 border-b border-brand-border pb-2 text-brand-text">
                <TrendingUp className="w-4 h-4 text-brand-emerald" />
                <span className="text-xs font-bold">Reseller RDTX/GRHA</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-brand-text-muted font-semibold block">Target Masuk Ipang</label>
                  <input
                    type="number"
                    min="0"
                    value={editPrices.target3}
                    onChange={(e) => setEditPrices({ ...editPrices, target3: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-brand-text-muted font-semibold block">HET Jual</label>
                  <input
                    type="number"
                    min="0"
                    value={editPrices.het3}
                    onChange={(e) => setEditPrices({ ...editPrices, het3: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-card border border-brand-border focus:border-emerald-500 rounded-lg p-2 text-xs focus:outline-none font-bold text-brand-text"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-brand-border">
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
        </form>
      </Modal>
    </div>
  );
};

export default ProductMaster;
