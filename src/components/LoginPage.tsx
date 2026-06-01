import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

const OFFLINE_PIN = '1234'; // fallback PIN when Supabase is not configured

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [logoError, setLogoError] = useState(false);
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
      if (data.user) onLoginSuccess(data.user);
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
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 relative">
            {!logoError ? (
              <img
                src="/logo.png"
                alt="Logo Qurban"
                className="w-20 h-20 object-contain drop-shadow-md"
                onError={() => setLogoError(true)}
              />
            ) : (
              <FallbackLogo />
            )}
            {/* Online / offline badge */}
            <span
              className={`absolute -bottom-1 -right-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                isOfflineMode
                  ? 'bg-amber-50 text-amber-600 border-amber-300'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-300'
              }`}
            >
              {isOfflineMode ? 'Lokal' : 'Online'}
            </span>
          </div>
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
                  disabled={pin.join('').length < 4}
                  className="mt-2 w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                  style={{
                    background: pin.join('').length === 4
                      ? 'linear-gradient(135deg, #F26522 0%, #e05510 100%)'
                      : '#d1d5db',
                    boxShadow: pin.join('').length === 4 ? '0 4px 20px rgba(242,101,34,0.35)' : 'none',
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
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium outline-none transition-all duration-200 focus:border-[#F26522] focus:bg-white placeholder:text-gray-300"
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
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium outline-none transition-all duration-200 focus:border-[#F26522] focus:bg-white placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0 text-red-500">
                      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                      <path d="M10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <p className="text-xs text-red-600 font-semibold">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #F26522 0%, #e05510 100%)',
                    boxShadow: '0 4px 20px rgba(242,101,34,0.35)',
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Memverifikasi…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Masuk
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}
                  className="w-full text-center text-xs text-gray-400 hover:text-[#F26522] transition-colors font-semibold mt-1"
                >
                  Lupa password?
                </button>
              </form>
            ) : (
              // ── FORGOT PASSWORD MODE ──
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Masukkan email Anda. Kami akan mengirim link reset password.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); setInfo(''); }}
                    placeholder="nama@email.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium outline-none transition-all duration-200 focus:border-[#F26522] focus:bg-white placeholder:text-gray-300"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0 text-red-500">
                      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                      <path d="M10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <p className="text-xs text-red-600 font-semibold">{error}</p>
                  </div>
                )}

                {info && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0 text-emerald-500">
                      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                      <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-xs text-emerald-700 font-semibold">{info}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #F26522 0%, #e05510 100%)',
                    boxShadow: '0 4px 20px rgba(242,101,34,0.35)',
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Mengirim…
                    </>
                  ) : (
                    'Kirim Link Reset'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                  className="w-full text-center text-xs text-gray-400 hover:text-[#F26522] transition-colors font-semibold"
                >
                  ← Kembali ke login
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-400 font-mono tracking-tight mt-6">
          Sistem Proteksi Enkripsi Hak Klaim Qurban
        </p>
      </div>

      {/* Shake animation style */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ──

function FallbackLogo() {
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 85C15 56 7 40 7 25C7 13.5 16 5 27 5C33.5 5 40 8.5 44 14C45 15.3 47 17 50 17C53 17 55 15.3 56 14C60 8.5 66.5 5 73 5C84 5 93 13.5 93 25C93 40 85 56 50 85Z" fill="#F26522"/>
      <path d="M50 28L25 48V67H75V48L50 28Z" stroke="white" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <path d="M46 67V56C46 53.8 47.8 52 50 52C52.2 52 54 53.8 54 56V67" stroke="white" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" fill="white" />
    </svg>
  );
}

function BackgroundOrnament() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Top-right blob */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #F26522 0%, transparent 70%)' }}
      />
      {/* Bottom-left blob */}
      <div
        className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #F26522 0%, transparent 70%)' }}
      />
      {/* Subtle dot grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#F26522" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
      {/* Decorative diagonal lines top-left */}
      <svg
        className="absolute top-0 left-0 opacity-[0.04]"
        width="200" height="200" viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {[0,20,40,60,80,100,120].map(offset => (
          <line
            key={offset}
            x1={offset} y1="0"
            x2={offset + 200} y2="200"
            stroke="#F26522" strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}
