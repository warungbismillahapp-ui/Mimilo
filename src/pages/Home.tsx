import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAuth, getHomeContent, getListings, getListingById, generateId, fileToBase64,
  savePayment, postPaymentEvent,
  NOTIFY_CHAT_KEY, NOTIFY_PAYMENT_KEY,
  type ChatEvent, type PaymentEvent,
} from '@/lib/storage';
import { PACKAGES } from '@/types';
import { triggerNotification } from '@/lib/notifications';
import { toast } from 'sonner';
import type { HomeContent, Listing, ListingCategory, User, PaymentRecord } from '@/types';
import BottomNav from '@/components/layout/BottomNav';
import {
  MapPin, Phone, ChevronRight, Search,
  Wallet, Upload, Copy, CreditCard, X, CheckCircle,
} from 'lucide-react';

const CATEGORIES: { key: ListingCategory; label: string; emoji: string; color: string; bg: string }[] = [
  { key: 'produk',     label: 'Produk',      emoji: '🛍️',  color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-100' },
  { key: 'otomotif',   label: 'Otomotif',    emoji: '🚗',  color: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
  { key: 'rumah',      label: 'Rumah',       emoji: '🏠',  color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-100' },
  { key: 'kosan',      label: 'Kosan',       emoji: '🏘️',  color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
  { key: 'penginapan', label: 'Penginapan',  emoji: '🏨',  color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-100' },
  { key: 'wisata',     label: 'Wisata',      emoji: '🏝️',  color: 'text-green-600',   bg: 'bg-green-50 border-green-100' },
  { key: 'kafe',       label: 'Kafe',        emoji: '☕',  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
  { key: 'lowongan',   label: 'Lowongan',    emoji: '💼',  color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-100' },
  { key: 'jasa',       label: 'Jasa',        emoji: '🔧',  color: 'text-teal-600',    bg: 'bg-teal-50 border-teal-100' },
];

const BANK_INFO = {
  mandiri: {
    name: 'Bank Mandiri',
    account: '1860007640002',
    holder: 'Halim Shady',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: '🏦',
  },
  ovo: {
    name: 'OVO',
    account: '082194909137',
    holder: 'Halim Shady',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: '📱',
  },
} as const;

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000];
const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return `${Math.floor(days / 30)} bln lalu`;
};

const Home = () => {
  const navigate = useNavigate();
  const user = getAuth();

  const [content, setContent]     = useState<HomeContent>(getHomeContent());
  const [listings, setListings]   = useState<Listing[]>([]);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [search, setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState<ListingCategory | 'all'>('all');

  // Balance — updated in real-time when admin confirms top-up
  const [balance, setBalance] = useState<number>(user?.balance || 0);

  // ── Top-up modal state ────────────────────────────────────────
  const [showTopUp, setShowTopUp]           = useState(false);
  const [topUpAmount, setTopUpAmount]       = useState(10000);
  const [customAmountStr, setCustomAmountStr] = useState('');
  const [useCustom, setUseCustom]           = useState(false);
  const [payMethod, setPayMethod]           = useState<'mandiri' | 'ovo'>('mandiri');
  const [proofImage, setProofImage]         = useState('');
  const [uploading, setUploading]           = useState(false);
  const [topUpDone, setTopUpDone]           = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setContent(getHomeContent());
    setListings(getListings().filter(l => l.status === 'active').slice(0, 16));
    // Auto-open top-up modal if redirected with ?topup=1
    if (window.location.search.includes('topup=1')) {
      setShowTopUp(true);
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (content.sliderImages.length < 2) return;
    const t = setInterval(() => setSliderIdx(i => (i + 1) % content.sliderImages.length), 3500);
    return () => clearInterval(t);
  }, [content.sliderImages]);

  // ── Cross-tab notifications ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const handleStorage = (e: StorageEvent) => {
      // Chat alert for sellers
      if (e.key === NOTIFY_CHAT_KEY && e.newValue) {
        const event: ChatEvent = JSON.parse(e.newValue);
        if (event.senderId === user.id) return;
        const listing = getListingById(event.listingId);
        if (!listing || listing.userId !== user.id) return;
        triggerNotification('chat');
        const snippet = event.message.length > 50
          ? event.message.substring(0, 50) + '…'
          : event.message;
        toast.success(`💬 ${event.senderName}: "${snippet}"`, { duration: 5000 });
      }
      // Top-up confirmation alert
      if (e.key === NOTIFY_PAYMENT_KEY && e.newValue) {
        const event: PaymentEvent = JSON.parse(e.newValue);
        if (event.userId !== user.id || event.type !== 'topup') return;
        if (event.status === 'approved') {
          const stored = localStorage.getItem('mimilo_user');
          if (stored) {
            const users: User[] = JSON.parse(stored);
            const updated = users.find(u => u.id === user.id);
            if (updated) setBalance(updated.balance || 0);
          }
          triggerNotification('listing');
          toast.success(`💰 Top Up ${formatRp(event.amount)} dikonfirmasi! Saldo diperbarui.`, { duration: 6000 });
        } else if (event.status === 'rejected') {
          triggerNotification('chat');
          toast.error(`Top Up ${formatRp(event.amount)} ditolak.`, { duration: 5000 });
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user]);

  if (!user) return null;

  const currentPkg = PACKAGES.find(p => p.key === (user.packageKey || 'new'))!;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/cari-iklan?q=${encodeURIComponent(search)}`);
  };

  const filteredListings = activeFilter === 'all'
    ? listings
    : listings.filter(l => l.category === activeFilter);

  // ── Top-up handlers ──────────────────────────────────────────
  const openTopUp = () => {
    setShowTopUp(true);
    setProofImage('');
    setTopUpDone(false);
    setCustomAmountStr('');
    setUseCustom(false);
    setTopUpAmount(10000);
    setPayMethod('mandiri');
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Foto maks 5MB'); return; }
    setUploading(true);
    const b64 = await fileToBase64(file);
    setProofImage(b64);
    setUploading(false);
    toast.success('Bukti berhasil diunggah');
  };

  const handleTopUpSubmit = () => {
    if (!user) return;
    const finalAmt = useCustom ? (parseInt(customAmountStr.replace(/\D/g, '')) || 0) : topUpAmount;
    if (finalAmt < 5000) { toast.error('Minimum top up Rp 5.000'); return; }
    if (!proofImage) { toast.error('Unggah bukti pembayaran dulu'); return; }

    const payment: PaymentRecord = {
      id:            generateId(),
      type:          'topup',
      userId:        user.id,
      userName:      user.name,
      userPhone:     user.phone,
      amount:        finalAmt,
      proofImage,
      paymentMethod: payMethod,
      status:        'pending',
      createdAt:     new Date().toISOString(),
    };

    savePayment(payment);
    postPaymentEvent(payment);
    triggerNotification('listing');
    setTopUpDone(true);
    toast.success('Permintaan top up dikirim! Menunggu konfirmasi admin.', { duration: 5000 });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} disalin!`));
  };

  const finalTopUpAmount = useCustom
    ? (parseInt(customAmountStr.replace(/\D/g, '')) || 0)
    : topUpAmount;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #e0f4ff 0%, #f8fcff 100%)' }}>

      {/* Marquee banner */}
      <div className="overflow-hidden bg-red-600">
        <p className="animate-marquee inline-block text-white font-bold text-xs py-1.5 px-4 whitespace-nowrap">
          {content.bannerText || '🌟 MIMILO — Pasang & Temukan Iklan Terbaik di Sini! 🌟'}
        </p>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-500 px-4 pt-4 pb-16">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white font-extrabold text-xl tracking-wide">MIMILO</h1>
            <p className="text-sky-100 text-xs">Halo, {user.name.split(' ')[0]}! 👋</p>
          </div>
          <button onClick={() => navigate('/akun')}
            className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
            {user.photo
              ? <img src={user.photo} alt="" className="w-full h-full rounded-full object-cover" />
              : <span className="text-white font-bold text-base">{user.name.charAt(0).toUpperCase()}</span>
            }
          </button>
        </div>

        <form onSubmit={handleSearch}>
          <div className="flex items-center bg-white rounded-2xl shadow-md px-4 py-3 gap-3">
            <Search size={18} className="text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk, rumah, kafe..."
              className="flex-1 text-sm text-slate-700 outline-none placeholder-slate-400"
            />
          </div>
        </form>
      </div>

      {/* Content overlay */}
      <div className="-mt-10 px-4 space-y-4">

        {/* ── Saldo + Paket Widget ─────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-md border border-sky-50 overflow-hidden flex items-stretch">
          {/* Saldo */}
          <div className="flex-1 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">💰 Saldo</p>
            <p className="font-extrabold text-slate-800 text-xl mt-0.5">{formatRp(balance)}</p>
            <p className={`text-[10px] mt-0.5 font-semibold ${balance >= 5000 ? 'text-green-500' : 'text-slate-400'}`}>
              {balance >= 5000 ? 'Saldo tersedia' : 'Min. Rp 5.000'}
            </p>
          </div>
          {/* Divider */}
          <div className="w-px bg-slate-100 my-3" />
          {/* Paket */}
          <button
            onClick={() => navigate('/paket')}
            className="flex-1 p-4 text-left hover:bg-slate-50 transition-colors">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">📦 Paket</p>
            <p className={`font-extrabold text-base mt-0.5 ${currentPkg.color}`}>
              {currentPkg.emoji} {currentPkg.name}
            </p>
            <p className="text-slate-400 text-[10px] mt-0.5">
              {currentPkg.maxPhotos === -1 ? '∞ foto' : `${currentPkg.maxPhotos} foto`}
            </p>
          </button>
          {/* Top Up Button */}
          <button
            onClick={openTopUp}
            className="bg-gradient-to-b from-sky-500 to-blue-600 text-white flex flex-col items-center justify-center px-5 gap-1.5 hover:from-sky-600 hover:to-blue-700 transition-colors active:scale-95">
            <Wallet size={20} />
            <span className="text-[10px] font-bold">Top Up</span>
          </button>
        </div>

        {/* Slider */}
        {content.sliderImages.length > 0 && (
          <div className="relative rounded-3xl overflow-hidden h-44 shadow-lg">
            <img
              src={content.sliderImages[sliderIdx]}
              alt={`Slide ${sliderIdx + 1}`}
              className="w-full h-full object-cover transition-opacity duration-500"
            />
            {content.sliderImages.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {content.sliderImages.map((_, i) => (
                  <button key={i} onClick={() => setSliderIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === sliderIdx ? 'bg-white w-6' : 'bg-white/50 w-1.5'}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <h2 className="font-bold text-slate-800 text-sm mb-3">Kategori</h2>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.key}
                onClick={() => navigate(`/cari-iklan?cat=${cat.key}`)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${cat.bg}`}>
                <span className="text-xl leading-none">{cat.emoji}</span>
                <span className={`text-[10px] font-semibold text-center leading-tight ${cat.color}`}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hero */}
        {content.heroTitle && (
          <div className="bg-gradient-to-r from-sky-500 to-blue-500 rounded-3xl p-5 shadow-md overflow-hidden relative">
            {content.heroImage && (
              <img src={content.heroImage} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            )}
            <div className="relative">
              <h2 className="text-white font-extrabold text-xl">{content.heroTitle}</h2>
              {content.heroSubtitle && <p className="text-sky-100 text-sm mt-1">{content.heroSubtitle}</p>}
              <button onClick={() => navigate('/pasang-iklan')}
                className="mt-3 px-4 py-2 rounded-xl bg-white/20 border border-white/40 text-white text-xs font-bold hover:bg-white/30 transition-colors">
                Pasang Iklan Sekarang →
              </button>
            </div>
          </div>
        )}

        {/* Custom sections */}
        {content.sections.map(section => (
          <div key={section.id}>
            {section.type === 'text' && (
              <div className="bg-white rounded-3xl p-4 shadow-sm">
                {section.title && <h3 className="font-bold text-slate-800 text-sm mb-2">{section.title}</h3>}
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{section.content}</p>
              </div>
            )}
            {section.type === 'image' && section.imageUrl && (
              <div className="rounded-3xl overflow-hidden shadow-sm">
                <img src={section.imageUrl} alt={section.title} className="w-full object-cover rounded-3xl" />
              </div>
            )}
            {section.type === 'phone' && (
              <div className="bg-white rounded-3xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-11 h-11 bg-sky-100 rounded-2xl flex items-center justify-center">
                  <Phone size={20} className="text-sky-500" />
                </div>
                <div>
                  {section.title && <p className="font-semibold text-slate-700 text-sm">{section.title}</p>}
                  <a href={`tel:${section.content}`} className="text-sky-600 font-bold">{section.content}</a>
                </div>
              </div>
            )}
            {section.type === 'map' && section.content && (
              <div className="rounded-3xl overflow-hidden shadow-sm">
                {section.title && <p className="font-bold text-slate-700 text-sm mb-2">{section.title}</p>}
                <iframe src={section.content} className="w-full h-52 rounded-3xl border-0" loading="lazy" title="Map" />
              </div>
            )}
          </div>
        ))}

        {/* Recent Listings */}
        {listings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800 text-sm">Iklan Terbaru</h2>
              <button onClick={() => navigate('/cari-iklan')}
                className="flex items-center text-sky-500 text-xs font-semibold">
                Lihat semua <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-3">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  activeFilter === 'all'
                    ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-sky-200'
                }`}>
                🔎 Semua
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveFilter(activeFilter === cat.key ? 'all' : cat.key)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                    activeFilter === cat.key
                      ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-sky-200'
                  }`}>
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 mb-3 font-medium">
              {filteredListings.length} iklan{activeFilter !== 'all'
                ? ` kategori ${CATEGORIES.find(c => c.key === activeFilter)?.label}` : ''}
            </p>

            {filteredListings.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-3xl">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-slate-500 text-sm font-medium">Belum ada iklan di kategori ini</p>
                <button onClick={() => navigate('/pasang-iklan')}
                  className="mt-3 px-5 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold">
                  Pasang Sekarang
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredListings.map(listing => {
                  const cat = CATEGORIES.find(c => c.key === listing.category);
                  return (
                    <button key={listing.id}
                      onClick={() => navigate(`/iklan/${listing.id}`)}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-50 hover:shadow-md transition-shadow text-left">
                      {listing.images[0] ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-32 object-cover" />
                      ) : (
                        <div className={`w-full h-32 flex items-center justify-center text-4xl ${cat?.bg}`}>
                          {cat?.emoji}
                        </div>
                      )}
                      <div className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat?.bg} ${cat?.color}`}>
                          {cat?.label}
                        </span>
                        <p className="font-semibold text-slate-800 text-sm mt-1.5 line-clamp-2 leading-tight">{listing.title}</p>
                        {listing.price && (
                          <p className="font-bold text-sky-600 text-sm mt-1">{listing.price}</p>
                        )}
                        {listing.location && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin size={10} className="text-slate-400" />
                            <span className="text-slate-400 text-[10px] truncate">{listing.location}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1.5">
                          {listing.condition && listing.condition.toLowerCase().includes('bekas') && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Bekas</span>
                          )}
                          <span className="text-[9px] text-slate-300 ml-auto">{timeAgo(listing.createdAt)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Contact */}
        {content.contactPhone && (
          <div className="bg-white rounded-3xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 bg-green-100 rounded-2xl flex items-center justify-center">
              <Phone size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Hubungi Kami</p>
              <a href={`tel:${content.contactPhone}`} className="text-green-700 font-bold">{content.contactPhone}</a>
            </div>
          </div>
        )}
        {content.contactAddress && (
          <div className="bg-white rounded-3xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 bg-sky-100 rounded-2xl flex items-center justify-center">
              <MapPin size={20} className="text-sky-500" />
            </div>
            <p className="text-slate-700 text-sm">{content.contactAddress}</p>
          </div>
        )}
        {content.mapEmbedUrl && (
          <iframe src={content.mapEmbedUrl} className="w-full h-52 rounded-3xl border-0 shadow-sm" loading="lazy" title="Location Map" />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  TOP UP MODAL                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showTopUp && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end"
          onClick={() => !topUpDone && setShowTopUp(false)}
        >
          <div
            className="bg-white rounded-t-3xl max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-base">💰 Top Up Saldo</h3>
                <p className="text-slate-400 text-xs">Saldo aktif: {formatRp(balance)}</p>
              </div>
              {!topUpDone && (
                <button onClick={() => setShowTopUp(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <X size={16} className="text-slate-500" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {topUpDone ? (
                /* ── Success state ── */
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={40} className="text-green-500" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-xl">Permintaan Dikirim!</h3>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    Bukti pembayaran sudah diterima.<br />
                    Admin akan memverifikasi dan menambahkan saldo Anda.
                  </p>
                  <p className="font-extrabold text-sky-600 text-2xl mt-3">{formatRp(finalTopUpAmount)}</p>
                  <p className="text-slate-400 text-xs mt-1">akan ditambahkan setelah konfirmasi admin</p>
                  <button onClick={() => setShowTopUp(false)}
                    className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md">
                    Tutup
                  </button>
                </div>
              ) : (
                <>
                  {/* ── Step 1: Nominal ── */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      1. Pilih Nominal Top Up (Min. Rp 5.000)
                    </h4>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {PRESET_AMOUNTS.map(amt => (
                        <button key={amt} type="button"
                          onClick={() => { setTopUpAmount(amt); setUseCustom(false); }}
                          className={`py-2.5 rounded-2xl text-xs font-bold border-2 transition-all ${
                            !useCustom && topUpAmount === amt
                              ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                              : 'bg-white border-slate-100 text-slate-700 hover:border-sky-300'
                          }`}>
                          {formatRp(amt)}
                        </button>
                      ))}
                    </div>
                    {/* Custom amount */}
                    <div className={`flex items-center gap-2 border-2 rounded-2xl px-4 py-3 transition-colors ${
                      useCustom ? 'border-sky-400 bg-sky-50' : 'border-slate-100 bg-white'
                    }`}>
                      <span className="text-slate-500 text-sm font-semibold flex-shrink-0">Rp</span>
                      <input
                        type="number"
                        placeholder="Nominal lain..."
                        value={customAmountStr}
                        onChange={e => { setCustomAmountStr(e.target.value); setUseCustom(true); }}
                        onFocus={() => setUseCustom(true)}
                        className="flex-1 text-sm outline-none bg-transparent text-slate-800 font-semibold min-w-0"
                      />
                    </div>
                    {useCustom && parseInt(customAmountStr) > 0 && parseInt(customAmountStr) < 5000 && (
                      <p className="text-red-500 text-xs mt-1.5 font-medium">⚠️ Minimum top up Rp 5.000</p>
                    )}
                  </div>

                  {/* Summary bar */}
                  <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Jumlah Top Up</p>
                      <p className="font-extrabold text-sky-700 text-2xl">{formatRp(finalTopUpAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Setelah dikonfirmasi</p>
                      <p className="font-bold text-green-600 text-sm">+{formatRp(finalTopUpAmount)}</p>
                    </div>
                  </div>

                  {/* ── Step 2: Payment method ── */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      2. Metode Pembayaran
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {(['mandiri', 'ovo'] as const).map(method => {
                        const info = BANK_INFO[method];
                        return (
                          <button key={method}
                            onClick={() => setPayMethod(method)}
                            className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                              payMethod === method
                                ? `${info.border} ${info.bg} ring-2 ring-offset-1 ring-sky-300`
                                : 'border-slate-100 bg-white hover:border-slate-200'
                            }`}>
                            <span className="text-2xl block mb-1">{info.icon}</span>
                            <p className={`font-bold text-sm ${info.color}`}>{info.name}</p>
                            <p className="text-slate-400 text-[11px]">Transfer</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Step 3: Transfer details ── */}
                  <div className={`rounded-2xl border-2 ${BANK_INFO[payMethod].border} ${BANK_INFO[payMethod].bg} p-4`}>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      3. Transfer ke {BANK_INFO[payMethod].name}
                    </h4>
                    <div className="space-y-2">
                      {/* Account number */}
                      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium mb-0.5">
                            {payMethod === 'mandiri' ? 'No. Rekening' : 'No. OVO'}
                          </p>
                          <p className="font-extrabold text-slate-800 text-lg tracking-wider">
                            {BANK_INFO[payMethod].account}
                          </p>
                          <p className="text-slate-500 text-xs">a.n. {BANK_INFO[payMethod].holder}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(
                            BANK_INFO[payMethod].account,
                            payMethod === 'mandiri' ? 'No. Rekening' : 'No. OVO'
                          )}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${BANK_INFO[payMethod].bg} border ${BANK_INFO[payMethod].border} hover:opacity-80 transition-opacity`}>
                          <Copy size={15} className={BANK_INFO[payMethod].color} />
                        </button>
                      </div>
                      {/* Amount */}
                      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium mb-0.5">Jumlah Transfer</p>
                          <p className="font-extrabold text-xl text-sky-700">{formatRp(finalTopUpAmount)}</p>
                        </div>
                        {finalTopUpAmount > 0 && (
                          <button
                            onClick={() => copyToClipboard(String(finalTopUpAmount), 'Jumlah')}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-50 border border-sky-200 hover:opacity-80 transition-opacity">
                            <Copy size={15} className="text-sky-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Step 4: Upload proof ── */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      4. Upload Bukti Transfer
                    </h4>
                    {proofImage ? (
                      <div className="relative">
                        <img src={proofImage} alt="Bukti" className="w-full h-48 object-cover rounded-2xl border-2 border-green-200" />
                        <button onClick={() => setProofImage('')}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow">
                          <X size={14} className="text-white" />
                        </button>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                          <CheckCircle size={11} /> Bukti diunggah
                        </div>
                      </div>
                    ) : (
                      <label className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        uploading ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:border-sky-400 hover:bg-sky-50'
                      }`}>
                        <input type="file" accept="image/*" className="hidden" onChange={handleProofUpload} />
                        {uploading
                          ? <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                          : <Upload size={28} className="text-sky-400" />
                        }
                        <p className="text-sm font-semibold text-sky-600">
                          {uploading ? 'Mengupload...' : 'Ketuk untuk upload screenshot'}
                        </p>
                        <p className="text-xs text-slate-400">JPG / PNG — Maks. 5MB</p>
                      </label>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleTopUpSubmit}
                    disabled={!proofImage || uploading || finalTopUpAmount < 5000}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-base shadow-lg shadow-sky-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-95">
                    <CreditCard size={20} /> Kirim Bukti Top Up
                  </button>

                  <p className="text-center text-xs text-slate-400 pb-2">
                    Saldo aktif dalam 1×24 jam setelah konfirmasi admin
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Home;
