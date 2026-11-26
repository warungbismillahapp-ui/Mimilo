export type PackageKey = 'new' | 'pemula' | 'standar' | 'pro' | 'gold' | 'toko';

export interface PackageConfig {
  key: PackageKey;
  name: string;
  price: number;
  maxPhotos: number;   // -1 = unlimited
  color: string;
  bg: string;
  border: string;
  badge: string;
  emoji: string;
}

export const PACKAGES: PackageConfig[] = [
  { key: 'new',     name: 'New',          price: 0,      maxPhotos: 1,   color: 'text-slate-600',  bg: 'bg-slate-50',   border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600',   emoji: '🆓' },
  { key: 'pemula',  name: 'Pemula',       price: 1000,   maxPhotos: 3,   color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200', badge: 'bg-green-100 text-green-700',   emoji: '🌱' },
  { key: 'standar', name: 'Standar',      price: 5000,   maxPhotos: 10,  color: 'text-sky-700',    bg: 'bg-sky-50',     border: 'border-sky-200',   badge: 'bg-sky-100 text-sky-700',       emoji: '⭐' },
  { key: 'pro',     name: 'Pro',          price: 10000,  maxPhotos: 25,  color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700',     emoji: '🚀' },
  { key: 'gold',    name: 'Gold',         price: 50000,  maxPhotos: 100, color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700',   emoji: '🏅' },
  { key: 'toko',    name: 'Toko Online',  price: 100000, maxPhotos: -1,  color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-300',badge: 'bg-purple-100 text-purple-700', emoji: '🏪' },
];

export interface User {
  id: string;
  phone: string;
  name: string;
  address: string;
  photo: string;
  createdAt: string;
  packageKey?: PackageKey;
  packageActivatedAt?: string;
  balance?: number;
}

export interface PaymentRecord {
  id: string;
  type?: 'package' | 'topup';
  userId: string;
  userName: string;
  userPhone: string;
  packageKey?: PackageKey;
  packageName?: string;
  amount: number;
  proofImage: string;
  paymentMethod: 'mandiri' | 'ovo';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  confirmedAt?: string;
  adminNote?: string;
}

export type ListingCategory =
  | 'produk'
  | 'otomotif'
  | 'rumah'
  | 'kosan'
  | 'penginapan'
  | 'wisata'
  | 'kafe'
  | 'lowongan'
  | 'jasa';

export interface Listing {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  category: ListingCategory;
  title: string;
  description: string;
  price: string;
  phone: string;
  whatsapp: string;
  location: string;
  mapEmbedUrl: string;
  images: string[];
  videoUrl: string;
  condition?: string;
  status: 'pending' | 'active' | 'closed';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  listingId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface HomeContent {
  welcomeText: string;
  bannerText: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  sliderImages: string[];
  sections: HomeSection[];
  contactPhone: string;
  contactAddress: string;
  mapEmbedUrl: string;
}

export interface HomeSection {
  id: string;
  type: 'text' | 'image' | 'phone' | 'map' | 'slider';
  title: string;
  content: string;
  imageUrl?: string;
}
