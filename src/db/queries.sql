-- =====================================================================
-- TALLER "ALEXANDER" — CONSULTAS DE PRUEBA Y LÓGICA DE NEGOCIO
-- Ejecutar DESPUÉS de schema.sql
-- =====================================================================

-- =====================================================================
-- SECCIÓN A — DATOS DE PRUEBA (SEED)
-- =====================================================================

-- Catálogos
INSERT INTO TipoUnidad (nombre) VALUES
    ('Camion Cisterna'), ('Furgon'), ('Tracto'), ('Motobomba'), ('Generador'), ('Compresor');

INSERT INTO Marca (nombre) VALUES
    ('Freightliner'), ('Inno 300'), ('Chagman');

-- Los roles 'admin' y 'trabajador' ya los inserta schema.sql (catálogo cerrado):
-- no se insertan aquí. id_rol = 1 -> admin, id_rol = 2 -> trabajador.

INSERT INTO TipoMantenimiento (nombre, intervalo_valor, tipo_medidor_aplicable) VALUES
    ('PM1', 5000, 'Odometro'),
    ('PM2', 10000, 'Odometro'),
    ('PM3', 20000, 'Odometro'),
    ('PM1-Horas', 250, 'Horometro'),
    ('Correctivo', 0, 'Odometro'),
    ('Auxilio', 0, 'Odometro');

INSERT INTO CatalogoServicio (nombre, descripcion, precio_referencial) VALUES
    ('Reparacion sistema de succion', 'Mano de obra especializada en sistema hidraulico de succion', 350.00),
    ('Revision plataforma hidraulica', 'Diagnostico y ajuste de plataforma', 280.00),
    ('Diagnostico general', 'Revision integral previa a cotizacion', 80.00),
    ('Hora tecnico', 'Hora de mano de obra estandar', 45.00);

INSERT INTO TipoDocumento (nombre, es_documento_externo) VALUES
    ('Cotizacion', 1),
    ('Proforma', 1),
    ('Orden de Servicio Interna', 0);

INSERT INTO Proveedor (ruc, razon_social, nombre_comercial, contacto, ubicacion) VALUES
    ('20123456789', 'Repuestos Industriales SAC', 'RepIndustrial', '01-4567890', 'Callao'),
    ('20456789123', 'Hidraulica del Peru EIRL', 'HidraulicaPeru', '01-5551234', 'Lima');

-- Clientes
INSERT INTO Cliente (tipo_documento_identidad, numero_documento, nombre_razon_social, telefono, tipo_cliente) VALUES
    ('RUC', '20111222333', 'Transportes Andinos SAC', '999888777', 'Empresa'),
    ('DNI', '45678912',     'Jorge Ramirez',            '988776655', 'Persona Natural');

-- Activos (vehiculo con placa + equipo estacionario sin placa)
INSERT INTO Activo (id_tipo_unidad, id_marca, id_cliente, tipo_activo, placa, capacidad) VALUES
    (1, 1, 1, 'Vehiculo', 'ABC-123', 8000),          -- camion cisterna con placa
    (4, 3, 1, 'EquipoEstacionario', NULL, NULL);      -- motobomba sin placa

-- Trabajadores
-- Personal de prueba sin credenciales (correo/password NULL). Para probar el
-- login crea cuentas reales con crearTrabajador() o desde la pantalla de registro.
INSERT INTO Trabajador (id_rol, nombre, tipo_contrato) VALUES
    (1, 'Alexander (Dueno)', 'Fijo'),
    (2, 'Luis Ayudante', 'Fijo'),
    (2, 'Pedro Tornero', 'Subcontratado');

-- Repuestos
INSERT INTO Repuesto (nombre, codigo_referencia, stock_actual, es_comercial, estado_operativo) VALUES
    ('Filtro de aceite', 'FIL-001', 12, 1, 'Activo'),
    ('Empaque de bomba', 'EMP-045', 2, 0, 'Activo');

-- Proveedores de repuestos (N:M con precio propio)
INSERT INTO RepuestoProveedor (id_repuesto, id_proveedor, precio_ofrecido) VALUES
    (1, 1, 35.00),
    (1, 2, 38.50),
    (2, 2, 120.00);

