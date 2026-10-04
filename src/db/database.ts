// =====================================================================
// TALLER "ALEXANDER" — CAPA DE DATOS (expo-sqlite)
// Expo SDK ~57 / React Native 0.86 / TypeScript strict
//
// Fase actual: solo lógica y consultas (sin UI). Este módulo expone:
//   - initDatabase(): crea/abre la BD y aplica el esquema completo
//   - funciones de consulta tipadas, listas para usarse luego desde
//     hooks/pantallas cuando empiece la fase de integración con UI
// =====================================================================

import * as SQLite from "expo-sqlite";
import { compararSeguro, generarSalt, hashearPassword } from "./security";
import type {
  ActualizarTrabajadorInput,
  Cliente,
  DetalleCotizacionResuelto,
  DisponibilidadMantenimiento,
  FiltroTrabajadores,
  HistorialActivoRow,
  Marca,
  MejorProveedorRepuesto,
  NuevoTrabajadorInput,
  ResultadoLogin,
  RolNombre,
  TipoUnidad,
  TrabajadorErrorCodigo,
  TrabajadorPublico,
  UsuarioSesion,
  ActualizarPerfilInput,
} from "./types";

const DB_NAME = "taller_alexander.db";

// ---------------------------------------------------------------------
// 1. ESQUEMA (misma fuente de verdad que schema.sql).
//    Se embebe como string porque Metro/Expo no importa .sql como texto
//    sin un transformer adicional; para el DDL "real" de referencia usa
//    siempre schema.sql. Este bloque debe mantenerse sincronizado con él.
// ---------------------------------------------------------------------
const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Cliente (
    id_cliente               INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_documento_identidad TEXT    NOT NULL CHECK (tipo_documento_identidad IN ('RUC','DNI')),
    numero_documento         TEXT    NOT NULL UNIQUE,
    nombre_razon_social      TEXT    NOT NULL,
    telefono                 TEXT    NOT NULL,
    tipo_cliente             TEXT    NOT NULL CHECK (tipo_cliente IN ('Empresa','Persona Natural'))
);

