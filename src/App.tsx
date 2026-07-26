import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin'; 
import Booking from './pages/Booking';
import Settings from './pages/Settings';
import Member from './pages/Member';
import Download from './pages/Download';


// Komponen Utama Halaman Depan
function HomeContent() {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('Nomor berhasil disalin!');

  useEffect(() => {
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    function showToast(message: string) {
      setToastMsg(message);
      setToastVisible(true);
      
      if (toastTimer) clearTimeout(toastTimer);
      
      toastTimer = setTimeout(() => {
        setToastVisible(false);
      }, 2500);
    }

    async function copyToClipboard(text: string, provider: string) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          showToast(`${provider} (${text}) berhasil disalin!`);
        } else {
          showToast(`Salin manual: ${text}`);
        }
      } catch {
        showToast(`${provider}: ${text}`);
      }
    }

    const copyButtons = document.querySelectorAll('.btn-copy-payment');
    
    const handleClick = (e: Event) => {
      const button = e.currentTarget as HTMLElement;
      const number = button.getAttribute('data-copy');
      const provider = button.getAttribute('data-provider');
      
      if (number && provider) {
        copyToClipboard(number, provider);
      }
    };

    copyButtons.forEach(button => {
      button.addEventListener('click', handleClick);
    });

    return () => {
      copyButtons.forEach(button => {
        button.removeEventListener('click', handleClick);
      });
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 font-sans antialiased flex flex-col justify-between custom-scrollbar">
      {/* NAVBAR TOP */}
      <header className="h-14 sm:h-16 bg-white border-b-2 border-emerald-500 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-emerald-700 text-white p-1.5 sm:p-2 rounded-xl shadow-md border-2 border-emerald-800">
            <i className="fa-solid fa-calendar-days text-sm sm:text-lg" aria-hidden="true"></i>
          </div>
          <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-wide flex items-center gap-1">
            Go<span className="text-emerald-700">Jadwal</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-extrabold text-emerald-950 bg-emerald-100 border-2 border-emerald-400 rounded-xl hover:bg-emerald-200 shadow-sm transition">
            Masuk
          </Link>
          <Link to="/register" className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-black bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md transition active:scale-95">
            Daftar
          </Link>
        </div>
      </header>

      {/* MAIN HERO & CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-8 flex flex-col justify-center items-center">
        
        {/* HERO BANNER */}
        <div className="w-full bg-emerald-800 border-2 border-emerald-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 relative overflow-hidden">
          <div className="space-y-2 sm:space-y-4 z-10 text-center lg:text-left flex-1">
            <span className="inline-block px-2.5 py-0.5 sm:px-3.5 sm:py-1 bg-emerald-900/80 text-emerald-200 text-[10px] sm:text-xs font-black rounded-full border border-emerald-500 uppercase tracking-wider">
              Sistem Booking Praktis
            </span>
            <h1 className="text-xl sm:text-4xl lg:text-5xl font-black text-white leading-snug sm:leading-tight">
              Atur Jadwal & Temu Janji Tanpa Bentrok!
            </h1>
            <p className="text-emerald-100 text-xs sm:text-base max-w-2xl font-medium leading-relaxed">
              Bagikan kalender publik kamu. Klien bisa langsung memilih slot waktu kosong tanpa perlu konfirmasi berulang kali.
            </p>
            <div className="pt-1 sm:pt-2 flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start">
              <Link to="/register" className="px-4 py-2 sm:px-6 sm:py-3 bg-white hover:bg-emerald-50 text-emerald-950 text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl shadow-lg border-2 border-emerald-300 transition flex items-center gap-2 active:scale-95">
                <i className="fa-solid fa-rocket text-emerald-700" aria-hidden="true"></i> Buat Kalender Kamu
              </Link>
              <Link to="/login" className="px-4 py-2 sm:px-6 sm:py-3 bg-emerald-900/60 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl border border-emerald-600 transition flex items-center gap-2">
                <i className="fa-solid fa-right-to-bracket" aria-hidden="true"></i> Masuk Akun
              </Link>
            </div>
          </div>

          {/* CARD PREVIEW AKSI + PANEL TANGGALAN (STATIS) */}
          <div className="bg-white text-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 border-emerald-400 shadow-xl w-full max-w-xs shrink-0 z-10 space-y-3">
            <div className="flex items-center gap-2.5 sm:gap-3 border-b-2 border-slate-100 pb-2.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-emerald-700 font-bold text-xs sm:text-base shrink-0">
                <i className="fa-solid fa-calendar-day" aria-hidden="true"></i>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500">Preview Tanggalan</p>
                <p className="text-xs sm:text-sm font-black text-emerald-950">Juli 2026</p>
              </div>
            </div>

            {/* PANEL TANGGALAN STATIS */}
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 mb-1">
                <span>M</span><span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-700">
                <span className="text-slate-300">28</span><span className="text-slate-300">29</span><span className="text-slate-300">30</span><span>1</span><span>2</span><span>3</span><span>4</span>
                <span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span>
                <span>12</span><span>13</span><span>14</span><span>15</span><span className="bg-emerald-600 text-white font-black rounded-lg py-0.5 shadow-xs">16</span><span>17</span><span>18</span>
                <span>19</span><span>20</span><span>21</span><span>22</span><span>23</span><span>24</span><span className="bg-amber-400 text-slate-900 font-black rounded-lg py-0.5">25</span>
                <span>26</span><span>27</span><span>28</span><span>29</span><span>30</span><span>31</span><span className="text-slate-300">1</span>
              </div>
            </div>

            {/* STATUS SLOT JADWAL */}
            <div className="space-y-1.5 text-[11px] font-bold text-slate-700">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span><i className="fa-solid fa-circle text-amber-400 mr-1" aria-hidden="true"></i> 25 Tgl (Pending)</span>
                <span className="text-amber-900 font-black">2 Acara</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span><i className="fa-solid fa-circle text-emerald-600 mr-1" aria-hidden="true"></i> 16 Tgl (Disetujui)</span>
                <span className="text-emerald-900 font-black">5 Acara</span>
              </div>
            </div>
          </div>
        </div>

        {/* FITUR KEUNGGULAN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 w-full">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-emerald-400 shadow-md space-y-1 sm:space-y-2">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-xl sm:rounded-2xl border-2 border-emerald-300 flex items-center justify-center text-base sm:text-xl font-bold mb-2 sm:mb-4">
              <i className="fa-solid fa-link" aria-hidden="true"></i>
            </div>
            <h2 className="text-sm sm:text-lg font-black text-slate-900">Link Publik Unik</h2>
            <p className="text-[11px] sm:text-sm font-medium text-slate-600 leading-relaxed">
              Dapatkan tautan kalender pribadi kamu (misal: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">/namamu</code>) untuk dibagikan secara instan.
            </p>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-emerald-400 shadow-md space-y-1 sm:space-y-2">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-xl sm:rounded-2xl border-2 border-emerald-300 flex items-center justify-center text-base sm:text-xl font-bold mb-2 sm:mb-4">
              <i className="fa-solid fa-bell" aria-hidden="true"></i>
            </div>
            <h2 className="text-sm sm:text-lg font-black text-slate-900">Cek Bentrok Otomatis</h2>
            <p className="text-[11px] sm:text-sm font-medium text-slate-600 leading-relaxed">
              Sistem mendeteksi jadwal yang bertabrakan secara langsung sehingga waktu kamu selalu aman.
            </p>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-emerald-400 shadow-md space-y-1 sm:space-y-2">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-xl sm:rounded-2xl border-2 border-emerald-300 flex items-center justify-center text-base sm:text-xl font-bold mb-2 sm:mb-4">
              <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
            </div>
            <h2 className="text-sm sm:text-lg font-black text-slate-900">Kontrol Penuh Owner</h2>
            <p className="text-[11px] sm:text-sm font-medium text-slate-600 leading-relaxed">
              Setujui atau tolak pengajuan jadwal booking dari publik hanya dalam sekali klik di dasbor.
            </p>
          </div>
        </div>

        {/* AREA KONTAK KERJA SAMA / PROMOSI */}
        <div className="w-full bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 border-emerald-400 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <span className="inline-block px-3 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-black rounded-full border border-emerald-300 uppercase tracking-wider mb-1">
              <i className="fa-solid fa-handshake mr-1" aria-hidden="true"></i> Open Collaboration
            </span>
            <h3 className="text-base sm:text-xl font-black text-slate-900">Ingin Kerja Sama atau Promosi?</h3>
            <p className="text-xs sm:text-sm font-medium text-slate-600">
              Terbuka untuk kolaborasi proyek, tawaran promosi, maupun masukan pengembangan fitur.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center shrink-0">
            <button type="button" data-copy="p1998nr@gmail.com" data-provider="Email" className="btn-copy-payment px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border-2 border-slate-300 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer">
              <i className="fa-regular fa-envelope text-emerald-700 text-sm" aria-hidden="true"></i>
              <span>p1998nr@gmail.com</span>
              <i className="fa-regular fa-copy ml-1 text-slate-500" aria-hidden="true"></i>
            </button>

            <a href="mailto:p1998nr@gmail.com?subject=Tawaran%20Kerja%20Sama%20/%20Promosi%20-%20GoJadwal" className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition">
              <i className="fa-solid fa-paper-plane" aria-hidden="true"></i> Kirim Pesan
            </a>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t-2 border-emerald-500 py-4 sm:py-6 px-4 sm:px-8 mt-4 sm:mt-8 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-center md:text-left">
          
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900">Created by <strong className="text-emerald-700 font-extrabold tracking-wide">Artup Studio</strong></span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Available for work
              </span>
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500">© 2026 GoJadwal. All rights reserved.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border-2 border-slate-200 w-full md:w-auto justify-center">
            <span className="text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-wider">Support Creator:</span>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              
              <button type="button" data-copy="081328343908" data-provider="OVO" className="btn-copy-payment px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black text-[10px] sm:text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition border border-purple-900 cursor-pointer">
                <i className="fa-solid fa-wallet" aria-hidden="true"></i>
                <span>OVO: 0813-2834-3908</span>
                <i className="fa-regular fa-copy ml-1 text-purple-200" aria-hidden="true"></i>
              </button>

              <button type="button" data-copy="081328343908" data-provider="GoPay" className="btn-copy-payment px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-black text-[10px] sm:text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition border border-sky-800 cursor-pointer">
                <i className="fa-solid fa-wallet" aria-hidden="true"></i>
                <span>GoPay: 0813-2834-3908</span>
                <i className="fa-regular fa-copy ml-1 text-sky-200" aria-hidden="true"></i>
              </button>

            </div>
          </div>

        </div>
      </footer>

      {/* TOAST NOTIFICATION */}
      <div id="copyToast" className={`fixed bottom-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-black px-4 py-2 rounded-full shadow-2xl border-2 border-emerald-400 z-50 flex items-center gap-2 transition-all ${toastVisible ? '' : 'hidden'}`} role="status">
        <i className="fa-solid fa-circle-check text-emerald-400 text-sm" aria-hidden="true"></i>
        <span id="copyToastMsg">{toastMsg}</span>
      </div>
    </div>
  );
}

function MemberRouteWrapper() {
  const { id } = useParams();
  return <Member targetIdentifier={id || ""} />;
}

// Wrapper untuk mengambil parameter Username dari path /booking/:username
function BookingRouteWrapper() {
  const { username } = useParams();
  return <Booking ownerUsername={username} />;
}

// Router Utama App
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Halaman Utama / Beranda */}
        <Route path="/" element={<HomeContent />} />

        {/* Halaman Autentikasi */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rute Portal Member dengan ID UUID */}
        <Route path="/p/:id" element={<MemberRouteWrapper />} />

        {/* Rute Booking Publik dengan Username */}
        <Route path="/booking/:username" element={<BookingRouteWrapper />} />

        

        {/* Halaman Dashboard & Pengaturan Admin */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/setting" element={<Settings />} /> 

        {/* Halaman Fitur & Booking */}
        <Route path="/booking" element={<Booking ownerUsername="defaultUser" />} />
        <Route path="/member" element={<Member targetIdentifier="defaultMember" />} />
        <Route path="/download" element={<Download />} />
      </Routes>
    </Router>
  );
}