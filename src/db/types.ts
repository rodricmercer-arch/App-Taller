// =====================================================================
// TALLER "ALEXANDER" — TIPOS TYPESCRIPT (strict mode)
// Reflejan 1:1 las columnas de schema.sql para tipar los resultados
// de expo-sqlite (getAllAsync<T>, getFirstAsync<T>, etc.)
// =====================================================================

export type TipoDocumentoIdentidad = 'RUC' | 'DNI';
export type TipoCliente = 'Empresa' | 'Persona Natural';
export type TipoActivo = 'Vehiculo' | 'EquipoEstacionario';
export type TipoMedidor = 'Odometro' | 'Horometro' | 'Ciclos';
export type TipoContrato = 'Fijo' | 'Subcontratado';

/** Roles del sistema. Catálogo cerrado: no agregar más sin migrar schema.sql. */
export const ROLES = ['admin', 'trabajador'] as const;
export type RolNombre = (typeof ROLES)[number];
export type EstadoRepuesto = 'Activo' | 'Descontinuado';
export type EstadoOrden = 'Pendiente' | 'En Proceso' | 'Completada' | 'Cancelada';
export type EstadoCotizacion = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Anulada';
export type TipoItemDetalle = 'Repuesto' | 'Servicio';
export type EstadoDisponibilidad = 'VENCIDO' | 'PROXIMO' | 'OK';

// SQLite no tiene boolean real: expo-sqlite devuelve 0 | 1 en columnas INTEGER
export type SQLiteBoolean = 0 | 1;

export interface Cliente {
  id_cliente: number;
  tipo_documento_identidad: TipoDocumentoIdentidad;
  numero_documento: string;
  nombre_razon_social: string;
  telefono: string;
  tipo_cliente: TipoCliente;
}

export interface TipoUnidad {
  id_tipo_unidad: number;
  nombre: string;
}

export interface Marca {
  id_marca: number;
  nombre: string;
}

export interface Rol {
  id_rol: number;
  nombre: RolNombre;
}

export interface TipoMantenimiento {
  id_tipo_mantenimiento: number;
  nombre: string;
  intervalo_valor: number;
  tipo_medidor_aplicable: TipoMedidor;
}

export interface CatalogoServicio {
  id_servicio: number;
  nombre: string;
  descripcion: string | null;
  precio_referencial: number;
}

export interface TipoDocumento {
  id_tipo_documento: number;
  nombre: string;
  es_documento_externo: SQLiteBoolean;
}

export interface Proveedor {
  id_proveedor: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  contacto: string | null;
  ubicacion: string | null;
}

export interface Activo {
  id_activo: number;
  id_tipo_unidad: number;
  id_marca: number | null;
  id_cliente: number;
  tipo_activo: TipoActivo;
  placa: string | null;
  capacidad: number | null;
}

export interface Medidor {
  id_medidor: number;
  id_activo: number;
  tipo_medidor: TipoMedidor;
  lectura_actual: number;
  fecha_ultima_lectura: string; // ISO 'YYYY-MM-DD'
}

/** Fila completa de la tabla Trabajador (incluye hash: NO exponer a la UI). */
export interface Trabajador {
  id_trabajador: number;
  id_rol: number;
  nombre: string;
  tipo_contrato: TipoContrato;
  correo: string | null;
  telefono: string | null;
  dni: string | null;
  password_hash: string | null;
  password_salt: string | null;
  activo: SQLiteBoolean;
}

export interface Repuesto {
  id_repuesto: number;
  nombre: string;
  codigo_referencia: string | null;
  stock_actual: number;
  es_comercial: SQLiteBoolean;
  estado_operativo: EstadoRepuesto;
}

export interface OrdenDeTrabajo {
  id_orden: number;
  id_activo: number;
  id_medidor: number;
  id_tipo_mantenimiento: number;
  responsable_id: number;
  valor_lectura: number;
  fecha: string;
  descripcion: string | null;
  es_auxilio: SQLiteBoolean;
  ubicacion_auxilio: string | null;
  estado: EstadoOrden;
}

export interface Cotizacion {
  id_cotizacion: number;
  id_activo: number;
  id_tipo_documento: number;
  fecha_emision: string;
  monto_total: number;
  estado: EstadoCotizacion;
}