CREATE TABLE IF NOT EXISTS TipoUnidad (
    id_tipo_unidad INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Marca (
    id_marca INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre   TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Rol (
    id_rol INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS TipoMantenimiento (
    id_tipo_mantenimiento INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre                 TEXT    NOT NULL UNIQUE,
    intervalo_valor        INTEGER NOT NULL,
    tipo_medidor_aplicable TEXT    NOT NULL CHECK (tipo_medidor_aplicable IN ('Odometro','Horometro','Ciclos'))
);

CREATE TABLE IF NOT EXISTS CatalogoServicio (
    id_servicio         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre              TEXT    NOT NULL,
    descripcion         TEXT,
    precio_referencial  REAL    NOT NULL
);

CREATE TABLE IF NOT EXISTS TipoDocumento (
    id_tipo_documento    INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre               TEXT    NOT NULL UNIQUE,
    es_documento_externo INTEGER NOT NULL CHECK (es_documento_externo IN (0,1))
);

CREATE TABLE IF NOT EXISTS Proveedor (
    id_proveedor      INTEGER PRIMARY KEY AUTOINCREMENT,
    ruc               TEXT    NOT NULL UNIQUE,
    razon_social      TEXT    NOT NULL,
    nombre_comercial  TEXT,
    contacto          TEXT,
    ubicacion         TEXT
);

CREATE TABLE IF NOT EXISTS Activo (
    id_activo      INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tipo_unidad INTEGER NOT NULL,
    id_marca       INTEGER,
    id_cliente     INTEGER NOT NULL,
    tipo_activo    TEXT    NOT NULL CHECK (tipo_activo IN ('Vehiculo','EquipoEstacionario')),
    placa          TEXT,
    capacidad      REAL,
    FOREIGN KEY (id_tipo_unidad) REFERENCES TipoUnidad(id_tipo_unidad),
    FOREIGN KEY (id_marca)       REFERENCES Marca(id_marca),
    FOREIGN KEY (id_cliente)     REFERENCES Cliente(id_cliente)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activo_placa_unique
    ON Activo(placa) WHERE placa IS NOT NULL;

CREATE TABLE IF NOT EXISTS Medidor (
    id_medidor            INTEGER PRIMARY KEY AUTOINCREMENT,
    id_activo             INTEGER NOT NULL,
    tipo_medidor          TEXT    NOT NULL CHECK (tipo_medidor IN ('Odometro','Horometro','Ciclos')),
    lectura_actual        REAL    NOT NULL,
    fecha_ultima_lectura  TEXT    NOT NULL,
    FOREIGN KEY (id_activo) REFERENCES Activo(id_activo)
);

CREATE TABLE IF NOT EXISTS Trabajador (
    id_trabajador  INTEGER PRIMARY KEY AUTOINCREMENT,
    id_rol         INTEGER NOT NULL,
    nombre         TEXT    NOT NULL,
    tipo_contrato  TEXT    NOT NULL CHECK (tipo_contrato IN ('Fijo','Subcontratado')),
    correo         TEXT,
    telefono       TEXT,
    dni            TEXT,
    password_hash  TEXT,
    password_salt  TEXT,
    activo         INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
    FOREIGN KEY (id_rol) REFERENCES Rol(id_rol)
);

CREATE TABLE IF NOT EXISTS Repuesto (
    id_repuesto        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre             TEXT    NOT NULL,
    codigo_referencia  TEXT    UNIQUE,
    stock_actual       INTEGER NOT NULL DEFAULT 0,
    es_comercial       INTEGER NOT NULL CHECK (es_comercial IN (0,1)),
    estado_operativo   TEXT    NOT NULL DEFAULT 'Activo' CHECK (estado_operativo IN ('Activo','Descontinuado'))
);

CREATE TABLE IF NOT EXISTS OrdenDeTrabajo (
    id_orden               INTEGER PRIMARY KEY AUTOINCREMENT,
    id_activo              INTEGER NOT NULL,
    id_medidor             INTEGER NOT NULL,
    id_tipo_mantenimiento  INTEGER NOT NULL,
    responsable_id         INTEGER NOT NULL,
    valor_lectura          REAL    NOT NULL,
    fecha                  TEXT    NOT NULL,
    descripcion            TEXT,
    es_auxilio             INTEGER NOT NULL CHECK (es_auxilio IN (0,1)),
    ubicacion_auxilio      TEXT,
    estado                 TEXT    NOT NULL DEFAULT 'Pendiente'
                                    CHECK (estado IN ('Pendiente','En Proceso','Completada','Cancelada')),
    FOREIGN KEY (id_activo)             REFERENCES Activo(id_activo),
    FOREIGN KEY (id_medidor)            REFERENCES Medidor(id_medidor),
    FOREIGN KEY (id_tipo_mantenimiento) REFERENCES TipoMantenimiento(id_tipo_mantenimiento),
    FOREIGN KEY (responsable_id)        REFERENCES Trabajador(id_trabajador)
);

CREATE TABLE IF NOT EXISTS Cotizacion (
    id_cotizacion      INTEGER PRIMARY KEY AUTOINCREMENT,
    id_activo          INTEGER NOT NULL,
    id_tipo_documento  INTEGER NOT NULL,
    fecha_emision      TEXT    NOT NULL,
    monto_total        REAL    NOT NULL DEFAULT 0,
    estado             TEXT    NOT NULL DEFAULT 'Pendiente'
                               CHECK (estado IN ('Pendiente','Aprobada','Rechazada','Anulada')),
    FOREIGN KEY (id_activo)         REFERENCES Activo(id_activo),
    FOREIGN KEY (id_tipo_documento) REFERENCES TipoDocumento(id_tipo_documento)
);

CREATE TABLE IF NOT EXISTS FotoCotizacion (
    id_foto        INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cotizacion  INTEGER NOT NULL,
    url_imagen     TEXT    NOT NULL,
    fecha_subida   TEXT    NOT NULL,
    FOREIGN KEY (id_cotizacion) REFERENCES Cotizacion(id_cotizacion) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS DetalleCotizacion (
    id_detalle       INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cotizacion    INTEGER NOT NULL,
    id_repuesto      INTEGER,
    id_servicio      INTEGER,
    tipo_item        TEXT    NOT NULL CHECK (tipo_item IN ('Repuesto','Servicio')),
    cantidad         INTEGER NOT NULL,
    precio_unitario  REAL    NOT NULL,
    FOREIGN KEY (id_cotizacion) REFERENCES Cotizacion(id_cotizacion) ON DELETE CASCADE,
    FOREIGN KEY (id_repuesto)   REFERENCES Repuesto(id_repuesto),
    FOREIGN KEY (id_servicio)   REFERENCES CatalogoServicio(id_servicio),
    CHECK (
        (tipo_item = 'Repuesto' AND id_repuesto IS NOT NULL AND id_servicio IS NULL)
        OR
        (tipo_item = 'Servicio' AND id_servicio IS NOT NULL AND id_repuesto IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS OrdenTrabajo_Trabajador (
    id_orden             INTEGER NOT NULL,
    id_trabajador        INTEGER NOT NULL,
    tipo_participacion   TEXT    NOT NULL CHECK (tipo_participacion IN ('Fijo','Subcontratado')),
    rol_en_trabajo       TEXT,
    PRIMARY KEY (id_orden, id_trabajador),
    FOREIGN KEY (id_orden)      REFERENCES OrdenDeTrabajo(id_orden),
    FOREIGN KEY (id_trabajador) REFERENCES Trabajador(id_trabajador)
);

CREATE TABLE IF NOT EXISTS RepuestoProveedor (
    id_repuesto      INTEGER NOT NULL,
    id_proveedor     INTEGER NOT NULL,
    precio_ofrecido  REAL    NOT NULL,
    PRIMARY KEY (id_repuesto, id_proveedor),
    FOREIGN KEY (id_repuesto)  REFERENCES Repuesto(id_repuesto),
    FOREIGN KEY (id_proveedor) REFERENCES Proveedor(id_proveedor)
);

CREATE INDEX IF NOT EXISTS idx_activo_cliente        ON Activo(id_cliente);
CREATE INDEX IF NOT EXISTS idx_medidor_activo         ON Medidor(id_activo);
CREATE INDEX IF NOT EXISTS idx_orden_activo           ON OrdenDeTrabajo(id_activo);
CREATE INDEX IF NOT EXISTS idx_orden_medidor          ON OrdenDeTrabajo(id_medidor);
CREATE INDEX IF NOT EXISTS idx_orden_tipomant         ON OrdenDeTrabajo(id_tipo_mantenimiento);
CREATE INDEX IF NOT EXISTS idx_cotizacion_activo      ON Cotizacion(id_activo);
CREATE INDEX IF NOT EXISTS idx_detalle_cotizacion     ON DetalleCotizacion(id_cotizacion);
CREATE INDEX IF NOT EXISTS idx_detalle_repuesto       ON DetalleCotizacion(id_repuesto);
CREATE INDEX IF NOT EXISTS idx_repuestoprov_repuesto  ON RepuestoProveedor(id_repuesto);

DROP TRIGGER IF EXISTS trg_orden_valida_activo_insert;
CREATE TRIGGER trg_orden_valida_activo_insert
BEFORE INSERT ON OrdenDeTrabajo
FOR EACH ROW
WHEN NEW.id_activo <> (SELECT id_activo FROM Medidor WHERE id_medidor = NEW.id_medidor)
BEGIN
    SELECT RAISE(ABORT, 'id_activo no coincide con el activo del medidor referenciado (id_medidor)');
END;

DROP TRIGGER IF EXISTS trg_orden_valida_activo_update;
CREATE TRIGGER trg_orden_valida_activo_update
BEFORE UPDATE OF id_activo, id_medidor ON OrdenDeTrabajo
FOR EACH ROW
WHEN NEW.id_activo <> (SELECT id_activo FROM Medidor WHERE id_medidor = NEW.id_medidor)
BEGIN
    SELECT RAISE(ABORT, 'id_activo no coincide con el activo del medidor referenciado (id_medidor)');
END;

DROP TRIGGER IF EXISTS trg_recalc_monto_insert;
CREATE TRIGGER trg_recalc_monto_insert
AFTER INSERT ON DetalleCotizacion
BEGIN
    UPDATE Cotizacion
       SET monto_total = (SELECT COALESCE(SUM(cantidad * precio_unitario), 0) FROM DetalleCotizacion WHERE id_cotizacion = NEW.id_cotizacion)
     WHERE id_cotizacion = NEW.id_cotizacion;
END;

DROP TRIGGER IF EXISTS trg_recalc_monto_update;
CREATE TRIGGER trg_recalc_monto_update
AFTER UPDATE ON DetalleCotizacion
BEGIN
    UPDATE Cotizacion
       SET monto_total = (SELECT COALESCE(SUM(cantidad * precio_unitario), 0) FROM DetalleCotizacion WHERE id_cotizacion = NEW.id_cotizacion)
     WHERE id_cotizacion = NEW.id_cotizacion;
END;

DROP TRIGGER IF EXISTS trg_recalc_monto_delete;
CREATE TRIGGER trg_recalc_monto_delete
AFTER DELETE ON DetalleCotizacion
BEGIN
    UPDATE Cotizacion
       SET monto_total = (SELECT COALESCE(SUM(cantidad * precio_unitario), 0) FROM DetalleCotizacion WHERE id_cotizacion = OLD.id_cotizacion)
     WHERE id_cotizacion = OLD.id_cotizacion;
END;
`;

// ---------------------------------------------------------------------
// 1b. Parte del esquema que depende de las columnas nuevas de Trabajador
//     (índices únicos) y roles cerrados. Se ejecuta DESPUÉS de
//     migrarTrabajador() para que funcione también en bases ya existentes.
//     Debe mantenerse sincronizado con schema.sql (secciones 2 y 8).
// ---------------------------------------------------------------------
const AUTH_SQL = `
INSERT OR IGNORE INTO Rol (nombre) VALUES ('admin'), ('trabajador');

CREATE UNIQUE INDEX IF NOT EXISTS idx_trabajador_correo_unique
    ON Trabajador(correo) WHERE correo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trabajador_dni_unique
    ON Trabajador(dni) WHERE dni IS NOT NULL;

DROP TRIGGER IF EXISTS trg_rol_solo_permitidos_insert;
CREATE TRIGGER trg_rol_solo_permitidos_insert
BEFORE INSERT ON Rol
FOR EACH ROW
WHEN NEW.nombre NOT IN ('admin','trabajador')
BEGIN
    SELECT RAISE(ABORT, 'Rol no permitido: solo existen admin y trabajador');
END;

DROP TRIGGER IF EXISTS trg_rol_inmutable_update;
CREATE TRIGGER trg_rol_inmutable_update
BEFORE UPDATE OF nombre ON Rol
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'Los roles son fijos y no se pueden renombrar');
END;

DROP TRIGGER IF EXISTS trg_rol_inmutable_delete;
CREATE TRIGGER trg_rol_inmutable_delete
BEFORE DELETE ON Rol
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'Los roles son fijos y no se pueden eliminar');
END;
`;

// ---------------------------------------------------------------------
// 2. Apertura + aplicación del esquema
// ---------------------------------------------------------------------

/**
 * Migración idempotente para bases creadas ANTES de la gestión de personal:
 *  - agrega a Trabajador las columnas de credenciales/contacto/estado;
 *  - si existían roles distintos de 'admin'/'trabajador' (datos de prueba
 *    como 'Jefe de Taller'), reasigna esos trabajadores a 'trabajador' y
 *    elimina los roles sobrantes. Esas filas quedan sin credenciales, así
 *    que no pueden iniciar sesión hasta que un admin les asigne correo y
 *    contraseña con actualizarTrabajador().
 * En una base nueva no hace nada (las columnas ya vienen en SCHEMA_SQL).
 */
async function migrarTrabajador(db: SQLite.SQLiteDatabase): Promise<void> {
  const columnas = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(Trabajador);`,
  );
  const existentes = new Set(columnas.map((c) => c.name));

  const nuevas: ReadonlyArray<readonly [string, string]> = [
    ["correo", "TEXT"],
    ["telefono", "TEXT"],
    ["dni", "TEXT"],
    ["password_hash", "TEXT"],
    ["password_salt", "TEXT"],
    ["activo", "INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))"],
  ];

  await db.withTransactionAsync(async () => {
    for (const [nombre, definicion] of nuevas) {
      if (!existentes.has(nombre)) {
        await db.execAsync(
          `ALTER TABLE Trabajador ADD COLUMN ${nombre} ${definicion};`,
        );
      }
    }

    const legado = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM Rol WHERE nombre NOT IN ('admin','trabajador');`,
    );
    if (legado && legado.total > 0) {
      await db.execAsync(`
        INSERT OR IGNORE INTO Rol (nombre) VALUES ('admin'), ('trabajador');
        UPDATE Trabajador
           SET id_rol = (SELECT id_rol FROM Rol WHERE nombre = 'trabajador')
         WHERE id_rol NOT IN (SELECT id_rol FROM Rol WHERE nombre IN ('admin','trabajador'));
        DELETE FROM Rol WHERE nombre NOT IN ('admin','trabajador');
      `);
    }
  });
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Siembra un admin y un trabajador de ejemplo la primera vez que arranca la app
 * (base de datos sin ningún admin todavía). Reutiliza crearTrabajador() para
 * heredar automáticamente el hasheo de contraseña y las validaciones/duplicados;
 * si el seed ya corrió antes o alguien ya registró ese correo, el catch lo ignora
 * en vez de tumbar el arranque de la app.
 */
async function seedUsuariosPorDefecto(): Promise<void> {
  if (await existeAdmin()) return;

  try {
    await crearTrabajador({
      nombre: "Alexander",
      correo: "alex@taller.com",
      telefono: "987654321",
      dni: "12345678",
      password: "Admin1234",
      rol: "admin",
      tipo_contrato: "Fijo",
    });
  } catch (e) {
    if (!(e instanceof TrabajadorError)) throw e;
  }

  try {
    await crearTrabajador({
      nombre: "Trabajador Demo",
      correo: "trabajador@taller.com",
      telefono: "987654322",
      dni: "87654321",
      password: "Trabajo1234",
      rol: "trabajador",
      tipo_contrato: "Fijo",
    });
  } catch (e) {
    if (!(e instanceof TrabajadorError)) throw e;
  }
}

/**
 * Abre (o crea) la base de datos y aplica el esquema completo.
 * Debe llamarse una sola vez al arrancar la app / los tests.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // PRAGMA foreign_keys no persiste entre conexiones: se re-declara aquí
  // además de estar dentro de SCHEMA_SQL, por seguridad.
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await db.execAsync(SCHEMA_SQL);
  await migrarTrabajador(db);
  await db.execAsync(AUTH_SQL);

  dbInstance = db;
  await seedUsuariosPorDefecto();
  return db;
}

/**
 * Devuelve la instancia ya inicializada. Lanza error si initDatabase()
 * no fue llamado antes (fail-fast, útil en fase de pruebas).
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error(
      "La base de datos no ha sido inicializada. Llama a initDatabase() primero.",
    );
  }
  return dbInstance;
}

/**
 * Borra el archivo físico de la BD. Útil entre corridas de test
 * para partir de un estado limpio (no usar en producción).
 */
export async function resetDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
  try {
    await SQLite.deleteDatabaseAsync("taller_alexander.db");
  } catch (e) {
    // Si la base de datos no existe todavía (primer arranque), no hacemos nada y seguimos
  }
}

// ---------------------------------------------------------------------
// 3. Consultas de negocio tipadas (equivalentes a queries.sql, Sección C y B5/B3)
// ---------------------------------------------------------------------

/**
 * Calcula, para cada Activo/Medidor, cuánto falta para el próximo
 * mantenimiento aplicable y su estado de disponibilidad.
 * @param umbralProximo margen (en la unidad del medidor) para marcar 'PROXIMO'
 */
export async function getDisponibilidadMantenimiento(
  umbralProximo: number = 500,
): Promise<DisponibilidadMantenimiento[]> {
  const db = getDb();
  return db.getAllAsync<DisponibilidadMantenimiento>(
    `
    WITH ultima_orden AS (
        SELECT id_medidor, id_tipo_mantenimiento, MAX(valor_lectura) AS ultima_lectura_servicio
        FROM OrdenDeTrabajo
        WHERE estado = 'Completada'
        GROUP BY id_medidor, id_tipo_mantenimiento
    )
    SELECT
        a.id_activo,
        a.placa,
        tu.nombre AS tipo_unidad,
        m.id_medidor,
        m.tipo_medidor,
        m.lectura_actual,
        tm.nombre AS tipo_mantenimiento,
        tm.intervalo_valor,
        COALESCE(uo.ultima_lectura_servicio, 0) AS ultima_lectura_servicio,
        COALESCE(uo.ultima_lectura_servicio, 0) + tm.intervalo_valor AS proxima_lectura_objetivo,
        (COALESCE(uo.ultima_lectura_servicio, 0) + tm.intervalo_valor) - m.lectura_actual AS restante,
        CASE
            WHEN (COALESCE(uo.ultima_lectura_servicio, 0) + tm.intervalo_valor) - m.lectura_actual <= 0 THEN 'VENCIDO'
            WHEN (COALESCE(uo.ultima_lectura_servicio, 0) + tm.intervalo_valor) - m.lectura_actual <= ? THEN 'PROXIMO'
            ELSE 'OK'
        END AS estado_disponibilidad
    FROM Activo a
    JOIN Medidor m ON m.id_activo = a.id_activo
    JOIN TipoUnidad tu ON tu.id_tipo_unidad = a.id_tipo_unidad
    JOIN TipoMantenimiento tm ON tm.tipo_medidor_aplicable = m.tipo_medidor AND tm.intervalo_valor > 0
    LEFT JOIN ultima_orden uo ON uo.id_medidor = m.id_medidor AND uo.id_tipo_mantenimiento = tm.id_tipo_mantenimiento
    ORDER BY restante ASC;
    `,
    [umbralProximo],
  );
}

/** Historial de órdenes de trabajo de un Activo, más reciente primero. */
export async function getHistorialActivo(
  idActivo: number,
): Promise<HistorialActivoRow[]> {
  const db = getDb();
  return db.getAllAsync<HistorialActivoRow>(
    `
    SELECT od.id_orden, od.fecha, tm.nombre AS tipo_mantenimiento, od.valor_lectura,
           od.estado, od.es_auxilio, t.nombre AS responsable
    FROM OrdenDeTrabajo od
    JOIN TipoMantenimiento tm ON tm.id_tipo_mantenimiento = od.id_tipo_mantenimiento
    JOIN Trabajador t ON t.id_trabajador = od.responsable_id
    WHERE od.id_activo = ?
    ORDER BY od.fecha DESC;
    `,
    [idActivo],
  );
}

/** Mejor proveedor (precio más bajo) para cada repuesto. */
export async function getMejorProveedorPorRepuesto(): Promise<
  MejorProveedorRepuesto[]
> {
  const db = getDb();
  return db.getAllAsync<MejorProveedorRepuesto>(
    `
    SELECT r.id_repuesto, r.nombre, p.nombre_comercial, rp.precio_ofrecido
    FROM RepuestoProveedor rp
    JOIN Repuesto r ON r.id_repuesto = rp.id_repuesto
    JOIN Proveedor p ON p.id_proveedor = rp.id_proveedor
    WHERE rp.precio_ofrecido = (
        SELECT MIN(rp2.precio_ofrecido) FROM RepuestoProveedor rp2 WHERE rp2.id_repuesto = rp.id_repuesto
    )
    ORDER BY r.nombre;
    `,
  );
}

/** Detalle resuelto (repuesto/servicio con nombre real) de una cotización. */
export async function getDetalleCotizacion(
  idCotizacion: number,
): Promise<DetalleCotizacionResuelto[]> {
  const db = getDb();
  return db.getAllAsync<DetalleCotizacionResuelto>(
    `
    SELECT dc.id_detalle, dc.tipo_item,
           CASE WHEN dc.tipo_item = 'Repuesto' THEN r.nombre ELSE cs.nombre END AS descripcion_item,
           dc.cantidad, dc.precio_unitario, (dc.cantidad * dc.precio_unitario) AS subtotal_calculado
    FROM DetalleCotizacion dc
    LEFT JOIN Repuesto r ON r.id_repuesto = dc.id_repuesto
    LEFT JOIN CatalogoServicio cs ON cs.id_servicio = dc.id_servicio
    WHERE dc.id_cotizacion = ?;
    `,
    [idCotizacion],
  );
}

/** Repuestos activos con stock igual o menor al umbral dado. */
export async function getRepuestosStockBajo(
  umbral: number = 5,
): Promise<{ id_repuesto: number; nombre: string; stock_actual: number }[]> {
  const db = getDb();
  return db.getAllAsync(
    `SELECT id_repuesto, nombre, stock_actual FROM Repuesto
     WHERE estado_operativo = 'Activo' AND stock_actual <= ? ORDER BY stock_actual ASC;`,
    [umbral],
  );
}

// =====================================================================
// NUEVAS FUNCIONES CRUD DE VEHÍCULOS (ADMIN) Y CONSULTAS (CLIENTE)
// =====================================================================

export interface VehiculoConDetalle {
  id_activo: number;
  placa: string | null;
  tipo_activo: string;
  capacidad: number | null;
  nombre_cliente: string;
  marca: string | null;
  tipo_unidad: string;
  lectura_actual: number;
  tipo_medidor: string;
}

/** 1. LEER / LISTAR: Obtiene todos los vehículos con sus nombres relacionados (Cliente, Marca, Tipo, Medidor) */
export async function getVehiculosConDetalle(): Promise<VehiculoConDetalle[]> {
  const db = getDb();
  return db.getAllAsync<VehiculoConDetalle>(`
    SELECT 
      a.id_activo, 
      a.placa, 
      a.tipo_activo, 
      a.capacidad,
      c.nombre_razon_social AS nombre_cliente,
      m_marca.nombre AS marca,
      tu.nombre AS tipo_unidad,
      med.lectura_actual, 
      med.tipo_medidor
    FROM Activo a
    JOIN Cliente c ON c.id_cliente = a.id_cliente
    JOIN TipoUnidad tu ON tu.id_tipo_unidad = a.id_tipo_unidad
    LEFT JOIN Marca m_marca ON m_marca.id_marca = a.id_marca
    JOIN Medidor med ON med.id_activo = a.id_activo
    ORDER BY a.id_activo DESC;
  `);
}

// ---------------------------------------------------------------------
// LECTURA DE UN ACTIVO PARA EDICIÓN
// ---------------------------------------------------------------------

export interface ActivoParaEditar {
  id_activo: number;
  id_tipo_unidad: number;
  id_marca: number | null;
  id_cliente: number;
  tipo_activo: "Vehiculo" | "EquipoEstacionario";
  placa: string | null;
  capacidad: number | null;
  nombre_cliente: string;
  tipo_medidor: "Odometro" | "Horometro" | "Ciclos";
  lectura_actual: number;
}

/** Trae un Activo por id con lo necesario para precargar el formulario de edición. */
export async function getActivoPorId(
  idActivo: number,
): Promise<ActivoParaEditar | null> {
  const db = getDb();
  const resultado = await db.getFirstAsync<ActivoParaEditar>(
    `
    SELECT
      a.id_activo,
      a.id_tipo_unidad,
      a.id_marca,
      a.id_cliente,
      a.tipo_activo,
      a.placa,
      a.capacidad,
      c.nombre_razon_social AS nombre_cliente,
      med.tipo_medidor,
      med.lectura_actual
    FROM Activo a
    JOIN Cliente c ON c.id_cliente = a.id_cliente
    JOIN Medidor med ON med.id_activo = a.id_activo
    WHERE a.id_activo = ?;
    `,
    [idActivo],
  );
  return resultado ?? null;
}

/** 2. CREAR: Registra un nuevo activo (Vehículo o Equipo Estacionario) y su medidor inicial en una transacción segura */
export async function crearVehiculo(
  idTipoUnidad: number,
  idMarca: number | null,
  idCliente: number,
  tipoActivo: "Vehiculo" | "EquipoEstacionario",
  placa: string | null,
  capacidad: number | null,
  tipoMedidor: "Odometro" | "Horometro" | "Ciclos",
  lecturaInicial: number,
): Promise<number> {
  const db = getDb();
  let nuevoIdActivo = 0;

  // Blindaje: Si la placa viene vacía, con espacios o cadena vacía, la forzamos a null real
  const placaLimpia = placa && placa.trim() !== "" ? placa.trim() : null;

  await db.withTransactionAsync(async () => {
    // Insertar el activo usando la placa limpia (null si no aplica)
    const resultadoActivo = await db.runAsync(
      `INSERT INTO Activo (id_tipo_unidad, id_marca, id_cliente, tipo_activo, placa, capacidad) 
       VALUES (?, ?, ?, ?, ?, ?);`,
      [idTipoUnidad, idMarca, idCliente, tipoActivo, placaLimpia, capacidad],
    );
    nuevoIdActivo = resultadoActivo.lastInsertRowId;

    // Regla de negocio de la BD: todo activo requiere obligatoriamente un medidor
    const fechaHoy = new Date().toISOString().split("T")[0];
    await db.runAsync(
      `INSERT INTO Medidor (id_activo, tipo_medidor, lectura_actual, fecha_ultima_lectura) 
       VALUES (?, ?, ?, ?);`,
      [nuevoIdActivo, tipoMedidor, lecturaInicial, fechaHoy],
    );
  });

  return nuevoIdActivo;
}

// ---------------------------------------------------------------------
// 3'. ACTUALIZAR (reemplaza la función actualizarVehiculo existente)
// ---------------------------------------------------------------------

/**
 * Modifica Tipo de Unidad, Marca, Placa y Capacidad de un Activo existente.
 * No toca id_cliente ni tipo_activo (ver nota arriba del parche).
 */
export async function actualizarVehiculo(
  idActivo: number,
  idTipoUnidad: number,
  idMarca: number | null,
  placa: string | null,
  capacidad: number | null,
): Promise<void> {
  const db = getDb();

  // Blindaje: si la placa viene vacía o solo espacios, se guarda como null real
  const placaLimpia = placa && placa.trim() !== "" ? placa.trim() : null;

  await db.runAsync(
    `UPDATE Activo
        SET id_tipo_unidad = ?, id_marca = ?, placa = ?, capacidad = ?
      WHERE id_activo = ?;`,
    [idTipoUnidad, idMarca, placaLimpia, capacidad, idActivo],
  );
}

/** 4. ELIMINAR: Borra el vehículo y su medidor asociado respetando restricciones */
export async function eliminarVehiculo(idActivo: number): Promise<void> {
  const db = getDb();
  await db.withTransactionAsync(async () => {
    // Primero borramos el medidor dependiente
    await db.runAsync(`DELETE FROM Medidor WHERE id_activo = ?;`, [idActivo]);
    // Luego borramos el vehículo
    await db.runAsync(`DELETE FROM Activo WHERE id_activo = ?;`, [idActivo]);
  });
}

export const eliminarActivo = eliminarVehiculo;

// ---------------------------------------------------------------------
// LECTURA DE CATÁLOGOS (para poblar los SearchableSelect)
// ---------------------------------------------------------------------

export async function getClientes(): Promise<Cliente[]> {
  const db = getDb();
  return db.getAllAsync<Cliente>(
    `SELECT * FROM Cliente ORDER BY nombre_razon_social ASC;`,
  );
}

export async function getMarcas(): Promise<Marca[]> {
  const db = getDb();
  return db.getAllAsync<Marca>(`SELECT * FROM Marca ORDER BY nombre ASC;`);
}

export async function getTiposUnidad(): Promise<TipoUnidad[]> {
  const db = getDb();
  return db.getAllAsync<TipoUnidad>(
    `SELECT * FROM TipoUnidad ORDER BY nombre ASC;`,
  );
}

// ---------------------------------------------------------------------
// ALTA RÁPIDA DE CATÁLOGOS ("+ Nuevo" inline desde el formulario)
// ---------------------------------------------------------------------

/** Crea una nueva Marca. `nombre` es UNIQUE NOT NULL en el esquema. */
export async function crearMarca(nombre: string): Promise<number> {
  const db = getDb();
  const resultado = await db.runAsync(
    `INSERT INTO Marca (nombre) VALUES (?);`,
    [nombre.trim()],
  );
  return resultado.lastInsertRowId;
}

/** Crea un nuevo TipoUnidad. `nombre` es UNIQUE NOT NULL en el esquema. */
export async function crearTipoUnidad(nombre: string): Promise<number> {
  const db = getDb();
  const resultado = await db.runAsync(
    `INSERT INTO TipoUnidad (nombre) VALUES (?);`,
    [nombre.trim()],
  );
  return resultado.lastInsertRowId;
}

/**
 * Crea un nuevo Cliente. A diferencia de Marca/TipoUnidad, Cliente tiene
 * varios campos NOT NULL (tipo_documento_identidad, numero_documento,
 * nombre_razon_social, telefono, tipo_cliente), así que el alta rápida
 * pide los cinco. numero_documento es UNIQUE.
 */
export async function crearCliente(
  tipoDocumentoIdentidad: "RUC" | "DNI",
  numeroDocumento: string,
  nombreRazonSocial: string,
  telefono: string,
  tipoCliente: "Empresa" | "Persona Natural",
): Promise<number> {
  const db = getDb();
  const resultado = await db.runAsync(
    `INSERT INTO Cliente (tipo_documento_identidad, numero_documento, nombre_razon_social, telefono, tipo_cliente)
     VALUES (?, ?, ?, ?, ?);`,
    [
      tipoDocumentoIdentidad,
      numeroDocumento.trim(),
      nombreRazonSocial.trim(),
      telefono.trim(),
      tipoCliente,
    ],
  );
  return resultado.lastInsertRowId;
}

// =====================================================================
// GESTIÓN DE PERSONAL (Etapa 1): CRUD de trabajadores + autenticación
//
// Roles cerrados: 'admin' (dueño/jefe) y 'trabajador'.
// Esta capa NO conoce quién la llama: la autorización ("solo un admin
// puede crear/editar/eliminar") se aplica en la UI con session.esAdmin().
// =====================================================================

export class TrabajadorError extends Error {
  readonly codigo: TrabajadorErrorCodigo;

  constructor(codigo: TrabajadorErrorCodigo, mensaje: string) {
    super(mensaje);
    this.name = "TrabajadorError";
    this.codigo = codigo;
  }
}

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_DNI = /^\d{8}$/;
const REGEX_TELEFONO = /^\+?\d{7,15}$/;
const PASSWORD_MIN = 8;

/** Salt fijo solo para igualar el tiempo de respuesta cuando el correo no existe. */
const SALT_SEÑUELO = "00000000000000000000000000000000";

const normalizarCorreo = (correo: string): string => correo.trim().toLowerCase();
const normalizarTelefono = (tel: string): string => tel.replace(/[\s-]/g, "");

const SELECT_TRABAJADOR_PUBLICO = `
  SELECT t.id_trabajador, t.nombre, t.correo, t.telefono, t.dni,
         t.tipo_contrato, t.activo, r.nombre AS rol
    FROM Trabajador t
    JOIN Rol r ON r.id_rol = t.id_rol
`;

// ---------------------------------------------------------------------
// Validaciones y helpers internos
// ---------------------------------------------------------------------

function invalido(mensaje: string): never {
  throw new TrabajadorError("DATOS_INVALIDOS", mensaje);
}

function validarNombre(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio.length < 2) invalido("El nombre debe tener al menos 2 caracteres.");
  return limpio;
}

function validarCorreo(correo: string): string {
  const limpio = normalizarCorreo(correo);
  if (!REGEX_CORREO.test(limpio)) invalido("El correo no tiene un formato válido.");
  return limpio;
}

function validarDni(dni: string): string {
  const limpio = dni.trim();
  if (!REGEX_DNI.test(limpio)) invalido("El DNI debe tener exactamente 8 dígitos.");
  return limpio;
}

function validarTelefono(telefono: string): string {
  const limpio = normalizarTelefono(telefono);
  if (!REGEX_TELEFONO.test(limpio)) {
    invalido("El teléfono debe tener entre 7 y 15 dígitos.");
  }
  return limpio;
}

function validarPassword(password: string): string {
  if (password.length < PASSWORD_MIN) {
    invalido(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
  }
  return password;
}

async function getIdRol(
  db: SQLite.SQLiteDatabase,
  rol: RolNombre,
): Promise<number> {
  const fila = await db.getFirstAsync<{ id_rol: number }>(
    `SELECT id_rol FROM Rol WHERE nombre = ?;`,
    [rol],
  );
  if (!fila) invalido(`El rol '${rol}' no existe en el catálogo.`);
  return fila.id_rol;
}

/** Cuenta admins activos; `excluirId` sirve para simular "¿y si este deja de serlo?". */
async function contarAdminsActivos(
  db: SQLite.SQLiteDatabase,
  excluirId?: number,
): Promise<number> {
  const fila = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total
       FROM Trabajador t JOIN Rol r ON r.id_rol = t.id_rol
      WHERE r.nombre = 'admin' AND t.activo = 1 AND t.id_trabajador <> ?;`,
    [excluirId ?? -1],
  );
  return fila?.total ?? 0;
}

async function verificarDuplicados(
  db: SQLite.SQLiteDatabase,
  correo: string | undefined,
  dni: string | undefined,
  excluirId?: number,
): Promise<void> {
  const excluir = excluirId ?? -1;
  if (correo !== undefined) {
    const dup = await db.getFirstAsync<{ id_trabajador: number }>(
      `SELECT id_trabajador FROM Trabajador WHERE correo = ? AND id_trabajador <> ?;`,
      [correo, excluir],
    );
    if (dup) {
      throw new TrabajadorError("CORREO_DUPLICADO", "Ya existe un trabajador con ese correo.");
    }
  }
  if (dni !== undefined) {
    const dup = await db.getFirstAsync<{ id_trabajador: number }>(
      `SELECT id_trabajador FROM Trabajador WHERE dni = ? AND id_trabajador <> ?;`,
      [dni, excluir],
    );
    if (dup) {
      throw new TrabajadorError("DNI_DUPLICADO", "Ya existe un trabajador con ese DNI.");
    }
  }
}

/** Red de seguridad: traduce errores UNIQUE de SQLite si dos altas chocan a la vez. */
function traducirErrorSqlite(e: unknown): never {
  if (e instanceof TrabajadorError) throw e;
  const mensaje = e instanceof Error ? e.message : String(e);
  if (mensaje.includes("UNIQUE") && mensaje.includes("correo")) {
    throw new TrabajadorError("CORREO_DUPLICADO", "Ya existe un trabajador con ese correo.");
  }
  if (mensaje.includes("UNIQUE") && mensaje.includes("dni")) {
    throw new TrabajadorError("DNI_DUPLICADO", "Ya existe un trabajador con ese DNI.");
  }
  throw e;
}

// ---------------------------------------------------------------------
// LEER
// ---------------------------------------------------------------------

/** Lista trabajadores (sin hash/salt), ordenados por nombre. */
export async function getTrabajadores(
  filtro: FiltroTrabajadores = {},
): Promise<TrabajadorPublico[]> {
  const db = getDb();
  const condiciones: string[] = [];
  const params: (string | number)[] = [];

  if (filtro.rol) {
    condiciones.push("r.nombre = ?");
    params.push(filtro.rol);
  }
  if (filtro.soloActivos) {
    condiciones.push("t.activo = 1");
  }
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  return db.getAllAsync<TrabajadorPublico>(
    `${SELECT_TRABAJADOR_PUBLICO} ${where} ORDER BY t.nombre COLLATE NOCASE ASC;`,
    params,
  );
}

export async function getTrabajadorPorId(
  idTrabajador: number,
): Promise<TrabajadorPublico | null> {
  const db = getDb();
  const fila = await db.getFirstAsync<TrabajadorPublico>(
    `${SELECT_TRABAJADOR_PUBLICO} WHERE t.id_trabajador = ?;`,
    [idTrabajador],
  );
  return fila ?? null;
}

/** ¿Existe al menos un admin activo? Sirve para el arranque inicial de la app. */
export async function existeAdmin(): Promise<boolean> {
  return (await contarAdminsActivos(getDb())) > 0;
}

// ---------------------------------------------------------------------
// CREAR
// ---------------------------------------------------------------------

/** Crea un trabajador con credenciales. Devuelve su id_trabajador. */
export async function crearTrabajador(
  input: NuevoTrabajadorInput,
): Promise<number> {
  const db = getDb();

  const nombre = validarNombre(input.nombre);
  const correo = validarCorreo(input.correo);
  const telefono = validarTelefono(input.telefono);
  const dni = validarDni(input.dni);
  const password = validarPassword(input.password);

  const salt = await generarSalt();
  const hash = await hashearPassword(password, salt);

  let nuevoId = 0;
  try {
    await db.withTransactionAsync(async () => {
      await verificarDuplicados(db, correo, dni);
      const idRol = await getIdRol(db, input.rol);
      const resultado = await db.runAsync(
        `INSERT INTO Trabajador
           (id_rol, nombre, tipo_contrato, correo, telefono, dni, password_hash, password_salt, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);`,
        [idRol, nombre, input.tipo_contrato, correo, telefono, dni, hash, salt],
      );
      nuevoId = resultado.lastInsertRowId;
    });
  } catch (e) {
    traducirErrorSqlite(e);
  }
  return nuevoId;
}

// ---------------------------------------------------------------------
// ACTUALIZAR
// ---------------------------------------------------------------------

/**
 * Actualiza solo los campos presentes en `cambios`.
 * Protege al último admin activo: no se le puede quitar el rol ni desactivar.
 */
export async function actualizarTrabajador(
  idTrabajador: number,
  cambios: ActualizarTrabajadorInput,
): Promise<void> {
  const db = getDb();

  const sets: string[] = [];
  const params: (string | number)[] = [];

  const nombre = cambios.nombre !== undefined ? validarNombre(cambios.nombre) : undefined;
  const correo = cambios.correo !== undefined ? validarCorreo(cambios.correo) : undefined;
  const telefono = cambios.telefono !== undefined ? validarTelefono(cambios.telefono) : undefined;
  const dni = cambios.dni !== undefined ? validarDni(cambios.dni) : undefined;

  if (nombre !== undefined) { sets.push("nombre = ?"); params.push(nombre); }
  if (correo !== undefined) { sets.push("correo = ?"); params.push(correo); }
  if (telefono !== undefined) { sets.push("telefono = ?"); params.push(telefono); }
  if (dni !== undefined) { sets.push("dni = ?"); params.push(dni); }
  if (cambios.tipo_contrato !== undefined) {
    sets.push("tipo_contrato = ?");
    params.push(cambios.tipo_contrato);
  }
  if (cambios.activo !== undefined) {
    sets.push("activo = ?");
    params.push(cambios.activo ? 1 : 0);
  }
  if (cambios.nuevaPassword !== undefined) {
    const password = validarPassword(cambios.nuevaPassword);
    const salt = await generarSalt();
    sets.push("password_hash = ?", "password_salt = ?");
    params.push(await hashearPassword(password, salt), salt);
  }

  if (sets.length === 0 && cambios.rol === undefined) return;

  try {
    await db.withTransactionAsync(async () => {
      const actual = await getTrabajadorPorId(idTrabajador);
      if (!actual) {
        throw new TrabajadorError("NO_ENCONTRADO", "El trabajador no existe.");
      }

      await verificarDuplicados(db, correo, dni, idTrabajador);

      if (cambios.rol !== undefined) {
        sets.push("id_rol = ?");
        params.push(await getIdRol(db, cambios.rol));
      }

      // Regla: siempre debe quedar al menos un admin activo
      const dejaDeSerAdminActivo =
        actual.rol === "admin" &&
        actual.activo === 1 &&
        ((cambios.rol !== undefined && cambios.rol !== "admin") ||
          cambios.activo === false);
      if (dejaDeSerAdminActivo && (await contarAdminsActivos(db, idTrabajador)) === 0) {
        throw new TrabajadorError(
          "ULTIMO_ADMIN",
          "No puedes quitar el rol ni desactivar al único administrador activo.",
        );
      }

      await db.runAsync(
        `UPDATE Trabajador SET ${sets.join(", ")} WHERE id_trabajador = ?;`,
        [...params, idTrabajador],
      );
    });
  } catch (e) {
    traducirErrorSqlite(e);
  }
}

// ---------------------------------------------------------------------
// PERFIL PROPIO (Etapa 2)
// ---------------------------------------------------------------------

/** Mensaje de error de un campo (o null si es válido). Sirve para validar en tiempo real en la UI. */
export function errorDeCampo(
  campo: "nombre" | "correo" | "telefono" | "dni" | "passwordNueva",
  valor: string,
): string | null {
  try {
    switch (campo) {
      case "nombre": validarNombre(valor); break;
      case "correo": validarCorreo(valor); break;
      case "telefono": validarTelefono(valor); break;
      case "dni": validarDni(valor); break;
      case "passwordNueva": validarPasswordNueva(valor); break;
    }
    return null;
  } catch (e) {
    if (e instanceof TrabajadorError) return e.message;
    throw e;
  }
}

/** Mínimo 8 caracteres, con al menos una letra y un número. */
function validarPasswordNueva(password: string): string {
  validarPassword(password);
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    invalido("La contraseña debe incluir al menos una letra y un número.");
  }
  return password;
}

/**
 * Actualiza el perfil de un trabajador. Solo acepta nombre, correo, teléfono,
 * DNI y tipo de contrato: el rol y el estado activo no se pueden tocar desde aquí.
 */
export async function actualizarPerfil(
  idTrabajador: number,
  cambios: ActualizarPerfilInput,
): Promise<TrabajadorPublico> {
  const { nombre, correo, telefono, dni, tipo_contrato } = cambios;
  await actualizarTrabajador(idTrabajador, { nombre, correo, telefono, dni, tipo_contrato });
  const actualizado = await getTrabajadorPorId(idTrabajador);
  if (!actualizado) {
    throw new TrabajadorError("NO_ENCONTRADO", "El trabajador no existe.");
  }
  return actualizado;
}

/** Cambia la contraseña verificando primero la actual. Genera un salt nuevo. */
export async function cambiarPassword(
  idTrabajador: number,
  passwordActual: string,
  passwordNueva: string,
): Promise<void> {
  const db = getDb();
  const nueva = validarPasswordNueva(passwordNueva);

  const fila = await db.getFirstAsync<{
    password_hash: string | null;
    password_salt: string | null;
  }>(
    `SELECT password_hash, password_salt FROM Trabajador WHERE id_trabajador = ?;`,
    [idTrabajador],
  );
  if (!fila) throw new TrabajadorError("NO_ENCONTRADO", "El trabajador no existe.");

  const incorrecta = new TrabajadorError(
    "PASSWORD_ACTUAL_INCORRECTA",
    "La contraseña actual es incorrecta.",
  );
  if (!fila.password_hash || !fila.password_salt) throw incorrecta;
  const hashActual = await hashearPassword(passwordActual, fila.password_salt);
  if (!compararSeguro(hashActual, fila.password_hash)) throw incorrecta;

  if (passwordActual === nueva) {
    invalido("La nueva contraseña debe ser distinta a la actual.");
  }

  const salt = await generarSalt();
  const hash = await hashearPassword(nueva, salt);
  // "AND password_hash = ?" evita pisar un cambio concurrente
  const res = await db.runAsync(
    `UPDATE Trabajador SET password_hash = ?, password_salt = ?
      WHERE id_trabajador = ? AND password_hash = ?;`,
    [hash, salt, idTrabajador, fila.password_hash],
  );
  if (res.changes === 0) throw incorrecta;
}

// ---------------------------------------------------------------------
// ELIMINAR
// ---------------------------------------------------------------------

/**
 * Elimina definitivamente a un trabajador.
 * - No permite borrar al último admin activo.
 * - Si el trabajador figura en órdenes de trabajo (responsable o cuadrilla)
 *   lanza TIENE_HISTORIAL: en ese caso hay que desactivarlo con
 *   actualizarTrabajador(id, { activo: false }) para conservar el historial.
 */
export async function eliminarTrabajador(idTrabajador: number): Promise<void> {
  const db = getDb();

  await db.withTransactionAsync(async () => {
    const actual = await getTrabajadorPorId(idTrabajador);
    if (!actual) {
      throw new TrabajadorError("NO_ENCONTRADO", "El trabajador no existe.");
    }

    if (
      actual.rol === "admin" &&
      actual.activo === 1 &&
      (await contarAdminsActivos(db, idTrabajador)) === 0
    ) {
      throw new TrabajadorError(
        "ULTIMO_ADMIN",
        "No puedes eliminar al único administrador activo.",
      );
    }

    const refs = await db.getFirstAsync<{ total: number }>(
      `SELECT (SELECT COUNT(*) FROM OrdenDeTrabajo WHERE responsable_id = ?)
            + (SELECT COUNT(*) FROM OrdenTrabajo_Trabajador WHERE id_trabajador = ?) AS total;`,
      [idTrabajador, idTrabajador],
    );
    if (refs && refs.total > 0) {
      throw new TrabajadorError(
        "TIENE_HISTORIAL",
        "El trabajador tiene órdenes de trabajo asociadas. Desactívalo en lugar de eliminarlo.",
      );
    }

    await db.runAsync(`DELETE FROM Trabajador WHERE id_trabajador = ?;`, [idTrabajador]);
  });
}

// ---------------------------------------------------------------------
// AUTENTICACIÓN
// ---------------------------------------------------------------------

interface FilaLogin {
  id_trabajador: number;
  nombre: string;
  correo: string;
  tipo_contrato: UsuarioSesion["tipo_contrato"];
  activo: 0 | 1;
  password_hash: string | null;
  password_salt: string | null;
  rol: RolNombre;
}

/**
 * Valida credenciales y devuelve el usuario con su rol.
 *
 * @param rolRequerido si se indica, solo autentica a quien tenga ese rol
 *        (útil para pantallas exclusivas, p. ej. un login solo-admin).
 *
 * Seguridad:
 *  - correo inexistente y contraseña incorrecta devuelven el mismo motivo
 *    (CREDENCIALES_INVALIDAS) para no revelar qué correos existen;
 *  - el estado activo y el rol solo se evalúan con contraseña correcta.
 */
export async function autenticarTrabajador(
  correo: string,
  password: string,
  rolRequerido?: RolNombre,
): Promise<ResultadoLogin> {
  const db = getDb();
  const credencialesInvalidas: ResultadoLogin = {
    ok: false,
    motivo: "CREDENCIALES_INVALIDAS",
  };

  const correoNormalizado = normalizarCorreo(correo);
  if (correoNormalizado === "" || password === "") return credencialesInvalidas;

  const fila = await db.getFirstAsync<FilaLogin>(
    `SELECT t.id_trabajador, t.nombre, t.correo, t.tipo_contrato, t.activo,
            t.password_hash, t.password_salt, r.nombre AS rol
       FROM Trabajador t
       JOIN Rol r ON r.id_rol = t.id_rol
      WHERE t.correo = ?;`,
    [correoNormalizado],
  );

  if (!fila || !fila.password_hash || !fila.password_salt) {
    await hashearPassword(password, SALT_SEÑUELO); // iguala tiempos de respuesta
    return credencialesInvalidas;
  }

  const hashIngresado = await hashearPassword(password, fila.password_salt);
  if (!compararSeguro(hashIngresado, fila.password_hash)) {
    return credencialesInvalidas;
  }

  if (fila.activo !== 1) return { ok: false, motivo: "USUARIO_INACTIVO" };
  if (rolRequerido && fila.rol !== rolRequerido) {
    return { ok: false, motivo: "ROL_NO_AUTORIZADO" };
  }

  return {
    ok: true,
    usuario: {
      id_trabajador: fila.id_trabajador,
      nombre: fila.nombre,
      correo: fila.correo,
      rol: fila.rol,
      tipo_contrato: fila.tipo_contrato,
    },
  };
}