-- Medidores (un activo puede tener varios)
INSERT INTO Medidor (id_activo, tipo_medidor, lectura_actual, fecha_ultima_lectura) VALUES
    (1, 'Odometro', 24500, '2026-09-20'),
    (2, 'Horometro', 480, '2026-09-18');

-- Orden de trabajo (requiere id_medidor consistente con id_activo -> validado por TRIGGER)
INSERT INTO OrdenDeTrabajo
    (id_activo, id_medidor, id_tipo_mantenimiento, responsable_id, valor_lectura, fecha, descripcion, es_auxilio, estado)
VALUES
    (1, 1, 1, 1, 20000, '2026-08-01', 'Cambio de aceite y filtros PM1', 0, 'Completada'),
    (1, 1, 2, 1, 22000, '2026-09-01', 'Inspeccion PM2', 0, 'Completada');

-- Personal que participo en la orden (pivote)
INSERT INTO OrdenTrabajo_Trabajador (id_orden, id_trabajador, tipo_participacion, rol_en_trabajo) VALUES
    (1, 2, 'Fijo', 'Apoyo cambio de aceite'),
    (2, 3, 'Subcontratado', 'Torneado de piezas');

-- Cotizacion + detalle (mezcla repuesto y servicio) + foto
INSERT INTO Cotizacion (id_activo, id_tipo_documento, fecha_emision, estado) VALUES
    (1, 1, '2026-09-22', 'Pendiente');

INSERT INTO DetalleCotizacion (id_cotizacion, id_repuesto, id_servicio, tipo_item, cantidad, precio_unitario) VALUES
    (1, 1, NULL, 'Repuesto', 2, 35.00),
    (1, NULL, 1, 'Servicio', 1, 350.00);
    -- Tras este INSERT, el TRIGGER trg_recalc_monto_insert deja monto_total = 420.00

INSERT INTO FotoCotizacion (id_cotizacion, url_imagen, fecha_subida) VALUES
    (1, 'file:///fotos/cotizacion_1_a.jpg', '2026-09-22');


-- =====================================================================
-- SECCIÓN B — CONSULTAS DE FILTRADO Y JOINS
-- =====================================================================

-- B1. Historial completo de órdenes de un Activo especifico (parametro: id_activo)
SELECT
    od.id_orden,
    od.fecha,
    tm.nombre        AS tipo_mantenimiento,
    od.valor_lectura,
    od.estado,
    od.es_auxilio,
    t.nombre         AS responsable
FROM OrdenDeTrabajo od
JOIN TipoMantenimiento tm ON tm.id_tipo_mantenimiento = od.id_tipo_mantenimiento
JOIN Trabajador t         ON t.id_trabajador = od.responsable_id
WHERE od.id_activo = ?
ORDER BY od.fecha DESC;

-- B2. Cuadrilla completa (responsable + apoyo) de una orden especifica (parametro: id_orden)
SELECT t.nombre, 'Responsable' AS rol_general, NULL AS rol_en_trabajo
FROM OrdenDeTrabajo od
JOIN Trabajador t ON t.id_trabajador = od.responsable_id
WHERE od.id_orden = ?
UNION ALL
SELECT t.nombre, otr.tipo_participacion AS rol_general, otr.rol_en_trabajo
FROM OrdenTrabajo_Trabajador otr
JOIN Trabajador t ON t.id_trabajador = otr.id_trabajador
WHERE otr.id_orden = ?;

-- B3. Detalle de una cotizacion con nombres reales (resuelve el discriminador polimorfico)
SELECT
    dc.id_detalle,
    dc.tipo_item,
    CASE WHEN dc.tipo_item = 'Repuesto' THEN r.nombre ELSE cs.nombre END AS descripcion_item,
    dc.cantidad,
    dc.precio_unitario,
    (dc.cantidad * dc.precio_unitario) AS subtotal_calculado
FROM DetalleCotizacion dc
LEFT JOIN Repuesto r         ON r.id_repuesto = dc.id_repuesto
LEFT JOIN CatalogoServicio cs ON cs.id_servicio = dc.id_servicio
WHERE dc.id_cotizacion = ?;

