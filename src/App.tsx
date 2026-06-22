import React, { useState, useEffect, useCallback } from 'react';
import Scanner from './components/Scanner';
import AdminPanel from './components/AdminPanel';
import StatusBanner from './components/StatusBanner';
import LoginPage from './components/LoginPage';
import { getSyncQueue, removeKuponFromQueue, initDB, getKuponLokalAll } from './lib/indexedDB';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { Shield, ShieldAlert, LogOut } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [statistik, setStatistik] = useState({ total: 0, klaim: 0 });
  const [showAdmin, setShowAdmin] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // ── Auth gate: restore existing Supabase session on mount ──
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // No Supabase: skip session check, show login PIN page directly
      setAuthChecked(true);
      return;
    }

    // SECURITY FIX: Restore session + sync role dari profiles ke user_metadata
    const restoreSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const user = data.session.user;

          // Sync role dari profiles ke user_metadata
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileData?.role && user.user_metadata?.role !== profileData.role) {
            await supabase.auth.updateUser({
              data: { role: profileData.role }
            });
            // Refresh user dengan metadata baru
            const { data: { user: refreshedUser } } = await supabase.auth.getUser();
            setCurrentUser(refreshedUser || user);
          } else {
            setCurrentUser(user);
          }
        }
      } catch (err) {
        console.error('Session restore error:', err);
      } finally {
        setAuthChecked(true);
      }
    };

    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setShowAdmin(false);
  };

  const eksekusiKalkulasiMorfologiData = useCallback(async () => {
    try {
      await initDB();
      const antrean = await getSyncQueue();
      setQueueCount(antrean.length);

      // Instantly compute from local IndexedDB for immediate rendering with zero lag
      const localCoupons = await getKuponLokalAll();
      const total = localCoupons.length;
      const klaim = localCoupons.filter(k => k.status_klaim).length;
      setStatistik({ total, klaim });
    } catch (e) {
      console.error("Gagal menghitung statistik lokal:", e);
    }
  }, []);

  const sinkronisasiKeServerPusat = useCallback(async () => {
    if (!navigator.onLine || !isSupabaseConfigured || !supabase) return;
    try {
      const antrean = await getSyncQueue();
      if (antrean.length === 0) return;

      for (const item of antrean) {
        const { error } = await supabase
          .from('kupon_qurban')
          .update({ status_klaim: item.status_klaim, waktu_klaim: item.waktu_klaim })
          .eq('kode_qr', item.kode_qr);
        
        if (!error) {
          await removeKuponFromQueue(item.kode_qr);
        }
      }
      eksekusiKalkulasiMorfologiData();
    } catch (err) {
      console.error("Proses sinkronisasi latar belakang tertunda:", err);
    }
  }, [eksekusiKalkulasiMorfologiData]);

  const triggerSyncAndRecalculate = useCallback(async () => {
    // 1. Instantly update UI statistics from high performance local storage
    await eksekusiKalkulasiMorfologiData();
    // 2. Immediately kick off server sync in the background
    await sinkronisasiKeServerPusat();
  }, [eksekusiKalkulasiMorfologiData, sinkronisasiKeServerPusat]);

  useEffect(() => {
    // Initial load
    initDB().then(() => eksekusiKalkulasiMorfologiData());

    const handleOnline = () => {
      setIsOnline(true);
      sinkronisasiKeServerPusat();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync loop every 10 seconds if online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        sinkronisasiKeServerPusat();
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [sinkronisasiKeServerPusat, eksekusiKalkulasiMorfologiData]);

  // ── Auth gate: not yet checked ──
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#F26522" strokeWidth="3" strokeOpacity="0.2"/>
          <path d="M12 2a10 10 0 0110 10" stroke="#F26522" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    );
  }

  // ── Auth gate: not logged in ──
  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-[#F26522] selection:text-white">
      <div>
        <StatusBanner 
          isOnline={isOnline} 
          queueCount={queueCount} 
          isSupabaseConfigured={isSupabaseConfigured} 
        />
        
        <header id="header-bar" className="relative p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm min-h-[72px]">
          {/* Left: Direct Logo link pointing to /logo.png with dynamic fallback to SVG */}
          <div id="logo-icon" className="relative flex items-center justify-center z-10 shrink-0">
            {!logoError ? (
              <img 
                id="logo-image-render"
                src={`${import.meta.env.BASE_URL}logo.png`} 
                alt="Logo Qurban" 
                className="w-24 h-24 object-contain hover:scale-105 transition-transform" 
                onError={() => setLogoError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-[0_2px_4px_rgba(242,101,34,0.15)] select-none hover:scale-105 transition-transform" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 85C15 56 7 40 7 25C7 13.5 16 5 27 5C33.5 5 40 8.5 44 14C45 15.3 47 17 50 17C53 17 55 15.3 56 14C60 8.5 66.5 5 73 5C84 5 93 13.5 93 25C93 40 85 56 50 85Z" fill="#F26522"/>
                <path d="M50 28L25 48V67H75V48L50 28Z" stroke="white" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" fill="none" />
                <path d="M46 67V56C46 53.8 47.8 52 50 52C52.2 52 54 53.8 54 56V67" stroke="white" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" fill="white" />
              </svg>
            )}
          </div>

          {/* Center: Title & Creator centered precisely using absolute layout */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center select-none text-center pointer-events-none w-[180px] sm:w-[260px]">
            <h1 className="text-sm sm:text-base md:text-lg font-black tracking-wider text-slate-900 uppercase font-sans">
              QURBAN <span className="text-[#F26522]">SCANNER</span>
            </h1>
            <p className="text-[8px] sm:text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              by <span className="text-[#F26522]">nana.studio</span>
            </p>
          </div>

          {/* Right: Toggle + Logout Buttons */}
          <div className="z-10 shrink-0 flex items-center gap-2">
            <button 
              id="toggle-view-mode"
              onClick={() => setShowAdmin(!showAdmin)}
              className="flex items-center justify-center gap-1 border border-gray-200 hover:border-[#F26522]/60 hover:bg-[#F26522]/5 bg-white px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold tracking-tight transition-all text-gray-700 hover:text-[#F26522] shadow-sm"
            >
              {showAdmin ? (
                <>
                  <Shield id="icon-shield-active" size={14} className="text-[#F26522]" />
                  <span>MODE SCAN</span>
                </>
              ) : (
                <>
                  <ShieldAlert id="icon-shield-inactive" size={14} className="text-gray-400" />
                  <span>PANEL ADMIN</span>
                </>
              )}
            </button>
            <button
              id="logout-button"
              onClick={handleLogout}
              title="Keluar"
              className="flex items-center justify-center border border-gray-200 hover:border-red-300 hover:bg-red-50 bg-white p-1.5 sm:p-2 rounded-xl transition-all shadow-sm group"
            >
              <LogOut size={14} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 max-w-lg mx-auto w-full mt-4">
          {/* Ringkasan Metrik Data */}
          <div id="stats-dashboard" className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 flex justify-around shadow-sm">
            <div className="text-center">
              <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider mb-1">Kupon Terdaftar</span>
              <div id="stat-total" className="text-2xl font-black text-slate-800">{statistik.total}</div>
            </div>
            <div className="w-px bg-gray-200 self-stretch"></div>
            <div className="text-center">
              <span className="text-[10px] text-[#F26522] font-bold block uppercase tracking-wider mb-1">Sudah Diambil</span>
              <div id="stat-claimed" className="text-2xl font-black text-[#F26522]">{statistik.klaim}</div>
            </div>
            <div className="w-px bg-gray-200 self-stretch"></div>
            <div className="text-center">
              <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider mb-1">Sisa Antrean</span>
              <div id="stat-remaining" className="text-2xl font-black text-slate-800">
                {Math.max(0, statistik.total - statistik.klaim)}
              </div>
            </div>
          </div>

          {showAdmin ? (
            <AdminPanel 
              onDataUpdated={triggerSyncAndRecalculate} 
            />
          ) : (
            <Scanner triggerSyncCheck={triggerSyncAndRecalculate} />
          )}
        </main>
      </div>

      <footer id="footer-copyright" className="p-4 bg-white text-center border-t border-gray-200 text-[10px] text-gray-400 font-mono tracking-tight mt-12">
        Sistem Proteksi Enkripsi Hak Klaim Qurban - Bebas Duplikasi Klaim Fisik.
      </footer>
    </div>
  );
}
