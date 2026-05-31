import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface StatusBannerProps {
  isOnline: boolean;
  queueCount: number;
  isSupabaseConfigured: boolean;
}

export default function StatusBanner({ isOnline, queueCount, isSupabaseConfigured }: StatusBannerProps) {
  return (
    <div className="w-full flex flex-col">
      <div 
        id="status-banner-main"
        className={`w-full py-2.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors duration-300 ${
          isOnline && isSupabaseConfigured 
            ? 'bg-[#F26522]/5 text-[#F26522] border-b border-[#F26522]/10' 
            : 'bg-amber-50 text-amber-800 border-b border-amber-200'
        }`}
      >
        <div className="flex items-center gap-3 text-sm font-semibold">
          {isOnline && isSupabaseConfigured ? (
            <Wifi id="icon-wifi-online" size={16} className="text-[#F26522] shrink-0" />
          ) : (
            <WifiOff id="icon-wifi-offline" size={16} className="text-amber-600 shrink-0" />
          )}
          <span>
            {isOnline && isSupabaseConfigured 
              ? 'Sistem Berjalan dalam Mode Daring (Real-time Cloud Sync)' 
              : !isSupabaseConfigured 
                ? 'Sistem Berjalan dalam Mode Luring Lokal (IndexedDB)' 
                : 'Sistem Berjalan dalam Mode Luring (Koneksi Cloud Terputus)'}
          </span>
        </div>
        
        {queueCount > 0 && (
          <span 
            id="status-banner-queue-badge"
            className="text-xs bg-amber-600 text-white font-bold px-2 py-0.5 rounded-full animate-pulse self-start sm:self-auto"
          >
            {queueCount} Antrean Tersimpan di Memori
          </span>
        )}
      </div>

      {!isSupabaseConfigured && (
        <div 
          id="status-banner-warning"
          className="w-full py-2 px-4 bg-amber-50/40 text-amber-700 border-b border-amber-100 flex items-center gap-2 text-xs"
        >
          <AlertCircle id="icon-alert" size={12} className="text-amber-600 shrink-0" />
          <span>
            Database Cloud belum terhubung. Konfigurasikan <strong>VITE_SUPABASE_URL</strong> di panel Rahasia jika ingin mengaktifkan sinkronisasi cloud.
          </span>
        </div>
      )}
    </div>
  );
}
