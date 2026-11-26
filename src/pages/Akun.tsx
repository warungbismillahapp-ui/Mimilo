import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAuth, setAuth, saveUser, clearAuth, fileToBase64, getListings, deleteListing, saveListing,
  NOTIFY_PAYMENT_KEY, type PaymentEvent,
} from '@/lib/storage';
import { PACKAGES } from '@/types';
import type { User, Listing } from '@/types';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import {
  Camera, Phone, MapPin, LogOut, Edit2, Save, X,
  Package, Clock, CheckCircle, XCircle, Trash2,
  ChevronRight, PlusCircle, User as UserIcon, Crown,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  produk:     { label: 'Produk',     emoji: '🛍️', color: 'text-orange-600', bg: 'bg-orange-50' },
  otomotif:   { label: 'Otomotif',   emoji: '🚗', color: 'text-red-600',    bg: 'bg-red-50' },
  rumah:      { label: 'Rumah',      emoji: '🏠', color: 'text-sky-600',    bg: 'bg-sky-50' },
  kosan:      { label: 'Kosan',      emoji: '🏘️', color: 'text-blue-600',   bg: 'bg-blue-50' },
  penginapan: { label: 'Penginapan', emoji: '🏨', color: 'text-purple-600', bg: 'bg-purple-50' },
  wisata:     { label: 'Wisata',     emoji: '🏝️', color: 'text-green-600',  bg: 'bg-green-50' },
  kafe:       { label: 'Kafe',       emoji: '☕', color: 'text-amber-600',  bg: 'bg-amber-50' },
  lowongan:   { label: 'Lowongan',   emoji: '💼', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  jasa:       { label: 'Jasa',       emoji: '🔧', color: 'text-teal-600',   bg: 'bg-teal-50' },
};

type ActiveTab = 'profil' | 'iklan';

const STATUS_CONFIG = {
  pending: { label: 'Menunggu',  icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50  border-amber-200' },
  active:  { label: 'Aktif',     icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50  border-green-200' },
  closed:  { label: 'Ditutup',   icon: XCircle,      color: 'text-slate-500',  bg: 'bg-slate-100 border-slate-200' },
};

const Akun = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(getAuth());
  const [activeTab, setActiveTab] = useState<ActiveTab>('profil');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState(user?.address || '');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | Listing['status']>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // ── Listen for payment confirmation from admin tab ──
  useEffect(() => {
    if (!user) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== NOTIFY_PAYMENT_KEY || !e.newValue) return;
      const event: PaymentEvent = JSON.parse(e.newValue);
      if (event.userId !== user.id) return;
      // Refresh user data (package might have been updated)
      const stored = localStorage.getItem('mimilo_user');
      if (stored) {
        const users: User[] = JSON.parse(stored);
        const updated = users.find(u => u.id === user.id);
        if (updated) {
          setAuth(updated);
          setUser(updated);
        }
      }
      if (event.status === 'approved') {
        import('@/lib/notifications').then(({ triggerNotification }) => triggerNotification('listing'));
        import('sonner').then(({ toast }) => {
          if (event.type === 'topup') {
            toast.success(`💰 Top Up Rp ${event.amount.toLocaleString('id-ID')} dikonfirmasi! Saldo diperbarui.`, { duration: 6000 });
          } else {
            toast.success(`🎉 Paket ${event.packageName || ''} berhasil diaktifkan!`, { duration: 6000 });
          }
        });
      } else if (event.status === 'rejected') {
        import('@/lib/notifications').then(({ triggerNotification }) => triggerNotification('chat'));
        import('sonner').then(({ toast }) => {
          if (event.type === 'topup') {
            toast.error(`Top Up Rp ${event.amount.toLocaleString('id-ID')} ditolak.`, { duration: 5000 });
          } else {
            toast.error(`Pembayaran Paket ${event.packageName || ''} ditolak.`, { duration: 5000 });
          }
        });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user]);

  useEffect(() => {
    if (user) {
      const all = getListings().filter(l => l.userId === user.id);
      setMyListings(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Foto maksimal 3MB'); return; }
    const b64 = await fileToBase64(file);
    const updated = { ...user, photo: b64 };
    saveUser(updated);
    setAuth(updated);
    setUser(updated);
    toast.success('Foto profil diperbarui!');
  };

  const handleSave = () => {
    if (!user) return;
    if (!name.trim()) { toast.error('Nama tidak boleh kosong'); return; }
    const updated = { ...user, name: name.trim(), address: address.trim() };
    saveUser(updated);
    setAuth(updated);
    setUser(updated);
    setEditing(false);
    toast.success('Profil berhasil disimpan!');
  };

  const handleLogout = () => {
    clearAuth();
    toast.success('Berhasil keluar');
    navigate('/login');
  };

  const handleDeleteListing = (id: string) => {
    deleteListing(id);
    setMyListings(prev => prev.filter(l => l.id !== id));
    setDeleteConfirm(null);
    toast.success('Iklan berhasil dihapus');
  };

  const handleToggleClose = (listing: Listing) => {
    const newStatus = listing.status === 'closed' ? 'active' : 'closed';
    const updated = { ...listing, status: newStatus as Listing['status'] };
    saveListing(updated);
    setMyListings(prev => prev.map(l => l.id === listing.id ? updated : l));
    toast.success(newStatus === 'closed' ? 'Iklan ditutup' : 'Iklan diaktifkan kembali');
  };

  if (!user) return null;

  const currentPkg = PACKAGES.find(p => p.key === (user.packageKey || 'new'))!;

  const filteredListings = filterStatus === 'all'
    ? myListings
    : myListings.filter(l => l.status === filterStatus);

  const counts = {
    all:     myListings.length,
    pending: myListings.filter(l => l.status === 'pending').length,
    active:  myListings.filter(l => l.status === 'active').length,
    closed:  myListings.filter(l => l.status === 'closed').length,
  };

  const formatRp = (n: number) => n === 0 ? 'GRATIS' : 'Rp ' + n.toLocaleString('id-ID');

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #e0f4ff 0%, #f0f9ff 100%)' }}>
      <Header title="Akun Saya" showLogo />

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── Profile Card ── */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Cover */}
          <div className="h-20 bg-gradient-to-r from-sky-400 to-blue-500" />

          <div className="px-5 pb-4">
            <div className="flex items-end justify-between -mt-10 mb-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                  {user.photo
                    ? <img src={user.photo} alt="Profil" className="w-full h-full object-cover" />
                    : <span className="text-white font-extrabold text-3xl">{user.name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sky-500 border-2 border-white shadow flex items-center justify-center cursor-pointer hover:bg-sky-600 transition-colors">
                  <Camera size={13} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              {/* Edit button */}
              <button
                onClick={() => { setEditing(!editing); setName(user.name); setAddress(user.address); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${editing ? 'bg-slate-100 text-slate-600' : 'bg-sky-50 text-sky-600'}`}
              >
                {editing ? <><X size={13} /> Batal</> : <><Edit2 size={13} /> Edit</>}
              </button>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block tracking-wide">NAMA LENGKAP</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="w-full border-2 border-sky-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-sky-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block tracking-wide">ALAMAT</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                    className="w-full border-2 border-sky-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-500 transition-colors resize-none" />
                </div>
                <button onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm">
                  <Save size={15} /> Simpan Perubahan
                </button>
              </div>
            ) : (
              <div>
                <h2 className="font-bold text-slate-800 text-lg">{user.name}</h2>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Bergabung {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl shadow-sm p-1.5 flex gap-1">
          {([
            { key: 'profil', label: 'Profil', icon: UserIcon },
            { key: 'iklan',  label: `Iklan Saya${counts.all > 0 ? ` (${counts.all})` : ''}`, icon: Package },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === key
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} />
              {label}
              {key === 'iklan' && counts.pending > 0 && (
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${activeTab === 'iklan' ? 'bg-white text-sky-600' : 'bg-amber-500 text-white'}`}>
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ────────────────────────────────────────── */}
        {/*  TAB: PROFIL                              */}
        {/* ────────────────────────────────────────── */}
        {activeTab === 'profil' && (
          <div className="space-y-3">
            <a href={`tel:${user.phone}`}
              className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-sky-50 hover:border-sky-200 transition-colors active:scale-95">
              <div className="w-11 h-11 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                <Phone size={20} className="text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-medium">Nomor Telepon</p>
                <p className="font-bold text-sky-700 text-base">+62 {user.phone}</p>
              </div>
              <div className="bg-sky-500 rounded-xl px-3 py-1.5">
                <span className="text-white text-xs font-semibold">Hubungi</span>
              </div>
            </a>

            <div className="flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm border border-sky-50">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={20} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-medium">Alamat</p>
                <p className="font-semibold text-slate-800 text-sm mt-0.5 leading-relaxed">
                  {user.address || <span className="text-slate-400 italic">Belum diisi</span>}
                </p>
              </div>
            </div>

            {/* Balance */}
            <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-sky-50">
              <div className="w-11 h-11 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0 text-xl">
                💰
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 font-medium">Saldo Saya</p>
                <p className="font-extrabold text-slate-800 text-lg">{'Rp ' + (user.balance || 0).toLocaleString('id-ID')}</p>
                {(user.balance || 0) === 0 && (
                  <p className="text-[10px] text-slate-400">Belum ada saldo</p>
                )}
              </div>
              <button
                onClick={() => navigate('/home?topup=1')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 text-xs font-bold hover:bg-sky-100 transition-colors">
                Top Up →
              </button>
            </div>

            {/* Quick link to listings */}
            <button onClick={() => setActiveTab('iklan')}
              className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-sky-50 hover:border-sky-200 transition-colors text-left">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Package size={20} className="text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 font-medium">Total Iklan Saya</p>
                <p className="font-bold text-slate-800 text-base">{counts.all} iklan dipasang</p>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>

            {/* Package Status */}
            <button onClick={() => navigate('/paket')}
              className={`w-full flex items-center gap-3 rounded-2xl p-4 shadow-sm border-2 text-left hover:opacity-90 transition-opacity ${currentPkg.bg} ${currentPkg.border}`}>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-white`}>
                {currentPkg.emoji}
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 font-medium">Paket Iklan Aktif</p>
                <div className="flex items-center gap-2">
                  <p className={`font-bold text-base ${currentPkg.color}`}>{currentPkg.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentPkg.badge}`}>
                    {currentPkg.maxPhotos === -1 ? '∞ foto' : `${currentPkg.maxPhotos} foto`}
                  </span>
                </div>
                {currentPkg.price > 0 ? (
                  <p className="text-[10px] text-slate-400">{formatRp(currentPkg.price)} · Aktif selamanya</p>
                ) : (
                  <p className={`text-[10px] font-semibold ${currentPkg.color}`}>Upgrade untuk lebih banyak foto →</p>
                )}
              </div>
              <Crown size={18} className={currentPkg.color} />
            </button>

            {/* Logout */}
            <button onClick={handleLogout}
              className="w-full py-3.5 rounded-2xl bg-white border-2 border-red-100 text-red-500 font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-red-50 transition-colors">
              <LogOut size={17} /> Keluar dari Akun
            </button>

            <p className="text-center text-slate-400 text-xs pb-2">MIMILO v1.0.0</p>
          </div>
        )}

        {/* ────────────────────────────────────────── */}
        {/*  TAB: IKLAN SAYA                          */}
        {/* ────────────────────────────────────────── */}
        {activeTab === 'iklan' && (
          <div className="space-y-3">

            {/* Status filter chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {([
                { key: 'all',     label: `Semua (${counts.all})` },
                { key: 'pending', label: `Menunggu (${counts.pending})` },
                { key: 'active',  label: `Aktif (${counts.active})` },
                { key: 'closed',  label: `Ditutup (${counts.closed})` },
              ] as const).map(({ key, label }) => (
                <button key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                    filterStatus === key
                      ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-sky-200'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Pasang iklan baru shortcut */}
            <button onClick={() => navigate('/pasang-iklan')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 text-sky-600 font-bold text-sm hover:border-sky-400 hover:bg-sky-100 transition-all">
              <PlusCircle size={18} /> Pasang Iklan Baru
            </button>

            {/* Empty state */}
            {filteredListings.length === 0 && (
              <div className="text-center py-14 bg-white rounded-3xl">
                <div className="text-5xl mb-3">📋</div>
                <p className="font-bold text-slate-700 text-base">
                  {filterStatus === 'all' ? 'Belum ada iklan' : `Tidak ada iklan ${STATUS_CONFIG[filterStatus as Listing['status']]?.label.toLowerCase()}`}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {filterStatus === 'all' ? 'Mulai pasang iklan pertama Anda!' : 'Coba filter lain'}
                </p>
                {filterStatus === 'all' && (
                  <button onClick={() => navigate('/pasang-iklan')}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-sm shadow-md">
                    Pasang Sekarang
                  </button>
                )}
              </div>
            )}

            {/* Listing cards */}
            {filteredListings.map(listing => {
              const cat = CATEGORIES[listing.category];
              const statusCfg = STATUS_CONFIG[listing.status];
              const StatusIcon = statusCfg.icon;
              const isConfirmDelete = deleteConfirm === listing.id;

              return (
                <div key={listing.id} className="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
                  {/* Card body */}
                  <button
                    onClick={() => navigate(`/iklan/${listing.id}`)}
                    className="flex gap-3 p-3.5 w-full text-left hover:bg-slate-50 transition-colors">
                    {/* Thumbnail */}
                    {listing.images[0] ? (
                      <img src={listing.images[0]} alt={listing.title}
                        className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ${cat?.bg}`}>
                        {cat?.emoji}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Category + Status */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat?.bg} ${cat?.color}`}>
                          {cat?.emoji} {cat?.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
                          <StatusIcon size={9} /> {statusCfg.label}
                        </span>
                      </div>

                      <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{listing.title}</p>

                      {listing.price && (
                        <p className="font-bold text-sky-600 text-sm mt-0.5">{listing.price}</p>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        {listing.condition && listing.condition.toLowerCase().includes('bekas') && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Bekas</span>
                        )}
                        <p className="text-slate-400 text-[10px] ml-auto">
                          {new Date(listing.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Action bar */}
                  {!isConfirmDelete ? (
                    <div className="flex border-t border-slate-100">
                      {/* Toggle close/active */}
                      <button
                        onClick={() => handleToggleClose(listing)}
                        disabled={listing.status === 'pending'}
                        className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors border-r border-slate-100 disabled:opacity-40 disabled:cursor-not-allowed ${
                          listing.status === 'closed'
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-slate-500 hover:bg-slate-50'
                        }`}>
                        {listing.status === 'closed'
                          ? <><CheckCircle size={13} /> Aktifkan</>
                          : <><XCircle size={13} /> Tutup</>
                        }
                      </button>

                      {/* Edit — navigates to pasang iklan (future: pre-fill) */}
                      <button
                        onClick={() => navigate(`/iklan/${listing.id}`)}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 transition-colors border-r border-slate-100">
                        <Edit2 size={13} /> Lihat Detail
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirm(listing.id)}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>
                  ) : (
                    /* Confirm delete */
                    <div className="flex border-t border-red-100 bg-red-50">
                      <div className="flex-1 flex items-center px-4 py-2.5">
                        <p className="text-xs font-semibold text-red-600">Hapus iklan ini?</p>
                      </div>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors">
                        Batal
                      </button>
                      <button onClick={() => handleDeleteListing(listing.id)}
                        className="px-4 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                        Ya, Hapus
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <p className="text-center text-xs text-slate-400 pb-2">
              {filteredListings.length} iklan ditampilkan
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Akun;
