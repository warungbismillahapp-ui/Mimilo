import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Welcome from '@/pages/Welcome';
import Home from '@/pages/Home';
import PasangIklan from '@/pages/BuatKerja';
import CariIklan from '@/pages/CariKerja';
import DetailIklan from '@/pages/DetailIklan';
import Akun from '@/pages/Akun';
import Paket from '@/pages/Paket';
import Admin from '@/pages/Admin';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/home" element={<Home />} />
        <Route path="/pasang-iklan" element={<PasangIklan />} />
        <Route path="/cari-iklan" element={<CariIklan />} />
        <Route path="/iklan/:id" element={<DetailIklan />} />
        <Route path="/akun" element={<Akun />} />
        <Route path="/paket" element={<Paket />} />
        <Route path="/admin-mimilo" element={<Admin />} />
        {/* Legacy routes */}
        <Route path="/buat-kerja" element={<PasangIklan />} />
        <Route path="/cari-kerja" element={<CariIklan />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
