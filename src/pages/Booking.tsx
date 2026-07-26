import React, { useState, useEffect, useCallback } from 'react';

interface JadwalItem {
  id: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  keterangan: string;
  is_confirmed: boolean;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error';
}

interface BookingProps {
  ownerUsername?: string;
}

export default function Booking({ ownerUsername: propsOwnerUsername }: BookingProps) {
  const [targetOwnerUsername, setTargetOwnerUsername] = useState<string>(propsOwnerUsername || "");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Inisialisasi State dengan mengecek localStorage (Membaca Cache terlebih dahulu)
  const [globalJadwalList, setGlobalJadwalList] = useState<JadwalItem[]>(() => {
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const bookingIndex = pathSegments.indexOf("booking");
    let owner = propsOwnerUsername || "";
    if (!owner) {
      if (bookingIndex !== -1 && pathSegments.length > bookingIndex + 1) {
        owner = pathSegments[bookingIndex + 1];
      } else if (pathSegments.length > 0) {
        owner = pathSegments[pathSegments.length - 1];
      }
    }
    try {
      const cached = localStorage.getItem(`booking_cache_${owner}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  
  // State Modal Detail & Form
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<JadwalItem[]>([]);

  // State Form Input
  const [jamMulai, setJamMulai] = useState<string>("09:00");
  const [jamSelesai, setJamSelesai] = useState<string>("10:00");
  const [pic, setPic] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [keterangan, setKeterangan] = useState<string>("");

  // State Notifikasi & Loading
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>("Memproses Booking...");

  // Fungsi Helper Pelindung XSS
  const escapeHTML = useCallback((str: string): string => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }, []);

  // Deteksi path URL yang robust
  useEffect(() => {
    if (propsOwnerUsername) {
      setTargetOwnerUsername(propsOwnerUsername);
      return;
    }
    const pathSegments = window.location.pathname.split("/").filter(Boolean);
    const bookingIndex = pathSegments.indexOf("booking");
    if (bookingIndex !== -1 && pathSegments.length > bookingIndex + 1) {
      setTargetOwnerUsername(pathSegments[bookingIndex + 1]);
    } else if (pathSegments.length > 0) {
      setTargetOwnerUsername(pathSegments[pathSegments.length - 1]);
    }
  }, [propsOwnerUsername]);

  // Fungsi Fetch dengan Retry Mechanism
  const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, delay = 500): Promise<Response> => {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && retries > 0) {
        await new Promise((r) => setTimeout(r, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      return response;
    } catch (err) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw err;
    }
  };

  const fetchJadwalBookingData = useCallback(async (retriesLeft = 3, delayMs = 500): Promise<void> => {
    if (!targetOwnerUsername) return;

    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || "";
      const res = await fetchWithRetry(`${API_URL}/api/booking/jadwal/${encodeURIComponent(targetOwnerUsername)}?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        setGlobalJadwalList(list);
        localStorage.setItem(`booking_cache_${targetOwnerUsername}`, JSON.stringify(list));
      } else if (retriesLeft > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return fetchJadwalBookingData(retriesLeft - 1, delayMs * 2);
      } else {
        showNotification("Gagal mengambil data jadwal owner.", "error");
      }
    } catch (err) {
      console.error("Error fetching booking data:", err);
      if (retriesLeft > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return fetchJadwalBookingData(retriesLeft - 1, delayMs * 2);
      }
    }
  }, [targetOwnerUsername]);

  useEffect(() => {
  if (targetOwnerUsername) {
    // Selalu ambil data terbaru dari server di background setiap kali halaman dimuat,
    // sehingga cache lokal otomatis ter-update dengan data terbaru.
    fetchJadwalBookingData();
  }
}, [targetOwnerUsername, fetchJadwalBookingData]);
  const showNotification = (message: string, type: 'success' | 'error' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDateClick = (dateStr: string, daySchedules: JadwalItem[]) => {
    setSelectedDateStr(dateStr);
    if (daySchedules.length > 0) {
      setSelectedDaySchedules(daySchedules);
      setIsDetailModalOpen(true);
    } else {
      setIsFormModalOpen(true);
    }
  };

  const submitJadwal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!jamMulai || !jamSelesai) {
      showNotification("Jam mulai dan jam selesai wajib diisi!", "error");
      return;
    }
    if (jamMulai >= jamSelesai) {
      showNotification("Jam selesai harus lebih lambat dari jam mulai!", "error");
      return;
    }
    if (!pic.trim() || !whatsapp.trim()) {
      showNotification("Nama PIC dan No WhatsApp wajib diisi!", "error");
      return;
    }
    if (!targetOwnerUsername) {
      showNotification("Error: Pemilik jadwal tidak valid.", "error");
      return;
    }

    const fullKeterangan = `[PIC: ${pic.trim()}] [WA: ${whatsapp.trim()}] - Keperluan: ${keterangan.trim() || '-'}`;
    const payload = {
      tanggal: selectedDateStr,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      keterangan: fullKeterangan
    };

    setIsLoading(true);
    setLoadingText("Mengirimkan jadwal booking Anda...");

    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetchWithRetry(`${API_URL}/api/booking/${encodeURIComponent(targetOwnerUsername)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, 3, 1000);

      const result = await response.json();

      if (response.ok) {
        setIsFormModalOpen(false);
        showNotification(result.message || "Berhasil! Booking Anda berhasil diajukan.", "success");
        setPic("");
        setWhatsapp("");
        setKeterangan("");
        await fetchJadwalBookingData();
      } else {
        showNotification(result.err || "Gagal mengajukan jadwal.", "error");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      showNotification("Gagal mengirim booking setelah beberapa kali mencoba. Periksa koneksi Anda.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 font-sans antialiased flex flex-col items-center justify-start p-3 sm:p-6 space-y-4">
      
      {/* FLOATING NOTIFICATION */}
      {notification && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[10000] w-[90%] max-w-xl p-4 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-2xl transition-all duration-300 ${
          notification.type === 'error' ? 'bg-rose-100 border-rose-400 text-rose-950' : 'bg-emerald-100 border-emerald-400 text-emerald-950'
        }`}>
          <div className="flex items-center gap-2.5">
            <i className={`fa-solid ${notification.type === 'error' ? 'fa-triangle-exclamation text-rose-600' : 'fa-circle-check text-emerald-700'} text-lg shrink-0`}></i>
            <span>{escapeHTML(notification.message)}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-slate-900 shrink-0 p-1">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-[9999] flex flex-col items-center justify-center gap-3 text-white">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-extrabold text-sm sm:text-base tracking-wide">{loadingText}</p>
        </div>
      )}

      {/* HEADER SIMPLE */}
      <header className="w-full max-w-4xl bg-white border-2 border-emerald-500 rounded-3xl p-4 sm:p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-black text-lg border-2 border-emerald-300 shadow-sm shrink-0">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-black text-emerald-700 uppercase tracking-widest">Halaman Booking Online</div>
            <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
              {targetOwnerUsername ? `Jadwal milik @${escapeHTML(targetOwnerUsername)}` : "Memuat Pemilik..."}
            </h1>
          </div>
        </div>
      </header>

      {/* KALENDER CARD */}
      <div className="w-full max-w-4xl bg-white rounded-3xl border-2 border-emerald-400 shadow-xl p-4 sm:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-slate-200">
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900">{monthNames[month]} {year}</h2>
            <p className="text-xs font-bold text-emerald-700 hidden sm:block mt-0.5">Pilih tanggal di bawah untuk melihat slot jam & mengajukan booking</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 sm:p-2.5 bg-slate-100 border-2 border-slate-300 hover:bg-emerald-600 hover:text-white text-slate-800 rounded-xl transition shadow-sm">
              <i className="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition shadow-sm">
              Hari Ini
            </button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 sm:p-2.5 bg-slate-100 border-2 border-slate-300 hover:bg-emerald-600 hover:text-white text-slate-800 rounded-xl transition shadow-sm">
              <i className="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>

        {/* Keterangan Status Warna */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-800 mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
          <span className="text-slate-500 uppercase tracking-wider shrink-0">Status Slot:</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-600 inline-block shadow-xs"></span>
            <span className="text-amber-950">Pending</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-emerald-800 inline-block shadow-xs"></span>
            <span className="text-emerald-950">Terisi</span>
          </div>
        </div>

        {/* GRID TANGGAL */}
        <div className="grid grid-cols-7 gap-2 text-center font-black text-xs sm:text-sm text-slate-700 mb-3">
          <div className="text-rose-600">Min</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div className="text-emerald-700">Sab</div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-3 justify-items-center items-center">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`prev-${i}`} className="w-8 h-8 sm:w-12 sm:h-12 aspect-square rounded-full bg-slate-100 text-slate-300 flex items-center justify-center text-xs font-bold border border-slate-200/60 mx-auto">
              {prevTotalDays - firstDayIndex + i + 1}
            </div>
          ))}

          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const formattedMonth = String(month + 1).padStart(2, '0');
            const formattedDay = String(dayNum).padStart(2, '0');
            const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
            
            const isPastDate = dateStr < todayStr;
            const isToday = dateStr === todayStr;
            const daySchedules = globalJadwalList.filter(j => j.tanggal === dateStr);
            const hasSchedules = daySchedules.length > 0;

            let circleStyle = "bg-white text-slate-900 border-2 border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 cursor-pointer";
            let badgeStyle = "";
            if (isPastDate) {
              circleStyle = "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60";
            } else if (hasSchedules) {
              const hasUnconfirmed = daySchedules.some(j => !j.is_confirmed);
              if (hasUnconfirmed) {
                circleStyle = "bg-amber-300 text-amber-950 font-black border-2 border-amber-500 shadow-md animate-pulse cursor-pointer";
                badgeStyle = "bg-amber-950 text-amber-100";
              } else {
                circleStyle = "bg-emerald-600 text-white font-black border-2 border-emerald-800 shadow-md cursor-pointer";
                badgeStyle = "bg-white text-emerald-900";
              }
            } else if (isToday) {
              circleStyle = "bg-emerald-100 text-emerald-950 font-black border-2 border-emerald-600 ring-2 ring-emerald-300 cursor-pointer";
            }

            return (
              <div 
                key={dateStr} 
                onClick={() => !isPastDate && handleDateClick(dateStr, daySchedules)}
                className={`w-8 h-8 sm:w-12 sm:h-12 aspect-square rounded-full ${circleStyle} transition transform active:scale-95 flex flex-col items-center justify-center relative shadow-sm mx-auto`}
              >
                <span className="text-xs sm:text-base font-extrabold leading-none">{dayNum}</span>
                {hasSchedules && !isPastDate && (
                  <span className={`absolute -bottom-1 text-[8px] sm:text-[10px] font-black px-1 sm:px-1.5 py-0.2 rounded-full ${badgeStyle} shadow-xs`}>
                    {daySchedules.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL FORM BOOKING */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 w-full max-w-md overflow-hidden">
            <div className="p-5 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-black text-lg">Formulir Booking Jadwal</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-emerald-100 hover:text-white p-2 rounded-full hover:bg-emerald-600 transition">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={submitJadwal} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal Dipilih</label>
                <input type="text" disabled value={selectedDateStr} className="w-full bg-slate-100 border-2 border-slate-300 rounded-xl px-3.5 py-2 text-sm font-black text-slate-900" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jam Mulai</label>
                  <input type="time" value={jamMulai} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJamMulai(e.target.value)} className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jam Selesai</label>
                  <input type="time" value={jamSelesai} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJamSelesai(e.target.value)} className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Lengkap (Pengaju)</label>
                <input type="text" value={pic} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPic(e.target.value)} placeholder="Contoh: Budi Utama" className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium outline-none focus:border-emerald-600 text-slate-900" required />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">No. WhatsApp / Kontak</label>
                <input type="text" value={whatsapp} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWhatsapp(e.target.value)} placeholder="Contoh: 08123456789" className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium outline-none focus:border-emerald-600 text-slate-900" required />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Acara, Lokasi & Keperluan</label>
                <textarea rows={2} value={keterangan} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setKeterangan(e.target.value)} placeholder="Keperluan diskusi proyek, meeting, dll..." className="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium outline-none resize-none focus:border-emerald-600 text-slate-900"></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-md transition active:scale-95">Kirim Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL SLOT */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 w-full max-w-lg overflow-hidden">
            <div className="p-5 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-black text-lg">Slot Terisi Tanggal: {escapeHTML(selectedDateStr)}</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-emerald-100 hover:text-white p-2 rounded-full hover:bg-emerald-600 transition">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
              {selectedDaySchedules.map(j => {
                const jamMulaiClean = j.jam_mulai ? j.jam_mulai.slice(0, 5) : '-';
                const jamSelesaiClean = j.jam_selesai ? j.jam_selesai.slice(0, 5) : '-';
                return (
                  <div key={j.id} className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      <i className="fa-regular fa-clock text-emerald-700 mr-1.5"></i> {escapeHTML(jamMulaiClean)} - {escapeHTML(jamSelesaiClean)} WIB
                    </span>
                    <span className={`px-2.5 py-1 text-xs font-black rounded-full ${j.is_confirmed ? 'bg-emerald-100 text-emerald-950 border border-emerald-400' : 'bg-amber-100 text-amber-950 border border-amber-400'}`}>
                      {j.is_confirmed ? 'Terisi (Disetujui)' : 'Pending Booking'}
                    </span>
                  </div>
                );
              })}
              <button onClick={() => { setIsDetailModalOpen(false); setIsFormModalOpen(true); }} className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-950 text-xs font-black rounded-xl mt-3 flex items-center justify-center gap-2 transition shadow-sm">
                <i className="fa-solid fa-plus text-emerald-700"></i> Buat Booking Baru di Tanggal Ini
              </button>
            </div>

            <div className="p-4 bg-slate-100 border-t-2 border-slate-200 flex justify-end">
              <button onClick={() => setIsDetailModalOpen(false)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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

    </div>
  );
}