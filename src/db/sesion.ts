// =====================================================================
// TALLER "ALEXANDER" — SESIÓN EN MEMORIA
//
// Guarda quién inició sesión mientras la app está abierta. No se persiste:
// al cerrar la app se pide login otra vez. Si luego se requiere "recordar
// sesión", persistir solo el id_trabajador en expo-secure-store y
// rehidratar con getTrabajadorPorId() (nunca guardar la contraseña).
// =====================================================================

import type { RolNombre, UsuarioSesion } from "./types";

let sesionActual: UsuarioSesion | null = null;

export function iniciarSesion(usuario: UsuarioSesion): void {
  sesionActual = usuario;
}

export function cerrarSesion(): void {
  sesionActual = null;
}

export function getSesion(): UsuarioSesion | null {
  return sesionActual;
}

/** Refresca los datos visibles de la sesión tras editar el perfil (no toca id ni rol). */
export function actualizarSesion(
  cambios: Partial<Pick<UsuarioSesion, "nombre" | "correo" | "tipo_contrato">>,
): void {
  if (sesionActual) sesionActual = { ...sesionActual, ...cambios };
}

export function tieneRol(rol: RolNombre): boolean {
  return sesionActual?.rol === rol;
}

export function esAdmin(): boolean {
  return tieneRol("admin");
}
