import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getKuponLokal, updateKuponLokalStatus } from '../lib/indexedDB';
import { CheckCircle, XCircle, Camera, Keyboard, AlertTriangle } from 'lucide-react';

interface ScannerProps {
  triggerSyncCheck: () => void;
}

interface ScanResultState {
  success: boolean;
  message: string;
  timestamp: string;
}

export default function Scanner({ triggerSyncCheck }: ScannerProps) {
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Use a constant DOM ID for html5-qrcode so it binds predictably.
  const scannerRegionId = "qurban-qr-scanner-region";

  const prosesKupon = async (code: string) => {
    if (!code) return;
    try {
      const dataKupon = await getKuponLokal(code);

      if (!dataKupon) {
        setScanResult({
          success: false,
          message: `Kupon Tidak Valid! Kode [${code}] tidak terdaftar di sistem lokal.`,
          timestamp: new Date().toLocaleTimeString('id-ID')
        });
        return;
      }

      if (dataKupon.status_klaim) {
        const waktuFormat = dataKupon.waktu_klaim 
          ? new Date(dataKupon.waktu_klaim).toLocaleTimeString('id-ID') 
          : 'Waktu tidak diketahui';
        setScanResult({
          success: false,
          message: `⚠️ DITOLAK! Kupon sudah ditukarkan pada: ${waktuFormat}`,
          timestamp: new Date().toLocaleTimeString('id-ID')
        });
      } else {
        const waktuSekarang = new Date().toISOString();
        await updateKuponLokalStatus(code, true, waktuSekarang);
        setScanResult({
          success: true,
          message: `✅ VALID! Daging dapat diserahkan. Kode Kupon: ${code}`,
          timestamp: new Date().toLocaleTimeString('id-ID')
        });
        triggerSyncCheck();
      }
    } catch (err) {
      setErrorLog('Kegagalan sistem memproses kupon.');
    }
  };

  const prosesKuponRef = useRef(prosesKupon);
  useEffect(() => {
    prosesKuponRef.current = prosesKupon;
  }, [prosesKupon]);

  const hasOpenResultModal = !!scanResult;
  const hasOpenPopupRef = useRef(hasOpenResultModal);
  useEffect(() => {
    hasOpenPopupRef.current = hasOpenResultModal;
  }, [hasOpenResultModal]);

  useEffect(() => {
    if (activeTab !== 'camera' || !isCameraActive) {
      return;
    }

    const html5QrcodeScanner = new Html5QrcodeScanner(scannerRegionId, {
      fps: 10,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdge * 0.7);
        return {
          width: Math.max(qrboxSize, 50),
          height: Math.max(qrboxSize, 50)
        };
      },
      rememberLastUsedCamera: true,
      supportedScanTypes: [0] // Camera only
    } as any, false);

    const onScanSuccess = async (decodedText: string) => {
      // Guard callback to prevent double processing when a modal is active
      if (hasOpenPopupRef.current) {
        return;
      }
      try {
        const cleanedCode = decodedText.trim();
        await prosesKuponRef.current(cleanedCode);
      } catch (err) {
        setErrorLog('Kegagalan sistem membaca basis data lokal.');
      }
    };

    const onScanFailure = () => {
      // Silent scan failure to avoid spam
    };

    try {
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    } catch (e) {
      console.error("Gagal initialize scanner:", e);
    }

    return () => {
      try {
        html5QrcodeScanner.clear().catch((error) => {
          console.warn("Failed to clear html5QrcodeScanner. ", error);
        });
      } catch (e) {
        console.warn("Error running clear():", e);
      }
    };
  }, [activeTab, isCameraActive]);

  const handeManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = manualCode.trim().toUpperCase();
    if (!finalCode) return;
    prosesKupon(finalCode);
    setManualCode('');
  };

  return (
    <div 
      id="scanner-card"
      className="w-full max-w-md mx-auto bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"
    >
      {/* Tab Switcher */}
      <div 
        id="scanner-tab-container"
        className="flex border-b border-gray-100 mb-5"
      >
        <button
          id="btn-tab-camera"
          onClick={() => setActiveTab('camera')}
          className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'camera' 
              ? 'border-[#F26522] text-[#F26522] bg-[#F26522]/5' 
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Camera size={16} />
          Kamera Pemindai
        </button>
        <button
          id="btn-tab-manual"
          onClick={() => {
            setActiveTab('manual');
            setScanResult(null);
          }}
          className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'manual' 
              ? 'border-[#F26522] text-[#F26522] bg-[#F26522]/5' 
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Keyboard size={16} />
          Input Manual
        </button>
      </div>

      {activeTab === 'camera' ? (
        <div id="camera-section">
          <div className="w-full flex justify-between items-center mb-3.5">
            <span className="text-xs font-bold text-gray-500 px-3 py-1 bg-gray-50 rounded-full border border-gray-150 font-mono flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-[#F26522] animate-ping' : 'bg-rose-500'}`}></span>
              STATUS: {isCameraActive ? 'SISTEM PINDAI AKTIF' : 'SISTEM PINDAI MATI'}
            </span>
          </div>

          {isCameraActive ? (
            <>
              <div 
                id={scannerRegionId} 
                className="qr-scanner-override overflow-hidden rounded-lg bg-slate-900 border border-gray-200 p-2 min-h-[160px]"
              ></div>
              <p className="text-gray-500 text-[11px] text-center mt-2.5">
                Pastikan kode QR bersih dan posisikan di tengah kamera.
              </p>
              <button
                id="btn-gate-stop-camera"
                onClick={() => setIsCameraActive(false)}
                className="w-full mt-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
              >
                <XCircle size={15} /> TUTUP PINDAIAN (Stop Gate)
              </button>
            </>
          ) : (
            <div className="w-full h-[220px] rounded-lg bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center p-6 text-center">
              <Camera className="text-gray-300 mb-3 animate-pulse" size={44} />
              <p className="text-sm font-bold text-gray-700">Kamera Pemindai Nonaktif</p>
              <p className="text-[11px] text-gray-400 mt-1.5 max-w-[280px] leading-relaxed">
                Klik tombol di bawah untuk membuka gate kamera secara langsung.
              </p>
              <button
                id="btn-gate-start-camera"
                onClick={() => setIsCameraActive(true)}
                className="w-full mt-5 bg-[#F26522] hover:bg-[#d44e19] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
              >
                <Camera size={15} /> BUKA PINDAIAN (Mulai Gate)
              </button>
            </div>
          )}
        </div>
      ) : (
        <form 
          id="manual-form"
          onSubmit={handeManualSubmit} 
          className="space-y-4"
        >
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200/80 flex flex-col gap-2">
            <label className="block text-xs font-bold text-gray-500">
              MASUKKAN KODE KUPON SECARA MANUAL
            </label>
            <div className="flex gap-2">
              <input
                id="input-manual-code"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="CONTOH: RZ-WNSR-00000001"
                className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#F26522] text-slate-800 uppercase font-mono tracking-wider shadow-sm"
              />
              <button
                id="btn-manual-submit"
                type="submit"
                className="bg-[#F26522] hover:bg-[#d44e19] text-white font-bold px-4 py-2 rounded-md text-sm transition-colors shadow-sm"
                disabled={!manualCode.trim()}
              >
                Proses
              </button>
            </div>
          </div>
        </form>
      )}

      {errorLog && (
        <div 
          id="scanner-error-log"
          className="mt-3 p-3 bg-rose-50 text-rose-700 rounded-md text-xs border border-rose-100 flex gap-2 items-center"
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span>{errorLog}</span>
        </div>
      )}

      {/* Modern Pop-Up Dialog Modal Overlay for Explicit Coupon Response */}
      {scanResult && (
        <div 
          id="scan-result-modal-overlay"
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            id="scan-result-modal-card"
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl flex flex-col items-center justify-between text-slate-800"
          >
            <div className="mb-4">
              {scanResult.success ? (
                <div className="w-16 h-16 bg-[#F26522]/10 text-[#F26522] rounded-full flex items-center justify-center border border-[#F26522]/30 animate-pulse">
                  <CheckCircle size={36} />
                </div>
              ) : (
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-200">
                  <XCircle size={36} />
                </div>
              )}
            </div>

            <h3 className={`text-lg font-black tracking-wide uppercase mb-2 ${
              scanResult.success ? 'text-[#F26522]' : 'text-rose-600'
            }`}>
              {scanResult.success ? 'Kupon Valid!' : 'KUPON INVALID / DITOLAK'}
            </h3>

            <p className="text-sm text-center font-bold leading-relaxed mb-4 text-gray-700">
              {scanResult.message}
            </p>

            <span className="text-[10px] text-gray-400 font-mono mb-6 bg-gray-50 py-1.5 px-3 rounded border border-gray-150">
              Maksimum Scan Lock: {scanResult.timestamp}
            </span>

            <button
              id="btn-close-modal-result"
              onClick={() => {
                setScanResult(null);
                setErrorLog(null);
              }}
              className="w-full py-3 rounded-xl font-extrabold text-sm tracking-widest transition-all bg-[#F26522] hover:bg-[#d44e19] text-white shadow-md active:scale-98 uppercase"
            >
              Tutup & Pindai Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
