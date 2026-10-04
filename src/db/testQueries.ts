// =====================================================================
// TALLER "ALEXANDER" — RUNNER DE PRUEBAS DE LÓGICA (sin UI)
// =====================================================================

import {
  actualizarVehiculo,
  crearVehiculo,
  eliminarVehiculo,
  getDb,
  getDetalleCotizacion,
  getDisponibilidadMantenimiento,
  getHistorialActivo,
  getMejorProveedorPorRepuesto,
  getRepuestosStockBajo,
  // 1. IMPORTAMOS LAS NUEVAS FUNCIONES CRUD DE VEHÍCULOS
  getVehiculosConDetalle,
  initDatabase,
  resetDatabase,
} from "./database";

/** Inserta el set de datos de prueba (equivalente a la Sección A de queries.sql). */
async function seedTestData(): Promise<void> {
  const db = getDb();

  await db.withTransactionAsync(async () => {
    // --- Catálogos ---
    await db.runAsync(
      `INSERT INTO TipoUnidad (nombre) VALUES ('Camion Cisterna'), ('Furgon'), ('Tracto'), ('Motobomba'), ('Generador'), ('Compresor');`,
    );
    await db.runAsync(
      `INSERT INTO Marca (nombre) VALUES ('Freightliner'), ('Inno 300'), ('Chagman');`,
    );
    // Los roles 'admin' (1) y 'trabajador' (2) ya los crea initDatabase().
    await db.runAsync(
      `INSERT INTO TipoMantenimiento (nombre, intervalo_valor, tipo_medidor_aplicable) VALUES
        ('PM1', 5000, 'Odometro'), ('PM2', 10000, 'Odometro'), ('PM3', 20000, 'Odometro'),
        ('PM1-Horas', 250, 'Horometro'), ('Correctivo', 0, 'Odometro'), ('Auxilio', 0, 'Odometro');`,
    );
    await db.runAsync(
      `INSERT INTO CatalogoServicio (nombre, descripcion, precio_referencial) VALUES
        ('Reparacion sistema de succion', 'Mano de obra especializada', 350.00),
        ('Revision plataforma hidraulica', 'Diagnostico y ajuste', 280.00),
        ('Diagnostico general', 'Revision integral', 80.00),
        ('Hora tecnico', 'Hora de mano de obra estandar', 45.00);`,
    );
    await db.runAsync(
      `INSERT INTO TipoDocumento (nombre, es_documento_externo) VALUES
        ('Cotizacion', 1), ('Proforma', 1), ('Orden de Servicio Interna', 0);`,
    );
    await db.runAsync(
      `INSERT INTO Proveedor (ruc, razon_social, nombre_comercial, contacto, ubicacion) VALUES
        ('20123456789', 'Repuestos Industriales SAC', 'RepIndustrial', '01-4567890', 'Callao'),
        ('20456789123', 'Hidraulica del Peru EIRL', 'HidraulicaPeru', '01-5551234', 'Lima');`,
    );

    // --- Clientes / Activos / Personal ---
    await db.runAsync(
      `INSERT INTO Cliente (tipo_documento_identidad, numero_documento, nombre_razon_social, telefono, tipo_cliente) VALUES
        ('RUC', '20111222333', 'Transportes Andinos SAC', '999888777', 'Empresa'),
        ('DNI', '45678912', 'Jorge Ramirez', '988776655', 'Persona Natural');`,
    );
    await db.runAsync(
      `INSERT INTO Activo (id_tipo_unidad, id_marca, id_cliente, tipo_activo, placa, capacidad) VALUES
        (1, 1, 1, 'Vehiculo', 'ABC-123', 8000),
        (4, 3, 1, 'EquipoEstacionario', NULL, NULL);`,
    );
    await db.runAsync(
      `INSERT INTO Trabajador (id_rol, nombre, tipo_contrato) VALUES
        (1, 'Alexander (Dueno)', 'Fijo'), (2, 'Luis Ayudante', 'Fijo'), (2, 'Pedro Tornero', 'Subcontratado');`,
    );
    await db.runAsync(
      `INSERT INTO Repuesto (nombre, codigo_referencia, stock_actual, es_comercial, estado_operativo) VALUES
        ('Filtro de aceite', 'FIL-001', 12, 1, 'Activo'), ('Empaque de bomba', 'EMP-045', 2, 0, 'Activo');`,
    );
    await db.runAsync(
      `INSERT INTO RepuestoProveedor (id_repuesto, id_proveedor, precio_ofrecido) VALUES
        (1, 1, 35.00), (1, 2, 38.50), (2, 2, 120.00);`,
    );
    await db.runAsync(
      `INSERT INTO Medidor (id_activo, tipo_medidor, lectura_actual, fecha_ultima_lectura) VALUES
        (1, 'Odometro', 24500, '2026-09-20'), (2, 'Horometro', 480, '2026-09-18');`,
    );

    // --- Transaccionales (ejercitan los TRIGGERS) ---
    await db.runAsync(
      `INSERT INTO OrdenDeTrabajo
        (id_activo, id_medidor, id_tipo_mantenimiento, responsable_id, valor_lectura, fecha, descripcion, es_auxilio, estado) VALUES
        (1, 1, 1, 1, 20000, '2026-08-01', 'Cambio de aceite y filtros PM1', 0, 'Completada'),
        (1, 1, 2, 1, 22000, '2026-09-01', 'Inspeccion PM2', 0, 'Completada');`,
    );
    await db.runAsync(
      `INSERT INTO OrdenTrabajo_Trabajador (id_orden, id_trabajador, tipo_participacion, rol_en_trabajo) VALUES
        (1, 2, 'Fijo', 'Apoyo cambio de aceite'), (2, 3, 'Subcontratado', 'Torneado de piezas');`,
    );
    await db.runAsync(
      `INSERT INTO Cotizacion (id_activo, id_tipo_documento, fecha_emision, estado) VALUES (1, 1, '2026-09-22', 'Pendiente');`,
    );
    await db.runAsync(
      `INSERT INTO DetalleCotizacion (id_cotizacion, id_repuesto, id_servicio, tipo_item, cantidad, precio_unitario) VALUES
        (1, 1, NULL, 'Repuesto', 2, 35.00), (1, NULL, 1, 'Servicio', 1, 350.00);`,
    );
    await db.runAsync(
      `INSERT INTO FotoCotizacion (id_cotizacion, url_imagen, fecha_subida) VALUES
        (1, 'file:///fotos/cotizacion_1_a.jpg', '2026-09-22');`,
    );
  });

  console.log("[SEED] Datos de prueba insertados correctamente.");
}

