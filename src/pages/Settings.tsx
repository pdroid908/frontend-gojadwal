import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();

  
  // State Ganti Username
  const [usernameBaru, setUsernameBaru] = useState('');
  const [loadingUsername, setLoadingUsername] = useState(false);

  // State Ganti Password
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [showPassLama, setShowPassLama] = useState(false);
  const [showPassBaru, setShowPassBaru] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // State Notifikasi
  const [notif, setNotif] = useState<{ show: boolean; msg: string; isSuccess: boolean }>({
    show: false,
    msg: '',
    isSuccess: false,
  });

  const showNotification = (msg: string, isSuccess: boolean) => {
    setNotif({ show: true, msg, isSuccess });
  };

  const hideNotif = () => {
    setNotif((prev) => ({ ...prev, show: false }));
  };

  // Handler Update Username
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameBaru.trim()) return;

    const yakin = window.confirm(`Apakah Anda yakin ingin mengubah username menjadi "${usernameBaru}"?\n\nCatatan: URL link booking online Anda juga akan berubah.`);
    if (!yakin) return;

    setLoadingUsername(true);
    hideNotif();

    try {
      const res = await fetch(`/user/change-username`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' 
        },
        body: JSON.stringify({ username_baru: usernameBaru.trim() }),
        credentials: 'include', // <-- Ubah dari same-origin menjadi include
      });

      if (res.status === 401 || res.status === 403) {
        navigate('/login');
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showNotification('Username berhasil diubah!', true);
        setUsernameBaru('');
      } else {
        showNotification(data.err || 'Gagal mengubah username.', false);
      }
    } catch {
      showNotification('Gagal menghubungi server. Silakan coba lagi.', false);
    } finally {
      setLoadingUsername(false);
    }
  };

  // Handler Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordLama || !passwordBaru) return;

    const yakin = window.confirm('Apakah Anda yakin ingin memperbarui password akun Anda?');
    if (!yakin) return;

    setLoadingPassword(true);
    hideNotif();

    try {
      const res = await fetch(`/user/change-password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' 
        },
        body: JSON.stringify({
          password_lama: passwordLama,
          password_baru: passwordBaru,
        }),
        credentials: 'include', // <-- Ubah dari same-origin menjadi include
      });

      if (res.status === 401 || res.status === 403) {
        navigate('/login');
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showNotification('Password berhasil diperbarui!', true);
        setPasswordLama('');
        setPasswordBaru('');
      } else {
        showNotification(data.err || 'Gagal memperbarui password.', false);
      }
    } catch {
      showNotification('Gagal menghubungi server. Silakan coba lagi.', false);
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 font-sans antialiased overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* HEADER KEMBALI KE ADMIN */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/admin')} 
            className="inline-flex items-center gap-2 px-2 py-2 bg-white border-2 border-emerald-500 text-emerald-800 text-xs font-black rounded-xl hover:bg-emerald-50 transition shadow-sm cursor-pointer"
          >
            <i className="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
          </button>
          <h1 className="text-xl font-black text-slate-900">Pengaturan Akun</h1>
        </div>

        {/* ALERT NOTIFIKASI */}
        {notif.show && (
          <div className={`p-4 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm transition-all ${
            notif.isSuccess ? 'bg-emerald-100 border-emerald-400 text-emerald-950' : 'bg-rose-100 border-rose-400 text-rose-950'
          }`}>
            <div className="flex items-center gap-2.5">
              <i className={`fa-solid ${notif.isSuccess ? 'fa-circle-check text-emerald-700' : 'fa-triangle-exclamation text-rose-600'} text-lg`}></i>
              <span>{notif.msg}</span>
            </div>
            <button onClick={hideNotif} className="text-slate-500 hover:text-slate-900 cursor-pointer">
              <i className="fa-solid fa-xmark text-base"></i>
            </button>
          </div>
        )}

        {/* FORM 1: GANTI USERNAME */}
        <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-lg p-6 space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-user-pen text-emerald-600"></i> Ganti Username
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Username akan mengganti URL unik booking online dan username saat Anda mau Login.</p>
          </div>

          <form onSubmit={handleUpdateUsername} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">Username Baru</label>
              <input 
                type="text" 
                value={usernameBaru} 
                onChange={(e) => setUsernameBaru(e.target.value)} 
                required 
                minLength={3} 
                maxLength={50} 
                placeholder="Masukkan username baru..." 
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loadingUsername} 
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white text-xs font-black rounded-xl transition shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              {loadingUsername ? <i className="fa-solid fa-spinner animate-spin"></i> : null}
              <span>Simpan Username</span>
            </button>
          </form>
        </div>

        {/* FORM 2: GANTI PASSWORD */}
        <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-lg p-6 space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-lock text-emerald-600"></i> Ganti Password
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Pastikan password baru Anda minimal 6 karakter.</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">Password Saat Ini</label>
              <div className="relative">
                <input 
                  type={showPassLama ? "text" : "password"} 
                  value={passwordLama} 
                  onChange={(e) => setPasswordLama(e.target.value)} 
                  required 
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassLama(!showPassLama)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <i className={`fa-solid ${showPassLama ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">Password Baru</label>
              <div className="relative">
                <input 
                  type={showPassBaru ? "text" : "password"} 
                  value={passwordBaru} 
                  onChange={(e) => setPasswordBaru(e.target.value)} 
                  required 
                  minLength={6} 
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassBaru(!showPassBaru)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <i className={`fa-solid ${showPassBaru ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loadingPassword} 
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-xs font-black rounded-xl transition shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              {loadingPassword ? <i className="fa-solid fa-spinner animate-spin"></i> : null}
              <span>Perbarui Password</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}