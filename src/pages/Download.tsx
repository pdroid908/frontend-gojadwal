import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface Jadwal {
  id: number;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  is_confirmed: boolean;
  keterangan: string;
}

export default function Download() {
  const navigate = useNavigate();
  const [rawSchedules, setRawSchedules] = useState<Jadwal[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Jadwal[]>([]);
  const [loggedInUsername, setLoggedInUsername] = useState<string>('Owner');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ambil data dari backend Go (/user)
  useEffect(() => {
    const fetchData = async () => {
      try {
        
        const response = await fetch(`/download`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' },
          credentials: 'include',
        });

        if (response.status === 401 || response.status === 403) {
          navigate('/login');
          return;
        }

        const result = await response.json();

        if (result.status === 'success') {
          setLoggedInUsername(result.username || 'Owner');
          const data = result.data || [];
          setRawSchedules(data);
          setFilteredSchedules(data);
        } else {
          setErrorMsg('belum ada data.');
        }
      } catch {
        setErrorMsg('Gagal terhubung ke server.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Handler Filter Status
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilterStatus(val);

    if (val === 'CONFIRMED') {
      setFilteredSchedules(rawSchedules.filter((item) => item.is_confirmed));
    } else if (val === 'PENDING') {
      setFilteredSchedules(rawSchedules.filter((item) => !item.is_confirmed));
    } else {
      setFilteredSchedules([...rawSchedules]);
    }
  };

  // Export ke Excel menggunakan SheetJS
  const exportToExcel = () => {
    if (filteredSchedules.length === 0) {
      alert('Tidak ada data untuk diunduh!');
      return;
    }

    const excelData = filteredSchedules.map((item, index) => ({
      No: index + 1,
      Tanggal: item.tanggal || '-',
      'Jam Mulai': item.jam_mulai ? item.jam_mulai.slice(0, 5) : '-',
      'Jam Selesai': item.jam_selesai ? item.jam_selesai.slice(0, 5) : '-',
      Status: item.is_confirmed ? 'Disetujui' : 'Pending',
      'Keterangan / Catatan': item.keterangan || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 45 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal Booking');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Data_Jadwal_${loggedInUsername}_${dateStr}.xlsx`);
  };

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 font-sans antialiased p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER PAGE */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border-2 border-emerald-500 shadow-xl">
          <div>
            <button 
              onClick={() => navigate('/admin')} 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition mb-2 cursor-pointer bg-transparent border-none p-0"
            >
              <i className="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
            </button>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-file-excel text-emerald-600"></i> Download Data Jadwal
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">Preview data jadwal Anda sebelum diunduh ke format Excel (.xlsx)</p>
          </div>

          <button 
            onClick={exportToExcel} 
            disabled={loading || filteredSchedules.length === 0}
            className="w-full sm:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-download"></i> Download ke Excel
          </button>
        </div>

        {/* PANEL FILTER PREVIEW */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Status:</label>
            <select 
              value={filterStatus} 
              onChange={handleFilterChange} 
              className="bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="CONFIRMED">Disetujui</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Total Data: <span className="text-emerald-700 font-black">{filteredSchedules.length}</span> Jadwal
          </div>
        </div>

        {/* TABEL PREVIEW */}
        <div className="bg-white rounded-3xl border-2 border-emerald-400 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-700 text-white text-xs uppercase font-black tracking-wider">
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Waktu</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Keterangan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100 text-xs font-semibold text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                      <i className="fa-solid fa-spinner animate-spin text-xl mb-2"></i>
                      <p>Memuat data jadwal...</p>
                    </td>
                  </tr>
                ) : errorMsg ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-rose-600 font-bold">
                      <i className="fa-solid fa-circle-exclamation text-xl mb-2"></i>
                      <p>{errorMsg}</p>
                    </td>
                  </tr>
                ) : filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                      Tidak ada data jadwal yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((item, index) => {
                    const jamMulai = item.jam_mulai ? item.jam_mulai.slice(0, 5) : '-';
                    const jamSelesai = item.jam_selesai ? item.jam_selesai.slice(0, 5) : '-';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 text-center font-black text-slate-500">{index + 1}</td>
                        <td className="p-4 font-bold text-slate-900">{item.tanggal || '-'}</td>
                        <td className="p-4">
                          <i className="fa-regular fa-clock text-emerald-700 mr-1"></i> {jamMulai} - {jamSelesai}
                        </td>
                        <td className="p-4">
                          {item.is_confirmed ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-full font-black text-[10px]">
                              Disetujui
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-400 rounded-full font-black text-[10px]">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-4 whitespace-pre-wrap leading-relaxed max-w-xs text-slate-600">
                          {item.keterangan || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}