/** Verifica que el TRIGGER de consistencia cruzada rechace un id_activo inconsistente. */
async function testTriggerConsistenciaActivo(): Promise<void> {
  const db = getDb();
  console.log("\n=== TEST: trigger de consistencia id_activo/id_medidor ===");
  try {
    await db.runAsync(
      `INSERT INTO OrdenDeTrabajo
        (id_activo, id_medidor, id_tipo_mantenimiento, responsable_id, valor_lectura, fecha, es_auxilio, estado)
       VALUES (1, 2, 4, 1, 500, '2026-09-23', 0, 'Pendiente');`,
    );
    console.error(
      "[FAIL] El trigger debió rechazar esta inserción y no lo hizo.",
    );
  } catch (error) {
    console.log(
      "[OK] El trigger bloqueó la inconsistencia como se esperaba:",
      (error as Error).message,
    );
  }
}

/** Verifica que el TRIGGER de recálculo de monto_total funcione tras el seed. */
async function testTriggerRecalculoMonto(): Promise<void> {
  const db = getDb();
  console.log("\n=== TEST: trigger de recálculo de monto_total ===");
  const cotizacion = await db.getFirstAsync<{
    id_cotizacion: number;
    monto_total: number;
    estado: string;
  }>(
    `SELECT id_cotizacion, monto_total, estado FROM Cotizacion WHERE id_cotizacion = 1;`,
  );

  const esperado = 2 * 35.0 + 1 * 350.0; // 420.00
  if (cotizacion?.monto_total === esperado) {
    console.log(
      `[OK] monto_total = ${cotizacion.monto_total} (esperado ${esperado})`,
    );
  } else {
    console.error(
      `[FAIL] monto_total = ${cotizacion?.monto_total}, se esperaba ${esperado}`,
    );
  }
}

