import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuth, getListings } from '@/lib/storage';
import type { Listing, ListingCategory } from '@/types';
import BottomNav from '@/components/layout/BottomNav';
import { Search, MapPin, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORIES: { key: ListingCategory; label: string; emoji: string; color: string; bg: string }[] = [
  { key: 'produk',     label: 'Produk',      emoji: '🛍️',  color: 'text-orange-600',  bg: 'bg-orange-50' },
  { key: 'otomotif',   label: 'Otomotif',    emoji: '🚗',  color: 'text-red-600',     bg: 'bg-red-50' },
  { key: 'rumah',      label: 'Rumah',       emoji: '🏠',  color: 'text-sky-600',     bg: 'bg-sky-50' },
  { key: 'kosan',      label: 'Kosan',       emoji: '🏘️',  color: 'text-blue-600',    bg: 'bg-blue-50' },
  { key: 'penginapan', label: 'Penginapan',  emoji: '🏨',  color: 'text-purple-600',  bg: 'bg-purple-50' },
  { key: 'wisata',     label: 'Wisata',      emoji: '🏝️',  color: 'text-green-600',   bg: 'bg-green-50' },
  { key: 'kafe',       label: 'Kafe',        emoji: '☕',  color: 'text-amber-600',   bg: 'bg-amber-50' },
  { key: 'lowongan',   label: 'Lowongan',    emoji: '💼',  color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  { key: 'jasa',       label: 'Jasa',        emoji: '🔧',  color: 'text-teal-600',    bg: 'bg-teal-50' },
];

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

interface OtoFilter {
  vehicleType: string;
  transmission: string;
  condition: string;
  yearMin: string;
  yearMax: string;
}

const VEHICLE_TYPES = [
  { v: 'mobil',      l: '🚗 Mobil' },
  { v: 'motor',      l: '🏍️ Motor' },
  { v: 'truk',       l: '🚚 Truk' },
  { v: 'pickup',     l: '🚛 Pick-Up' },
  { v: 'bus',        l: '🚌 Bus' },
  { v: 'alat-berat', l: '🚧 Alat Berat' },
];

const TRANSMISSIONS = [
  { v: 'manual', l: '🤜 Manual' },
  { v: 'matic',  l: '⚙️ Matic' },
  { v: 'cvt',    l: '🌀 CVT' },
];

const YEARS = Array.from({ length: new Date().getFullYear() - 1989 }, (_, i) => String(new Date().getFullYear() - i));

const defaultOtoFilter: OtoFilter = { vehicleType: '', transmission: '', condition: '', yearMin: '', yearMax: '' };

const CariIklan = () => {
  const navigate = useNavigate();
  const user = getAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState<ListingCategory | 'all'>(
    (searchParams.get('cat') as ListingCategory) || 'all'
  );
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [filtered, setFiltered] = useState<Listing[]>([]);
  const [otoFilter, setOtoFilter] = useState<OtoFilter>(defaultOtoFilter);
  const [showOtoFilter, setShowOtoFilter] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const active = getListings().filter(l => l.status === 'active');
    setAllListings(active);
  }, [user, navigate]);

  useEffect(() => {
    let result = allListings;
    if (activeCategory !== 'all') {
      result = result.filter(l => l.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
      );
    }
    // Otomotif advanced filters
    if (activeCategory === 'otomotif') {
      if (otoFilter.vehicleType) {
        result = result.filter(l => l.description.toLowerCase().includes(`jenis: ${otoFilter.vehicleType}`));
      }
      if (otoFilter.transmission) {
        result = result.filter(l => l.description.toLowerCase().includes(`transmisi: ${otoFilter.transmission}`));
      }
      if (otoFilter.condition) {
        if (otoFilter.condition === 'baru') {
          result = result.filter(l => !l.condition || l.condition.toLowerCase() === 'baru');
        } else {
          result = result.filter(l => l.condition && l.condition.toLowerCase().includes('bekas'));
        }
      }
      if (otoFilter.yearMin || otoFilter.yearMax) {
        result = result.filter(l => {
          const match = l.description.match(/tahun:\s*(\d{4})/i);
          if (!match) return false;
          const year = parseInt(match[1]);
          if (otoFilter.yearMin && year < parseInt(otoFilter.yearMin)) return false;
          if (otoFilter.yearMax && year > parseInt(otoFilter.yearMax)) return false;
          return true;
        });
      }
    }
    setFiltered(result);
  }, [allListings, activeCategory, search, otoFilter]);

  const handleCategoryChange = (cat: ListingCategory | 'all') => {
    setActiveCategory(cat);
    setOtoFilter(defaultOtoFilter);
    if (cat === 'otomotif') setShowOtoFilter(true);
    else setShowOtoFilter(false);
    const params: Record<string, string> = {};
    if (cat !== 'all') params.cat = cat;
    if (search) params.q = search;
    setSearchParams(params);
  };

  const otoActiveCount = Object.values(otoFilter).filter(v => v !== '').length;
  const updOto = (patch: Partial<OtoFilter>) => setOtoFilter(f => ({ ...f, ...patch }));
  const toggleOto = <K extends keyof OtoFilter>(key: K, val: string) =>
    setOtoFilter(f => ({ ...f, [key]: f[key] === val ? '' : val }));

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #e0f4ff 0%, #f8fcff 100%)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-500 px-4 pt-4 pb-5 sticky top-0 z-40">
        <h1 className="text-white font-bold text-lg mb-3">Cari Iklan</h1>
        <div className="flex items-center bg-white rounded-2xl px-4 py-3 gap-3 shadow-md">
          <Search size={17} className="text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari produk, rumah, wisata..."
            className="flex-1 text-sm text-slate-700 outline-none placeholder-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={16} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
              activeCategory === 'all'
                ? 'bg-sky-500 border-sky-500 text-white'
                : 'bg-white border-slate-100 text-slate-600 hover:border-sky-200'
            }`}
          >
            🔎 Semua
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                activeCategory === cat.key
                  ? 'bg-sky-500 border-sky-500 text-white'
                  : 'bg-white border-slate-100 text-slate-600 hover:border-sky-200'
              }`}
            >
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* ── Otomotif Advanced Filter Panel ── */}
        {activeCategory === 'otomotif' && (
          <div className="mt-3">
            {/* Toggle header */}
            <button
              onClick={() => setShowOtoFilter(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
                otoActiveCount > 0
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-slate-100 text-slate-600 hover:border-sky-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={15} />
                <span className="text-xs font-bold">Filter Otomotif</span>
                {otoActiveCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {otoActiveCount} aktif
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {otoActiveCount > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); setOtoFilter(defaultOtoFilter); }}
                    className="text-[10px] font-semibold text-red-500 hover:underline"
                  >
                    Reset
                  </button>
                )}
                {showOtoFilter
                  ? <ChevronUp size={15} className="text-slate-400" />
                  : <ChevronDown size={15} className="text-slate-400" />}
              </div>
            </button>

            {/* Filter body */}
            {showOtoFilter && (
              <div className="mt-2 bg-white border-2 border-slate-100 rounded-2xl p-4 space-y-4">

                {/* Jenis Kendaraan */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Jenis Kendaraan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VEHICLE_TYPES.map(({ v, l }) => (
                      <button key={v} type="button"
                        onClick={() => toggleOto('vehicleType', v)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                          otoFilter.vehicleType === v
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300'
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rentang Tahun */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Rentang Tahun</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={otoFilter.yearMin}
                      onChange={e => updOto({ yearMin: e.target.value })}
                      className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-400 bg-slate-50"
                    >
                      <option value="">Dari Tahun</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="text-slate-400 text-xs font-bold">–</span>
                    <select
                      value={otoFilter.yearMax}
                      onChange={e => updOto({ yearMax: e.target.value })}
                      className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-400 bg-slate-50"
                    >
                      <option value="">Sampai Tahun</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Transmisi */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Transmisi</p>
                  <div className="flex gap-2">
                    {TRANSMISSIONS.map(({ v, l }) => (
                      <button key={v} type="button"
                        onClick={() => toggleOto('transmission', v)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                          otoFilter.transmission === v
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300'
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kondisi */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Kondisi</p>
                  <div className="flex gap-2">
                    {[
                      { v: 'baru',  l: '✨ Baru' },
                      { v: 'bekas', l: '♻️ Bekas' },
                    ].map(({ v, l }) => (
                      <button key={v} type="button"
                        onClick={() => toggleOto('condition', v)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                          otoFilter.condition === v
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300'
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-4 pt-3">
        <p className="text-xs text-slate-500 mb-3 font-medium">
          {filtered.length} iklan ditemukan
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-bold text-slate-700 text-base mb-2">Iklan tidak ditemukan</h3>
            <p className="text-slate-400 text-sm">Coba ubah kata kunci atau kategori</p>
            <button onClick={() => navigate('/pasang-iklan')}
              className="mt-5 px-6 py-3 rounded-2xl bg-sky-500 text-white font-bold text-sm shadow-md">
              + Pasang Iklan Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(listing => {
              const cat = CATEGORIES.find(c => c.key === listing.category);
              return (
                <button key={listing.id}
                  onClick={() => navigate(`/iklan/${listing.id}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-50 hover:shadow-md transition-shadow text-left">
                  {listing.images[0] ? (
                    <div className="relative">
                      <img src={listing.images[0]} alt={listing.title} className="w-full h-36 object-cover" />
                      {listing.videoUrl && (
                        <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                          <span className="text-white text-xs">▶</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`w-full h-36 flex items-center justify-center text-5xl ${cat?.bg}`}>
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
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin size={10} className="text-slate-400 flex-shrink-0" />
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

      <BottomNav />
    </div>
  );
};

export default CariIklan;
