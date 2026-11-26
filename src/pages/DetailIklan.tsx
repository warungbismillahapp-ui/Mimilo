import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAuth, getListingById, getMessages, saveMessageWithEvent, generateId,
  NOTIFY_CHAT_KEY, type ChatEvent,
} from '@/lib/storage';
import type { Listing, ChatMessage } from '@/types';
import { triggerNotification, formatWANumber } from '@/lib/notifications';
import {
  ArrowLeft, Phone, MessageCircle, MapPin,
  ChevronLeft, ChevronRight, Play, Send, X,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  produk:     { label: 'Produk',      emoji: '🛍️',  color: 'text-orange-600',  bg: 'bg-orange-50' },
  otomotif:   { label: 'Otomotif',    emoji: '🚗',  color: 'text-red-600',     bg: 'bg-red-50' },
  rumah:      { label: 'Rumah',       emoji: '🏠',  color: 'text-sky-600',     bg: 'bg-sky-50' },
  kosan:      { label: 'Kosan',       emoji: '🏘️',  color: 'text-blue-600',    bg: 'bg-blue-50' },
  penginapan: { label: 'Penginapan',  emoji: '🏨',  color: 'text-purple-600',  bg: 'bg-purple-50' },
  wisata:     { label: 'Wisata',      emoji: '🏝️',  color: 'text-green-600',   bg: 'bg-green-50' },
  kafe:       { label: 'Kafe',        emoji: '☕',  color: 'text-amber-600',   bg: 'bg-amber-50' },
  lowongan:   { label: 'Lowongan',    emoji: '💼',  color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  jasa:       { label: 'Jasa',        emoji: '🔧',  color: 'text-teal-600',    bg: 'bg-teal-50' },
};

const DetailIklan = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = getAuth();

  const [listing, setListing]       = useState<Listing | null>(null);
  const [imgIdx, setImgIdx]         = useState(0);
  const [showChat, setShowChat]     = useState(false);
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]   = useState('');
  const [showVideo, setShowVideo]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef   = useRef<HTMLDivElement>(null);
  // Stable refs — prevent stale closure in storage event handler
  const listingRef   = useRef<Listing | null>(null);
  const showChatRef  = useRef(false);
  const userRef      = useRef(user);

  useEffect(() => { listingRef.current  = listing;  }, [listing]);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!id) return;
    const l = getListingById(id);
    if (!l) { toast.error('Iklan tidak ditemukan'); navigate(-1); return; }
    setListing(l);
    setMessages(getMessages(id));
  }, [id, user, navigate]);

  // ── Real-time chat sync via localStorage storage events (cross-tab) ──────
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== NOTIFY_CHAT_KEY || !e.newValue) return;
      const event: ChatEvent = JSON.parse(e.newValue);
      const cur = listingRef.current;
      if (!cur || event.listingId !== cur.id) return;
      if (event.senderId === userRef.current?.id) return; // skip own sends

      // Reload messages for this listing
      setMessages(getMessages(cur.id));
      // Sound + vibration
      triggerNotification('chat');
      // If chat panel is closed → show toast + badge
      if (!showChatRef.current) {
        setUnreadCount(c => c + 1);
        const snippet = event.message.length > 60
          ? event.message.substring(0, 60) + '…'
          : event.message;
        toast.success(`💬 ${event.senderName}: "${snippet}"`, { duration: 4000 });
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  const handleChatToggle = () => {
    if (showChat) {
      setShowChat(false);
    } else {
      setShowChat(true);
      setUnreadCount(0);
    }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !user || !listing) return;
    const msg: ChatMessage = {
      id:          generateId(),
      listingId:   listing.id,
      senderId:    user.id,
      senderName:  user.name,
      message:     chatInput.trim(),
      createdAt:   new Date().toISOString(),
    };
    // saveMessageWithEvent triggers storage event in OTHER tabs (seller/admin)
    saveMessageWithEvent(msg, listing.title);
    setMessages(prev => [...prev, msg]);
    setChatInput('');
  };

  const openWhatsApp = () => {
    if (!listing?.whatsapp) {
      toast.error('Nomor WhatsApp tidak tersedia');
      return;
    }
    const num = formatWANumber(listing.whatsapp);
    if (num.length < 8) {
      toast.error('Format nomor WhatsApp tidak valid — pastikan diawali 08 atau 62');
      return;
    }
    const text = encodeURIComponent(
      `Halo kak, saya tertarik dengan iklan ini:\n*${listing.title}*\n\nBoleh info lebih lanjut?`
    );
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
  };

  if (!listing) return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const cat        = CATEGORIES[listing.category];
  const mediaItems = [...listing.images];
  const hasVideo   = !!listing.videoUrl;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Image Gallery ──────────────────────────────────────────────── */}
      <div className="relative bg-slate-100">
        {mediaItems.length > 0 || hasVideo ? (
          <div className="relative h-72 overflow-hidden">
            {showVideo && hasVideo ? (
              <video
                src={listing.videoUrl.startsWith('data:') ? listing.videoUrl : undefined}
                controls autoPlay className="w-full h-full object-cover"
              />
            ) : mediaItems[imgIdx] ? (
              <img src={mediaItems[imgIdx]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-8xl ${cat.bg}`}>{cat.emoji}</div>
            )}

            {mediaItems.length > 1 && !showVideo && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + mediaItems.length) % mediaItems.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
                  <ChevronLeft size={18} className="text-white" />
                </button>
                <button onClick={() => setImgIdx(i => (i + 1) % mediaItems.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
                  <ChevronRight size={18} className="text-white" />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {mediaItems.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`} />
                  ))}
                </div>
              </>
            )}

            {hasVideo && !showVideo && (
              <button onClick={() => setShowVideo(true)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-semibold">
                <Play size={12} /> Video
              </button>
            )}
            {showVideo && (
              <button onClick={() => setShowVideo(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                <X size={14} className="text-white" />
              </button>
            )}
          </div>
        ) : (
          <div className={`h-56 flex items-center justify-center text-8xl ${cat.bg}`}>{cat.emoji}</div>
        )}

        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-32">

        {/* Category + Title */}
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${cat.bg} ${cat.color}`}>
              {cat.emoji} {cat.label}
            </span>
            {listing.condition && listing.condition.toLowerCase().includes('bekas') && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">♻️ Bekas</span>
            )}
          </div>
          <h1 className="font-extrabold text-slate-800 text-xl mt-2 leading-snug">{listing.title}</h1>
          {listing.price && (
            <p className="font-bold text-sky-600 text-xl mt-1">{listing.price}</p>
          )}
        </div>

        {/* Location */}
        {listing.location && (
          <div className="flex items-start gap-2 mb-4 bg-sky-50 rounded-2xl px-3 py-3">
            <MapPin size={16} className="text-sky-500 mt-0.5 flex-shrink-0" />
            <p className="text-slate-700 text-sm">{listing.location}</p>
          </div>
        )}

        {/* WhatsApp info card */}
        {listing.whatsapp && (
          <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={17} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">WhatsApp Penjual</p>
                <p className="text-green-700 font-bold text-sm">+{formatWANumber(listing.whatsapp)}</p>
              </div>
            </div>
            <button onClick={openWhatsApp}
              className="px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-bold shadow-sm hover:bg-green-600 transition-colors">
              Chat WA
            </button>
          </div>
        )}

        {/* Description */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <h3 className="font-bold text-slate-700 text-sm mb-2">Deskripsi</h3>
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
        </div>

        {/* Map */}
        {listing.mapEmbedUrl && (
          <div className="mb-4">
            <h3 className="font-bold text-slate-700 text-sm mb-2">Lokasi di Peta</h3>
            <iframe
              src={listing.mapEmbedUrl}
              className="w-full h-52 rounded-2xl border-0 shadow-sm"
              loading="lazy" title="Map"
            />
          </div>
        )}

        {/* Seller Info */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">{listing.userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm">{listing.userName}</p>
            <p className="text-slate-400 text-xs">
              Diposting {new Date(listing.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Thumbnail strip */}
        {listing.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {listing.images.map((img, i) => (
              <button key={i}
                onClick={() => { setImgIdx(i); setShowVideo(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-sky-500' : 'border-transparent'}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Fixed Action Bar ───────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 z-40">
        <div className="max-w-lg mx-auto flex gap-3">
          {listing.phone && (
            <a href={`tel:${listing.phone.replace(/\D/g, '')}`}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-sky-100 text-sky-700 font-bold text-sm hover:bg-sky-200 transition-colors">
              <Phone size={18} /> Telepon
            </a>
          )}
          {listing.whatsapp && (
            <button onClick={openWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors shadow-md shadow-green-200">
              <MessageCircle size={18} /> WhatsApp
            </button>
          )}

          {/* Chat button with unread badge */}
          <button onClick={handleChatToggle}
            className={`flex-1 relative flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-colors shadow-md ${
              showChat
                ? 'bg-slate-800 text-white'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-200'
            }`}>
            <MessageCircle size={18} /> Chat
            {unreadCount > 0 && !showChat && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── In-App Chat Panel ──────────────────────────────────────────── */}
      {showChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end"
          onClick={() => setShowChat(false)}>
          <div className="bg-white rounded-t-3xl max-h-[72vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">💬 Chat Penjual</p>
                <p className="text-slate-400 text-xs truncate">{listing.title}</p>
              </div>
              {/* WhatsApp shortcut inside chat */}
              {listing.whatsapp && (
                <button onClick={openWhatsApp}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors">
                  <MessageCircle size={12} /> WA
                </button>
              )}
              <button onClick={() => setShowChat(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <X size={16} className="text-slate-600" />
              </button>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="text-slate-400 text-sm font-medium">Mulai percakapan dengan penjual</p>
                  <p className="text-slate-300 text-xs mt-1">Pesan langsung tersampaikan</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id}
                    className={`flex items-end gap-2 ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                    {msg.senderId !== user?.id && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] font-bold">{msg.senderName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.senderId === user?.id
                        ? 'bg-sky-500 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}>
                      {msg.senderId !== user?.id && (
                        <p className="text-[11px] font-semibold mb-0.5 opacity-70">{msg.senderName}</p>
                      )}
                      <p className="leading-relaxed">{msg.message}</p>
                      <p className={`text-[10px] mt-0.5 ${msg.senderId === user?.id ? 'text-white/60 text-right' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 bg-white">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Tulis pesan ke penjual..."
                className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-sky-300 transition-all"
              />
              <button onClick={sendChat} disabled={!chatInput.trim()}
                className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 hover:bg-sky-600 disabled:opacity-40 transition-colors shadow-md">
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailIklan;