-- B4. Verificar que el TRIGGER de recalculo funciono (debe mostrar 420.00 con el seed de arriba)
SELECT id_cotizacion, monto_total, estado FROM Cotizacion WHERE id_cotizacion = ?;

-- B5. Mejor proveedor (precio mas bajo) para cada repuesto
SELECT
    r.id_repuesto,
    r.nombre,
    p.nombre_comercial,
    rp.precio_ofrecido
FROM RepuestoProveedor rp
JOIN Repuesto r  ON r.id_repuesto = rp.id_repuesto
JOIN Proveedor p ON p.id_proveedor = rp.id_proveedor
WHERE rp.precio_ofrecido = (
    SELECT MIN(rp2.precio_ofrecido)
    FROM RepuestoProveedor rp2
    WHERE rp2.id_repuesto = rp.id_repuesto
)
ORDER BY r.nombre;

-- B6. Repuestos activos con stock bajo (umbral parametrizable)
SELECT id_repuesto, nombre, stock_actual
FROM Repuesto
WHERE estado_operativo = 'Activo' AND stock_actual <= ?
ORDER BY stock_actual ASC;

-- B7. Activos de un cliente con conteo de ordenes de trabajo
SELECT
    a.id_activo,
    a.tipo_activo,
    a.placa,
    COUNT(od.id_orden) AS total_ordenes
FROM Activo a
LEFT JOIN OrdenDeTrabajo od ON od.id_activo = a.id_activo
WHERE a.id_cliente = ?
GROUP BY a.id_activo;


-- =====================================================================
-- SECCIÓN C — LÓGICA DE NEGOCIO: DISPONIBILIDAD / PROXIMO MANTENIMIENTO
-- =====================================================================
-- Para cada Activo + Medidor, calcula cuanto falta (en la unidad del medidor)
-- para el proximo mantenimiento de cada TipoMantenimiento aplicable a ese
-- tipo de medidor, tomando como base la ULTIMA orden COMPLETADA de ese tipo.
-- Si nunca se hizo ese mantenimiento, la base es 0 (desde que se registro el activo).
-- =====================================================================

WITH ultima_orden AS (
    SELECT
        od.id_medidor,
        od.id_tipo_mantenimiento,
        MAX(od.valor_lectura) AS ultima_lectura_servicio
    FROM OrdenDeTrabajo od
    WHERE od.estado = 'Completada'
    GROUP BY od.id_medidor, od.id_tipo_mantenimiento
)
SELECT
    a.id_activo,
    a.placa,
    tu.nombre                                                              AS tipo_unidad,
    m.id_medidor,
    m.tipo_medidor,
    m.lectura_actual,
    tm.nombre                                                              AS tipo_mantenimiento,
    tm.intervalo_valor,
    COALESCE(uo.ultima_lectura_servicio, 0)                                AS ultima_lectura_servicio,
    COALESCE(uo.ultima_lectura_servicio, 0) + tm.intervalo_valor           AS proxima_lectura_objetivo,
    (COALESCE(uo.ultima_lectura_servicio, 0) + tm.intervalo_valor) - m.lectura_actual AS restante,
    CASE
        WHEN (COALESCE(uo.ultima_lectura_servicio, 0) + tm.intervalo_valor) - m.lectura_actual <= 0   THEN 'VENCIDO'
        WHEN (COALESCE(uo.ultima_lectura_servicio, 0) + tm.intervalo_valor) - m.lectura_actual <= 500 THEN 'PROXIMO'
        ELSE 'OK'
    END AS estado_disponibilidad
FROM Activo a
JOIN Medidor m           ON m.id_activo = a.id_activo
JOIN TipoUnidad tu        ON tu.id_tipo_unidad = a.id_tipo_unidad
JOIN TipoMantenimiento tm ON tm.tipo_medidor_aplicable = m.tipo_medidor
                          AND tm.intervalo_valor > 0        -- excluye Correctivo/Auxilio (intervalo 0)
LEFT JOIN ultima_orden uo ON uo.id_medidor = m.id_medidor
                          AND uo.id_tipo_mantenimiento = tm.id_tipo_mantenimiento
ORDER BY restante ASC;
