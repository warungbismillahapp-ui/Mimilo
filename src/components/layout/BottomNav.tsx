import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, User } from 'lucide-react';

const tabs = [
  { label: 'Beranda', icon: Home, path: '/home' },
  { label: 'Cari Iklan', icon: Search, path: '/cari-iklan' },
  { label: 'Pasang Iklan', icon: PlusCircle, path: '/pasang-iklan' },
  { label: 'Akun', icon: User, path: '/akun' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-2xl">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ label, icon: Icon, path }) => {
          const active = pathname === path;
          const isPrimary = path === '/pasang-iklan';
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex-1 flex flex-col items-center pt-2 pb-3 transition-all relative ${
                isPrimary ? '' : active ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isPrimary ? (
                <div className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-300 border-4 border-white">
                  <Icon size={22} className="text-white" />
                </div>
              ) : (
                <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${active ? 'bg-sky-100' : ''}`}>
                  <Icon size={20} />
                </div>
              )}
              <span className={`text-[10px] font-semibold mt-0.5 ${isPrimary ? 'text-sky-600 mt-1' : ''}`}>
                {label}
              </span>
              {active && !isPrimary && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
