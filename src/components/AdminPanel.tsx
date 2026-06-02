import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { saveKuponLokalBulk, clearAllLokalData, getKuponLokalAll, Kupon } from '../lib/indexedDB';
import { Trash2, Download, Layers, ShieldAlert, CheckCircle, Database, Search, QrCode, Printer, X, FileText, ChevronLeft, ChevronRight, AlertTriangle, Loader2, Lock, Unlock, LogIn, LogOut, User, Mail, Key, ShieldCheck } from 'lucide-react';

interface AdminPanelProps {
  onDataUpdated: () => void;
}

export default function AdminPanel({ onDataUpdated }: AdminPanelProps) {
  const [jumlahKupon, setJumlahKupon] = useState(100);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Stats and lists
  const [coupons, setCoupons] = useState<Kupon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'claimed' | 'unclaimed'>('all');
  const [selectedCoupon, setSelectedCoupon] = useState<Kupon | null>(null);
  
  // Printing state
  const [isPrintPreviewActive, setIsPrintPreviewActive] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Supabase Authentication States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [authMessage, setAuthMessage] = useState({ text: '', type: 'info' as 'info' | 'success' | 'error' });
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Administrative Rule: Check if a logged in user is an Administrator
  const isUserAdmin = (user: any) => {
    if (!isSupabaseConfigured) return true; // Offline local sandbox gets full config
    if (!user) return false;
    
    const emailLower = (user.email || '').toLowerCase();
    
    // Auth-Bypass Rules:
    // 1. Creator email
    if (emailLower === 'faruzanscara@gmail.com') return true;
    
    // 2. Emails containing words signaling administrative levels (e.g. admin@masjid.id, master-admin@rumahzakat.org)
    if (emailLower.includes('admin')) return true;
    
    // 3. Explicit metadata flags
    if (user.user_metadata?.role === 'admin') return true;
    
    return false;
  };

  const adminPrivilege = isUserAdmin(currentUser);

  // Refresh local list
  const refreshLocalList = async () => {
    try {
      const all = await getKuponLokalAll();
      setCoupons(all);
    } catch (e) {
      console.error('Gagal mengambil daftar kupon:', e);
    }
  };

  useEffect(() => {
    refreshLocalList();
    
    if (isSupabaseConfigured && supabase) {
      // Check for current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setCurrentUser(session?.user ?? null);
        setAuthLoading(false);
      }).catch(err => {
        console.error("Auth session fetch error:", err);
        setAuthLoading(false);
      });

      // Maintain user state dynamically
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user ?? null);
        setAuthLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setAuthLoading(false);
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;
    
    if (!authEmail || !authPassword) {
      setAuthMessage({ text: 'Mohon isi email dan password.', type: 'error' });
      return;
    }
    
    setAuthSubmitting(true);
    setAuthMessage({ text: '', type: 'info' });
    
    try {
      if (authMode === 'signin') {
        const { error, data } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        
        if (error) throw error;
        setAuthMessage({ text: 'Berhasil login! Selamat datang.', type: 'success' });
        setCurrentUser(data.user);
      } else if (authMode === 'signup') {
        const isEmailAdmin = authEmail.toLowerCase().includes('admin');
        const role = isEmailAdmin ? 'admin' : 'petugas';
        
        const { error, data } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              role: role,
            }
          }
        });
        
        if (error) throw error;
        
        if (data.session) {
          setAuthMessage({ text: 'Akun berhasil terdaftar dan langsung masuk!', type: 'success' });
          setCurrentUser(data.user);
        } else {
          setAuthMessage({ text: 'Registrasi berhasil! Silakan periksa kotak masuk email Anda untuk verifikasi akun.', type: 'success' });
          setAuthMode('signin');
        }
      }
    } catch (err: any) {
      console.error(err);
      setAuthMessage({ text: err.message || 'Terjadi gangguan internal, silakan dicoba kembali.', type: 'error' });
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;
    
    if (!authEmail) {
      setAuthMessage({ text: 'Mohon isi email Anda.', type: 'error' });
      return;
    }
    
    setAuthSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: window.location.href,
      });
      if (error) throw error;
      setAuthMessage({ text: 'Tautan reset password telah dikirim ke email Anda. Silakan cek inbox.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setAuthMessage({ text: err.message || 'Gagal mengirim email reset.', type: 'error' });
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      setAuthLoading(true);
      await supabase.auth.signOut();
      setCurrentUser(null);
      setAuthLoading(false);
      setAuthMessage({ text: 'Berhasil keluar sesi.', type: 'info' });
    }
  };

  const generateKuponMassal = async () => {
    if (!adminPrivilege) {
      setIsSuccess(false);
      setStatusText("Akses Ditolak: Hanya akun Administrator yang diperbolehkan memproduksi kupon massal.");
      return;
    }
    if (jumlahKupon <= 0 || jumlahKupon > 3000) {
      setIsSuccess(false);
      setStatusText("Masukkan jumlah valid antara 1 hingga 3000 kupon.");
      return;
    }
    setLoading(true);
    setIsSuccess(false);
    setStatusText('Membuat kode kupon QR qurban...');

    try {
      const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const generateKodeQB = (existingCodes: Set<string>): string => {
        let code: string;
        do {
          let suffix = '';
          for (let c = 0; c < 6; c++) {
            suffix += CHARSET[Math.floor(Math.random() * CHARSET.length)];
          }
          code = `QB-RZ-${suffix}`;
        } while (existingCodes.has(code));
        return code;
      };

      const payload: Kupon[] = [];
      const dataCsv = [["No", "Kode_QR", "Status_Klaim"]];

      // Build set of all existing codes to guarantee no collision
      const existingCodes = new Set<string>(coupons.map(c => c.kode_qr));
      const generatedThisBatch = new Set<string>();

      for (let i = 0; i < jumlahKupon; i++) {
        const allUsed = new Set([...existingCodes, ...generatedThisBatch]);
        const formattedCode = generateKodeQB(allUsed);
        generatedThisBatch.add(formattedCode);
        payload.push({
          kode_qr: formattedCode,
          status_klaim: false,
          waktu_klaim: null,
          lokasi_pemindaian: 'pos_utama'
        });
        dataCsv.push([(i + 1).toString(), formattedCode, "false"]);
      }

      if (isSupabaseConfigured && supabase) {
        setStatusText('Menginjeksi data ke server Supabase...');
        const { error } = await supabase.from('kupon_qurban').insert(payload);
        if (error) throw error;
      } else {
        setStatusText('Mode Lokal: Melompati injeksi server Supabase...');
      }

      setStatusText('Mengamankan salinan ke penyimpanan lokal PWA...');
      await saveKuponLokalBulk(payload);

      setStatusText('Mengekstrak berkas CSV untuk kebutuhan cetak...');
      const csvContent = "data:text/csv;charset=utf-8," + dataCsv.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `KUPON_QURBAN_RAW_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsSuccess(true);
      setStatusText(`Kupon berhasil dibuat! (${jumlahKupon} kupon dibuat & diekspor ke CSV)`);
      refreshLocalList();
      onDataUpdated();
    } catch (err: any) {
      console.error(err);
      setIsSuccess(false);
      setStatusText(`Kegagalan pembuatan: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadSistemLokal = async () => {
    setIsSuccess(false);
    if (!isSupabaseConfigured || !supabase) {
      setStatusText('Peringatan: Cloud database belum dihubungkan. Silakan tambahkan variabel lingkungan Supabase.');
      return;
    }

    setPulling(true);
    setLoading(true);
    setStatusText('Menarik data master dari server...');
    try {
      const { data, error } = await supabase.from('kupon_qurban').select('*');
      if (error) throw error;

      if (data && data.length > 0) {
        const mappedData: Kupon[] = data.map((item: any) => ({
          kode_qr: item.kode_qr,
          status_klaim: item.status_klaim,
          waktu_klaim: item.waktu_klaim,
          lokasi_pemindaian: item.lokasi_pemindaian || 'pos_utama'
        }));
        await saveKuponLokalBulk(mappedData);
        setIsSuccess(true);
        setStatusText(`Sinkronisasi sukses! ${data.length} kupon tersemat luring.`);
        await refreshLocalList();
        onDataUpdated();
      } else {
        setStatusText('Tidak ada kupon di server pusat.');
      }
    } catch (err: any) {
      setIsSuccess(false);
      setStatusText(`Sinkronisasi gagal: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setPulling(false);
      setLoading(false);
    }
  };

  const wipeDataKolektif = async () => {
    if (!adminPrivilege) {
      setIsSuccess(false);
      setStatusText("Akses Ditolak: Hanya akun Administrator yang diperbolehkan menghapus total data.");
      return;
    }
    setIsSuccess(false);
    setLoading(true);
    setStatusText('Pembersihan memori...');
    try {
      if (isSupabaseConfigured && supabase) {
        setStatusText('Menghapus data di server Supabase...');
        const { error } = await supabase.from('kupon_qurban').delete().neq('kode_qr', 'ROOT_SHIELD');
        if (error) throw error;
      }
      
      setStatusText('Membersihkan penyimpanan IndexedDB lokal...');
      await clearAllLokalData();
      setIsSuccess(true);
      setStatusText('Seluruh data berhasil dibersihkan.');
      setCoupons([]);
      onDataUpdated();
    } catch (err: any) {
      setIsSuccess(false);
      setStatusText(`Pembersihan gagal: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter coupons list
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.kode_qr.toLowerCase().includes(searchQuery.toLowerCase().trim());
    if (filterMode === 'all') return matchesSearch;
    if (filterMode === 'claimed') return matchesSearch && c.status_klaim;
    if (filterMode === 'unclaimed') return matchesSearch && !c.status_klaim;
    return matchesSearch;
  });

  // Paginated coupons
  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const currentItems = filteredCoupons.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Function to print a specific coupon QR
  const triggerPrintWindow = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn("Direct window.print() failed. Attempting alternative printing method...", err);
      // Fallback command pattern for strict sandboxed frames:
      try {
        document.execCommand('print', false, undefined);
      } catch (err2) {
        alert("Silakan buka aplikasi di tab baru (klik tombol Link di bawah / kanan atas iframe) untuk mencetak langsung dengan lancar jika cetak otomatis diblokir oleh peramban dalam bingkai iframe.");
      }
    }
  };

  // Full-screen printable view override
  if (isPrintPreviewActive) {
    return (
      <div 
        id="print-preview-overlay"
        className="fixed inset-0 bg-white text-slate-900 z-50 overflow-y-auto p-4 sm:p-8 flex flex-col justify-between print:bg-white print:text-black print:p-0"
      >
        {/* Navigation / Actions header hidden when printing */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-300 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="text-[#F26522] shrink-0" size={24} />
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Pratinjau Lembar Cetak Kupon QR</h2>
              <p className="text-xs text-slate-500">
                Menampilkan {filteredCoupons.length} kupon dalam format layout cetak siap potong (20 kupon per lembar A4).
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPrintPreviewActive(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-sm rounded-lg transition-colors flex items-center gap-1.5"
            >
              <X size={16} /> Kembali
            </button>
            <button
              onClick={triggerPrintWindow}
              className="px-5 py-2 bg-[#F26522] hover:bg-[#d44e19] text-white font-bold text-sm rounded-lg shadow transition-colors flex items-center gap-2 animate-bounce print:hidden"
            >
              <Printer size={16} /> Cetak Sekarang (Ctrl+P)
            </button>
          </div>
        </div>

        {/* Informative helper for print settings */}
        <div className="mb-4 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs leading-relaxed text-slate-600 print:hidden flex gap-2">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div>
            <span className="font-bold">Tips Mencetak:</span>
            <p>Untuk mendapat cetak pas <strong>20 QR per lembar A4</strong>, atur ukuran kertas ke <strong>A4</strong>, orientasi <strong>Portrait (Tegak)</strong>, atur margin ke <strong>Default/Minimal (8mm)</strong>, hilangkan centang <strong>&quot;Headers and Footers&quot;</strong>, dan aktifkan <strong>&quot;Background Graphics&quot;</strong> di dialog cetak browser Anda.</p>
          </div>
        </div>

        {/* Printable Grid */}
        <div className="flex-1 print:p-0">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 print:gap-2 print:grid-cols-4 print-grid-container">
            {filteredCoupons.map((coupon, idx) => (
              <div 
                key={coupon.kode_qr} 
                className="border-2 border-dashed border-slate-450 p-4 rounded-xl flex flex-col items-center text-center bg-white justify-between relative overflow-hidden break-inside-avoid shadow-sm print:shadow-none print:border-slate-800 page-break-inside-avoid min-h-[220px] print-card-item"
              >
                {/* Coupon Header design */}
                <div className="w-full flex justify-between items-center mb-1 text-[10px] text-slate-600 font-bold border-b border-slate-200 pb-1 print:text-[7px] print:mb-0 pb-0.5 print:border-slate-300">
                  <span>PANITIA QURBAN 1447 H</span>
                  <span className="text-[#F26522] font-mono print:text-black">#{idx + 1}</span>
                </div>

                <div className="my-2 bg-white p-1 rounded border border-slate-100 flex items-center justify-center print:my-0.5 print:p-0 print:border-none">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(coupon.kode_qr)}`}
                    alt={`QR Code ${coupon.kode_qr}`}
                    className="w-[100px] h-[100px] object-contain print:w-[54px] print:h-[54px]"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="w-full">
                  <div className="text-sm font-extrabold tracking-widest font-mono bg-slate-100 text-slate-900 py-0.5 px-2 rounded-md border border-slate-200 print:bg-slate-50 print:text-[9.5px] print:py-0 print:px-1 print:border-slate-300">
                    {coupon.kode_qr}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 uppercase font-medium print:text-[6px] print:mt-0.5 print:leading-none">
                    Tunjukkan kupon saat pengambilan daging
                  </p>
                </div>

                {/* Claim spot badge for physical marking if needed */}
                <div className="absolute right-[-15px] top-[-15px] w-12 h-12 bg-slate-50 rounded-full border-2 border-slate-200 flex items-end justify-center pb-1 text-[8px] font-black tracking-tighter text-slate-400 rotate-45 select-none print:border-slate-300 print:w-8 print:h-8 print:right-[-10px] print:top-[-10px] print:pb-0.5 print:text-[5px]">
                  PTK
                </div>
              </div>
            ))}
          </div>

          {filteredCoupons.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <QrCode size={48} className="mx-auto mb-2 opacity-30" />
              <p className="text-base font-bold">Tidak ada kupon untuk diprint.</p>
              <p className="text-xs">Silakan tutup peninjau dan buat kupon terlebih dahulu.</p>
            </div>
          )}
        </div>

        {/* Print Sheet Footer to display systemic integrity information */}
        <footer className="mt-8 pt-4 border-t border-slate-200 text-[9px] text-slate-400 font-mono flex justify-between items-center print:hidden print:border-slate-300">
          <span>QURBAN SCANNER SECURE PRINT SHEET</span>
          <span>Sistem Proteksi Klaim Antiduplikasi Luring Pertama</span>
        </footer>
      </div>
    );
  }

  // Auth loading state
  if (isSupabaseConfigured && authLoading) {
    return (
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center min-h-[320px]">
        <Loader2 className="animate-spin text-[#F26522] mb-3" size={32} />
        <p className="text-sm font-semibold text-slate-800">Memeriksa Sesi Autentikasi...</p>
      </div>
    );
  }

  // Not logged in state (Supabase connected)
  if (isSupabaseConfigured && !currentUser) {
    return (
      <div className="w-full max-w-md mx-auto bg-white p-6 rounded-2xl border border-gray-200 shadow-md space-y-6 animate-fade-in">
        <div className="flex flex-col items-center text-center space-y-2 border-b border-gray-150 pb-4">
          <div className="w-12 h-12 bg-[#F26522]/10 rounded-full flex items-center justify-center text-[#F26522]">
            <Lock size={22} />
          </div>
          <h2 className="text-base font-black text-slate-800 tracking-tight">Kunci Keamanan Core Panel</h2>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
            Hanya petugas &amp; administrator terdaftar yang diizinkan mengelola data master qurban.
          </p>
        </div>

        {authMessage.text && (
          <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
            authMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            authMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {authMessage.text}
          </div>
        )}

        {authMode !== 'forgot' ? (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-md py-2.5 pl-9 pr-3 text-xs focus:outline-none focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522]/20 text-slate-800 shadow-sm font-sans"
                  placeholder="admin@rumahzakat.org"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    setAuthMessage({ text: '', type: 'info' });
                  }}
                  className="text-[10px] text-[#F26522] hover:underline font-bold"
                >
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-md py-2.5 pl-9 pr-3 text-xs focus:outline-none focus:border-[#F26522] focus:ring-1 focus:ring-[#F26522]/20 text-slate-800 shadow-sm font-sans"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-[#F26522] hover:bg-[#d44e19] text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-tight transition-colors flex items-center justify-center gap-2 disabled:opacity-40 shadow-sm"
            >
              {authSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  <span>Masuk Ke Panel</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Alamat Email Terdaftar
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-md py-2.5 pl-9 pr-3 text-xs focus:outline-none focus:border-[#F26522] text-slate-800 shadow-sm font-sans"
                  placeholder="admin@rumahzakat.org"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-[#F26522] hover:bg-[#d44e19] text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-tight transition-colors disabled:opacity-40 shadow-sm"
            >
              {authSubmitting ? 'Mengirim...' : 'Kirim Tautan Reset'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthMessage({ text: '', type: 'info' });
                }}
                className="text-xs text-[#F26522] hover:underline font-bold"
              >
                Kembali ke Form Masuk
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Authorized Profile Banner */}
      {isSupabaseConfigured && currentUser && (
        <div id="auth-profile-bar" className="w-full max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm ${
              adminPrivilege ? 'bg-gradient-to-br from-[#F26522] to-[#fd8046]' : 'bg-slate-750'
            }`}>
              {adminPrivilege ? <ShieldCheck size={18} /> : <User size={18} />}
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest font-mono">Status Sistem</p>
              <p className="text-[11px] font-bold text-slate-800 truncate max-w-[150px] sm:max-w-[210px]" title={currentUser.email}>
                {currentUser.email}
              </p>
              <div>
                <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                  adminPrivilege 
                    ? 'bg-orange-50 text-[#F26522] border border-[#F26522]/15' 
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {adminPrivilege ? '⚙️ Admin (Akses Penuh)' : '📋 Scanner (Akses Terbatas)'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[10px] bg-white hover:bg-gray-50 text-rose-600 font-bold border border-rose-100 py-1.5 px-3 rounded-xl transition-all active:scale-95 flex items-center gap-1 shadow-sm"
          >
            <LogOut size={12} /> Keluar
          </button>
        </div>
      )}

      {/* Primary Administration Actions */}
      <div 
        id="admin-panel"
        className="w-full max-w-md mx-auto bg-white p-5 rounded-2xl border border-gray-200 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4 border-b border-gray-150 pb-2">
          <Layers className="text-[#F26522]" size={20} />
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Panel Administrasi Kontrol</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-150 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-550 tracking-wider">
                PRODUKSI KUPON MASSAL
              </label>
              {!adminPrivilege && (
                <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-50 text-red-650 border border-red-150 inline-block">
                  Akses Terbatas: Admin Only
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input 
                id="input-coupon-count"
                type="number" 
                value={jumlahKupon} 
                disabled={!adminPrivilege}
                onChange={(e) => setJumlahKupon(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:border-[#F26522] text-slate-800 shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                placeholder="Jumlah"
                min="1"
                max="3000"
              />
              <button 
                id="btn-generate-coupons"
                disabled={loading || !adminPrivilege}
                onClick={generateKuponMassal}
                title={!adminPrivilege ? "Hanya akun Administrator yang dapat memproduksi kupon massal" : "Generate & Ekspor"}
                className="bg-[#F26522] hover:bg-[#d44e19] font-bold text-white px-4 py-2 rounded-md text-sm transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Generate &amp; Ekspor
              </button>
            </div>
            <p className="text-[10px] text-gray-400 block">
              * Tombol ini akan mengunduh berkas CSV berisi kode kupon acak untuk didesain atau dicetak dan dimasukkan ke database.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <button
              id="btn-pull-cloud"
              disabled={loading || pulling || !isSupabaseConfigured || !adminPrivilege}
              onClick={downloadSistemLokal}
              title={
                !isSupabaseConfigured 
                  ? "Database cloud tidak terkonfigurasi" 
                  : !adminPrivilege 
                    ? "Hanya akun Administrator yang dapat menarik data" 
                    : "Tarik data dari database online"
              }
              className="flex items-center justify-center gap-2 border border-gray-200 hover:border-[#F26522]/30 hover:bg-gray-50 bg-white px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-colors disabled:opacity-45 disabled:cursor-not-allowed text-gray-700 shadow-sm"
            >
              {pulling ? (
                <>
                  <Loader2 size={14} className="animate-spin text-[#F26522]" />
                  <span>Menarik Data...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Pull Server ke Lokal</span>
                </>
              )}
            </button>
            <button
              id="btn-factory-reset"
              disabled={loading || pulling || !adminPrivilege}
              onClick={() => setShowConfirmReset(true)}
              title={!adminPrivilege ? "Hanya akun Administrator yang dapat menghapus data" : "Reset seluruh data"}
              className="flex items-center justify-center gap-2 border border-rose-100 bg-white hover:bg-rose-50 hover:border-rose-300 text-rose-600 px-3 py-2.5 rounded-md text-xs font-semibold tracking-tight transition-colors disabled:opacity-45 disabled:cursor-not-allowed shadow-sm"
            >
              <Trash2 size={14} /> Reset Total Data
            </button>
          </div>

          {!isSupabaseConfigured && (
            <div 
              id="warning-box-unconfigured"
              className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2 text-xs text-amber-800 animate-pulse"
            >
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <span className="font-bold">Mode Simulasi Offline-Only Aktif</span>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Penyalinan coupon massal langsung disimpan ke dalam IndexedDB lokal Anda. Anda dapat menguji seluruh alur kerja QR pemindaian secara luring tanpa data cloud.
                </p>
              </div>
            </div>
          )}

          {statusText && (
            <div 
              id="admin-status-message"
              className={`p-3 rounded border text-center text-xs font-mono flex items-center justify-center gap-2 ${
                isSuccess 
                  ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              {isSuccess ? <CheckCircle size={14} className="shrink-0 text-emerald-600" /> : <Database size={14} className="shrink-0 text-slate-500" />}
              <span>{statusText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Coupon Database & QR Card Rendering */}
      <div 
        id="coupon-database-panel"
        className="w-full max-w-md mx-auto bg-white p-5 rounded-2xl border border-gray-200 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-150 pb-2">
          <div className="flex items-center gap-2">
            <QrCode className="text-[#F26522]" size={18} />
            <span className="text-base font-bold text-slate-800 tracking-tight">Daftar &amp; Cetak QR Kupon</span>
          </div>
          {coupons.length > 0 && (
            <button
              id="btn-print-sheet"
              onClick={() => setIsPrintPreviewActive(true)}
              className="px-2.5 py-1.5 bg-[#F26522] hover:bg-[#d44e19] text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition-all shadow-sm"
            >
              <Printer size={12} /> Cetak Lembar A4
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
            <input
              id="search-coupon-list"
              type="text"
              placeholder="Cari Kode QR Kupon..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gray-255 rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-[#F26522] text-slate-800 uppercase font-mono tracking-wider shadow-sm"
            />
          </div>

          <div className="flex gap-1.5 justify-between">
            <button
              onClick={() => { setFilterMode('all'); setCurrentPage(1); }}
              className={`flex-1 py-1 px-1.5 text-[10px] rounded border font-bold text-center transition-all ${
                filterMode === 'all' 
                  ? 'bg-gray-800 text-white border-gray-700' 
                  : 'bg-white text-gray-450 border-gray-200 hover:text-gray-705'
              }`}
            >
              Semua ({coupons.length})
            </button>
            <button
              onClick={() => { setFilterMode('unclaimed'); setCurrentPage(1); }}
              className={`flex-1 py-1 px-1.5 text-[10px] rounded border font-bold text-center transition-all ${
                filterMode === 'unclaimed' 
                  ? 'bg-[#F26522]/10 text-[#F26522] border-[#F26522]/30' 
                  : 'bg-white text-gray-455 border-gray-200 hover:text-gray-705'
              }`}
            >
              Belum Klaim ({coupons.filter(c => !c.status_klaim).length})
            </button>
            <button
              onClick={() => { setFilterMode('claimed'); setCurrentPage(1); }}
              className={`flex-1 py-1 px-1.5 text-[10px] rounded border font-bold text-center transition-all ${
                filterMode === 'claimed' 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : 'bg-white text-gray-455 border-gray-200 hover:text-gray-705'
              }`}
            >
              Sudah Klaim ({coupons.filter(c => c.status_klaim).length})
            </button>
          </div>
        </div>

        {/* Coupons List Grid */}
        <div className="space-y-2 min-h-[220px]">
          {currentItems.map(c => (
            <div 
              key={c.kode_qr}
              className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all ${
                c.status_klaim 
                  ? 'bg-rose-50 border-rose-250 text-rose-750' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold tracking-widest text-[#F26522]">{c.kode_qr}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  c.status_klaim ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-[#F26522]/10 text-[#F26522] border border-[#F26522]/20'
                }`}>
                  {c.status_klaim ? 'Sudah Diambil' : 'Tersedia'}
                </span>
              </div>
              
              <button
                onClick={() => setSelectedCoupon(c)}
                className="px-2.5 py-1 bg-white hover:bg-gray-50 text-[10px] font-bold rounded flex items-center gap-1 transition-all text-gray-700 border border-gray-200 shadow-sm"
              >
                <QrCode size={12} /> Lihat QR
              </button>
            </div>
          ))}

          {filteredCoupons.length === 0 && (
            <div className="text-center py-10 border border-dashed border-gray-200 rounded-lg text-slate-400 text-xs">
              Tidak ada kupon yang cocok dengan kriteria pencarian.
            </div>
          )}
        </div>

        {/* Pagination buttons */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-150 text-xs text-gray-500">
            <span>Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 px-2 border border-gray-200 bg-white hover:bg-gray-50 rounded disabled:opacity-40 shadow-sm text-gray-600"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1 px-2 border border-gray-200 bg-white hover:bg-gray-50 rounded disabled:opacity-40 shadow-sm text-gray-600"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Coupon Single QR Modal Overlay */}
      {selectedCoupon && (
        <div 
          id="single-coupon-preview-overlay"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            id="single-coupon-preview-card"
            className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-5 shadow-2xl relative flex flex-col items-center"
          >
            <button
              onClick={() => setSelectedCoupon(null)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-1.5 text-xs text-[#F26522] font-bold mb-4 uppercase tracking-wider self-start">
              <QrCode size={14} /> Detail QR Kupon Qurban
            </div>

            {/* High fidelity printable component design */}
            <div 
              id="printable-coupon-card"
              className="bg-white text-slate-900 p-5 rounded-lg border border-slate-300 w-full flex flex-col items-center text-center shadow-inner"
            >
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-1">
                PANITIA QURBAN 1447 H
              </span>
              <div className="w-px h-2 bg-slate-300 mb-2"></div>
              
              <div className="my-2 bg-white p-2 rounded-lg border border-slate-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedCoupon.kode_qr)}`}
                  alt={`QR Code ${selectedCoupon.kode_qr}`}
                  className="w-[130px] h-[130px] object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="text-base font-black tracking-widest font-mono bg-gray-100 text-slate-900 py-1 px-4 rounded-md border border-slate-200 mb-1">
                {selectedCoupon.kode_qr}
              </div>

              <span className="text-[9px] text-slate-500 uppercase font-medium mt-1">
                Tunjukkan kupon ini saat pengambilan daging
              </span>
            </div>

            {/* Status Information */}
            <div className="w-full mt-4 p-3 bg-gray-50 border border-gray-150 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Status Klaim:</span>
                <span className={selectedCoupon.status_klaim ? 'text-rose-600 font-bold' : 'text-[#F26522] font-bold'}>
                  {selectedCoupon.status_klaim ? '● Sudah Diambil' : '✅ Tersedia (Belum Klaim)'}
                </span>
              </div>
              {selectedCoupon.status_klaim && selectedCoupon.waktu_klaim && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Waktu Klaim:</span>
                  <span className="text-gray-750 font-mono">
                    {new Date(selectedCoupon.waktu_klaim).toLocaleTimeString('id-ID')} - {new Date(selectedCoupon.waktu_klaim).toLocaleDateString('id-ID')}
                  </span>
                </div>
              )}
            </div>

            {/* Actions for Modal */}
            <div className="flex gap-2 w-full mt-4">
              <button
                onClick={() => setSelectedCoupon(null)}
                className="flex-1 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-lg transition"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  // Pre-filter lists to just contain this coupon & spawn print overlay
                  setSelectedCoupon(null);
                  setSearchQuery(selectedCoupon.kode_qr);
                  setFilterMode('all');
                  setIsPrintPreviewActive(true);
                }}
                className="flex-1 py-1.5 bg-[#F26522] hover:bg-[#d44e19] text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer size={12} /> Cetak Kupon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal Overlay */}
      {showConfirmReset && (
        <div 
          id="reset-confirmation-overlay"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-slate-800 animate-fade-in"
        >
          <div 
            id="reset-confirmation-card"
            className="w-full max-w-sm bg-white border border-gray-200 rounded-xl p-5 shadow-2xl relative flex flex-col items-center"
          >
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mb-4 uppercase tracking-wider self-start">
              <AlertTriangle size={14} /> Konfirmasi Reset Total Data
            </div>

            <p className="text-sm text-gray-500 text-center leading-relaxed mb-6">
              Apakah Anda yakin menghapus total seluruh data server dan lokal? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  setShowConfirmReset(false);
                  await wipeDataKolektif();
                }}
                className="flex-1 py-1.5 bg-rose-650 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition shadow-sm"
              >
                Ya, Hapus Total
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

