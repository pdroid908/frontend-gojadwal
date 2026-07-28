import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface AlertState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

interface ErrorResponse {
  error?: string;
  err?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    message: '',
    type: 'error',
  });

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert({ show: false, message: '', type: 'error' });

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setAlert({ show: true, message: 'Username hanya boleh berisi huruf, angka, dan underscore (_)', type: 'error' });
      return;
    }

    if (password.length < 6) {
      setAlert({ show: true, message: 'Password minimal 6 karakter.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      
      const response = await fetch(`/regis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const contentType = response.headers.get('content-type');
      let data: ErrorResponse = {};
      
      if (contentType && contentType.includes('application/json')) {
        const jsonResult = await response.json().catch(() => ({}));
        if (jsonResult && typeof jsonResult === 'object') {
          data = jsonResult as ErrorResponse;
        }
      }

      if (response.ok) {
        setAlert({ show: true, message: 'Pendaftaran berhasil! Mengalihkan ke halaman login...', type: 'success' });
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : (typeof data.err === 'string' ? data.err : 'Gagal mendaftar, username mungkin sudah digunakan.');
        setAlert({ show: true, message: errorMsg, type: 'error' });
      }
    } catch {
      setAlert({ show: true, message: 'Gagal terhubung ke server. Periksa koneksi Anda.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-emerald-500 shadow-2xl overflow-hidden">
        
        <div className="bg-emerald-700 text-white p-6 text-center border-b-2 border-emerald-800">
          <div className="inline-flex bg-white text-emerald-700 p-3 rounded-2xl shadow-md mb-3">
            <i className="fa-solid fa-user-plus text-2xl" aria-hidden="true"></i>
          </div>
          <h1 className="text-2xl font-black">Buat Akun Owner</h1>
          <p className="text-xs text-emerald-100 font-medium mt-1">Daftar untuk membuat halaman kalender booking publik kamu</p>
        </div>

        <div className="p-6 space-y-4">
          {alert.show && (
            <div className={`p-3.5 rounded-2xl border-2 text-xs font-bold flex items-center gap-2 ${
              alert.type === 'success' ? 'bg-emerald-100 border-emerald-400 text-emerald-950' : 'bg-rose-100 border-rose-400 text-rose-950'
            }`} role="alert">
              <i className={`fa-solid ${alert.type === 'success' ? 'fa-circle-check text-emerald-700' : 'fa-triangle-exclamation text-rose-600'} text-base`} aria-hidden="true"></i>
              <span>{alert.message}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <i className="fa-solid fa-at text-sm" aria-hidden="true"></i>
                </span>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                  placeholder="contoh: joko" 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-1">Username ini akan menjadi link kamu: <span className="text-emerald-700">gojadwal.com/username</span></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <i className="fa-solid fa-lock text-sm" aria-hidden="true"></i>
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6} 
                  placeholder="Minimal 6 karakter" 
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition"
                />
                
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-emerald-700 transition cursor-pointer"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              <i className={`fa-solid ${loading ? 'fa-spinner animate-spin' : 'fa-user-check'}`} aria-hidden="true"></i>
              <span>{loading ? 'Memproses...' : 'Daftar Akun'}</span>
            </button>
          </form>

          <div className="pt-4 border-t-2 border-slate-100 text-center text-xs font-bold text-slate-600">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-emerald-700 hover:underline font-black">Login di sini</Link>
          </div>

          <div className="text-center">
            <Link to="/" className="text-xs font-extrabold text-slate-700 hover:text-slate-600 transition">
              <i className="fa-solid fa-arrow-left mr-1" aria-hidden="true"></i> Kembali ke Halaman Utama
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}