export interface Kupon {
  id?: string;
  kode_qr: string;
  status_klaim: boolean;
  waktu_klaim: string | null;
  lokasi_pemindaian: string;
}

const DB_NAME = 'QurbanScannerDB';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store untuk data master kupon sinkronisasi lokal
      if (!db.objectStoreNames.contains('kupon')) {
        db.createObjectStore('kupon', { keyPath: 'kode_qr' });
      }
      
      // Store antrean sinkronisasi untuk data hasil scan offline
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'kode_qr' });
      }
    };
  });
};

export const saveKuponLokalBulk = async (kuponList: Kupon[]): Promise<boolean> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('kupon', 'readwrite');
    const store = transaction.objectStore('kupon');
    
    kuponList.forEach(kupon => {
      store.put(kupon);
    });

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getKuponLokal = async (kodeQr: string): Promise<Kupon | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('kupon', 'readonly');
    const store = transaction.objectStore('kupon');
    const request = store.get(kodeQr);

    request.onsuccess = () => resolve(request.result as Kupon | undefined);
    request.onerror = () => reject(request.error);
  });
};

export const getKuponLokalAll = async (): Promise<Kupon[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('kupon', 'readonly');
    const store = transaction.objectStore('kupon');
    const request = store.getAll();

    request.onsuccess = () => resolve((request.result as Kupon[]) || []);
    request.onerror = () => reject(request.error);
  });
};

export const updateKuponLokalStatus = async (kodeQr: string, status: boolean, waktuKlaim: string | null): Promise<boolean> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['kupon', 'sync_queue'], 'readwrite');
    const kuponStore = transaction.objectStore('kupon');
    const queueStore = transaction.objectStore('sync_queue');

    const getReq = kuponStore.get(kodeQr);
    getReq.onsuccess = () => {
      const data = (getReq.result as Kupon) || {
        kode_qr: kodeQr,
        status_klaim: status,
        waktu_klaim: waktuKlaim,
        lokasi_pemindaian: 'pos_utama'
      };
      data.status_klaim = status;
      data.waktu_klaim = waktuKlaim;
      
      kuponStore.put(data);
      queueStore.put(data);
    };

    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getSyncQueue = async (): Promise<Kupon[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sync_queue', 'readonly');
    const store = transaction.objectStore('sync_queue');
    const request = store.getAll();

    request.onsuccess = () => resolve((request.result as Kupon[]) || []);
    request.onerror = () => reject(request.error);
  });
};

export const removeKuponFromQueue = async (kodeQr: string): Promise<boolean> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.delete(kodeQr);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const clearAllLokalData = async (): Promise<boolean> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['kupon', 'sync_queue'], 'readwrite');
    transaction.objectStore('kupon').clear();
    transaction.objectStore('sync_queue').clear();
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};
