import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

const Layout = ({ children, activePage, setActivePage }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Handle theme injection
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'input-sales', name: 'Input Penjualan', icon: PlusCircle },
    { id: 'report', name: 'Laporan Penjualan', icon: FileText },
    { id: 'products', name: 'Master Produk', icon: Package },
    { id: 'settings', name: 'Pengaturan & DB', icon: Settings },
  ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  const getPageTitle = () => {
    const activeItem = menuItems.find((item) => item.id === activePage);
    return activeItem ? activeItem.name : 'Aplikasi Penjualan';
  };

  return (
    <div className="min-h-screen bg-brand-dark flex text-brand-text transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-slate-350 border-r border-slate-900 shrink-0">
        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-500/20 text-lg">
            P
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">Pempek Zahra</h1>
            <p className="text-[10px] text-slate-500">Pembukuan Penjualan</p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10'
                    : 'hover:bg-slate-900 hover:text-slate-100 text-slate-450'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-white" />}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Profile & Logout Footer */}
        <div className="p-4 border-t border-slate-900 bg-slate-950">
          <div className="flex items-center gap-3 px-2 py-3 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-slate-405 border border-slate-800">
              <User className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="text-xs font-semibold text-slate-200 truncate">
                {user?.username || 'Admin Ipang'}
              </h4>
              <p className="text-[10px] text-slate-600 truncate font-mono">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all duration-205"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Aplikasi</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-brand-header border-b border-brand-border flex items-center justify-between px-4 md:px-8 z-30 shrink-0 shadow-sm transition-colors duration-200">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-brand-text-muted hover:bg-brand-bg-input transition-colors border border-brand-border"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Current Page Title */}
          <h2 className="text-sm font-extrabold text-brand-text tracking-tight">{getPageTitle()}</h2>

          {/* Right Header Widgets */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-brand-text-muted hover:text-brand-text hover:bg-brand-bg-input border border-brand-border transition-all"
              title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* User badge */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-[10px] font-bold px-2.5 py-1 bg-brand-emerald/10 text-brand-emerald rounded-full border border-brand-emerald/20">
                Lapak Online
              </span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                  {(user?.username || 'I')[0].toUpperCase()}
                </div>
                <span className="hidden md:inline-block text-xs font-bold text-brand-text">
                  {user?.username || 'Ipang'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <aside className="relative flex flex-col w-72 max-w-xs bg-slate-950 text-slate-300 h-full shadow-2xl">
            {/* Close Button */}
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Header */}
            <div className="p-6 border-b border-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-white shadow-md text-lg">
                P
              </div>
              <div>
                <h1 className="font-bold text-white text-sm">Pempek GF</h1>
                <p className="text-[10px] text-slate-550">Pembukuan Penjualan</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-900 bg-slate-950">
              <div className="flex items-center gap-3 px-2 py-3 rounded-lg mb-2">
                <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-slate-350">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-semibold text-slate-200 truncate">{user?.username}</h4>
                  <p className="text-[10px] text-slate-600 truncate">Administrator</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Keluar Aplikasi</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Layout;
