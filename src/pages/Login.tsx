import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, User, MapPin, ShieldCheck } from 'lucide-react';
import splashLogo from '@/assets/splash-logo.png';
import { getUserByPhone, saveUser, setAuth, generateId } from '@/lib/storage';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      toast.error('Nomor telepon tidak valid');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const existing = getUserByPhone(cleaned);
      if (existing) {
        setAuth(existing);
        toast.success(`Selamat datang kembali, ${existing.name}!`);
        navigate('/welcome');
      } else {
        setStep('register');
      }
      setLoading(false);
    }, 800);
  };

  const handleRegister = () => {
    if (!name.trim()) { toast.error('Nama tidak boleh kosong'); return; }
    if (!address.trim()) { toast.error('Alamat tidak boleh kosong'); return; }
    setLoading(true);
    setTimeout(() => {
      const cleaned = phone.replace(/\D/g, '');
      const user = {
        id: generateId(),
        phone: cleaned,
        name: name.trim(),
        address: address.trim(),
        photo: '',
        createdAt: new Date().toISOString(),
      };
      saveUser(user);
      setAuth(user);
      toast.success('Akun berhasil dibuat!');
      navigate('/welcome');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #e0f4ff 0%, #bae6fd 50%, #93c5fd 100%)' }}
    >
      {/* Top visual */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12">
        <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-xl mb-4 border-4 border-white/60">
          <img src={splashLogo} alt="MIMILO Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-3xl font-extrabold text-sky-800 tracking-wide">MIMILO</h1>
        <p className="text-sky-600 text-sm mt-1 font-medium">Aplikasi Lengkap Untuk Semua Orang</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10 max-w-lg w-full mx-auto">
        {step === 'phone' ? (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Masuk / Daftar</h2>
            <p className="text-slate-500 text-sm mb-6">Masukkan nomor telepon Anda untuk melanjutkan</p>

            <label className="block text-sm font-semibold text-slate-600 mb-2">Nomor Telepon</label>
            <div className="flex items-center border-2 border-sky-200 rounded-xl overflow-hidden focus-within:border-sky-500 transition-colors bg-sky-50">
              <div className="flex items-center gap-1 px-3 py-3 bg-sky-100 border-r border-sky-200">
                <Phone size={16} className="text-sky-500" />
                <span className="text-sky-700 font-semibold text-sm">+62</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="81234567890"
                className="flex-1 px-3 py-3 bg-transparent text-slate-800 font-medium text-base outline-none"
                onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Contoh: 08123456789 atau 81234567890</p>

            <button
              onClick={handlePhoneSubmit}
              disabled={loading}
              className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold text-base shadow-md hover:shadow-lg hover:from-sky-600 hover:to-blue-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Lanjutkan <ArrowRight size={18} /></>
              )}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Lengkapi Profil</h2>
            <p className="text-slate-500 text-sm mb-6">Nomor baru — isi data untuk mendaftar</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Nama Lengkap</label>
                <div className="flex items-center border-2 border-sky-200 rounded-xl overflow-hidden focus-within:border-sky-500 transition-colors bg-sky-50">
                  <div className="px-3 py-3 bg-sky-100 border-r border-sky-200">
                    <User size={16} className="text-sky-500" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nama Anda"
                    className="flex-1 px-3 py-3 bg-transparent text-slate-800 font-medium text-base outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Alamat</label>
                <div className="flex items-start border-2 border-sky-200 rounded-xl overflow-hidden focus-within:border-sky-500 transition-colors bg-sky-50">
                  <div className="px-3 py-3 bg-sky-100 border-r border-sky-200">
                    <MapPin size={16} className="text-sky-500" />
                  </div>
                  <textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Alamat lengkap Anda"
                    rows={2}
                    className="flex-1 px-3 py-3 bg-transparent text-slate-800 font-medium text-sm outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold text-base shadow-md hover:shadow-lg hover:from-sky-600 hover:to-blue-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Daftar & Masuk <ArrowRight size={18} /></>
              )}
            </button>

            <button onClick={() => setStep('phone')} className="mt-3 w-full text-center text-sm text-sky-500 font-medium hover:text-sky-700">
              ← Kembali
            </button>
          </>
        )}

        {/* Admin link */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button
            onClick={() => navigate('/admin-mimilo')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-semibold hover:border-sky-300 hover:text-sky-500 hover:bg-sky-50 transition-all duration-200"
          >
            <ShieldCheck size={14} />
            Masuk sebagai Admin
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
