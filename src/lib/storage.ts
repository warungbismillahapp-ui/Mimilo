import type { User, Listing, ChatMessage, HomeContent, PaymentRecord } from '@/types';

const KEYS = {
  PAYMENTS: 'mimilo_payments',
  USER: 'mimilo_user',
  LISTINGS: 'mimilo_listings',
  HOME_CONTENT: 'mimilo_home_content',
  AUTH: 'mimilo_auth',
  CHATS: 'mimilo_chats',
};

// Auth
export const getAuth = (): User | null => {
  const d = localStorage.getItem(KEYS.AUTH);
  return d ? JSON.parse(d) : null;
};
export const setAuth = (user: User): void => {
  localStorage.setItem(KEYS.AUTH, JSON.stringify(user));
};
export const clearAuth = (): void => {
  localStorage.removeItem(KEYS.AUTH);
};

// Users
export const getUsers = (): User[] => {
  const d = localStorage.getItem(KEYS.USER);
  return d ? JSON.parse(d) : [];
};
export const saveUser = (user: User): void => {
  const users = getUsers();
  const idx = users.findIndex(u => u.phone === user.phone);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  localStorage.setItem(KEYS.USER, JSON.stringify(users));
};
export const getUserByPhone = (phone: string): User | null => {
  return getUsers().find(u => u.phone === phone) || null;
};

// Listings
export const getListings = (): Listing[] => {
  const d = localStorage.getItem(KEYS.LISTINGS);
  return d ? JSON.parse(d) : [];
};
export const saveListing = (listing: Listing): void => {
  const listings = getListings();
  const idx = listings.findIndex(l => l.id === listing.id);
  if (idx >= 0) listings[idx] = listing;
  else listings.push(listing);
  localStorage.setItem(KEYS.LISTINGS, JSON.stringify(listings));
};
export const deleteListing = (id: string): void => {
  const listings = getListings().filter(l => l.id !== id);
  localStorage.setItem(KEYS.LISTINGS, JSON.stringify(listings));
};
export const getListingById = (id: string): Listing | null => {
  return getListings().find(l => l.id === id) || null;
};

// Chat Messages
export const getMessages = (listingId: string): ChatMessage[] => {
  const d = localStorage.getItem(KEYS.CHATS);
  const all: ChatMessage[] = d ? JSON.parse(d) : [];
  return all.filter(m => m.listingId === listingId);
};
export const saveMessage = (msg: ChatMessage): void => {
  const d = localStorage.getItem(KEYS.CHATS);
  const all: ChatMessage[] = d ? JSON.parse(d) : [];
  all.push(msg);
  localStorage.setItem(KEYS.CHATS, JSON.stringify(all));
};

// Home Content
export const getHomeContent = (): HomeContent => {
  const d = localStorage.getItem(KEYS.HOME_CONTENT);
  if (d) return JSON.parse(d);
  return {
    welcomeText: 'Temukan semua yang Anda butuhkan di MIMILO!',
    bannerText: '🌟 MIMILO — Pasang & Temukan Iklan Terbaik di Sini! 🌟',
    heroTitle: 'MIMILO Marketplace',
    heroSubtitle: 'Produk, Properti, Wisata & Kuliner Terbaik',
    heroImage: '',
    sliderImages: [],
    sections: [],
    contactPhone: '',
    contactAddress: '',
    mapEmbedUrl: '',
  };
};
export const saveHomeContent = (content: HomeContent): void => {
  localStorage.setItem(KEYS.HOME_CONTENT, JSON.stringify(content));
};

// Payments
export const getPayments = (): PaymentRecord[] => {
  const d = localStorage.getItem(KEYS.PAYMENTS);
  return d ? JSON.parse(d) : [];
};
export const savePayment = (payment: PaymentRecord): void => {
  const payments = getPayments();
  const idx = payments.findIndex(p => p.id === payment.id);
  if (idx >= 0) payments[idx] = payment;
  else payments.push(payment);
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
};
export const getPaymentsByUser = (userId: string): PaymentRecord[] =>
  getPayments().filter(p => p.userId === userId);