export interface FotoCotizacion {
  id_foto: number;
  id_cotizacion: number;
  url_imagen: string;
  fecha_subida: string;
}

export interface DetalleCotizacion {
  id_detalle: number;
  id_cotizacion: number;
  id_repuesto: number | null;
  id_servicio: number | null;
  tipo_item: TipoItemDetalle;
  cantidad: number;
  precio_unitario: number;
}

export interface OrdenTrabajoTrabajador {
  id_orden: number;
  id_trabajador: number;
  tipo_participacion: TipoContrato;
  rol_en_trabajo: string | null;
}

export interface RepuestoProveedor {
  id_repuesto: number;
  id_proveedor: number;
  precio_ofrecido: number;
}

// ---- Tipos de resultado para las consultas de negocio (queries.sql) ----

export interface DisponibilidadMantenimiento {
  id_activo: number;
  placa: string | null;
  tipo_unidad: string;
  id_medidor: number;
  tipo_medidor: TipoMedidor;
  lectura_actual: number;
  tipo_mantenimiento: string;
  intervalo_valor: number;
  ultima_lectura_servicio: number;
  proxima_lectura_objetivo: number;
  restante: number;
  estado_disponibilidad: EstadoDisponibilidad;
}

export interface MejorProveedorRepuesto {
  id_repuesto: number;
  nombre: string;
  nombre_comercial: string | null;
  precio_ofrecido: number;
}

export interface DetalleCotizacionResuelto {
  id_detalle: number;
  tipo_item: TipoItemDetalle;
  descripcion_item: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_calculado: number;
}

export interface HistorialActivoRow {
  id_orden: number;
  fecha: string;
  tipo_mantenimiento: string;
  valor_lectura: number;
  estado: EstadoOrden;
  es_auxilio: SQLiteBoolean;
  responsable: string;
}

// ---- Gestión de personal y autenticación (Etapa 1) ----

/** Trabajador listo para mostrar en la UI: sin hash/salt y con el rol resuelto. */
export interface TrabajadorPublico {
  id_trabajador: number;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  dni: string | null;
  tipo_contrato: TipoContrato;
  activo: SQLiteBoolean;
  rol: RolNombre;
}

export interface NuevoTrabajadorInput {
  nombre: string;
  correo: string;
  telefono: string;
  dni: string;
  password: string;
  rol: RolNombre;
  tipo_contrato: TipoContrato;
}

/** Todos los campos son opcionales: solo se actualiza lo que venga definido. */
export interface ActualizarTrabajadorInput {
  nombre?: string;
  correo?: string;
  telefono?: string;
  dni?: string;
  rol?: RolNombre;
  tipo_contrato?: TipoContrato;
  activo?: boolean;
  /** Si viene, reemplaza la contraseña (reseteo por parte del admin). */
  nuevaPassword?: string;
  
}

/** Campos que el propio usuario puede editar de su perfil (sin rol ni activo). */
export type ActualizarPerfilInput = Pick<
  ActualizarTrabajadorInput,
  "nombre" | "correo" | "telefono" | "dni" | "tipo_contrato"
>;

export interface FiltroTrabajadores {
  rol?: RolNombre;
  soloActivos?: boolean;
}

/** Datos mínimos de la persona autenticada (nunca incluye credenciales). */
export interface UsuarioSesion {
  id_trabajador: number;
  nombre: string;
  correo: string;
  rol: RolNombre;
  tipo_contrato: TipoContrato;
}

export type MotivoFalloLogin =
  | 'CREDENCIALES_INVALIDAS'
  | 'USUARIO_INACTIVO'
  | 'ROL_NO_AUTORIZADO';

export type ResultadoLogin =
  | { ok: true; usuario: UsuarioSesion }
  | { ok: false; motivo: MotivoFalloLogin };

export type TrabajadorErrorCodigo =
  | 'DATOS_INVALIDOS'
  | 'CORREO_DUPLICADO'
  | 'DNI_DUPLICADO'
  | 'NO_ENCONTRADO'
  | 'ULTIMO_ADMIN'
  | 'TIENE_HISTORIAL'
  | 'PASSWORD_ACTUAL_INCORRECTA';
