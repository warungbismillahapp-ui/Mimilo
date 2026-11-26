import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #e0f4ff 0%, #bae6fd 100%)' }}
    >
      <div className="text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg mx-auto mb-6">
          <span className="text-white font-extrabold text-3xl">M</span>
        </div>
        <h1 className="text-6xl font-extrabold text-sky-700 mb-2">404</h1>
        <p className="text-slate-600 text-lg font-medium mb-6">Halaman tidak ditemukan</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold shadow-md hover:shadow-lg transition-all"
        >
          <Home size={18} /> Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};

export default NotFound;