export const getPendingPayments = (): PaymentRecord[] =>
  getPayments().filter(p => p.status === 'pending');
export const updatePaymentStatus = (
  id: string,
  status: PaymentRecord['status'],
  adminNote?: string
): PaymentRecord | null => {
  const payments = getPayments();
  const idx = payments.findIndex(p => p.id === id);
  if (idx < 0) return null;
  payments[idx] = {
    ...payments[idx],
    status,
    confirmedAt: new Date().toISOString(),
    adminNote,
  };
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
  return payments[idx];
};

/** Add balance to a user's account (called when admin approves a top-up) */
export const addBalance = (userId: string, amount: number): User | null => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return null;
  const updated: User = { ...users[idx], balance: (users[idx].balance || 0) + amount };
  users[idx] = updated;
  localStorage.setItem(KEYS.USER, JSON.stringify(users));
  // Also update auth session if this is the currently logged-in user
  const authUser = getAuth();
  if (authUser && authUser.id === userId) {
    setAuth(updated);
  }
  return updated;
};

// ── Cross-tab Notification Event Keys ──────────────────────────────────
export const NOTIFY_CHAT_KEY       = 'mimilo_notify_chat';
export const NOTIFY_LISTING_KEY    = 'mimilo_notify_listing';
export const NOTIFY_PAYMENT_KEY    = 'mimilo_notify_payment';

export interface PaymentEvent {
  paymentId:    string;
  userId:       string;
  userName:     string;
  type?:        'package' | 'topup';
  packageName?: string;
  amount:       number;
  status:       'pending' | 'approved' | 'rejected';
  timestamp:    string;
}

export interface ChatEvent {
  messageId:    string;
  senderId:     string;
  senderName:   string;
  message:      string;
  listingId:    string;
  listingTitle: string;
  timestamp:    string;
}

export interface ListingEvent {
  listingId:    string;
  listingTitle: string;
  userName:     string;
  category:     string;
  timestamp:    string;
}

/** Save a chat message AND broadcast a cross-tab notification event */
export const saveMessageWithEvent = (msg: ChatMessage, listingTitle: string): void => {
  const d = localStorage.getItem(KEYS.CHATS);
  const all: ChatMessage[] = d ? JSON.parse(d) : [];
  all.push(msg);
  localStorage.setItem(KEYS.CHATS, JSON.stringify(all));
  const event: ChatEvent = {
    messageId:    msg.id,
    senderId:     msg.senderId,
    senderName:   msg.senderName,
    message:      msg.message,
    listingId:    msg.listingId,
    listingTitle,
    timestamp:    new Date().toISOString(),
  };
  localStorage.setItem(NOTIFY_CHAT_KEY, JSON.stringify(event));
};

/** Broadcast a payment event (new submission or admin confirmation) */
export const postPaymentEvent = (payment: PaymentRecord): void => {
  const event: PaymentEvent = {
    paymentId:    payment.id,
    userId:       payment.userId,
    userName:     payment.userName,
    type:         payment.type,
    packageName:  payment.packageName,
    amount:       payment.amount,
    status:       payment.status,
    timestamp:    new Date().toISOString(),
  };
  localStorage.setItem(NOTIFY_PAYMENT_KEY, JSON.stringify(event));
};

/** Broadcast a new-listing event so admin tab is notified in real time */
export const postListingEvent = (listing: Listing): void => {
  const event: ListingEvent = {
    listingId:    listing.id,
    listingTitle: listing.title,
    userName:     listing.userName,
    category:     listing.category,
    timestamp:    new Date().toISOString(),
  };
  localStorage.setItem(NOTIFY_LISTING_KEY, JSON.stringify(event));
};

// Utility
export const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
