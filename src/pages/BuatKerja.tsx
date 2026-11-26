import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, saveListing, generateId, fileToBase64, postListingEvent } from '@/lib/storage';
import { PACKAGES } from '@/types';
import type { ListingCategory } from '@/types';
import BottomNav from '@/components/layout/BottomNav';
import { ArrowLeft, Camera, Video, MapPin, Phone, MessageCircle, X, Plus, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES: { key: ListingCategory; label: string; emoji: string; color: string; bg: string }[] = [
  { key: 'produk',     label: 'Produk',      emoji: '🛍️', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  { key: 'otomotif',   label: 'Otomotif',    emoji: '🚗', color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  { key: 'rumah',      label: 'Rumah',       emoji: '🏠', color: 'text-sky-600',    bg: 'bg-sky-50 border-sky-200' },
  { key: 'kosan',      label: 'Kosan',       emoji: '🏘️', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  { key: 'penginapan', label: 'Penginapan',  emoji: '🏨', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  { key: 'wisata',     label: 'Wisata',      emoji: '🏝️', color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  { key: 'kafe',       label: 'Kafe',        emoji: '☕', color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  { key: 'lowongan',   label: 'Lowongan',    emoji: '💼', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  { key: 'jasa',       label: 'Jasa',        emoji: '🔧', color: 'text-teal-600',   bg: 'bg-teal-50 border-teal-200' },
];

// ─── Field configs per category ───────────────────────────────────────────────

interface ExtraFields {
  // Otomotif
  vehicleType?: string;
  vehicleBrand?: string;
  vehicleYear?: string;
  vehicleMileage?: string;
  transmission?: string;
  fuelType?: string;
  vehicleColor?: string;
  platNumber?: string;
  // Produk
  condition?: string;
  brand?: string;
  stock?: string;
  canShip?: boolean;
  // Rumah
  propertyType?: string; // jual | sewa
  bedrooms?: string;
  bathrooms?: string;
  landSize?: string;
  buildingSize?: string;
  certificate?: string;
  furnishing?: string;
  // Kosan
  gender?: string; // putra | putri | campur
  availableRooms?: string;
  kosFacilities?: string[];
  // Penginapan
  stars?: string;
  pricePerNight?: string;
  capacity?: string;
  hotelFacilities?: string[];
  // Wisata
  ticketPrice?: string;
  openHours?: string;
  tourismType?: string;
  tourismFacilities?: string[];
  // Kafe
  priceRange?: string;
  cafeOpenHours?: string;
  menuHighlight?: string;
  cafeFacilities?: string[];
  // Lowongan
  company?: string;
  salaryMin?: string;
  salaryMax?: string;
  jobType?: string;
  education?: string;
  experience?: string;
  deadline?: string;
  requirements?: string;
  // Jasa
  serviceType?: string;
  rate?: string;
  workArea?: string;
  yearsExp?: string;
}

const KOS_FACILITIES = ['AC', 'Kamar Mandi Dalam', 'Wi-Fi', 'Dapur Bersama', 'Parkir Motor', 'Parkir Mobil', 'Laundry', 'CCTV'];
const HOTEL_FACILITIES = ['Kolam Renang', 'Wi-Fi', 'Sarapan', 'Parkir', 'AC', 'TV', 'Lift', 'Restoran', 'Gym', 'Spa'];
const TOURISM_FACILITIES = ['Parkir', 'Toilet', 'Musholla', 'Warung/Kantin', 'Spot Foto', 'Pemandu Wisata', 'Area Bermain'];
const CAFE_FACILITIES = ['Wi-Fi', 'Parkir', 'Smoking Area', 'Live Music', 'Private Room', 'Outdoor Area', 'Colokan/Charger'];

const inputClass = "w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-sky-400 transition-colors bg-slate-50";
const selectClass = "w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-sky-400 transition-colors bg-slate-50 appearance-none";
const labelClass = "text-sm font-semibold text-slate-700 mb-1.5 block";
const sectionClass = "bg-white rounded-3xl p-4 shadow-sm space-y-4";
const sectionTitleClass = "text-xs font-bold text-slate-500 uppercase tracking-wide block";

// ─── Facility Checkbox Group ──────────────────────────────────────────────────
const FacilityGroup = ({
  options, selected, onChange, label,
}: { options: string[]; selected: string[]; onChange: (v: string[]) => void; label: string }) => (
  <div>
    <label className={labelClass}>{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button"
            onClick={() => onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
              active ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300'
            }`}>
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Category-specific form sections ─────────────────────────────────────────
const CategoryFields = ({
  category, extra, setExtra,
}: { category: ListingCategory; extra: ExtraFields; setExtra: (e: ExtraFields) => void }) => {
  const upd = (patch: Partial<ExtraFields>) => setExtra({ ...extra, ...patch });

  if (category === 'otomotif') return (
    <div className={sectionClass}>
      <label className={sectionTitleClass}>🚗 Detail Kendaraan</label>
      <div>
        <label className={labelClass}>Jenis Kendaraan</label>
        <div className="flex flex-wrap gap-2">
          {[
            { v: 'mobil', l: '🚗 Mobil' },
            { v: 'motor', l: '🏍️ Motor' },
            { v: 'truk',  l: '🚚 Truk' },
            { v: 'pickup', l: '🚛 Pick-Up' },
            { v: 'bus',   l: '🚌 Bus' },
            { v: 'alat-berat', l: '🚧 Alat Berat' },
          ].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => upd({ vehicleType: v })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                extra.vehicleType === v ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>Kondisi</label>
        <div className="flex gap-2">
          {[
            { v: 'Baru', l: '✨ Baru' },
            { v: 'Bekas - Sangat Baik', l: '♻️ Sangat Baik' },
            { v: 'Bekas - Baik', l: '♻️ Baik' },
            { v: 'Bekas - Cukup', l: '♻️ Cukup' },
          ].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => upd({ condition: v })}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold border-2 transition-all ${
                extra.condition === v ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Merek / Brand</label>
          <input value={extra.vehicleBrand || ''} onChange={e => upd({ vehicleBrand: e.target.value })}
            placeholder="Toyota, Honda, Yamaha" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Tahun Pembuatan</label>
          <input type="number" value={extra.vehicleYear || ''} onChange={e => upd({ vehicleYear: e.target.value })}
            placeholder="2020" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Kilometer (km)</label>
          <input type="number" value={extra.vehicleMileage || ''} onChange={e => upd({ vehicleMileage: e.target.value })}
            placeholder="35000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Warna</label>
          <input value={extra.vehicleColor || ''} onChange={e => upd({ vehicleColor: e.target.value })}
            placeholder="Putih, Hitam, dll" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Transmisi</label>
        <div className="flex gap-2">
          {[
            { v: 'manual', l: '🤜 Manual' },
            { v: 'matic', l: '⚙️ Matic / Otomatis' },
            { v: 'cvt', l: '🌀 CVT' },
          ].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => upd({ transmission: v })}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold border-2 transition-all ${
                extra.transmission === v ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>Bahan Bakar</label>
        <div className="flex flex-wrap gap-2">
          {[
            { v: 'bensin', l: '⛽ Bensin' },
            { v: 'diesel', l: '🛢️ Diesel' },
            { v: 'listrik', l: '⚡ Listrik' },
            { v: 'hybrid', l: '🌱 Hybrid' },
            { v: 'gas', l: '🔵 Gas/LPG' },
          ].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => upd({ fuelType: v })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                extra.fuelType === v ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>Nomor Plat <span className="text-slate-400 font-normal">(opsional)</span></label>
        <input value={extra.platNumber || ''} onChange={e => upd({ platNumber: e.target.value })}
          placeholder="TT 1234 AB" className={inputClass} />
      </div>
    </div>
  );

  if (category === 'produk') return (
    <div className={sectionClass}>
      <label className={sectionTitleClass}>🛍️ Detail Produk</label>
      <div>
        <label className={labelClass}>Kondisi Barang</label>
        <div className="flex gap-2">
          {['Baru', 'Bekas - Sangat Baik', 'Bekas - Baik', 'Bekas - Cukup'].map(c => (
            <button key={c} type="button"
              onClick={() => upd({ condition: c })}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold border-2 transition-all ${
                extra.condition === c ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              {c.includes('Baru') ? '✨ ' : '♻️ '}{c.replace('Bekas - ', '')}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>Merek / Brand</label>
        <input value={extra.brand || ''} onChange={e => upd({ brand: e.target.value })}
          placeholder="Contoh: Samsung, Nike, Lokal, dll" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Stok Tersedia</label>
          <input type="number" value={extra.stock || ''} onChange={e => upd({ stock: e.target.value })}
            placeholder="Jumlah" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Pengiriman</label>
          <div className="flex gap-2 mt-1">
            <button type="button"
              onClick={() => upd({ canShip: true })}
              className={`flex-1 py-3 rounded-2xl text-xs font-semibold border-2 transition-all ${
                extra.canShip === true ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              ✅ Bisa Kirim
            </button>
            <button type="button"
              onClick={() => upd({ canShip: false })}
              className={`flex-1 py-3 rounded-2xl text-xs font-semibold border-2 transition-all ${
                extra.canShip === false ? 'bg-red-400 border-red-400 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              📍 COD Saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (category === 'rumah') return (
    <div className={sectionClass}>
      <label className={sectionTitleClass}>🏠 Detail Properti</label>
      <div>
        <label className={labelClass}>Tipe Penawaran</label>
        <div className="flex gap-2">
          {[{ v: 'dijual', l: '🏷️ Dijual' }, { v: 'disewa', l: '🔑 Disewa' }].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => upd({ propertyType: v })}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                extra.propertyType === v ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Kamar Tidur</label>
          <select value={extra.bedrooms || ''} onChange={e => upd({ bedrooms: e.target.value })} className={selectClass}>
            <option value="">Pilih</option>
            {['1', '2', '3', '4', '5', '6+'].map(n => <option key={n} value={n}>{n} KT</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Kamar Mandi</label>
          <select value={extra.bathrooms || ''} onChange={e => upd({ bathrooms: e.target.value })} className={selectClass}>
            <option value="">Pilih</option>
            {['1', '2', '3', '4+'].map(n => <option key={n} value={n}>{n} KM</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Luas Tanah (m²)</label>
          <input type="number" value={extra.landSize || ''} onChange={e => upd({ landSize: e.target.value })}
            placeholder="m²" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Luas Bangunan (m²)</label>
          <input type="number" value={extra.buildingSize || ''} onChange={e => upd({ buildingSize: e.target.value })}
            placeholder="m²" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Sertifikat</label>
        <select value={extra.certificate || ''} onChange={e => upd({ certificate: e.target.value })} className={selectClass}>
          <option value="">Pilih jenis sertifikat</option>
          {['SHM - Sertifikat Hak Milik', 'HGB - Hak Guna Bangunan', 'AJB', 'Girik', 'SHSRS', 'Strata Title'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Kondisi Furnitur</label>
        <div className="flex gap-2">
          {[{ v: 'furnished', l: '🛋️ Furnished' }, { v: 'semi', l: '🪑 Semi-Furnished' }, { v: 'unfurnished', l: '🏠 Kosong' }].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => upd({ furnishing: v })}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                extra.furnishing === v ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (category === 'kosan') return (
    <div className={sectionClass}>
      <label className={sectionTitleClass}>🏘️ Detail Kosan</label>
      <div>
        <label className={labelClass}>Diperuntukkan</label>
        <div className="flex gap-2">
          {[{ v: 'putra', l: '👨 Putra' }, { v: 'putri', l: '👩 Putri' }, { v: 'campur', l: '👫 Campur' }].map(({ v, l }) => (
            <button key={v} type="button"
              onClick={() => upd({ gender: v })}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                extra.gender === v ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>Kamar Tersedia</label>
        <input type="number" value={extra.availableRooms || ''} onChange={e => upd({ availableRooms: e.target.value })}
          placeholder="Jumlah kamar kosong" className={inputClass} />
      </div>
      <FacilityGroup label="Fasilitas Kamar & Kos"
        options={KOS_FACILITIES}
        selected={extra.kosFacilities || []}
        onChange={v => upd({ kosFacilities: v })} />
    </div>
  );

  if (category === 'penginapan') return (
    <div className={sectionClass}>
      <label className={sectionTitleClass}>🏨 Detail Penginapan</label>
      <div>
        <label className={labelClass}>Klasifikasi Bintang</label>
        <div className="flex gap-2">
          {['1', '2', '3', '4', '5'].map(s => (
            <button key={s} type="button"
              onClick={() => upd({ stars: s })}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                extra.stars === s ? 'bg-amber-400 border-amber-400 text-white' : 'bg-white border-slate-200 text-slate-500'
              }`}>
              {'⭐'.repeat(parseInt(s))}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Harga Per Malam</label>
          <input value={extra.pricePerNight || ''} onChange={e => upd({ pricePerNight: e.target.value })}
            placeholder="Rp 150.000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Kapasitas Kamar</label>
          <input type="number" value={extra.capacity || ''} onChange={e => upd({ capacity: e.target.value })}
            placeholder="Jumlah kamar" className={inputClass} />
        </div>
      </div>
      <FacilityGroup label="Fasilitas Penginapan"
        options={HOTEL_FACILITIES}
        selected={extra.hotelFacilities || []}
        onChange={v => upd({ hotelFacilities: v })} />
    </div>
  );

  if (category === 'wisata') return (
    <div className={sectionClass}>
      <label className={sectionTitleClass}>🏝️ Detail Tempat Wisata</label>
      <div>
        <label className={labelClass}>Jenis Wisata</label>
        <select value={extra.tourismType || ''} onChange={e => upd({ tourismType: e.target.value })} className={selectClass}>
          <option value="">Pilih jenis wisata</option>
          {['Wisata Alam', 'Wisata Bahari', 'Wisata Sejarah & Budaya', 'Wisata Kuliner', 'Wisata Religi', 'Wisata Edukasi', 'Taman Hiburan', 'Wisata Petualangan'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Harga Tiket Masuk</label>
          <input value={extra.ticketPrice || ''} onChange={e => upd({ ticketPrice: e.target.value })}
            placeholder="Gratis / Rp 20.000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Jam Buka</label>
          <input value={extra.openHours || ''} onChange={e => upd({ openHours: e.target.value })}
            placeholder="08.00 – 17.00" className={inputClass} />
        </div>
      </div>
      <FacilityGroup label="Fasilitas Tersedia"
        options={TOURISM_FACILITIES}
        selected={extra.tourismFacilities || []}
        onChange={v => upd({ tourismFacilities: v })} />
    </div>
  );

  if (category === 'kafe') return (
    <div className={sectionClass}>
      <label className={sectionTitleClass}>☕ Detail Kafe / Restoran</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Range Harga</label>
          <select value={extra.priceRange || ''} onChange={e => upd({ priceRange: e.target.value })} className={selectClass}>
            <option value="">Pilih range</option>
            <option value="< Rp 25.000">{'< Rp 25.000'}</option>
            <option value="Rp 25.000 – 50.000">Rp 25.000 – 50.000</option>
            <option value="Rp 50.000 – 100.000">Rp 50.000 – 100.000</option>
            <option value="> Rp 100.000">{'> Rp 100.000'}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Jam Operasional</label>
          <input value={extra.cafeOpenHours || ''} onChange={e => upd({ cafeOpenHours: e.target.value })}
            placeholder="08.00 – 22.00" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Menu Unggulan</label>
        <input value={extra.menuHighlight || ''} onChange={e => upd({ menuHighlight: e.target.value })}
          placeholder="Contoh: Kopi Susu, Nasi Goreng Seafood" className={inputClass} />
      </div>
      <FacilityGroup label="Fasilitas Kafe"
        options={CAFE_FACILITIES}
        selected={extra.cafeFacilities || []}
        onChange={v => upd({ cafeFacilities: v })} />
    </div>
  );

  if (category === 'lowongan') return (
    <div className={sectionClass}>
      <label className={sectionTitleClass}>💼 Detail Lowongan Kerja</label>
      <div>
        <label className={labelClass}>Nama Perusahaan / Instansi</label>
        <input value={extra.company || ''} onChange={e => upd({ company: e.target.value })}
          placeholder="PT. Maju Jaya Indonesia" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Tipe Pekerjaan</label>
        <div className="flex flex-wrap gap-2">
          {['Full-Time', 'Part-Time', 'Freelance', 'Magang / Internship', 'Remote', 'Kontrak'].map(t => (
            <button key={t} type="button"
              onClick={() => upd({ jobType: t })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                extra.jobType === t ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Gaji Min (Rp)</label>
          <input type="number" value={extra.salaryMin || ''} onChange={e => upd({ salaryMin: e.target.value })}
            placeholder="3000000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Gaji Max (Rp)</label>
          <input type="number" value={extra.salaryMax || ''} onChange={e => upd({ salaryMax: e.target.value })}
            placeholder="5000000" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Pendidikan Min.</label>
          <select value={extra.education || ''} onChange={e => upd({ education: e.target.value })} className={selectClass}>
            <option value="">Pilih</option>
            {['SD / Sederajat', 'SMP / Sederajat', 'SMA/SMK', 'D1/D2/D3', 'S1/D4', 'S2', 'S3', 'Tidak Dipersyaratkan'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Pengalaman</label>
          <select value={extra.experience || ''} onChange={e => upd({ experience: e.target.value })} className={selectClass}>
            <option value="">Pilih</option>
            {['Fresh Graduate', '< 1 Tahun', '1-2 Tahun', '2-3 Tahun', '3-5 Tahun', '5+ Tahun'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Persyaratan & Kualifikasi</label>
        <textarea value={extra.requirements || ''} onChange={e => upd({ requirements: e.target.value })}
          placeholder="- Pria/Wanita max 30 tahun&#10;- Mampu bekerja dalam tim&#10;- dll"
          rows={4} className={`${inputClass} resize-none`} />
      </div>
      <div>
        <label className={labelClass}>Batas Lamaran</label>
        <input type="date" value={extra.deadline || ''} onChange={e => upd({ deadline: e.target.value })}
          className={inputClass} />
      </div>
    </div>
  );

  if (category === 'jasa') return (
    <div className={sectionClass}>
      <label className={sectionTitleClass}>🔧 Detail Jasa / Layanan</label>
      <div>
        <label className={labelClass}>Jenis Jasa</label>
        <select value={extra.serviceType || ''} onChange={e => upd({ serviceType: e.target.value })} className={selectClass}>
          <option value="">Pilih jenis jasa</option>
          {[
            'Jasa Bangunan & Renovasi', 'Jasa Listrik & Elektronik', 'Jasa Servis AC & Elektronik',
            'Jasa Desain Grafis & Digital', 'Jasa Fotografi & Video', 'Jasa Catering & Masak',
            'Jasa Kebersihan', 'Jasa Transportasi & Antar Jemput', 'Jasa Les & Kursus Privat',
            'Jasa Kesehatan & Kecantikan', 'Jasa IT & Komputer', 'Jasa Hukum & Administrasi', 'Lainnya',
          ].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Tarif / Harga</label>
          <input value={extra.rate || ''} onChange={e => upd({ rate: e.target.value })}
            placeholder="Rp 50.000 / jam" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Pengalaman</label>
          <select value={extra.yearsExp || ''} onChange={e => upd({ yearsExp: e.target.value })} className={selectClass}>
            <option value="">Pilih</option>
            {['< 1 Tahun', '1-2 Tahun', '2-5 Tahun', '5-10 Tahun', '10+ Tahun'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Area Layanan</label>
        <input value={extra.workArea || ''} onChange={e => upd({ workArea: e.target.value })}
          placeholder="Contoh: Ternate Utara, Seluruh Kota Ternate" className={inputClass} />
      </div>
    </div>
  );

  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PasangIklan = () => {
  const navigate = useNavigate();
  const user = getAuth();
  const currentPkg = PACKAGES.find(p => p.key === (user?.packageKey || 'new'))!;
  const maxPhotos = currentPkg.maxPhotos === -1 ? 99 : currentPkg.maxPhotos;

  const [category, setCategory] = useState<ListingCategory>('produk');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.address || '');
  const [mapEmbedUrl, setMapEmbedUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [extra, setExtra] = useState<ExtraFields>({});

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Reset extra fields when category changes
  useEffect(() => {
    setExtra({});
  }, [category]);

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > maxPhotos) {
      toast.error(`Paket ${currentPkg.name} hanya mendukung maks. ${maxPhotos} foto. Upgrade paket untuk lebih banyak foto.`);
      return;
    }
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast.error('Setiap foto maksimal 5MB'); return; }
    }
    const b64s = await Promise.all(files.map(fileToBase64));
    setImages(prev => [...prev, ...b64s]);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('Video maksimal 50MB'); return; }
    const b64 = await fileToBase64(file);
    setVideoFile(b64);
    toast.success('Video berhasil diunggah');
  };

  // Build extra description from category-specific fields
  const buildExtraDescription = (): string => {
    const parts: string[] = [];
    if (extra.vehicleType) parts.push(`Jenis: ${extra.vehicleType}`);
    if (extra.vehicleBrand) parts.push(`Merek: ${extra.vehicleBrand}`);
    if (extra.vehicleYear) parts.push(`Tahun: ${extra.vehicleYear}`);
    if (extra.vehicleMileage) parts.push(`Kilometer: ${parseInt(extra.vehicleMileage).toLocaleString('id')} km`);
    if (extra.vehicleColor) parts.push(`Warna: ${extra.vehicleColor}`);
    if (extra.transmission) parts.push(`Transmisi: ${extra.transmission}`);
    if (extra.fuelType) parts.push(`Bahan Bakar: ${extra.fuelType}`);
    if (extra.platNumber) parts.push(`Plat: ${extra.platNumber}`);
    if (extra.condition && category === 'otomotif') parts.push(`Kondisi: ${extra.condition}`);
    if (extra.condition && category === 'produk') parts.push(`Kondisi: ${extra.condition}`);
    if (extra.brand) parts.push(`Merek: ${extra.brand}`);
    if (extra.stock) parts.push(`Stok: ${extra.stock}`);
    if (extra.canShip !== undefined) parts.push(`Pengiriman: ${extra.canShip ? 'Bisa Kirim' : 'COD Saja'}`);
    if (extra.propertyType) parts.push(`Tipe: ${extra.propertyType === 'dijual' ? 'Dijual' : 'Disewa'}`);
    if (extra.bedrooms) parts.push(`Kamar Tidur: ${extra.bedrooms}`);
    if (extra.bathrooms) parts.push(`Kamar Mandi: ${extra.bathrooms}`);
    if (extra.landSize) parts.push(`Luas Tanah: ${extra.landSize} m²`);
    if (extra.buildingSize) parts.push(`Luas Bangunan: ${extra.buildingSize} m²`);
    if (extra.certificate) parts.push(`Sertifikat: ${extra.certificate}`);
    if (extra.furnishing) parts.push(`Furnitur: ${extra.furnishing}`);
    if (extra.gender) parts.push(`Untuk: ${extra.gender}`);
    if (extra.availableRooms) parts.push(`Kamar Tersedia: ${extra.availableRooms}`);
    if (extra.kosFacilities?.length) parts.push(`Fasilitas: ${extra.kosFacilities.join(', ')}`);
    if (extra.stars) parts.push(`Bintang: ${'⭐'.repeat(parseInt(extra.stars))}`);
    if (extra.pricePerNight) parts.push(`Harga/Malam: ${extra.pricePerNight}`);
    if (extra.capacity) parts.push(`Kapasitas: ${extra.capacity} kamar`);
    if (extra.hotelFacilities?.length) parts.push(`Fasilitas: ${extra.hotelFacilities.join(', ')}`);
    if (extra.tourismType) parts.push(`Jenis: ${extra.tourismType}`);
    if (extra.ticketPrice) parts.push(`Tiket: ${extra.ticketPrice}`);
    if (extra.openHours) parts.push(`Jam Buka: ${extra.openHours}`);
    if (extra.tourismFacilities?.length) parts.push(`Fasilitas: ${extra.tourismFacilities.join(', ')}`);
    if (extra.priceRange) parts.push(`Range Harga: ${extra.priceRange}`);
    if (extra.cafeOpenHours) parts.push(`Jam Buka: ${extra.cafeOpenHours}`);
    if (extra.menuHighlight) parts.push(`Menu Unggulan: ${extra.menuHighlight}`);
    if (extra.cafeFacilities?.length) parts.push(`Fasilitas: ${extra.cafeFacilities.join(', ')}`);
    if (extra.company) parts.push(`Perusahaan: ${extra.company}`);
    if (extra.jobType) parts.push(`Tipe: ${extra.jobType}`);
    if (extra.salaryMin && extra.salaryMax) parts.push(`Gaji: Rp ${parseInt(extra.salaryMin).toLocaleString('id')} – Rp ${parseInt(extra.salaryMax).toLocaleString('id')}`);
    if (extra.education) parts.push(`Pendidikan: ${extra.education}`);
    if (extra.experience) parts.push(`Pengalaman: ${extra.experience}`);
    if (extra.deadline) parts.push(`Batas Lamaran: ${extra.deadline}`);
    if (extra.requirements) parts.push(`\nKualifikasi:\n${extra.requirements}`);
    if (extra.serviceType) parts.push(`Jenis Jasa: ${extra.serviceType}`);
    if (extra.rate) parts.push(`Tarif: ${extra.rate}`);
    if (extra.yearsExp) parts.push(`Pengalaman: ${extra.yearsExp}`);
    if (extra.workArea) parts.push(`Area Layanan: ${extra.workArea}`);
    return parts.join('\n');
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error('Judul iklan wajib diisi'); return; }
    if (!description.trim()) { toast.error('Deskripsi wajib diisi'); return; }
    if (!user) return;

    setLoading(true);
    const extraDesc = buildExtraDescription();
    const fullDescription = description.trim() + (extraDesc ? '\n\n─── Detail ───\n' + extraDesc : '');

    setTimeout(() => {
      const newListing = {
        id: generateId(),
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
        category,
        title: title.trim(),
        description: fullDescription,
        price: price.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        location: location.trim(),
        mapEmbedUrl: mapEmbedUrl.trim(),
        images,
        videoUrl: videoFile || videoUrl,
        condition: extra.condition || '',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      saveListing(newListing);
      postListingEvent(newListing); // notify admin in real-time
      toast.success('Iklan berhasil dikirim! Menunggu persetujuan admin.');
      navigate('/home');
      setLoading(false);
    }, 800);
  };

  const selectedCat = CATEGORIES.find(c => c.key === category)!;

  // Dynamic title placeholder per category
  const titlePlaceholders: Record<ListingCategory, string> = {
    produk: 'Contoh: Sepatu Nike Air Max Original Size 42',
    otomotif: 'Contoh: Toyota Avanza 2019 Manual Mulus',
    rumah: 'Contoh: Rumah 3 Kamar SHM di Ternate Tengah',
    kosan: 'Contoh: Kos Putri AC Dekat Kampus Unkhair',
    penginapan: 'Contoh: Villa Gamalama View Laut Ternate',
    wisata: 'Contoh: Pantai Sulamadaha – Keindahan Bawah Laut',
    kafe: 'Contoh: Kafe Cengkeh – Kopi Spesialti Ternate',
    lowongan: 'Contoh: Dicari Kasir Part-Time Minimarket',
    jasa: 'Contoh: Jasa Desain Logo & Brosur Profesional',
  };

  const pricePlaceholders: Record<ListingCategory, string> = {
    produk: 'Rp 150.000 / nego',
    otomotif: 'Rp 85.000.000 / nego',
    rumah: 'Rp 500 Juta / Rp 3 Juta per bulan',
    kosan: 'Rp 600.000 / bulan',
    penginapan: 'Mulai Rp 200.000 / malam',
    wisata: 'Rp 25.000 / orang',
    kafe: 'Rp 15.000 – Rp 80.000',
    lowongan: 'Rp 2.500.000 – Rp 4.000.000 / bulan',
    jasa: 'Rp 50.000 / jam / nego',
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(180deg, #e0f4ff 0%, #f8fcff 100%)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-500 px-4 pt-4 pb-5 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div>
          <h1 className="text-white font-bold text-lg">Pasang Iklan</h1>
          <p className="text-sky-100 text-xs">{selectedCat.emoji} {selectedCat.label}</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* ── STEP 1: Category ── */}
        <div className={sectionClass}>
          <label className={sectionTitleClass}>1. Pilih Kategori</label>
          <button
            onClick={() => setShowCatPicker(!showCatPicker)}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 ${selectedCat.bg}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedCat.emoji}</span>
              <span className={`font-bold text-base ${selectedCat.color}`}>{selectedCat.label}</span>
            </div>
            <ChevronDown size={18} className={`${selectedCat.color} transition-transform ${showCatPicker ? 'rotate-180' : ''}`} />
          </button>
          {showCatPicker && (
            <div className="grid grid-cols-4 gap-2 mt-1">
              {CATEGORIES.map(cat => (
                <button key={cat.key}
                  onClick={() => { setCategory(cat.key); setShowCatPicker(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                    category === cat.key ? `${cat.bg} border-current` : 'border-slate-100 bg-white hover:border-sky-200'
                  }`}>
                  <span className="text-xl">{cat.emoji}</span>
                  <span className={`text-[10px] font-bold text-center leading-tight ${category === cat.key ? cat.color : 'text-slate-600'}`}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── STEP 2: Category-specific fields ── */}
        <CategoryFields category={category} extra={extra} setExtra={setExtra} />

        {/* ── STEP 3: Basic Info ── */}
        <div className={sectionClass}>
          <label className={sectionTitleClass}>2. Informasi Iklan</label>
          <div>
            <label className={labelClass}>Judul Iklan *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={titlePlaceholders[category]}
              className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Deskripsi Lengkap *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Tuliskan detail lengkap iklan Anda..."
              rows={4} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className={labelClass}>Harga / Tarif</label>
            <input value={price} onChange={e => setPrice(e.target.value)}
              placeholder={pricePlaceholders[category]}
              className={inputClass} />
          </div>
        </div>

        {/* ── STEP 4: Media ── */}
        <div className={sectionClass}>
          <label className={sectionTitleClass}>3. Foto & Video</label>
          <div>
            <label className={labelClass}>
              Foto ({images.length}/{maxPhotos === 99 ? '∞' : maxPhotos})
              <span className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${currentPkg.badge}`}>
                {currentPkg.emoji} Paket {currentPkg.name}
              </span>
            </label>
            {maxPhotos === 1 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">
                <span className="text-sm">⚠️</span>
                <p className="text-xs text-amber-700 font-medium">
                  Paket New hanya 1 foto. <button type="button" onClick={() => navigate('/paket')} className="underline font-bold">Upgrade paket</button> untuk lebih banyak foto.
                </p>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-xl" />
                  <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                    <X size={11} className="text-white" />
                  </button>
                </div>
              ))}
              {images.length < maxPhotos && (
                <label className="aspect-square border-2 border-dashed border-sky-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddImage} />
                  <Camera size={20} className="text-sky-400 mb-0.5" />
                  <span className="text-sky-400 text-[10px] font-semibold">Tambah</span>
                </label>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>Video</label>
            {videoFile ? (
              <div className="relative">
                <video src={videoFile} controls className="w-full rounded-2xl max-h-44" />
                <button onClick={() => setVideoFile('')}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow">
                  <X size={13} className="text-white" />
                </button>
              </div>
            ) : (
              <label className="w-full border-2 border-dashed border-sky-200 rounded-2xl p-4 flex flex-col items-center gap-1.5 cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors">
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                <Video size={24} className="text-sky-400" />
                <span className="text-sm font-semibold text-sky-500">Upload Video</span>
                <span className="text-xs text-slate-400">MP4 / MOV — Maks. 50MB</span>
              </label>
            )}
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
              placeholder="Atau tempel link YouTube / TikTok..."
              className={`${inputClass} mt-2`} />
          </div>
        </div>

        {/* ── STEP 5: Contact ── */}
        <div className={sectionClass}>
          <label className={sectionTitleClass}>4. Kontak</label>
          <div>
            <label className={`${labelClass} flex items-center gap-1.5`}>
              <Phone size={14} className="text-sky-500" /> Nomor Telepon
            </label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="081234567890" className={inputClass} />
          </div>
          <div>
            <label className={`${labelClass} flex items-center gap-1.5`}>
              <MessageCircle size={14} className="text-green-500" /> Nomor WhatsApp
            </label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              placeholder="628123456789 (format internasional)" className={inputClass} />
          </div>
        </div>

        {/* ── STEP 6: Location ── */}
        <div className={sectionClass}>
          <label className={sectionTitleClass}>5. Lokasi</label>
          <div>
            <label className={`${labelClass} flex items-center gap-1.5`}>
              <MapPin size={14} className="text-sky-500" /> Alamat / Lokasi
            </label>
            <textarea value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Contoh: Jl. Ahmad Yani No. 12, Ternate Tengah" rows={2}
              className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className={labelClass}>Google Maps Embed URL <span className="text-slate-400 font-normal">(opsional)</span></label>
            <input value={mapEmbedUrl} onChange={e => setMapEmbedUrl(e.target.value)}
              placeholder="https://www.google.com/maps/embed?..." className={inputClass} />
            <p className="text-[11px] text-slate-400 mt-1">
              Google Maps → Bagikan → Sematkan Peta → Salin src URL
            </p>
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-4 rounded-3xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-base shadow-lg shadow-sky-200 flex items-center justify-center gap-2 disabled:opacity-60 hover:shadow-xl transition-all active:scale-95">
          {loading
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><Plus size={20} /> Kirim Iklan</>
          }
        </button>
        <p className="text-center text-xs text-slate-400 pb-2">Iklan akan ditinjau admin sebelum ditampilkan</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default PasangIklan;
