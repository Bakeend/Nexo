const prefix = 'nexo-media://';
const databaseName = 'nexo-media';
const storeName = 'files';
const objectUrls = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('O armazenamento local não está disponível neste navegador.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento local.'));
  });
}

export function isWebMediaUri(uri: string) {
  return uri.startsWith(prefix);
}

export async function saveWebMedia(blob: Blob): Promise<string> {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put(blob, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Não foi possível salvar o anexo.'));
      transaction.onabort = () => reject(transaction.error || new Error('Não foi possível salvar o anexo.'));
    });
    return `${prefix}${key}`;
  } finally {
    database.close();
  }
}

export async function deleteWebMedia(uri: string): Promise<void> {
  if (!isWebMediaUri(uri)) return;
  const objectUrl = objectUrls.get(uri);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrls.delete(uri);

  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).delete(uri.slice(prefix.length));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Não foi possível remover o anexo temporário.'));
      transaction.onabort = () => reject(transaction.error || new Error('Não foi possível remover o anexo temporário.'));
    });
  } finally {
    database.close();
  }
}

export async function clearWebMedia(): Promise<void> {
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  objectUrls.clear();

  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('NÃ£o foi possÃ­vel limpar os anexos temporÃ¡rios.'));
      transaction.onabort = () => reject(transaction.error || new Error('NÃ£o foi possÃ­vel limpar os anexos temporÃ¡rios.'));
    });
  } finally {
    database.close();
  }
}

export async function getWebMedia(uri: string): Promise<Blob | null> {
  if (!isWebMediaUri(uri)) return null;
  const database = await openDatabase();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(uri.slice(prefix.length));
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error || new Error('Não foi possível abrir o anexo.'));
    });
  } finally {
    database.close();
  }
}

export async function webMediaObjectUrl(uri: string): Promise<string | null> {
  const cached = objectUrls.get(uri);
  if (cached) return cached;
  const blob = await getWebMedia(uri);
  if (!blob) return null;
  const objectUrl = URL.createObjectURL(blob);
  objectUrls.set(uri, objectUrl);
  return objectUrl;
}
