import React, { useState, useEffect, useCallback } from 'react';

interface JadwalItem {
  id: string;
  user_id: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  keterangan?: string;
  is_confirmed: boolean;
}

interface MemberProps {
  targetIdentifier: string;
}

export default function Member({ targetIdentifier }: MemberProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Inisialisasi state awal langsung dari localStorage
  const [globalJadwalList, setGlobalJadwalList] = useState<JadwalItem[]>(() => {
    try {
      const cachedLocal = localStorage.getItem(`jadwal_cache_${targetIdentifier}`);
      if (cachedLocal) {
        return JSON.parse(cachedLocal);
      }
    } catch {
      // Abaikan jika parsing gagal
    }
    return [];
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [isOwnerLoggedIn, setIsOwnerLoggedIn] = useState<boolean>(false);
  const [, setCurrentOwnerUsername] = useState<string>('');

  // State Modal Detail & Form Booking
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<JadwalItem[]>([]);

  // State Form Booking Publik
  const [bookTanggal, setBookTanggal] = useState<string>('');
  const [bookJamMulai, setBookJamMulai] = useState<string>('09:00');
  const [bookJamSelesai, setBookJamSelesai] = useState<string>('10:00');
  const [bookPic, setBookPic] = useState<string>('');
  const [bookWhatsapp, setBookWhatsapp] = useState<string>('');
  const [bookKeterangan, setBookKeterangan] = useState<string>('');

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

  const fetchProfileStatus = useCallback(async () => {
    try {
      const res = await fetch('/user', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.username) {
          setCurrentOwnerUsername(data.username);
          setIsOwnerLoggedIn(true);
        }
      }
    } catch {
      // Sesi tamu / belum login
    }
  }, []);

  // Fetch Jadwal dari Backend
  const fetchJadwalData = useCallback(async () => {
    if (!targetIdentifier) return;
    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || '';
      const endpoint = `${API_URL}/api/public/jadwal/${encodeURIComponent(targetIdentifier)}`;

      const res = await fetch(endpoint, {
        method: 'GET',
      });

      if (res.ok) {
        const data = await res.json();
        const freshList = Array.isArray(data) ? data : data.data || [];

        setGlobalJadwalList(freshList);
        localStorage.setItem(`jadwal_cache_${targetIdentifier}`, JSON.stringify(freshList));
      } else {
        console.error('Gagal memuat cache jadwal dari admin.');
      }
    } catch (err) {
      console.error('Terjadi kesalahan saat mengambil cache jadwal:', err);
    }
  }, [targetIdentifier]);

  useEffect(() => {
  const id = setTimeout(() => {
    void fetchProfileStatus();
    void fetchJadwalData();
  }, 0);

  return () => clearTimeout(id);
}, [targetIdentifier, fetchProfileStatus, fetchJadwalData]);
  const handleDateClick = (dateStr: string, schedules: JadwalItem[]) => {
    setSelectedDateStr(dateStr);
    setSelectedDaySchedules(schedules);
    setIsDetailModalOpen(true);
  };

  const deleteJadwal = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;
    try {
      const res = await fetch(`/user/jadwal/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        alert('Jadwal berhasil dihapus.');
        await fetchJadwalData();
        setIsDetailModalOpen(false);
      } else {
        const json = await res.json();
        alert(json.err || 'Gagal menghapus jadwal.');
      }
    } catch {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const submitBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bookTanggal || !bookJamMulai || !bookJamSelesai || !bookPic || !bookWhatsapp) {
      alert('Harap lengkapi Tanggal, Jam, Nama PIC, dan No. WhatsApp!');
      return;
    }

    const formattedKeterangan = `[PIC: ${bookPic.trim()}] [WA: ${bookWhatsapp.trim()}] - Keperluan: ${bookKeterangan ? bookKeterangan.trim() : '-'}`;

    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_URL}/api/booking/${encodeURIComponent(targetIdentifier)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: bookTanggal,
          jam_mulai: `${bookJamMulai}:00`,
          jam_selesai: `${bookJamSelesai}:00`,
          keterangan: formattedKeterangan,
        }),
      });

      if (res.ok) {
        alert('Pengajuan jadwal booking berhasil dikirim! Menunggu persetujuan admin.');
        setIsBookingModalOpen(false);
        setBookKeterangan('');
        setBookPic('');
        setBookWhatsapp('');
        await fetchJadwalData();
      } else {
        const json = await res.json();
        alert(json.err || 'Gagal mengirim pengajuan jadwal');
      }
    } catch {
      alert('Terjadi kesalahan koneksi jaringan.');
    }
  };

  // Logika Kalender
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col justify-between items-center antialiased">
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 flex flex-col items-center flex-1">
        <main className="w-full py-6 sm:py-8 space-y-5 flex flex-col items-center">
          
          {/* BANNER UTAMA */}
          <div className="w-full bg-emerald-900 border-2 border-emerald-950 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-950/80 text-emerald-200 text-[10px] sm:text-xs font-black rounded-full border border-emerald-500 uppercase tracking-wider">
                Portal Agenda 
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-1">Sistem Penjadwalan Online</h2>
              <p className="text-xs text-emerald-200/90 font-medium">Menampilkan seluruh agenda resmi yang telah disetujui.</p>
            </div>
          </div>

          {/* KALENDER CARD */}
          <div className="w-full bg-white rounded-2xl sm:rounded-3xl border-2 border-emerald-400 shadow-xl p-4 sm:p-6 flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b-2 border-slate-200">
              <div className="space-y-0.5">
                <h3 className="text-xl sm:text-3xl font-black text-slate-900">{monthNames[month]} {year}</h3>
                <p className="text-xs font-bold text-emerald-700">Pilih tanggal untuk meninjau rincian agenda</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-auto flex-wrap">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="p-2 sm:p-2.5 bg-slate-100 border-2 border-slate-300 rounded-xl hover:bg-emerald-600 hover:text-white transition shadow-sm"
                >
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition shadow-sm"
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="p-2 sm:p-2.5 bg-slate-100 border-2 border-slate-300 rounded-xl hover:bg-emerald-600 hover:text-white transition shadow-sm"
                >
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center font-black text-xs sm:text-sm text-slate-700 mb-3">
              <div className="text-rose-600">Min</div>
              <div>Sen</div>
              <div>Sel</div>
              <div>Rab</div>
              <div>Kam</div>
              <div>Jum</div>
              <div className="text-emerald-700">Sab</div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-3 justify-items-center items-center w-full">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div
                  key={`prev-${i}`}
                  className="w-9 h-9 sm:w-12 sm:h-12 aspect-square rounded-full bg-slate-100 text-slate-300 flex items-center justify-center text-xs border border-slate-200 mx-auto"
                >
                  {prevTotalDays - firstDayIndex + i + 1}
                </div>
              ))}

              {Array.from({ length: totalDays }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isPastDate = dateStr < todayStr;
                
                const daySchedules = globalJadwalList.filter(
                  (j) => j.tanggal === dateStr && j.is_confirmed === true
                );
                const hasSchedules = daySchedules.length > 0;

                let circleStyle = 'bg-white text-slate-900 border-2 border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 cursor-pointer';
                if (isPastDate) {
                  circleStyle = 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed';
                } else if (hasSchedules) {
                  circleStyle = 'bg-emerald-600 text-white font-black border-2 border-emerald-800 cursor-pointer shadow-md';
                }

                return (
                  <div
                    key={dateStr}
                    onClick={() => !isPastDate && handleDateClick(dateStr, daySchedules)}
                    className={`w-9 h-9 sm:w-12 sm:h-12 aspect-square rounded-full ${circleStyle} flex flex-col items-center justify-center relative shadow-sm transition-transform active:scale-95 mx-auto`}
                  >
                    <span className="text-xs sm:text-base font-extrabold leading-none">{dayNum}</span>
                    {hasSchedules && !isPastDate && (
                      <span className="absolute -bottom-1 text-[8px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full bg-white text-emerald-900 shadow-xs">
                        {daySchedules.length}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL DETAIL AGENDA */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 bg-emerald-700 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-sm sm:text-base">Detail Agenda Resmi</h3>
                <p className="text-xs text-emerald-100 font-medium">Tanggal: {escapeHTML(selectedDateStr)}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-emerald-100 hover:text-white p-2 rounded-full hover:bg-emerald-600 transition">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
              {selectedDaySchedules.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xs text-slate-500 font-bold">Tidak ada agenda resmi pada tanggal ini.</p>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setBookTanggal(selectedDateStr);
                      setIsBookingModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-700 transition"
                  >
                    + Ajukan Booking di Tanggal Ini
                  </button>
                </div>
              ) : (
                selectedDaySchedules.map((j, index) => {
                  const rawKeterangan = j.keterangan || '';
                  const jamMulai = j.jam_mulai ? j.jam_mulai.slice(0, 5) : '-';
                  const jamSelesai = j.jam_selesai ? j.jam_selesai.slice(0, 5) : '-';

                  let picName = '-';
                  let waNo = '-';

                  const picMatch = rawKeterangan.match(/\[PIC:\s*(.*?)\]/i);
                  if (picMatch) picName = picMatch[1];

                  const waMatch = rawKeterangan.match(/\[WA:\s*(.*?)\]/i);
                  if (waMatch) waNo = waMatch[1];

                  let cleanedText = rawKeterangan
                    .replace(/\[PIC:.*?\]/gi, '')
                    .replace(/\[WA:.*?\]/gi, '')
                    .replace(/-\s*Keperluan:\s*/gi, '')
                    .trim();

                  if (!cleanedText) cleanedText = 'Agenda / Pertemuan Resmi';

                  return (
                    <div key={j.id} className="bg-white rounded-2xl border-2 border-slate-200 p-4 space-y-3 shadow-xs">
                      <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                        <span className="text-xs font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg">
                          Agenda #{index + 1}
                        </span>
                        <span className="px-2.5 py-0.5 text-[11px] font-extrabold rounded-full bg-emerald-100 text-emerald-900">
                          Disetujui
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-900">
                        <i className="fa-regular fa-clock text-emerald-600"></i> {escapeHTML(jamMulai)} - {escapeHTML(jamSelesai)} WIB
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl text-xs border border-slate-200">
                        <div className="flex items-start gap-2">
                          <i className="fa-solid fa-user-tie text-emerald-700 mt-0.5"></i>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Penanggung Jawab</span>
                            <span className="font-extrabold text-slate-900">{escapeHTML(picName)}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <i className="fa-brands fa-whatsapp text-emerald-700 mt-0.5 text-sm"></i>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">No. WhatsApp</span>
                            <span className="font-extrabold text-slate-900">{escapeHTML(waNo)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Keterangan & Kebutuhan Acara</span>
                        <p className="text-xs text-slate-900 font-medium whitespace-pre-wrap">{escapeHTML(cleanedText)}</p>
                      </div>

                      {isOwnerLoggedIn && (
                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button
                            onClick={() => deleteJadwal(j.id)}
                            className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl transition hover:bg-rose-700"
                          >
                            Hapus Agenda
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 sm:p-4 bg-slate-100 border-t-2 border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM BOOKING PUBLIK */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 bg-emerald-700 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-sm sm:text-base">Formulir Pengajuan Booking</h3>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-emerald-100 hover:text-white p-2 rounded-full hover:bg-emerald-600 transition">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={submitBooking} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tanggal</label>
                <input
                  type="date"
                  value={bookTanggal}
                  onChange={(e) => setBookTanggal(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={bookJamMulai}
                    onChange={(e) => setBookJamMulai(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={bookJamSelesai}
                    onChange={(e) => setBookJamSelesai(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Penanggung Jawab (PIC)</label>
                <input
                  type="text"
                  value={bookPic}
                  onChange={(e) => setBookPic(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">No. WhatsApp / Kontak</label>
                <input
                  type="text"
                  value={bookWhatsapp}
                  onChange={(e) => setBookWhatsapp(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  required
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Keterangan / Keperluan</label>
                <textarea
                  rows={3}
                  value={bookKeterangan}
                  onChange={(e) => setBookKeterangan(e.target.value)}
                  placeholder="Tuliskan detail perihal pertemuan..."
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition hover:bg-emerald-800 active:scale-95"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-slate-200/70 border-t-2 border-slate-200 mt-12 py-8 px-4 flex flex-col items-center shrink-0">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600">
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

        <div className="w-full max-w-4xl mt-6 pt-4 border-t border-slate-300/60 flex flex-col sm:flex-row items-center justify-between text-[11px] font-semibold text-slate-400 gap-2">
          <p>© 2026 Artup Studio. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Powered by <span className="font-bold text-emerald-700">GoJadwal</span>
          </p>
        </div>
      </footer>
    </div>
  );
}