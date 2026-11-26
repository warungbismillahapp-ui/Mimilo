import { useState, useEffect } from 'react';
import {
  getHomeContent, saveHomeContent, getListings, saveListing, deleteListing, generateId, fileToBase64,
  NOTIFY_CHAT_KEY, NOTIFY_LISTING_KEY, NOTIFY_PAYMENT_KEY,
  getPendingPayments, updatePaymentStatus, saveUser, getUsers, postPaymentEvent, addBalance,
  type ChatEvent, type ListingEvent, type PaymentEvent,
} from '@/lib/storage';
import { PACKAGES } from '@/types';
import type { PaymentRecord } from '@/types';
import { triggerNotification } from '@/lib/notifications';
import type { HomeContent, HomeSection, Listing } from '@/types';
import { toast } from 'sonner';
import {
  Settings, Type, Image as ImageIcon, Phone, MapPin, Sliders, Plus, Trash2,
  Save, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock,
} from 'lucide-react';

type AdminTab = 'home' | 'listings' | 'payments';

const CATEGORIES: Record<string, { label: string; emoji: string }> = {
  produk:     { label: 'Produk',     emoji: '🛍️' },
  otomotif:   { label: 'Otomotif',   emoji: '🚗' },
  rumah:      { label: 'Rumah',      emoji: '🏠' },
  kosan:      { label: 'Kosan',      emoji: '🏘️' },
  penginapan: { label: 'Penginapan', emoji: '🏨' },
  wisata:     { label: 'Wisata',     emoji: '🏝️' },
  kafe:       { label: 'Kafe',       emoji: '☕' },
  lowongan:   { label: 'Lowongan',   emoji: '💼' },
  jasa:       { label: 'Jasa',        emoji: '🔧' },
};

