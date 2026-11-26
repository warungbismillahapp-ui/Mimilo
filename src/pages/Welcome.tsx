import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from '@/lib/storage';
import { ArrowRight, Play, Pause } from 'lucide-react';
import ternateHero from '@/assets/ternate-hero.jpg';
import mimiloPromo from '@/assets/mimilo-promo.png';

const PROMO_SLIDES = [
  {
    id: 1,
    bg: ternateHero,
    tag: '🌋 Kota Ternate',
    headline: 'Satu Aplikasi,\nSemua Kebutuhan',
    sub: 'Pasang & temukan iklan produk, properti, wisata, kuliner, dan lowongan kerja di Ternate',
    accent: 'from-slate-900/70 via-slate-900/30 to-transparent',
  },
  {
    id: 2,
    bg: null,
    promoImg: mimiloPromo,
    tag: '🛍️ Marketplace Lokal',
    headline: 'Jual & Beli\nProduk Lokal',
    sub: 'Ribuan produk UMKM Ternate tersedia. Dukung usaha lokal kita bersama!',
    solidBg: 'from-orange-600 via-rose-700 to-red-800',
  },
  {
    id: 3,
    bg: ternateHero,
    tag: '🏠 Properti & Wisata',
    headline: 'Rumah, Kosan &\nTempat Wisata',
    sub: 'Temukan penginapan terbaik, sewa kosan nyaman, hingga destinasi wisata eksotis Ternate',
    accent: 'from-slate-900/70 via-slate-900/30 to-transparent',
  },
  {
    id: 4,
    bg: null,
    solidBg: 'from-indigo-700 via-blue-700 to-sky-600',
    tag: '💼 Lowongan & Jasa',
    headline: 'Karier &\nPeluang Usaha',
    sub: 'Cari lowongan kerja, tawarkan jasa profesional, dan kembangkan bisnis di Ternate',
    accent: '',
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const user = getAuth();

  const [slideIdx, setSlideIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animKey, setAnimKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
  }, [user, navigate]);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSlideIdx(i => {
        const next = (i + 1) % PROMO_SLIDES.length;
        setAnimKey(k => k + 1);
        return next;
      });
    }, 4500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  const goToSlide = (i: number) => {
    setSlideIdx(i);
    setAnimKey(k => k + 1);
  };

  if (!user) return null;

  const slide = PROMO_SLIDES[slideIdx];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">

      {/* ─── FULL SCREEN BACKGROUND ─── */}
      {slide.solidBg ? (
        <div className={`absolute inset-0 bg-gradient-to-br ${slide.solidBg} transition-all duration-700`} />
      ) : slide.bg ? (
        <img
          key={`bg-${slideIdx}`}
          src={slide.bg}
          alt="bg"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: 'kenBurns 8s ease-in-out forwards' }}
        />
      ) : null}

      {/* Promo image overlay (slide 2) */}
      {slide.promoImg && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src={slide.promoImg}
            alt="promo"
            className="h-full w-auto object-contain opacity-30"
          />
        </div>
      )}

      {/* Dark gradient overlay — bottom heavy */}
      {!slide.solidBg && (
        <div className={`absolute inset-0 bg-gradient-to-t ${slide.accent || 'from-slate-900/80 via-slate-900/20 to-transparent'}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      {/* ─── TOP BAR ─── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-10 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-lg">M</span>
          </div>
          <div>
            <span className="text-white font-extrabold text-xl tracking-widest drop-shadow">MIMILO</span>
            <div className="flex items-center gap-1 -mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/60 text-[10px] font-medium">Ternate</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsPlaying(p => !p)}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow"
        >
          {isPlaying
            ? <Pause size={15} className="text-white" />
            : <Play size={15} className="text-white ml-0.5" />
          }
        </button>
      </div>

      {/* ─── SLIDE CONTENT (centered) ─── */}
      <div
        key={animKey}
        className="absolute inset-0 flex flex-col items-start justify-center px-7 z-10"
        style={{ animation: 'slideUpFade 0.65s ease-out forwards' }}
      >
        {/* Tag chip */}
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white text-xs font-semibold mb-4 shadow">
          {slide.tag}
        </span>

        {/* Headline */}
        <h1
          className="text-white font-black text-4xl leading-[1.15] mb-4 drop-shadow-2xl"
          style={{ whiteSpace: 'pre-line', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
        >
          {slide.headline}
        </h1>

        {/* Sub */}
        <p className="text-white/80 text-sm leading-relaxed max-w-xs drop-shadow">
          {slide.sub}
        </p>
      </div>

      {/* ─── BOTTOM AREA ─── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-12 flex flex-col gap-5">

        {/* Slide progress dots */}
        <div className="flex items-center gap-2">
          {PROMO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className="relative overflow-hidden rounded-full transition-all"
              style={{ height: 4, width: i === slideIdx ? 36 : 8, background: 'rgba(255,255,255,0.3)' }}
            >
              {i === slideIdx && isPlaying && (
                <span
                  className="absolute inset-y-0 left-0 bg-white rounded-full"
                  style={{ animation: 'progressBar 4.5s linear forwards', width: '100%' }}
                />
              )}
              {i === slideIdx && !isPlaying && (
                <span className="absolute inset-0 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/home')}
            className="w-full py-4 rounded-2xl bg-white text-slate-900 font-extrabold text-base flex items-center justify-center gap-2 shadow-xl hover:bg-white/90 active:scale-95 transition-all"
          >
            Masuk ke Beranda <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/pasang-iklan')}
            className="w-full py-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/25 active:scale-95 transition-all"
          >
            🚀 Pasang Iklan — Gratis!
          </button>
        </div>

        {/* Slide counter */}
        <p className="text-center text-white/40 text-xs font-medium">
          {slideIdx + 1} / {PROMO_SLIDES.length}
        </p>
      </div>
    </div>
  );
};

export default Welcome;
