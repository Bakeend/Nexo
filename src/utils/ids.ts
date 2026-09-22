import * as Crypto from 'expo-crypto';

export const newId = () => Crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
