-- =====================================================================
-- TALLER "ALEXANDER" — ESQUEMA SQLITE (18 ENTIDADES)
-- Generado a partir de: Estructura_Final_Consolidada_del_Modelo_de_Datos.docx
-- Motor destino: expo-sqlite (SQLite 3.x embebido en Expo SDK ~57)
-- =====================================================================
-- NOTAS DE PORTABILIDAD SQLite:
--   - SQLite no tiene tipo ENUM nativo  -> se usa TEXT + CHECK (...)
--   - SQLite no tiene tipo BOOLEAN real -> se usa INTEGER + CHECK IN (0,1)
--   - Las FK NO se validan por defecto  -> se activa con PRAGMA foreign_keys = ON
--     (debe ejecutarse en CADA conexión/sesión, expo-sqlite no lo persiste)
-- =====================================================================

PRAGMA foreign_keys = ON;

-- =====================================================================
-- 1. CATÁLOGOS
-- =====================================================================

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

-- Catálogo CERRADO: solo existen 'admin' (dueño/jefe de taller) y 'trabajador'
-- (colaboradores fijos o subcontratados). Se fuerza con triggers (sección 8)
-- para que también aplique a bases ya creadas sin reconstruir la tabla.
CREATE TABLE IF NOT EXISTS Rol (
    id_rol INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS TipoMantenimiento (
    id_tipo_mantenimiento INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre                 TEXT    NOT NULL UNIQUE,          -- PM1, PM2, PM3, Correctivo, Auxilio
    intervalo_valor        INTEGER NOT NULL,                 -- ej. 5000 (km/horas/ciclos)
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
    nombre               TEXT    NOT NULL UNIQUE,            -- Cotización, Proforma, Orden Interna...
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

-- =====================================================================
-- 2. ENTIDADES NÚCLEO
-- =====================================================================

CREATE TABLE IF NOT EXISTS Activo (
    id_activo      INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tipo_unidad INTEGER NOT NULL,
    id_marca       INTEGER,                                  -- opcional
    id_cliente     INTEGER NOT NULL,
    tipo_activo    TEXT    NOT NULL CHECK (tipo_activo IN ('Vehiculo','EquipoEstacionario')),
    placa          TEXT,                                     -- NULL permitido (equipos estacionarios)
    capacidad      REAL,
    FOREIGN KEY (id_tipo_unidad) REFERENCES TipoUnidad(id_tipo_unidad),
    FOREIGN KEY (id_marca)       REFERENCES Marca(id_marca),
    FOREIGN KEY (id_cliente)     REFERENCES Cliente(id_cliente)
);

-- UNIQUE condicional: solo exige unicidad de placa entre valores no nulos
CREATE UNIQUE INDEX IF NOT EXISTS idx_activo_placa_unique
    ON Activo(placa) WHERE placa IS NOT NULL;

CREATE TABLE IF NOT EXISTS Medidor (
    id_medidor            INTEGER PRIMARY KEY AUTOINCREMENT,
    id_activo             INTEGER NOT NULL,
    tipo_medidor          TEXT    NOT NULL CHECK (tipo_medidor IN ('Odometro','Horometro','Ciclos')),
    lectura_actual        REAL    NOT NULL,
    fecha_ultima_lectura  TEXT    NOT NULL,                  -- ISO-8601 'YYYY-MM-DD'
    FOREIGN KEY (id_activo) REFERENCES Activo(id_activo)
);

-- Trabajador ahora también es la cuenta de acceso a la app.
-- correo / password_* son NULL para personal sin acceso a la app (p. ej. datos
-- históricos); solo quien tenga correo + hash puede iniciar sesión.
-- password_hash = SHA-256(salt + ':' + password), ver db/security.ts
CREATE TABLE IF NOT EXISTS Trabajador (
    id_trabajador  INTEGER PRIMARY KEY AUTOINCREMENT,
    id_rol         INTEGER NOT NULL,
    nombre         TEXT    NOT NULL,
    tipo_contrato  TEXT    NOT NULL CHECK (tipo_contrato IN ('Fijo','Subcontratado')),
    correo         TEXT,                                     -- normalizado en minúsculas
    telefono       TEXT,
    dni            TEXT,
    password_hash  TEXT,
    password_salt  TEXT,
    activo         INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
    FOREIGN KEY (id_rol) REFERENCES Rol(id_rol)
);

-- Unicidad solo entre valores no nulos (permite personal legado sin credenciales)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trabajador_correo_unique
    ON Trabajador(correo) WHERE correo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trabajador_dni_unique
    ON Trabajador(dni) WHERE dni IS NOT NULL;

CREATE TABLE IF NOT EXISTS Repuesto (
    id_repuesto        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre             TEXT    NOT NULL,
    codigo_referencia  TEXT    UNIQUE,
    stock_actual       INTEGER NOT NULL DEFAULT 0,
    es_comercial       INTEGER NOT NULL CHECK (es_comercial IN (0,1)),
    estado_operativo   TEXT    NOT NULL DEFAULT 'Activo' CHECK (estado_operativo IN ('Activo','Descontinuado'))
);

-- =====================================================================
-- 3. ENTIDADES TRANSACCIONALES
-- =====================================================================

CREATE TABLE IF NOT EXISTS OrdenDeTrabajo (
    id_orden               INTEGER PRIMARY KEY AUTOINCREMENT,
    id_activo              INTEGER NOT NULL,   -- desnormalización controlada (ver TRIGGER trg_orden_valida_activo_*)
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
    monto_total        REAL    NOT NULL DEFAULT 0,   -- cacheado, ver TRIGGER trg_recalc_monto_*
    estado             TEXT    NOT NULL DEFAULT 'Pendiente'
                               CHECK (estado IN ('Pendiente','Aprobada','Rechazada','Anulada')),
    FOREIGN KEY (id_activo)         REFERENCES Activo(id_activo),
    FOREIGN KEY (id_tipo_documento) REFERENCES TipoDocumento(id_tipo_documento)
);

-- =====================================================================
-- 4. ENTIDADES DÉBILES (dependencia de existencia de Cotización)
-- =====================================================================

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
    id_repuesto      INTEGER,                          -- obligatorio solo si tipo_item='Repuesto'
    id_servicio      INTEGER,                          -- obligatorio solo si tipo_item='Servicio'
    tipo_item        TEXT    NOT NULL CHECK (tipo_item IN ('Repuesto','Servicio')),
    cantidad         INTEGER NOT NULL,
    precio_unitario  REAL    NOT NULL,                 -- snapshot histórico (no se recalcula del catálogo)
    FOREIGN KEY (id_cotizacion) REFERENCES Cotizacion(id_cotizacion) ON DELETE CASCADE,
    FOREIGN KEY (id_repuesto)   REFERENCES Repuesto(id_repuesto),
    FOREIGN KEY (id_servicio)   REFERENCES CatalogoServicio(id_servicio),
    CHECK (
        (tipo_item = 'Repuesto' AND id_repuesto IS NOT NULL AND id_servicio IS NULL)
        OR
        (tipo_item = 'Servicio' AND id_servicio IS NOT NULL AND id_repuesto IS NULL)
    )
);

-- =====================================================================
-- 5. ENTIDADES PIVOTE (relaciones N:M)
-- =====================================================================

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

-- =====================================================================
-- 6. ÍNDICES DE APOYO (columnas FK usadas en JOINs frecuentes)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_trabajador_rol         ON Trabajador(id_rol);
CREATE INDEX IF NOT EXISTS idx_activo_cliente        ON Activo(id_cliente);
CREATE INDEX IF NOT EXISTS idx_medidor_activo         ON Medidor(id_activo);
CREATE INDEX IF NOT EXISTS idx_orden_activo           ON OrdenDeTrabajo(id_activo);
CREATE INDEX IF NOT EXISTS idx_orden_medidor          ON OrdenDeTrabajo(id_medidor);
CREATE INDEX IF NOT EXISTS idx_orden_tipomant         ON OrdenDeTrabajo(id_tipo_mantenimiento);
CREATE INDEX IF NOT EXISTS idx_cotizacion_activo      ON Cotizacion(id_activo);
CREATE INDEX IF NOT EXISTS idx_detalle_cotizacion     ON DetalleCotizacion(id_cotizacion);
CREATE INDEX IF NOT EXISTS idx_detalle_repuesto       ON DetalleCotizacion(id_repuesto);
CREATE INDEX IF NOT EXISTS idx_repuestoprov_repuesto  ON RepuestoProveedor(id_repuesto);

-- =====================================================================
-- 7. TRIGGERS — Reglas de integridad de negocio
-- =====================================================================

-- (A) Consistencia cruzada: OrdenDeTrabajo.id_activo debe coincidir
--     siempre con el id_activo del Medidor referenciado (id_medidor).
--     Protege la desnormalización aceptada por rendimiento.
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

-- (B) Recálculo automático de Cotizacion.monto_total ante cualquier
--     cambio en sus líneas de DetalleCotizacion (INSERT/UPDATE/DELETE).
DROP TRIGGER IF EXISTS trg_recalc_monto_insert;
CREATE TRIGGER trg_recalc_monto_insert
AFTER INSERT ON DetalleCotizacion
BEGIN
    UPDATE Cotizacion
       SET monto_total = (
            SELECT COALESCE(SUM(cantidad * precio_unitario), 0)
              FROM DetalleCotizacion
             WHERE id_cotizacion = NEW.id_cotizacion
       )
     WHERE id_cotizacion = NEW.id_cotizacion;
END;

DROP TRIGGER IF EXISTS trg_recalc_monto_update;
CREATE TRIGGER trg_recalc_monto_update
AFTER UPDATE ON DetalleCotizacion
BEGIN
    UPDATE Cotizacion
       SET monto_total = (
            SELECT COALESCE(SUM(cantidad * precio_unitario), 0)
              FROM DetalleCotizacion
             WHERE id_cotizacion = NEW.id_cotizacion
       )
     WHERE id_cotizacion = NEW.id_cotizacion;
END;

DROP TRIGGER IF EXISTS trg_recalc_monto_delete;
CREATE TRIGGER trg_recalc_monto_delete
AFTER DELETE ON DetalleCotizacion
BEGIN
    UPDATE Cotizacion
       SET monto_total = (
            SELECT COALESCE(SUM(cantidad * precio_unitario), 0)
              FROM DetalleCotizacion
             WHERE id_cotizacion = OLD.id_cotizacion
       )
     WHERE id_cotizacion = OLD.id_cotizacion;
END;

-- =====================================================================
-- 8. ROLES CERRADOS: 'admin' y 'trabajador' (nada más)
-- =====================================================================

INSERT OR IGNORE INTO Rol (nombre) VALUES ('admin'), ('trabajador');

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
