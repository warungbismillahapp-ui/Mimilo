import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAuth, setAuth, saveUser, savePayment, getPaymentsByUser,
  fileToBase64, generateId, postPaymentEvent,
} from '@/lib/storage';
import { triggerNotification } from '@/lib/notifications';
import type { User, PaymentRecord } from '@/types';
import { PACKAGES } from '@/types';
import type { PackageKey } from '@/types';
import BottomNav from '@/components/layout/BottomNav';
import {
  ArrowLeft, Upload, CheckCircle, Clock, XCircle,
  Copy, CreditCard, Smartphone, X, Info,
} from 'lucide-react';
import { toast } from 'sonner';

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
};

const formatRp = (n: number) =>
  n === 0 ? 'GRATIS' : 'Rp ' + n.toLocaleString('id-ID');

export default function PaketIklan() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(getAuth());
  const [myPayments, setMyPayments] = useState<PaymentRecord[]>([]);

  // Modal state
  const [selectedPkg, setSelectedPkg] = useState<PackageKey | null>(null);
  const [payMethod, setPayMethod] = useState<'mandiri' | 'ovo'>('mandiri');
  const [proofImage, setProofImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setMyPayments(getPaymentsByUser(user.id));
  }, [user, navigate]);

  const currentPkg = PACKAGES.find(p => p.key === (user?.packageKey || 'new'))!;
  const selectedPkgData = selectedPkg ? PACKAGES.find(p => p.key === selectedPkg)! : null;

  const openModal = (key: PackageKey) => {
    if (key === 'new') {
      toast.info('Paket New sudah aktif secara default — tidak perlu pembayaran!');
      return;
    }
    // Check if user already paid for a higher/equal package
    const approved = myPayments.filter(p => p.status === 'approved');
    if (approved.some(p => p.packageKey === key)) {
      toast.info('Anda sudah memiliki paket ini!');
      return;
    }
    const pending = myPayments.filter(p => p.status === 'pending' && (!p.type || p.type === 'package'));
    if (pending.length > 0) {
      toast.warning('Ada pembayaran paket yang masih menunggu konfirmasi admin.');
      return;
    }
    setSelectedPkg(key);
    setProofImage('');
    setSubmitted(false);
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
    toast.success('Bukti pembayaran berhasil diunggah');
  };

  const handleSubmit = () => {
    if (!user || !selectedPkgData) return;
    if (!proofImage) { toast.error('Unggah bukti pembayaran terlebih dahulu'); return; }

    const payment: PaymentRecord = {
      id:            generateId(),
      userId:        user.id,
      userName:      user.name,
      userPhone:     user.phone,
      packageKey:    selectedPkgData.key,
      packageName:   selectedPkgData.name,
      amount:        selectedPkgData.price,
      proofImage,
      paymentMethod: payMethod,
      status:        'pending',
      createdAt:     new Date().toISOString(),
    };

    savePayment(payment);
    postPaymentEvent(payment); // notify admin
    triggerNotification('listing');
    const updated = getPaymentsByUser(user.id);
    setMyPayments(updated);
    setSubmitted(true);
    toast.success('Pembayaran berhasil dikirim! Menunggu konfirmasi admin.', { duration: 5000 });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} disalin!`));
  };

  const getStatusPayment = (payments: PaymentRecord[]): PaymentRecord | null => {
    const sorted = [...payments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted[0] || null;
  };

  const latestPayment = getStatusPayment(myPayments);

  if (!user) return null;

  return (
    <div className="min-h-screen pb-28" style={{ background: 'linear-gradient(180deg, #e0f4ff 0%, #f8fcff 100%)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-4 pt-4 pb-5 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Paket Iklan</h1>
            <p className="text-sky-100 text-xs">Berlaku selamanya · Sekali bayar</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* ── Paket Aktif Card ── */}
        <div className={`rounded-3xl p-4 border-2 ${currentPkg.border} ${currentPkg.bg} shadow-sm`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Paket Aktif Saya</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">{currentPkg.emoji}</span>
                <div>
                  <h3 className={`font-extrabold text-lg ${currentPkg.color}`}>{currentPkg.name}</h3>
                  <p className="text-slate-500 text-xs">
                    {currentPkg.maxPhotos === -1 ? 'Foto tak terbatas' : `Maks. ${currentPkg.maxPhotos} foto per iklan`}
                  </p>
                </div>
              </div>
            </div>
            {user.packageActivatedAt && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Aktif sejak</p>
                <p className="text-xs font-semibold text-slate-600">
                  {new Date(user.packageActivatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Latest Payment Status ── */}
        {latestPayment && (
          <div className={`rounded-2xl p-4 border-2 flex items-center gap-3 ${
            latestPayment.status === 'pending'  ? 'bg-amber-50 border-amber-200' :
            latestPayment.status === 'approved' ? 'bg-green-50 border-green-200' :
                                                   'bg-red-50 border-red-200'
          }`}>
            {latestPayment.status === 'pending'  && <Clock size={22} className="text-amber-500 flex-shrink-0" />}
            {latestPayment.status === 'approved' && <CheckCircle size={22} className="text-green-500 flex-shrink-0" />}
            {latestPayment.status === 'rejected' && <XCircle size={22} className="text-red-500 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${
                latestPayment.status === 'pending'  ? 'text-amber-700' :
                latestPayment.status === 'approved' ? 'text-green-700' :
                                                       'text-red-700'
              }`}>
                {latestPayment.status === 'pending'  && 'Menunggu Konfirmasi Admin'}
                {latestPayment.status === 'approved' && 'Pembayaran Dikonfirmasi ✅'}
                {latestPayment.status === 'rejected' && 'Pembayaran Ditolak ❌'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Paket {latestPayment.packageName} · {formatRp(latestPayment.amount)}
              </p>
              {latestPayment.adminNote && (
                <p className="text-xs text-slate-400 mt-0.5 italic">"{latestPayment.adminNote}"</p>
              )}
            </div>
          </div>
        )}

        {/* ── Info banner ── */}
        <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-3 flex items-start gap-2">
          <Info size={15} className="text-sky-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-700 font-medium leading-relaxed">
            Paket berlaku <strong>selamanya</strong> — cukup bayar sekali dan nikmati kuota foto tanpa batas waktu!
          </p>
        </div>

        {/* ── Package Cards ── */}
        <h2 className="font-bold text-slate-700 text-sm">Pilih Paket</h2>

        {PACKAGES.map(pkg => {
          const isActive  = user?.packageKey === pkg.key || (!user?.packageKey && pkg.key === 'new');
          const isPending = myPayments.some(p => p.packageKey === pkg.key && p.status === 'pending');
          const isDone    = myPayments.some(p => p.packageKey === pkg.key && p.status === 'approved');

          return (
            <div key={pkg.key}
              className={`rounded-3xl border-2 overflow-hidden shadow-sm transition-all ${
                isActive ? `${pkg.border} ${pkg.bg} ring-2 ring-offset-1` :
                  `border-slate-100 bg-white hover:border-sky-200`
              } ${isActive ? `ring-${pkg.border.replace('border-','')}` : ''}`}
              style={isActive ? { boxShadow: '0 0 0 2px rgba(14,165,233,0.3)' } : {}}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${pkg.bg} border ${pkg.border}`}>
                      {pkg.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-extrabold text-base ${pkg.color}`}>{pkg.name}</h3>
                        {isActive && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.badge}`}>AKTIF</span>
                        )}
                        {isPending && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">PENDING</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {pkg.maxPhotos === -1
                          ? '🖼️ Foto tak terbatas'
                          : `🖼️ Maks. ${pkg.maxPhotos} foto per iklan`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold text-xl ${pkg.key === 'new' ? 'text-green-600' : 'text-slate-800'}`}>
                      {formatRp(pkg.price)}
                    </p>
                    <p className="text-[10px] text-slate-400">sekali bayar</p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className={`border-t ${pkg.border} px-4 py-3`}>
                {isActive ? (
                  <div className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold ${pkg.color}`}>
                    <CheckCircle size={13} /> Paket Anda Saat Ini
                  </div>
                ) : isDone ? (
                  <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-green-600">
                    <CheckCircle size={13} /> Sudah Dikonfirmasi
                  </div>
                ) : isPending ? (
                  <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-amber-600">
                    <Clock size={13} /> Menunggu Konfirmasi
                  </div>
                ) : (
                  <button
                    onClick={() => openModal(pkg.key)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      pkg.key === 'new'
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : `${pkg.bg} ${pkg.color} border ${pkg.border} hover:opacity-80 active:scale-95`
                    }`}
                  >
                    {pkg.key === 'new' ? 'Paket Default' : `Pilih Paket ${pkg.name} →`}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* ── History ── */}
        {myPayments.length > 0 && (
          <div>
            <h2 className="font-bold text-slate-700 text-sm mb-2">Riwayat Pembayaran</h2>
            <div className="space-y-2">
              {[...myPayments].reverse().map(payment => (
                <div key={payment.id} className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-50 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    payment.status === 'pending'  ? 'bg-amber-100' :
                    payment.status === 'approved' ? 'bg-green-100' :
                                                     'bg-red-100'
                  }`}>
                    {payment.status === 'pending'  && <Clock size={18} className="text-amber-600" />}
                    {payment.status === 'approved' && <CheckCircle size={18} className="text-green-600" />}
                    {payment.status === 'rejected' && <XCircle size={18} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">Paket {payment.packageName}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {formatRp(payment.amount)} · {payment.paymentMethod === 'mandiri' ? '🏦 Mandiri' : '📱 OVO'}
                    </p>
                    <p className="text-slate-300 text-[10px]">
                      {new Date(payment.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    payment.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                    payment.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                     'bg-red-100 text-red-600'
                  }`}>
                    {payment.status === 'pending' ? 'Pending' : payment.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────── */}
      {/*  Payment Modal                                */}
      {/* ────────────────────────────────────────────── */}
      {selectedPkg && selectedPkgData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end"
          onClick={() => !submitted && setSelectedPkg(null)}>
          <div className="bg-white rounded-t-3xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {selectedPkgData.emoji} Paket {selectedPkgData.name}
                </h3>
                <p className={`font-extrabold text-xl ${selectedPkgData.color}`}>
                  {formatRp(selectedPkgData.price)}
                </p>
              </div>
              {!submitted && (
                <button onClick={() => setSelectedPkg(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <X size={16} className="text-slate-500" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {submitted ? (
                /* Success State */
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={40} className="text-green-500" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-xl">Pembayaran Dikirim!</h3>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    Bukti pembayaran Anda sudah diterima.<br />
                    Admin akan segera memverifikasi dan mengaktifkan paket Anda.
                  </p>
                  <p className="text-slate-400 text-xs mt-3">
                    Notifikasi akan dikirim setelah konfirmasi
                  </p>
                  <button onClick={() => setSelectedPkg(null)}
                    className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md">
                    Kembali ke Paket
                  </button>
                </div>
              ) : (
                <>
                  {/* Step 1: Choose method */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">1. Pilih Metode Pembayaran</h4>
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

                  {/* Step 2: Transfer Details */}
                  <div className={`rounded-2xl border-2 ${BANK_INFO[payMethod].border} ${BANK_INFO[payMethod].bg} p-4`}>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      2. Detail Transfer {BANK_INFO[payMethod].name}
                    </h4>

                    {/* Account Number */}
                    <div className="space-y-2">
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
                          onClick={() => copyToClipboard(BANK_INFO[payMethod].account,
                            payMethod === 'mandiri' ? 'No. Rekening' : 'No. OVO')}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${BANK_INFO[payMethod].bg} border ${BANK_INFO[payMethod].border} hover:opacity-80 transition-opacity`}>
                          <Copy size={15} className={BANK_INFO[payMethod].color} />
                        </button>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium mb-0.5">Jumlah Transfer</p>
                          <p className={`font-extrabold text-xl ${selectedPkgData.color}`}>
                            {formatRp(selectedPkgData.price)}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(String(selectedPkgData.price), 'Jumlah')}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPkgData.bg} border ${selectedPkgData.border} hover:opacity-80 transition-opacity`}>
                          <Copy size={15} className={selectedPkgData.color} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Upload Proof */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      3. Upload Bukti Pembayaran
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
                      <label className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${uploading ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:border-sky-400 hover:bg-sky-50'}`}>
                        <input type="file" accept="image/*" className="hidden" onChange={handleProofUpload} />
                        {uploading ? (
                          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload size={28} className="text-sky-400" />
                        )}
                        <p className="text-sm font-semibold text-sky-600">
                          {uploading ? 'Mengupload...' : 'Ketuk untuk upload screenshot'}
                        </p>
                        <p className="text-xs text-slate-400">JPG / PNG — Maks. 5MB</p>
                      </label>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!proofImage || uploading}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-base shadow-lg shadow-sky-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all active:scale-95">
                    <CreditCard size={20} /> Kirim Pembayaran
                  </button>

                  <p className="text-center text-xs text-slate-400 pb-1">
                    Pembayaran akan dikonfirmasi oleh admin dalam 1×24 jam
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
}
