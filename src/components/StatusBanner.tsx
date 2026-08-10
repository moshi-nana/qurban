import React from 'react';

interface StatusBannerProps {
  isOnline: boolean;
  queueCount: number;
  isSupabaseConfigured: boolean;
}

export default function StatusBanner({ isOnline, queueCount, isSupabaseConfigured }: StatusBannerProps) {
  const online = isOnline && isSupabaseConfigured;
  const label = online
    ? 'Mode Daring — Real-time Cloud Sync'
    : !isSupabaseConfigured
      ? 'Mode Luring Lokal (IndexedDB)'
      : 'Mode Luring — Koneksi Cloud Terputus';

  return (
    <div
      id="status-indicator"
      title={label}
      className="inline-flex items-center gap-1.5 cursor-default"
    >
      <span
        id="status-indicator-dot"
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          online ? 'bg-[#F26522]' : 'bg-amber-500 animate-pulse'
        }`}
      />
      {queueCount > 0 && (
        <span
          id="status-indicator-queue-badge"
          title={`${queueCount} Antrean Tersimpan di Memori`}
          className="text-[10px] leading-none bg-amber-600 text-white font-bold px-1.5 py-1 rounded-full"
        >
          {queueCount}
        </span>
      )}
    </div>
  );
}
