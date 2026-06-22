import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

const OFFLINE_PIN = import.meta.env.VITE_OFFLINE_PIN || '';

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mounted, setMounted] = useState(false);
  const [shake, setShake] = useState(false);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // ── Offline / local-sandbox mode (no Supabase configured) ──
  const isOfflineMode = !isSupabaseConfigured;

  // SECURITY FIX: Validate PIN is configured before allowing offline mode
  const isPinConfigured = OFFLINE_PIN && OFFLINE_PIN.length === 4 && /^\d{4}$/.test(OFFLINE_PIN);

  // PIN input handling for offline mode
  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...pin];
    next[index] = value.slice(-1);
    setPin(next);
    setError('');
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
    // Auto-submit when all 4 digits filled
    if (value && index === 3) {
      const fullPin = [...next].join('');
      if (fullPin.length === 4) handlePinSubmit([...next]);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handlePinSubmit = (digits = pin) => {
    // SECURITY FIX: Reject if PIN not properly configured
    if (!isPinConfigured) {
      setShake(true);
      setError('PIN belum dikonfigurasi. Hubungi administrator.');
      setPin(['', '', '', '']);
      pinRefs[0].current?.focus();
      setTimeout(() => setShake(false), 600);
      return;
    }

    const entered = digits.join('');
    if (entered === OFFLINE_PIN) {
      onLoginSuccess({ email: 'lokal@sandbox', id: 'offline', user_metadata: { role: 'admin' } });
    } else {
      setShake(true);
      setError('PIN salah. Coba lagi.');
      setPin(['', '', '', '']);
      pinRefs[0].current?.focus();
      setTimeout(() => setShake(false), 600);
    }
  };

  // ── Online Supabase mode ──
  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // SECURITY FIX: Sync role dari profiles ke user_metadata setelah login
      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileData?.role) {
          // Update user_metadata dengan role dari database
          await supabase.auth.updateUser({
            data: { role: profileData.role }
          });
          // Refresh user data dengan metadata baru
          const { data: { user: refreshedUser } } = await supabase.auth.getUser();
          onLoginSuccess(refreshedUser || data.user);
        } else {
          onLoginSuccess(data.user);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa email dan password.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setInfo('Email reset password telah dikirim. Cek inbox Anda.');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim email reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#f8f7f4' }}
    >
      {/* Geometric background ornament */}
      <BackgroundOrnament />

      {/* Card */}
      <div
        className={`
          relative z-10 w-full max-w-sm mx-4
          transition-all duration-700 ease-out
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
        `}
      >
        {/* Title above card */}
        <div className="flex flex-col items-center mb-6">
          <h1
            className="text-2xl font-black tracking-widest uppercase text-slate-900"
            style={{ letterSpacing: '0.18em' }}
          >
            QURBAN <span style={{ color: '#F26522' }}>SCANNER</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mt-1">
            by <span style={{ color: '#F26522' }}>nana.studio</span>
          </p>
        </div>

        {/* Main card */}
        <div
          className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 8px 40px rgba(242,101,34,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {/* Card header strip */}
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, #F26522 0%, #f5924a 50%, #F26522 100%)' }}
          />

          {/* Full-width logo banner */}
          <div className="flex flex-col items-center justify-center py-6 px-8 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
            <img
              src="/logo.png"
              alt="Logo Qurban"
              className="h-24 object-contain drop-shadow-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span
              className={`mt-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                isOfflineMode
                  ? 'bg-amber-50 text-amber-600 border-amber-300'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-300'
              }`}
            >
              {isOfflineMode ? '🔒 Mode Lokal' : '🌐 Mode Online'}
            </span>
          </div>

          <div className="p-8">
            {isOfflineMode ? (
              // ── OFFLINE PIN MODE ──
              <div className="flex flex-col items-center">
                <div className="mb-6 text-center">
                  <div
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
                    style={{ background: '#fff4ee', color: '#F26522', border: '1px solid #ffd4bc' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Mode Lokal — Tanpa Internet
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Masukkan PIN untuk membuka aplikasi
                  </p>
                </div>

                {/* SECURITY FIX: Show warning if PIN not configured */}
                {!isPinConfigured && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 text-center">
                    <strong>⚠️ PIN Belum Dikonfigurasi</strong>
                    <p className="mt-1">Hubungi administrator untuk mengatur VITE_OFFLINE_PIN di environment.</p>
                  </div>
                )}

                <div
                  className={`flex gap-3 mb-4 transition-transform ${shake ? 'animate-shake' : ''}`}
                >
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      ref={pinRefs[i]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      className={`
                        w-14 h-14 text-center text-2xl font-black rounded-2xl border-2
                        outline-none transition-all duration-200
                        ${digit
                          ? 'border-[#F26522] bg-[#fff4ee] text-[#F26522] scale-105'
                          : 'border-gray-200 bg-gray-50 text-gray-800'
                        }
                        focus:border-[#F26522] focus:bg-[#fff4ee] focus:scale-105
                      `}
                      autoFocus={i === 0}
                      disabled={!isPinConfigured}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-xs text-red-500 font-semibold text-center mb-2 animate-pulse">
                    {error}
                  </p>
                )}

                <button
                  onClick={() => handlePinSubmit()}
                  disabled={pin.join('').length < 4 || !isPinConfigured}
                  className="mt-2 w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white"
                  style={{
                    background: pin.join('').length === 4 && isPinConfigured
                      ? 'linear-gradient(135deg, #F26522 0%, #e05510 100%)'
                      : '#d1d5db',
                    boxShadow: pin.join('').length === 4 && isPinConfigured ? '0 4px 20px rgba(242,101,34,0.35)' : 'none',
                  }}
                >
                  Buka Aplikasi
                </button>
              </div>
            ) : mode === 'login' ? (
              // ── SUPABASE EMAIL/PASSWORD LOGIN ──
              <form onSubmit={handleSupabaseLogin} className="space-y-5">
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-500">Masuk dengan akun Supabase Anda</p>
                </div>

                <div className={`space-y-4 transition-transform ${shake ? 'animate-shake' : ''}`}>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="nama@email.com"
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#F26522] focus:ring-2 focus:ring-[#F26522]/10 text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#F26522] focus:ring-2 focus:ring-[#F26522]/10 text-slate-800 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-500 font-semibold text-center animate-pulse">
                    {error}
                  </p>
                )}
                {info && (
                  <p className="text-xs text-emerald-600 font-semibold text-center">
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all bg-[#F26522] hover:bg-[#d44e19] text-white shadow-lg shadow-[#F26522]/20 disabled:opacity-40"
                >
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="w-full text-center text-xs text-gray-400 hover:text-[#F26522] font-bold transition-colors"
                >
                  Lupa Password?
                </button>
              </form>
            ) : (
              // ── FORGOT PASSWORD ──
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-500">Reset password akun Anda</p>
                </div>

                <div className={`space-y-4 transition-transform ${shake ? 'animate-shake' : ''}`}>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                      Email Terdaftar
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="nama@email.com"
                      required
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#F26522] focus:ring-2 focus:ring-[#F26522]/10 text-slate-800 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-500 font-semibold text-center animate-pulse">
                    {error}
                  </p>
                )}
                {info && (
                  <p className="text-xs text-emerald-600 font-semibold text-center">
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all bg-[#F26522] hover:bg-[#d44e19] text-white shadow-lg shadow-[#F26522]/20 disabled:opacity-40"
                >
                  {loading ? 'Mengirim...' : 'Kirim Tautan Reset'}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-center text-xs text-gray-400 hover:text-[#F26522] font-bold transition-colors"
                >
                  Kembali ke Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BackgroundOrnament() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#F26522]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#F26522]/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
    </div>
  );
}
