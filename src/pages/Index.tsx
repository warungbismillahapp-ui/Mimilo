import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from '@/lib/storage';
import splashLogo from '@/assets/splash-logo.png';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = getAuth();
      if (user) {
        navigate('/welcome');
      } else {
        navigate('/login');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #e0f4ff 0%, #bae6fd 40%, #93c5fd 100%)' }}
    >
      {/* Background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-sky-300/30" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-blue-300/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/10" />
      </div>

      {/* Pulse rings */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-40 h-40 rounded-full border-4 border-sky-400/30 animate-pulse-ring" />
        <div className="absolute w-40 h-40 rounded-full border-4 border-sky-400/20 animate-pulse-ring" style={{ animationDelay: '0.8s' }} />
        <div className="w-36 h-36 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80 bg-white flex items-center justify-center">
          <img src={splashLogo} alt="MIMILO Logo" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Brand */}
      <h1 className="text-5xl font-extrabold text-sky-700 tracking-widest drop-shadow-sm animate-fade-in-up">
        MIMILO
      </h1>
      <p className="mt-3 text-sky-600 font-medium text-base text-center px-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        Aplikasi Lengkap Untuk Semua Orang
      </p>

      {/* Loading dots */}
      <div className="mt-12 flex gap-2">
        {[0, 0.2, 0.4].map((delay, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-bounce"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>

      <p className="absolute bottom-8 text-sky-500/70 text-xs font-medium">
        v1.0.0 &copy; 2024 MIMILO
      </p>
    </div>
  );
};

export default Index;
