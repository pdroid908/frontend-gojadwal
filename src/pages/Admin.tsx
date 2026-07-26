import  { useEffect, useState, useCallback , useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface Booking {
  id: string;
  user_id: string;
  tanggal: string; // Format: YYYY-MM-DD
  jam_mulai: string;
  jam_selesai: string;
  keterangan?: string;
  is_confirmed: boolean;
}

interface AdminResponse {
  status?: string;
  id?: string;
  username?: string;
  data?: Booking[];
  err?: string;
}

interface NotificationState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

export default function Admin() {
  const navigate = useNavigate();

  // State Utama
  const [loggedInUsername, setLoggedInUsername] = useState<string>('');
  const [loggedInId, setLoggedInId] = useState<string>('');
  const [allSchedules, setAllSchedules] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State Kalender & UI
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // State Modal Detail Tanggal
  const [selectedDateModal, setSelectedDateModal] = useState<string | null>(null);
 

  // State Notifikasi Global
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: '',
    type: 'success',
  });

  const modalSchedules = useMemo(() => {
  if (!selectedDateModal) return [];
  return allSchedules.filter((j) => j.tanggal === selectedDateModal);
}, [allSchedules, selectedDateModal]);

  const API_URL = import.meta.env.VITE_API_BASE_URL || '';

  // Helper Fetch dengan Retry (Sesuai fetchWithRetry di HTML)
  const fetchWithRetry = useCallback(
  async (
    url: string,
    options: RequestInit = {},
    retries = 3,
    delay = 300
  ): Promise<Response> => {
    let currentDelay = delay;

    for (;;) {
      try {
        const response = await fetch(url, options);

        if (response.status < 500 || retries <= 0) {
          return response;
        }
      } catch (err) {
        if (retries <= 0) {
          throw err;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, currentDelay));

      retries--;
      currentDelay *= 2;
    }
  },
  []
);

  // Menampilkan Notifikasi
  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'error') => {
    setNotification({ show: true, message, type });
  }, []);

  // Memuat Data User & Jadwal
  const loadUserData = useCallback(
    async (retriesLeft = 3, delayMs = 1000) => {
      try {
        const response = await fetchWithRetry(`${API_URL}/user`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' },
          credentials: 'include',
        });

        if (response.status === 401 || response.status === 403) {
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP Error Status: ${response.status}`);
        }

        const result: AdminResponse = await response.json();

        if (result.status === 'success') {
          const fetchedUsername = result.username || 'User';
          const fetchedId = result.id || '';
          const fetchedData = result.data || [];

          setLoggedInUsername(fetchedUsername);
          setLoggedInId(fetchedId);
          setAllSchedules(fetchedData);
          setLoading(false);
        } else {
          throw new Error(result.err || 'Respon server tidak valid');
        }
      } catch {
  if (retriesLeft > 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return loadUserData(retriesLeft - 1, delayMs * 2);
  }

  setLoading(false);
  showNotification('Gagal total mengambil data dari server.', 'error');
}
    },
    [API_URL, fetchWithRetry, navigate, showNotification]
  );

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);



  // Handler Salin Link Member
  const copyMemberLink = () => {
    if (!loggedInId) {
      showNotification('ID User tidak ditemukan.', 'error');
      return;
    }
    const shareUrl = `${window.location.origin}/p/${loggedInId}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        showNotification(`Link Member (/p/${loggedInId}) berhasil disalin!`, 'success');
      })
      .catch(() => {
        showNotification('Gagal menyalin link.', 'error');
      });
  };

  // Handler Salin Link Booking
  const copyBookingLink = () => {
    if (!loggedInUsername) return;
    const shareUrl = `${window.location.origin}/booking/${loggedInUsername}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        showNotification(`Link Booking Online (/booking/${loggedInUsername}) berhasil disalin!`, 'success');
      })
      .catch(() => {
        showNotification('Gagal menyalin link.', 'error');
      });
  };

  // Handler Navigasi Bulan Kalender
  const changeMonth = (dir: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + dir);
    setCurrentDate(newDate);
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Handler Aksi CRUD Jadwal
  const handleAcceptBooking = async (jadwalId: string) => {
    try {
      const response = await fetchWithRetry(`${API_URL}/user/accept/${jadwalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });
      const result: AdminResponse = await response.json();
      if (response.ok) {
        showNotification('Booking berhasil disetujui!', 'success');
        await loadUserData();
      } else {
        showNotification('Gagal: ' + (result.err || 'Terjadi kesalahan'), 'error');
      }
    } catch {
      showNotification('Gagal menghubungi server.', 'error');
    }
  };

  const handleDeleteBooking = async (jadwalId: string) => {
    const yakin = window.confirm('Apakah Anda yakin ingin menghapus jadwal ini?');
    if (!yakin) return;

    try {
      const response = await fetchWithRetry(`${API_URL}/user/jadwal/${jadwalId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include',
      });
      const result: AdminResponse = await response.json();
      if (response.ok) {
        showNotification('Jadwal berhasil dihapus!', 'success');
        await loadUserData();
      } else {
        showNotification('Gagal menghapus: ' + (result.err || 'Terjadi kesalahan'), 'error');
      }
    } catch {
      showNotification('Gagal menghubungi server.', 'error');
    }
  };

  const handleSaveKeterangan = async (jadwalId: string, pic: string, wa: string, ket: string) => {
    let finalKeterangan = '';
    if (pic.trim()) finalKeterangan += `[PIC: ${pic.trim()}] `;
    if (wa.trim()) finalKeterangan += `[WA: ${wa.trim()}] `;
    if (ket.trim()) finalKeterangan += `- Keperluan: ${ket.trim()}`;

    try {
      const response = await fetchWithRetry(`${API_URL}/user/jadwal/keterangan/${jadwalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ keterangan: finalKeterangan }),
        credentials: 'include',
      });
      const result: AdminResponse = await response.json();
      if (response.ok) {
        showNotification('Data jadwal berhasil diperbarui!', 'success');
        await loadUserData();
      } else {
        showNotification('Gagal memperbarui data: ' + (result.err || 'Terjadi kesalahan'), 'error');
      }
    } catch {
      showNotification('Gagal menghubungi server.', 'error');
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {
      // Abaikan error jaringan
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login');
    }
  };

  // Render Kalender Grid Logic
  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const cells = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    // Hari dari bulan sebelumnya
    for (let i = firstDayIndex; i > 0; i--) {
      const dayNum = prevTotalDays - i + 1;
      cells.push(
        <div
          key={`prev-${i}`}
          className="w-8 h-8 sm:w-12 sm:h-12 aspect-square rounded-full bg-slate-100 text-slate-300 flex items-center justify-center text-xs font-bold select-none border border-slate-200/60 mx-auto"
        >
          {dayNum}
        </div>
      );
    }

    // Hari bulan aktif
    for (let i = 1; i <= totalDays; i++) {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const formattedDay = String(i).padStart(2, '0');
      const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
      const isToday = dateStr === todayStr;

      const daySchedules = allSchedules.filter((j) => j.tanggal === dateStr);
      const hasSchedules = daySchedules.length > 0;

      let circleStyle = 'bg-white text-slate-900 border-2 border-slate-300 hover:border-emerald-600 hover:bg-emerald-50';
      let badgeStyle = '';

      if (hasSchedules) {
        const hasPending = daySchedules.some((j) => !j.is_confirmed);
        if (hasPending) {
          circleStyle = 'bg-amber-300 text-amber-950 font-black border-2 border-amber-500 shadow-md animate-pulse';
          badgeStyle = 'bg-amber-950 text-amber-100';
        } else {
          circleStyle = 'bg-emerald-600 text-white font-black border-2 border-emerald-800 shadow-md';
          badgeStyle = 'bg-white text-emerald-900';
        }
      } else if (isToday) {
        circleStyle = 'bg-emerald-100 text-emerald-950 font-black border-2 border-emerald-600 ring-2 ring-emerald-300';
      }

      cells.push(
        <div
          key={dateStr}
          onClick={() => {
            if (hasSchedules) {
              setSelectedDateModal(dateStr);
            }
          }}
          className={`w-8 h-8 sm:w-12 sm:h-12 aspect-square rounded-full ${circleStyle} cursor-pointer transition transform active:scale-95 flex flex-col items-center justify-center relative shadow-sm mx-auto`}
        >
          <span className="text-xs sm:text-base font-extrabold leading-none">{i}</span>
          {hasSchedules && (
            <span
              className={`absolute -bottom-1 text-[8px] sm:text-[10px] font-black px-1 sm:px-1.5 py-0.2 rounded-full ${badgeStyle} shadow-xs`}
            >
              {daySchedules.length}
            </span>
          )}
        </div>
      );
    }

    return cells;
  };

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  if (loading) {
    return (
      <div className="h-full bg-slate-100 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-emerald-700 font-bold text-sm">
          <i className="fa-solid fa-spinner animate-spin text-xl"></i>
          <span>Memuat dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-100 text-slate-900 font-sans antialiased overflow-hidden">
      <div className="flex h-full relative">
        {/* BACKDROP OVERLAY UNTUK SIDEBAR MOBILE */}
        <div
          id="sidebarBackdrop"
          onClick={() => setIsSidebarOpen(false)}
          className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-opacity duration-300 ${
            isSidebarOpen ? 'block' : 'hidden'
          }`}
        ></div>

        {/* SIDEBAR PANEL KIRI */}
        <aside
          id="sidebar"
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r-2 border-emerald-500 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-2xl shrink-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Sidebar Header */}
            <div className="h-16 flex items-center justify-between px-5 bg-emerald-700 text-white border-b-2 border-emerald-800">
              <div className="flex items-center gap-3">
                <div className="bg-white text-emerald-700 p-2 rounded-lg shadow-md">
                  <i className="fa-solid fa-calendar-check text-lg"></i>
                </div>
                <span className="font-extrabold text-lg tracking-wide">GoJadwal</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-600 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-2">
              <a
                href="/admin"
                className="flex items-center gap-3 px-4 py-3 text-emerald-950 bg-emerald-100 border-2 border-emerald-400 rounded-xl font-bold text-sm shadow-sm transition"
              >
                <i className="fa-solid fa-calendar-days text-emerald-700 text-base"></i> Kalender Saya
              </a>
              <a
                href="/setting"
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl font-bold text-sm transition border-2 border-transparent hover:border-emerald-200"
              >
                <i className="fa-solid fa-gear text-slate-500 text-base"></i> Pengaturan Akun
              </a>
              <a
                href="/download"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 border-2 border-emerald-400 active:scale-95"
              >
                <i className="fa-solid fa-file-excel"></i> Download Data Excel
              </a>
            </nav>
          </div>

          {/* Profile Info Panel */}
          <div className="p-4 m-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-2">
            <div className="text-xs text-slate-600 font-bold uppercase tracking-wider">Login Sebagai:</div>
            <div id="sidebarUsername" className="font-black text-base text-emerald-950 truncate">
              {loggedInUsername || 'Loading...'}
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-right-from-bracket"></i> Keluar
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-100">
          {/* NAVBAR ATAS */}
          <header className="h-16 bg-white border-b-2 border-emerald-500 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white rounded-xl transition border-2 border-emerald-300 cursor-pointer"
              >
                <i className="fa-solid fa-bars text-lg"></i>
              </button>
              <h1 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-user-shield text-emerald-600"></i> Dashboard Admin
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/settings"
                title="Ke Pengaturan Akun"
                className="text-xs sm:text-sm font-extrabold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border-2 border-emerald-300 px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <i className="fa-solid fa-user-gear text-emerald-700"></i>
                <span id="navUsername">@{loggedInUsername}</span>
              </a>
            </div>
          </header>

          {/* NOTIFICATION ALERT BANNER */}
          <div
            id="globalNotification"
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xl p-4 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-2xl transition-all duration-300 ${
              notification.show ? 'flex' : 'hidden'
            } ${
              notification.type === 'error'
                ? 'bg-rose-100 border-rose-400 text-rose-950'
                : 'bg-emerald-100 border-emerald-400 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <i
                className={`fa-solid ${
                  notification.type === 'error' ? 'fa-triangle-exclamation text-rose-600' : 'fa-circle-check text-emerald-700'
                } text-lg`}
              ></i>
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification((prev) => ({ ...prev, show: false }))}
              className="text-slate-500 hover:text-slate-900 shrink-0 p-1 cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          {/* MAIN CONTAINER */}
          <main className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex flex-col items-center">
            {/* HERO BANNER */}
            <div className="w-full max-w-4xl bg-emerald-800 border-2 border-emerald-900 rounded-2xl p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 z-10">
                <span className="inline-block px-2.5 py-0.5 bg-emerald-900/80 text-emerald-200 text-[10px] font-black rounded-full border border-emerald-500 uppercase tracking-wider">
                  Panel Admin
                </span>
                <h2 className="text-base sm:text-xl font-black text-white leading-tight" id="bannerGreeting">
                  Selamat Datang di Kalender Admin
                </h2>
                <p className="text-emerald-100 text-[11px] sm:text-xs font-medium leading-normal">
                  Bagikan link publik member atau link khusus booking online kepada klien Anda.
                </p>
              </div>

              <div id="shareLinkContainer" className="z-10 shrink-0 flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={copyMemberLink}
                  className="flex-1 md:flex-none px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-100 hover:bg-white text-slate-900 text-[11px] sm:text-xs font-black rounded-lg sm:rounded-xl shadow-md transition flex items-center justify-center gap-1.5 border-2 border-slate-300 active:scale-95 cursor-pointer"
                >
                  <i className="fa-solid fa-users text-emerald-700 text-xs sm:text-sm"></i>
                  <span>Link Member</span>
                </button>
                <button
                  onClick={copyBookingLink}
                  className="flex-1 md:flex-none px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-[11px] sm:text-xs font-black rounded-lg sm:rounded-xl shadow-md transition flex items-center justify-center gap-1.5 border-2 border-emerald-200 active:scale-95 cursor-pointer"
                >
                  <i className="fa-solid fa-calendar-plus text-emerald-900 text-xs sm:text-sm"></i>
                  <span>Link Booking</span>
                </button>
              </div>
            </div>

            {/* CARD KALENDER PANEL */}
            <div className="w-full max-w-4xl bg-white rounded-3xl border-2 border-emerald-400 shadow-2xl p-4 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-slate-200">
                <div>
                  <h2 id="monthYearDisplay" className="text-xl sm:text-3xl font-black text-slate-900">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <p className="text-xs font-bold text-emerald-700 hidden sm:block mt-0.5">
                    Klik lingkaran tanggal untuk melihat detail & konfirmasi
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-2.5 bg-slate-100 border-2 border-slate-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-slate-800 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <button
                    onClick={goToCurrentMonth}
                    className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-2.5 bg-slate-100 border-2 border-slate-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-slate-800 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>
                </div>
              </div>

              {/* Keterangan Warna Status (Legend) */}
              <div className="flex items-center gap-4 text-xs font-bold text-slate-800 mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
                <span className="text-slate-500 uppercase tracking-wider shrink-0">Status:</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-600 inline-block shadow-xs"></span>
                  <span className="text-amber-950">Pending (Kuning)</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-emerald-800 inline-block shadow-xs"></span>
                  <span className="text-emerald-950">Disetujui (Hijau)</span>
                </div>
              </div>

              {/* Nama Hari */}
              <div className="grid grid-cols-7 gap-2 text-center font-black text-xs sm:text-sm text-slate-700 mb-3">
                <div className="text-rose-600">Min</div>
                <div>Sen</div>
                <div>Sel</div>
                <div>Rab</div>
                <div>Kam</div>
                <div>Jum</div>
                <div className="text-emerald-700">Sab</div>
              </div>

              {/* GRID TANGGAL */}
              <div id="calendarGrid" className="grid grid-cols-7 gap-1 sm:gap-3 justify-items-center items-center">
                {renderCalendarDays()}
              </div>
            </div>

            {/* FOOTER */}
            <footer className="w-full max-w-4xl mt-8 pt-6 pb-8 border-t-2 border-slate-200 text-slate-600 shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                    <div className="bg-emerald-700 text-white p-1.5 rounded-lg text-xs">
                      <i className="fa-solid fa-camera font-black"></i>
                    </div>
                    <span>Artup Studio</span>
                  </div>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Sistem Penjadwalan & Booking Online. Dikelola untuk mempermudah manajemen Anda.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <i className="fa-solid fa-envelope text-emerald-600"></i> Ada yang Ingin Diobrolkan?
                  </h4>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    Butuh bantuan teknis, penyesuaian fitur, atau ada kendala sistem? Silakan kirim email ke Developer.
                  </p>
                  <a
                    href="mailto:p1998nr@gmail.com?subject=Bantuan%20Sistem%20GoJadwal"
                    className="inline-flex items-center gap-2 text-emerald-700 font-bold hover:text-emerald-800 transition underline"
                  >
                    <i className="fa-solid fa-paper-plane text-xs text-emerald-600"></i> p1998nr@gmail.com
                  </a>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <i className="fa-regular fa-clock text-emerald-600"></i> Jam Operasional
                  </h4>
                  <ul className="space-y-1 font-medium text-slate-500">
                    <li className="flex justify-between">
                      <span>Senin - Sabtu:</span>
                      <span className="font-bold text-slate-700">09:00 - 21:00 WIB</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Minggu / Libur:</span>
                      <span className="font-bold text-rose-600">Sesuai Janji Meski DiKhianati</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-[11px] font-semibold text-slate-400 gap-2">
                <p>© 2026 Artup Studio. All rights reserved.</p>
                <p className="flex items-center gap-1">
                  Powered by <span className="font-bold text-emerald-700">GoJadwal</span>
                </p>
              </div>
            </footer>
          </main>
        </div>
      </div>

      {/* MODAL DETAIL JADWAL */}
      {selectedDateModal && (
        <div id="detailModal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 w-full max-w-lg overflow-hidden transform transition-all">
            <div className="p-5 border-b-2 border-emerald-200 flex items-center justify-between bg-emerald-700 text-white">
              <div>
                <h3 className="font-black text-lg">Kelola Jadwal Booking</h3>
                <p className="text-xs text-emerald-100 font-bold" id="modalSelectedDate">
                  Tanggal: {selectedDateModal}
                </p>
              </div>
              <button
                onClick={() => setSelectedDateModal(null)}
                className="text-emerald-100 hover:text-white p-2 rounded-full hover:bg-emerald-600 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-96 overflow-y-auto custom-scrollbar" id="modalScheduleList">
              {modalSchedules.map((item, index) => {
                const isConfirmed = item.is_confirmed;
                const badgeClass = isConfirmed
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-400'
                  : 'bg-amber-100 text-amber-950 border border-amber-400';
                const badgeText = isConfirmed ? 'Disetujui' : 'Pending';

                const jamMulaiFormatted = item.jam_mulai ? item.jam_mulai.slice(0, 5) : '';
                const jamSelesaiFormatted = item.jam_selesai ? item.jam_selesai.slice(0, 5) : '';

                const rawKet = item.keterangan || '';
                let picVal = '';
                let waVal = '';

                const picMatch = rawKet.match(/\[(?:PIC|Nama):\s*(.*?)\]/i);
                if (picMatch) picVal = picMatch[1].trim();

                const waMatch = rawKet.match(/\[(?:WA|Kontak):\s*(.*?)\]/i);
                if (waMatch) waVal = waMatch[1].trim();

                const detailVal = rawKet
                  .replace(/\[(?:PIC|Nama):.*?\]/gi, '')
                  .replace(/\[(?:WA|Kontak):.*?\]/gi, '')
                  .replace(/-\s*Keperluan:\s*/gi, '')
                  .trim();

                return (
                  <ScheduleDetailItem
                    key={item.id}
                    index={index}
                    item={item}
                    isConfirmed={isConfirmed}
                    badgeClass={badgeClass}
                    badgeText={badgeText}
                    jamMulaiFormatted={jamMulaiFormatted}
                    jamSelesaiFormatted={jamSelesaiFormatted}
                    initialPic={picVal}
                    initialWa={waVal}
                    initialDetail={detailVal}
                    selectedDateModal={selectedDateModal}
                    onSaveKeterangan={handleSaveKeterangan}
                    onAcceptBooking={handleAcceptBooking}
                    onDeleteBooking={handleDeleteBooking}
                  />
                );
              })}
            </div>

            <div className="p-4 bg-slate-100 border-t-2 border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDateModal(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl transition shadow-md cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Komponen Pendukung Terisolasi untuk Item Detail Jadwal di dalam Modal
interface ScheduleDetailItemProps {
  index: number;
  item: Booking;
  isConfirmed: boolean;
  badgeClass: string;
  badgeText: string;
  jamMulaiFormatted: string;
  jamSelesaiFormatted: string;
  initialPic: string;
  initialWa: string;
  initialDetail: string;
  selectedDateModal: string;
  onSaveKeterangan: (id: string, pic: string, wa: string, ket: string) => void;
  onAcceptBooking: (id: string) => void;
  onDeleteBooking: (id: string) => void;
}

function ScheduleDetailItem({
  index,
  item,
  isConfirmed,
  badgeClass,
  badgeText,
  jamMulaiFormatted,
  jamSelesaiFormatted,
  initialPic,
  initialWa,
  initialDetail,
  onSaveKeterangan,
  onAcceptBooking,
  onDeleteBooking,
}: ScheduleDetailItemProps) {
  const [pic, setPic] = useState<string>(initialPic);
  const [wa, setWa] = useState<string>(initialWa);
  const [ket, setKet] = useState<string>(initialDetail);

  return (
    <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3 shadow-sm relative transition-all">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-800 text-white text-xs font-black rounded-lg shadow-xs">
            #{index + 1}
          </span>
          <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
            <i className="fa-regular fa-clock text-emerald-700 text-base"></i> {jamMulaiFormatted} - {jamSelesaiFormatted} WIB
          </span>
        </div>
        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full ${badgeClass}`}>{badgeText}</span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase">
              <i className="fa-solid fa-user text-emerald-700 mr-1"></i> Penanggung Jawab:
            </label>
            <input
              type="text"
              value={pic}
              onChange={(e) => setPic(e.target.value)}
              placeholder="Nama PIC..."
              className="w-full bg-white border-2 border-slate-300 focus:border-emerald-600 rounded-xl p-2 text-xs font-bold text-slate-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase">
              <i className="fa-solid fa-phone text-emerald-700 mr-1"></i> No. WA / Kontak:
            </label>
            <input
              type="text"
              value={wa}
              onChange={(e) => setWa(e.target.value)}
              placeholder="08xxx..."
              className="w-full bg-white border-2 border-slate-300 focus:border-emerald-600 rounded-xl p-2 text-xs font-bold text-slate-900 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold text-slate-600 uppercase">
            <i className="fa-solid fa-pen-to-square text-emerald-700 mr-1"></i> Perihal / Keperluan:
          </label>
          <textarea
            value={ket}
            onChange={(e) => setKet(e.target.value)}
            placeholder="Tulis detail keperluan..."
            className="w-full h-20 bg-white border-2 border-slate-300 focus:border-emerald-600 rounded-xl p-2.5 text-xs font-semibold text-slate-900 outline-none custom-scrollbar resize-y"
          ></textarea>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => onSaveKeterangan(item.id, pic, wa, ket)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-floppy-disk"></i> Simpan Perubahan
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
        {!isConfirmed && (
          <button
            onClick={() => onAcceptBooking(item.id)}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-check text-xs"></i> Setujui
          </button>
        )}

        <button
          onClick={() => onDeleteBooking(item.id)}
          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <i className="fa-solid fa-trash text-xs"></i> Hapus
        </button>
      </div>
    </div>
  );
}