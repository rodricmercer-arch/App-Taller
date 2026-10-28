// Validaciones de entrada compartidas por los formularios (Taller "Alexander")

const REGEX_PLACA = /^[A-Z0-9]{3}-?[A-Z0-9]{3}$/;
const REGEX_DNI = /^\d{8}$/;
const REGEX_RUC = /^(10|15|17|20)\d{9}$/;
const REGEX_CELULAR_PE = /^(\+?51)?9\d{8}$/;
const REGEX_NUMERO = /^(\d+\.?\d*|\.\d+)$/;

// ---------------- PLACA ----------------

/** Mientras se escribe: mayúsculas, sin espacios ni símbolos (solo A-Z, 0-9 y guion). */
export const limpiarPlaca = (texto: string): string =>
  texto.toUpperCase().replace(/[^A-Z0-9-]/g, "");

/** Devuelve la placa en formato canónico "ABC-123", o null si no es válida. */
export function normalizarPlaca(texto: string): string | null {
  const limpia = texto.toUpperCase().trim();
  if (!REGEX_PLACA.test(limpia)) return null;
  const sinGuion = limpia.replace("-", "");
  return `${sinGuion.slice(0, 3)}-${sinGuion.slice(3)}`;
}

// ---------------- DOCUMENTO (DNI / RUC) ----------------

/** Mientras se escribe: solo dígitos. */
export const limpiarDigitos = (texto: string): string =>
  texto.replace(/\D/g, "");

/** Mensaje de error o null si el documento es válido para su tipo. */
export function errorDocumento(
  tipo: "DNI" | "RUC",
  numero: string,
): string | null {
  const n = numero.trim();
  if (tipo === "DNI") {
    return REGEX_DNI.test(n)
      ? null
      : "El DNI debe tener exactamente 8 dígitos numéricos.";
  }
  return REGEX_RUC.test(n)
    ? null
    : "El RUC debe tener 11 dígitos y empezar con 10, 15, 17 o 20.";
}

// ---------------- TELÉFONO ----------------

/** Mientras se escribe: solo dígitos y un "+" únicamente al inicio. */
export function limpiarTelefono(texto: string): string {
  const base = texto.replace(/[^\d+]/g, "");
  return base.startsWith("+")
    ? "+" + base.slice(1).replace(/\+/g, "")
    : base.replace(/\+/g, "");
}

/** Celular peruano: 9 dígitos que empiezan con 9, con +51 / 51 opcional. */
export function errorTelefono(telefono: string): string | null {
  const n = telefono.replace(/[\s-]/g, "");
  return REGEX_CELULAR_PE.test(n)
    ? null
    : "El teléfono debe ser un celular peruano: 9 dígitos que empiecen con 9 (opcionalmente con +51 al inicio).";
}

// ---------------- NÚMEROS (lecturas, capacidades) ----------------

/** Mientras se escribe: solo dígitos y un único separador decimal (la coma se convierte en punto). */
export function filtrarNumerico(texto: string): string {
  const limpio = texto.replace(/[^\d.,]/g, "").replace(/,/g, ".");
  const i = limpio.indexOf(".");
  return i === -1
    ? limpio
    : limpio.slice(0, i + 1) + limpio.slice(i + 1).replace(/\./g, "");
}

/** Devuelve el número (>= 0) o null si el texto no es un número válido. Rechaza "-5", "1e5", "abc". */
export function parseNumeroNoNegativo(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!REGEX_NUMERO.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
