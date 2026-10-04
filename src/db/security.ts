// =====================================================================
// TALLER "ALEXANDER" — UTILIDADES DE CONTRASEÑA (expo-crypto)
//
// Requiere:  npx expo install expo-crypto
//
// Esquema: password_hash = SHA-256(salt + ':' + password), con un salt
// aleatorio de 16 bytes por usuario. Nunca se guarda la contraseña en
// claro. Es suficiente para una base local en el dispositivo; si más
// adelante hay backend, la verificación debe migrar al servidor con un
// KDF lento (bcrypt/argon2).
// =====================================================================

import * as Crypto from "expo-crypto";

const SALT_BYTES = 16;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Genera un salt aleatorio criptográficamente seguro (hex, 32 chars). */
export async function generarSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(SALT_BYTES);
  return bytesToHex(bytes);
}

/** Devuelve el hash hexadecimal de la contraseña con el salt dado. */
export async function hashearPassword(
  password: string,
  salt: string,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

/** Comparación en tiempo constante para evitar filtrar información por timing. */
export function compararSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferencia === 0;
}