const Admin = () => {
  const [tab, setTab] = useState<AdminTab>('home');
  const [content, setContent] = useState<HomeContent>(getHomeContent());
  const [listings, setListings] = useState<Listing[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | Listing['status']>('all');

  useEffect(() => {
    setListings(getListings());
    setPayments(getPendingPayments());
  }, []);

  // ── Real-time notifications for admin panel ──────────────────────────────
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === NOTIFY_LISTING_KEY && e.newValue) {
        const event: ListingEvent = JSON.parse(e.newValue);
        setListings(getListings()); // refresh listing list
        triggerNotification('listing');
        const title = event.listingTitle.length > 40
          ? event.listingTitle.substring(0, 40) + '…'
          : event.listingTitle;
        toast.success(`📋 Iklan baru dari ${event.userName}! "${title}"`, { duration: 6000 });
      }
      if (e.key === NOTIFY_PAYMENT_KEY && e.newValue) {
        const event: PaymentEvent = JSON.parse(e.newValue);
        setPayments(getPendingPayments());
        triggerNotification('listing');
        const label = event.type === 'topup'
          ? `Top Up Rp ${event.amount.toLocaleString('id-ID')}`
          : `Paket ${event.packageName || ''}`;
        toast.success(`💰 Pembayaran baru! ${event.userName} — ${label}`, { duration: 6000 });
      }
      if (e.key === NOTIFY_CHAT_KEY && e.newValue) {
        const event: ChatEvent = JSON.parse(e.newValue);
        triggerNotification('chat');
        const snippet = event.message.length > 45
          ? event.message.substring(0, 45) + '…'
          : event.message;
        toast.success(`💬 Chat: ${event.senderName} → "${snippet}"`, { duration: 4000 });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleSave = () => {
    saveHomeContent(content);
    toast.success('Perubahan berhasil disimpan!');
  };

  const addSection = (type: HomeSection['type']) => {
    const newSection: HomeSection = { id: generateId(), type, title: '', content: '', imageUrl: '' };
    setContent(c => ({ ...c, sections: [...c.sections, newSection] }));
    setExpandedSection(newSection.id);
  };

  const updateSection = (id: string, updates: Partial<HomeSection>) => {
    setContent(c => ({ ...c, sections: c.sections.map(s => s.id === id ? { ...s, ...updates } : s) }));
  };

  const removeSection = (id: string) => {
    setContent(c => ({ ...c, sections: c.sections.filter(s => s.id !== id) }));
  };

  const handleHeroImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setContent(c => ({ ...c, heroImage: b64 }));
  };

  const handleSliderAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setContent(c => ({ ...c, sliderImages: [...c.sliderImages, b64] }));
  };

  const handleSectionImage = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    updateSection(id, { imageUrl: b64, content: b64 });
  };

  const updateListingStatus = (id: string, status: Listing['status']) => {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;
    const updated = { ...listing, status };
    saveListing(updated);
    setListings(prev => prev.map(l => l.id === id ? updated : l));
    toast.success('Status diperbarui');
  };

  const handleDeleteListing = (id: string) => {
    deleteListing(id);
    setListings(prev => prev.filter(l => l.id !== id));
    toast.success('Iklan dihapus');
  };

  const handlePaymentConfirm = (id: string, approved: boolean, note?: string) => {
    const updated = updatePaymentStatus(id, approved ? 'approved' : 'rejected', note);
    if (!updated) return;
    if (approved) {
      if (!updated.type || updated.type === 'package') {
        // Activate package
        const users = getUsers();
        const u = users.find(u => u.id === updated.userId);
        if (u && updated.packageKey) {
          saveUser({ ...u, packageKey: updated.packageKey, packageActivatedAt: new Date().toISOString() });
        }
      } else {
        // Credit balance for top-up
        addBalance(updated.userId, updated.amount);
      }
    }
    postPaymentEvent(updated);
    triggerNotification('listing');
    setPayments(getPendingPayments());
    const successMsg = approved
      ? (updated.type === 'topup'
          ? `✅ Saldo ${formatRp(updated.amount)} ditambahkan ke ${updated.userName}`
          : `✅ Paket ${updated.packageName || ''} diaktifkan untuk ${updated.userName}`)
      : `❌ Pembayaran ditolak`;
    toast.success(successMsg);
  };

  const filteredListings = filterStatus === 'all' ? listings : listings.filter(l => l.status === filterStatus);

  const statusCount = {
    all: listings.length,
    pending: listings.filter(l => l.status === 'pending').length,
    active: listings.filter(l => l.status === 'active').length,
    closed: listings.filter(l => l.status === 'closed').length,
  };

  const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  const SECTION_ICONS: Record<HomeSection['type'], React.ReactNode> = {
    text: <Type size={15} />, image: <ImageIcon size={15} />, phone: <Phone size={15} />,
    map: <MapPin size={15} />, slider: <Sliders size={15} />,
  };
  const SECTION_LABELS: Record<HomeSection['type'], string> = {
    text: 'Teks', image: 'Gambar', phone: 'Telepon', map: 'Peta', slider: 'Slider',
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg">
              <Settings size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">Admin MIMILO</h1>
              <p className="text-slate-400 text-xs">Panel Pengelolaan Website</p>
            </div>
          </div>
          {tab === 'home' && (
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold transition-colors shadow-lg">
              <Save size={14} /> Simpan
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800 border-b border-slate-700 px-4">
        <div className="max-w-2xl mx-auto flex">
          {(['home', 'listings', 'payments'] as AdminTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3.5 text-sm font-semibold border-b-2 transition-all relative ${tab === t ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              {t === 'home' ? '🏠 Halaman' : t === 'listings' ? '📋 Iklan' : '💰 Bayar'}
              {t === 'listings' && statusCount.pending > 0 && (
                <span className="absolute top-2 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {statusCount.pending}
                </span>
              )}
              {t === 'payments' && payments.length > 0 && (
                <span className="absolute top-2 right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {payments.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {tab === 'home' && (
          <>
            {/* Banner */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <h3 className="font-bold text-sky-400 text-xs uppercase tracking-wide mb-4 flex items-center gap-2">
                <Type size={13} /> Teks Banner & Sambutan
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Teks Banner Merah (Berjalan)</label>
                  <input value={content.bannerText}
                    onChange={e => setContent(c => ({ ...c, bannerText: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Teks Selamat Datang</label>
                  <input value={content.welcomeText}
                    onChange={e => setContent(c => ({ ...c, welcomeText: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 transition-colors" />
                </div>
              </div>
            </div>

            {/* Hero */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <h3 className="font-bold text-sky-400 text-xs uppercase tracking-wide mb-4 flex items-center gap-2">
                <ImageIcon size={13} /> Hero / Banner Utama
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Judul Hero</label>
                  <input value={content.heroTitle}
                    onChange={e => setContent(c => ({ ...c, heroTitle: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Sub Judul</label>
                  <input value={content.heroSubtitle}
                    onChange={e => setContent(c => ({ ...c, heroSubtitle: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Gambar Background Hero</label>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleHeroImage} />
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${content.heroImage ? 'border-sky-500' : 'border-slate-600 hover:border-sky-500'}`}>
                      {content.heroImage
                        ? <img src={content.heroImage} alt="hero" className="h-24 mx-auto object-cover rounded-lg" />
                        : <p className="text-slate-400 text-sm">Klik untuk upload gambar</p>}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Slider */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <h3 className="font-bold text-sky-400 text-xs uppercase tracking-wide mb-4 flex items-center gap-2">
                <Sliders size={13} /> Slider Gambar
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {content.sliderImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" className="w-full h-20 object-cover rounded-xl" />
                    <button
                      onClick={() => setContent(c => ({ ...c, sliderImages: c.sliderImages.filter((_, idx) => idx !== i) }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow">
                      <Trash2 size={10} className="text-white" />
                    </button>
                  </div>
                ))}
                <label className="cursor-pointer border-2 border-dashed border-slate-600 hover:border-sky-500 rounded-xl h-20 flex items-center justify-center transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleSliderAdd} />
                  <Plus size={20} className="text-slate-400" />
                </label>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <h3 className="font-bold text-sky-400 text-xs uppercase tracking-wide mb-4 flex items-center gap-2">
                <Phone size={13} /> Kontak & Peta
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Nomor Telepon</label>
                  <input value={content.contactPhone}
                    onChange={e => setContent(c => ({ ...c, contactPhone: e.target.value }))}
                    placeholder="0812345678"
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Alamat</label>
                  <textarea value={content.contactAddress}
                    onChange={e => setContent(c => ({ ...c, contactAddress: e.target.value }))}
                    rows={2}
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 transition-colors resize-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">URL Google Maps Embed</label>
                  <input value={content.mapEmbedUrl}
                    onChange={e => setContent(c => ({ ...c, mapEmbedUrl: e.target.value }))}
                    placeholder="https://www.google.com/maps/embed?..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 transition-colors" />
                </div>
              </div>
            </div>

            {/* Custom Sections */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <h3 className="font-bold text-sky-400 text-xs uppercase tracking-wide mb-4 flex items-center gap-2">
                <Plus size={13} /> Bagian Kustom
              </h3>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {(['text', 'image', 'phone', 'map'] as HomeSection['type'][]).map(type => (
                  <button key={type} onClick={() => addSection(type)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-700 hover:bg-sky-500/20 border border-slate-600 hover:border-sky-500 transition-all text-slate-300 hover:text-sky-400">
                    {SECTION_ICONS[type]}
                    <span className="text-xs font-semibold">{SECTION_LABELS[type]}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {content.sections.map(section => (
                  <div key={section.id} className="border border-slate-700 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-700 transition-colors">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                        <span className="text-slate-500">{SECTION_ICONS[section.type]}</span>
                        {SECTION_LABELS[section.type]}: {section.title || <span className="text-slate-500 italic">Tanpa judul</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={e => { e.stopPropagation(); removeSection(section.id); }}
                          className="p-1 rounded-lg hover:bg-red-500/20"><Trash2 size={13} className="text-red-400" /></button>
                        {expandedSection === section.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </button>
                    {expandedSection === section.id && (
                      <div className="p-3 bg-slate-700/50 space-y-2 border-t border-slate-700">
                        <input value={section.title} onChange={e => updateSection(section.id, { title: e.target.value })}
                          placeholder="Judul bagian"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500 transition-colors" />
                        {section.type === 'text' && (
                          <textarea value={section.content} onChange={e => updateSection(section.id, { content: e.target.value })}
                            placeholder="Konten teks..." rows={3}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500 transition-colors resize-none" />
                        )}
                        {section.type === 'image' && (
                          <label className="cursor-pointer block">
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleSectionImage(section.id, e)} />
                            <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${section.imageUrl ? 'border-sky-500' : 'border-slate-600 hover:border-sky-500'}`}>
                              {section.imageUrl ? <img src={section.imageUrl} alt="" className="h-20 mx-auto object-cover rounded-lg" /> : <p className="text-slate-400 text-sm">Klik upload gambar</p>}
                            </div>
                          </label>
                        )}
                        {section.type === 'phone' && (
                          <input value={section.content} onChange={e => updateSection(section.id, { content: e.target.value })}
                            placeholder="Nomor telepon"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500 transition-colors" />
                        )}
                        {section.type === 'map' && (
                          <input value={section.content} onChange={e => updateSection(section.id, { content: e.target.value })}
                            placeholder="URL Google Maps Embed"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500 transition-colors" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {content.sections.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">Klik tombol di atas untuk menambah bagian</p>
                )}
              </div>
            </div>

            <button onClick={handleSave}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold text-base shadow-lg flex items-center justify-center gap-2">
              <Save size={20} /> Simpan Semua Perubahan
            </button>
          </>
        )}

        {tab === 'payments' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-400">💰 Konfirmasi Pembayaran</h3>
              <span className="text-xs text-slate-400">{payments.length} pending</span>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-slate-400 text-sm">Tidak ada pembayaran menunggu konfirmasi</p>
              </div>
            ) : (
              payments.map(payment => {
                const isTopUp = payment.type === 'topup';
                const pkg = isTopUp ? null : PACKAGES.find(p => p.key === payment.packageKey);
                return (
                  <div key={payment.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                    {/* Payment Info */}
                    <div className="flex gap-3 p-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        isTopUp ? 'bg-green-900' : (pkg?.bg || 'bg-slate-700')
                      }`}>
                        {isTopUp ? '💰' : (pkg?.emoji || '📦')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            isTopUp ? 'bg-green-700 text-green-100' : (pkg?.badge || 'bg-slate-600 text-white')
                          }`}>
                            {isTopUp ? '💰 Top Up Saldo' : `Paket ${payment.packageName || ''}`}
                          </span>
                          <span className="text-xs text-amber-400 font-semibold">{payment.paymentMethod === 'mandiri' ? '🏦 Mandiri' : '📱 OVO'}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm">{payment.userName}</h4>
                        <p className="text-slate-400 text-xs mt-0.5">{payment.userPhone}</p>
                        <p className={`text-sm font-bold mt-1 ${isTopUp ? 'text-green-400' : 'text-sky-400'}`}>{formatRp(payment.amount)}</p>
                      </div>
                    </div>
                    {/* Proof Image */}
                    {payment.proofImage && (
                      <div className="px-4 pb-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Bukti Pembayaran</p>
                        <img src={payment.proofImage} alt="Bukti" className="w-full rounded-xl object-cover max-h-48" />
                      </div>
                    )}
                    {/* Actions */}
                    <div className="flex border-t border-slate-700">
                      <button
                        onClick={() => handlePaymentConfirm(payment.id, true)}
                        className="flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/10 transition-colors border-r border-slate-700">
                        <CheckCircle size={14} /> Konfirmasi
                      </button>
                      <button
                        onClick={() => handlePaymentConfirm(payment.id, false, 'Bukti tidak valid')}
                        className="flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
                        <XCircle size={14} /> Tolak
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {tab === 'listings' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: 'all', label: 'Semua', color: 'text-white', bg: 'bg-slate-700' },
                { key: 'pending', label: 'Menunggu', color: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/20' },
                { key: 'active', label: 'Aktif', color: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/20' },
                { key: 'closed', label: 'Ditutup', color: 'text-slate-400', bg: 'bg-slate-700' },
              ] as const).map(s => (
                <button key={s.key}
                  onClick={() => setFilterStatus(s.key)}
                  className={`rounded-2xl p-3 text-center transition-all ${s.bg} ${filterStatus === s.key ? 'ring-2 ring-sky-500' : ''}`}>
                  <p className={`font-extrabold text-xl ${s.color}`}>{statusCount[s.key]}</p>
                  <p className="text-slate-400 text-[10px] font-semibold mt-0.5">{s.label}</p>
                </button>
              ))}
            </div>

            {filteredListings.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-500">Tidak ada iklan</p>
              </div>
            ) : (
              filteredListings.map(listing => {
                const cat = CATEGORIES[listing.category];
                return (
                  <div key={listing.id} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                    <div className="flex gap-3 p-4">
                      {listing.images[0] ? (
                        <img src={listing.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                          {cat?.emoji}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold">
                            {cat?.emoji} {cat?.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            listing.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                            listing.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            'bg-slate-600 text-slate-400'
                          }`}>
                            {listing.status === 'pending' ? 'Menunggu' : listing.status === 'active' ? 'Aktif' : 'Ditutup'}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm leading-snug line-clamp-1">{listing.title}</h4>
                        <p className="text-slate-400 text-xs mt-0.5">{listing.userName} · {listing.userPhone}</p>
                        {listing.price && <p className="text-sky-400 text-xs font-semibold mt-0.5">{listing.price}</p>}
                      </div>
                    </div>
                    <div className="flex border-t border-slate-700">
                      <button onClick={() => updateListingStatus(listing.id, 'active')}
                        className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${listing.status === 'active' ? 'bg-green-500/20 text-green-400' : 'text-slate-400 hover:bg-slate-700 hover:text-green-400'}`}>
                        <CheckCircle size={13} /> Aktifkan
                      </button>
                      <button onClick={() => updateListingStatus(listing.id, 'pending')}
                        className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold border-x border-slate-700 transition-colors ${listing.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-700 hover:text-amber-400'}`}>
                        <Clock size={13} /> Tunda
                      </button>
                      <button onClick={() => handleDeleteListing(listing.id)}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