/** Ejecuta todas las consultas de negocio y muestra los resultados. */
async function runBusinessQueries(): Promise<void> {
  console.log("\n=== CONSULTA: disponibilidad de mantenimiento por activo ===");
  console.log(
    JSON.stringify(await getDisponibilidadMantenimiento(500), null, 2),
  );

  console.log("\n=== CONSULTA: historial del Activo #1 (camión ABC-123) ===");
  console.log(JSON.stringify(await getHistorialActivo(1), null, 2));

  console.log("\n=== CONSULTA: mejor proveedor por repuesto ===");
  console.log(JSON.stringify(await getMejorProveedorPorRepuesto(), null, 2));

  console.log("\n=== CONSULTA: detalle resuelto de la Cotización #1 ===");
  console.log(JSON.stringify(await getDetalleCotizacion(1), null, 2));

  console.log("\n=== CONSULTA: repuestos con stock bajo (umbral=5) ===");
  console.log(JSON.stringify(await getRepuestosStockBajo(5), null, 2));
}

/** 2. NUEVA FUNCIÓN QUE ENCAPSULA LAS PRUEBAS DEL CRUD DE VEHÍCULOS */
async function testCrudVehiculos(): Promise<void> {
  console.log("\n=== TEST CRUD: Listar vehículos iniciales ===");
  let vehiculos = await getVehiculosConDetalle();
  console.log(`Total vehículos actuales: ${vehiculos.length}`);

  console.log("\n=== TEST CRUD: Crear un nuevo vehículo de prueba ===");
  // Usamos el cliente ID=1, tipo_unidad ID=1 y marca ID=1 creados en el seed
  const nuevoId = await crearVehiculo(
    1,
    1,
    1,
    "XYZ-999",
    15.5,
    "Odometro",
    1000,
  );
  console.log(`Vehículo creado con ID: ${nuevoId}`);

  vehiculos = await getVehiculosConDetalle();
  console.log(
    "Vehículo encontrado en la lista:",
    JSON.stringify(
      vehiculos.find((v) => v.id_activo === nuevoId),
      null,
      2,
    ),
  );

  console.log("\n=== TEST CRUD: Actualizar el vehículo creado ===");
  await actualizarVehiculo(nuevoId, "XYZ-999 (Modificado)", 20.0, 1);
  vehiculos = await getVehiculosConDetalle();
  console.log(
    "Vehículo actualizado:",
    JSON.stringify(
      vehiculos.find((v) => v.id_activo === nuevoId),
      null,
      2,
    ),
  );

  console.log("\n=== TEST CRUD: Eliminar el vehículo de prueba ===");
  await eliminarVehiculo(nuevoId);
  vehiculos = await getVehiculosConDetalle();
  console.log(
    `Vehículo eliminado con éxito. Total actual de vehículos: ${vehiculos.length}`,
  );
}

/**
 * Punto de entrada único: resetea la BD, aplica el esquema, siembra datos,
 * corre los triggers, las consultas de negocio y el ciclo CRUD de vehículos.
 */
export async function runAllTests(): Promise<void> {
  console.log(
    '=== INICIANDO PRUEBAS DE BASE DE DATOS — TALLER "ALEXANDER" ===',
  );

  await resetDatabase();
  await initDatabase();

  await seedTestData();
  await testTriggerConsistenciaActivo();
  await testTriggerRecalculoMonto();
  await runBusinessQueries();

  // 3. EJECUTAMOS EL CRUD DE VEHÍCULOS AQUÍ
  await testCrudVehiculos();

  console.log("\n=== PRUEBAS FINALIZADAS EXITOSAMENTE ===");
}
