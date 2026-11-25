import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------
// Datos de demostración (módulo de vehículos y dependencias directas)
// ---------------------------------------------------------------------

const MARCAS_SEED: readonly string[] = [
  "Toyota",
  "Volvo",
  "Scania",
  "Hyundai",
  "Caterpillar",
  "Cummins",
];

const TIPOS_UNIDAD_SEED: readonly string[] = [
  "Camión",
  "Camioneta",
  "Automóvil",
  "Maquinaria",
];

type ClienteSeed = readonly [
  tipoDoc: "RUC" | "DNI",
  numeroDocumento: string,
  nombreRazonSocial: string,
  telefono: string,
  tipoCliente: "Empresa" | "Persona Natural",
];

const CLIENTES_SEED: readonly ClienteSeed[] = [
  [
    "RUC",
    "20512345678",
    "Transportes Andes del Sur S.A.C.",
    "014567890",
    "Empresa",
  ],
  [
    "RUC",
    "20601234567",
    "Constructora Pacífico E.I.R.L.",
    "987100200",
    "Empresa",
  ],
  ["RUC", "20498765432", "Minera Cerro Alto S.A.", "987300400", "Empresa"],
  ["RUC", "20556677889", "Logística Rímac S.A.C.", "012345678", "Empresa"],
  ["DNI", "45678912", "Carlos Mendoza Quispe", "987654001", "Persona Natural"],
  [
    "DNI",
    "70123456",
    "María Fernanda Salazar Ríos",
    "987654002",
    "Persona Natural",
  ],
  ["DNI", "41236587", "Jorge Huamán Torres", "987654003", "Persona Natural"],
];

interface ActivoSeed {
  tipoUnidad: string;
  marca: string;
  clienteDoc: string;
  tipoActivo: "Vehiculo" | "EquipoEstacionario";
  placa: string | null;
  capacidad: number | null;
  tipoMedidor: "Odometro" | "Horometro" | "Ciclos";
  lectura: number;
}

const ACTIVOS_SEED: readonly ActivoSeed[] = [
  {
    tipoUnidad: "Camión",
    marca: "Volvo",
    clienteDoc: "20512345678",
    tipoActivo: "Vehiculo",
    placa: "V4K-815",
    capacidad: 28000,
    tipoMedidor: "Odometro",
    lectura: 184500,
  },
  {
    tipoUnidad: "Camión",
    marca: "Scania",
    clienteDoc: "20512345678",
    tipoActivo: "Vehiculo",
    placa: "B7R-392",
    capacidad: 30000,
    tipoMedidor: "Odometro",
    lectura: 241300,
  },
  {
    tipoUnidad: "Camión",
    marca: "Volvo",
    clienteDoc: "20556677889",
    tipoActivo: "Vehiculo",
    placa: "C2M-640",
    capacidad: 26000,
    tipoMedidor: "Odometro",
    lectura: 98750,
  },
  {
    tipoUnidad: "Camión",
    marca: "Scania",
    clienteDoc: "20498765432",
    tipoActivo: "Vehiculo",
    placa: "D9T-204",
    capacidad: 32000,
    tipoMedidor: "Odometro",
    lectura: 312800,
  },
  {
    tipoUnidad: "Camioneta",
    marca: "Toyota",
    clienteDoc: "20601234567",
    tipoActivo: "Vehiculo",
    placa: "F3H-771",
    capacidad: 1000,
    tipoMedidor: "Odometro",
    lectura: 76420,
  },
  {
    tipoUnidad: "Camioneta",
    marca: "Hyundai",
    clienteDoc: "20601234567",
    tipoActivo: "Vehiculo",
    placa: "A8L-559",
    capacidad: 1100,
    tipoMedidor: "Odometro",
    lectura: 54300,
  },
  {
    tipoUnidad: "Camioneta",
    marca: "Toyota",
    clienteDoc: "45678912",
    tipoActivo: "Vehiculo",
    placa: "BQX-482",
    capacidad: 1000,
    tipoMedidor: "Odometro",
    lectura: 132900,
  },
  {
    tipoUnidad: "Automóvil",
    marca: "Hyundai",
    clienteDoc: "70123456",
    tipoActivo: "Vehiculo",
    placa: "AZD-317",
    capacidad: null,
    tipoMedidor: "Odometro",
    lectura: 41850,
  },
  {
    tipoUnidad: "Automóvil",
    marca: "Toyota",
    clienteDoc: "41236587",
    tipoActivo: "Vehiculo",
    placa: "C5P-926",
    capacidad: null,
    tipoMedidor: "Odometro",
    lectura: 88210,
  },
  {
    tipoUnidad: "Maquinaria",
    marca: "Caterpillar",
    clienteDoc: "20601234567",
    tipoActivo: "Vehiculo",
    placa: null,
    capacidad: 18000,
    tipoMedidor: "Horometro",
    lectura: 3420.5,
  },
  {
    tipoUnidad: "Maquinaria",
    marca: "Cummins",
    clienteDoc: "20498765432",
    tipoActivo: "EquipoEstacionario",
    placa: null,
    capacidad: 250,
    tipoMedidor: "Horometro",
    lectura: 5120,
  },
];

/**
 * Precarga catálogos, clientes, activos y medidores para demostraciones.
 * Idempotente: si ya existe algún Activo, no hace nada (no pisa datos reales).
 * Orden respetando FK: catálogos -> clientes -> activos -> medidores.
 * Nunca lanza errores hacia arriba: un fallo del seed no debe tumbar el arranque.
 */
export async function sembrarDatosIniciales(db: SQLiteDatabase): Promise<void> {
  try {
    const existente = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM Activo;`,
    );
    if (existente && existente.total > 0) return;

    const fechaHoy = new Date().toISOString().split("T")[0];

    await db.withTransactionAsync(async () => {
      // 1. Catálogos
      for (const nombre of MARCAS_SEED) {
        await db.runAsync(`INSERT OR IGNORE INTO Marca (nombre) VALUES (?);`, [
          nombre,
        ]);
      }
      for (const nombre of TIPOS_UNIDAD_SEED) {
        await db.runAsync(
          `INSERT OR IGNORE INTO TipoUnidad (nombre) VALUES (?);`,
          [nombre],
        );
      }

      // 2. Clientes (numero_documento es UNIQUE)
      for (const [
        tipoDoc,
        numero,
        nombre,
        telefono,
        tipoCliente,
      ] of CLIENTES_SEED) {
        await db.runAsync(
          `INSERT OR IGNORE INTO Cliente
             (tipo_documento_identidad, numero_documento, nombre_razon_social, telefono, tipo_cliente)
           VALUES (?, ?, ?, ?, ?);`,
          [tipoDoc, numero, nombre, telefono, tipoCliente],
        );
      }

      // 3. Activos + 4. Medidores (los ids se resuelven por nombre/documento)
      for (const a of ACTIVOS_SEED) {
        const res = await db.runAsync(
          `INSERT OR IGNORE INTO Activo
             (id_tipo_unidad, id_marca, id_cliente, tipo_activo, placa, capacidad)
           VALUES (
             (SELECT id_tipo_unidad FROM TipoUnidad WHERE nombre = ?),
             (SELECT id_marca FROM Marca WHERE nombre = ?),
             (SELECT id_cliente FROM Cliente WHERE numero_documento = ?),
             ?, ?, ?
           );`,
          [
            a.tipoUnidad,
            a.marca,
            a.clienteDoc,
            a.tipoActivo,
            a.placa,
            a.capacidad,
          ],
        );
        if (res.changes === 0) continue; // fila ignorada: no crear medidor huérfano

        await db.runAsync(
          `INSERT INTO Medidor (id_activo, tipo_medidor, lectura_actual, fecha_ultima_lectura)
           VALUES (?, ?, ?, ?);`,
          [res.lastInsertRowId, a.tipoMedidor, a.lectura, fechaHoy],
        );
      }
    });
  } catch (e) {
    console.warn("[seed] No se pudieron sembrar los datos iniciales:", e);
  }
}

// ---------------------------------------------------------------------
// Datos operativos (catálogos de cotización, inventario, órdenes, cotizaciones)
// Idempotente POR TABLA: cada bloque solo inserta si su tabla está vacía.
// ---------------------------------------------------------------------

type TablaSeed =
  | "TipoDocumento"
  | "TipoMantenimiento"
  | "CatalogoServicio"
  | "Proveedor"
  | "Repuesto"
  | "RepuestoProveedor"
  | "OrdenDeTrabajo"
  | "Cotizacion"
  | "DetalleCotizacion"
  | "FotoCotizacion";

async function tablaVacia(
  db: SQLiteDatabase,
  tabla: TablaSeed,
): Promise<boolean> {
  const fila = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${tabla};`,
  );
  return (fila?.total ?? 0) === 0;
}

const TIPOS_DOCUMENTO_SEED: readonly (readonly [string, 0 | 1])[] = [
  ["Cotizacion", 1],
  ["Proforma", 1],
  ["Orden de Servicio Interna", 0],
];

const TIPOS_MANTENIMIENTO_SEED: readonly (readonly [
  string,
  number,
  "Odometro" | "Horometro" | "Ciclos",
])[] = [
  ["PM1", 5000, "Odometro"],
  ["PM2", 10000, "Odometro"],
  ["PM3", 20000, "Odometro"],
  ["PM1-Horas", 250, "Horometro"],
  ["Correctivo", 0, "Odometro"],
  ["Auxilio", 0, "Odometro"],
];

const SERVICIOS_SEED: readonly (readonly [string, string, number])[] = [
  ["Diagnóstico general", "Revisión integral previa a cotización", 80.0],
  ["Hora técnico", "Hora de mano de obra estándar", 60.0],
  [
    "Revisión de frenos",
    "Inspección de pastillas, discos y líquido de frenos",
    100.0,
  ],
  [
    "Revisión del sistema hidráulico",
    "Diagnóstico de bombas, mangueras y sellos del sistema hidráulico",
    150.0,
  ],
  [
    "Cambio de aceite y filtros (mano de obra)",
    "Mano de obra del cambio de aceite y filtros",
    90.0,
  ],
  [
    "Alineación y balanceo",
    "Alineación de dirección y balanceo de ruedas",
    70.0,
  ],
];

const PROVEEDORES_SEED: readonly (readonly [
  ruc: string,
  razon: string,
  comercial: string,
  contacto: string,
  ubicacion: string,
])[] = [
  [
    "20123456789",
    "Repuestos Industriales SAC",
    "RepIndustrial",
    "01-4567890",
    "Callao",
  ],
  [
    "20456789123",
    "Hidráulica del Perú EIRL",
    "HidráulicaPerú",
    "01-5551234",
    "Lima",
  ],
  [
    "20567891234",
    "Autopartes Lima Norte SAC",
    "AutoNorte",
    "01-5557788",
    "Los Olivos, Lima",
  ],
];

const REPUESTOS_SEED: readonly (readonly [
  nombre: string,
  codigo: string,
  stock: number,
  esComercial: 0 | 1,
  estado: "Activo" | "Descontinuado",
  url: string | null,
])[] = [
  [
    "Filtro de aceite",
    "FIL-001",
    30,
    1,
    "Activo",
    "https://provinnor.pe/wp-content/uploads/2025/09/filtro-de-aceite-sakura-c-65400.webp",
  ],
  [
    "Pastillas de freno",
    "FRE-010",
    12,
    1,
    "Activo",
    "https://www.ro-des.com/wp-content/uploads/2022/09/pastillas-de-freno.jpg",
  ],
  [
    "Bujías (juego x4)",
    "BUJ-004",
    20,
    1,
    "Activo",
    "https://http2.mlstatic.com/D_NQ_NP_2X_721889-MPE85511145835_062025-F.webp",
  ],
  [
    "Amortiguador trasero",
    "AMO-020",
    8,
    1,
    "Activo",
    "https://cdn.club-magazin.autodoc.de/uploads/sites/11/2020/11/amortiguador-de-coche.jpg",
  ],
  [
    "Batería 12V 100Ah",
    "BAT-100",
    3,
    1,
    "Activo",
    "https://bateriasyamperios.com/wp-content/uploads/2019/06/bateria-gel-long-LGK100-12N.jpg",
  ],
  [
    "Pistón forjado",
    "PIS-030",
    5,
    1,
    "Activo",
    "https://thumbs.dreamstime.com/b/deporte-forjado-ligero-y-pist%C3%B3n-biela-el-competir-con-135707055.jpg?w=992",
  ],
  [
    "Empaque de bomba",
    "EMP-045",
    2,
    0,
    "Activo",
    "https://es.jst-seals.com/uploadfile/202310/24/5459679de87a49b5559fb254f837cd21_medium.jpg",
  ],
  [
    "Kit de sello hidráulico",
    "SEL-050",
    0,
    0,
    "Activo",
    "https://www.costex.com/wp-content/uploads/2025/07/mini-excavator-hydraulic-seal-kits-header.jpg",
  ],
  [
    "Filtro de aire",
    "FAI-002",
    15,
    1,
    "Descontinuado",
    "https://renusa.pe/wp-content/uploads/2023/08/FA7357.jpg",
  ],
  [
    "Manguera de succión",
    "MAN-060",
    6,
    0,
    "Activo",
    "https://rentamax.com.ni/wp-content/uploads/2025/02/Manguera-de-Succion-2.jpg",
  ],
];

const P1 = "20123456789"; // Repuestos Industriales SAC
const P2 = "20456789123"; // Hidráulica del Perú EIRL
const P3 = "20567891234"; // Autopartes Lima Norte SAC

const PRECIOS_SEED: readonly (readonly [
  codigo: string,
  ruc: string,
  precio: number,
])[] = [
  ["FIL-001", P1, 45.0],
  ["FIL-001", P3, 48.5],
  ["FRE-010", P3, 135.0],
  ["BUJ-004", P1, 88.0],
  ["BUJ-004", P3, 92.0],
  ["AMO-020", P1, 310.0],
  ["BAT-100", P3, 420.0],
  ["PIS-030", P1, 560.0],
  ["PIS-030", P2, 540.0],
  ["EMP-045", P2, 120.0],
  ["SEL-050", P2, 265.0],
  ["FAI-002", P1, 52.0],
];

const ORDENES_SEED: readonly (readonly [
  placa: string,
  tipoMantenimiento: string,
  estado: "Pendiente" | "En Proceso" | "Completada" | "Cancelada",
  offsetFecha: string,
  descripcion: string,
])[] = [
  [
    "V4K-815",
    "PM1",
    "Completada",
    "-12 day",
    "Mantenimiento preventivo PM1: cambio de aceite y filtros",
  ],
  [
    "B7R-392",
    "Correctivo",
    "En Proceso",
    "-2 day",
    "Reparación correctiva del sistema hidráulico",
  ],
  [
    "C2M-640",
    "PM2",
    "Pendiente",
    "+0 day",
    "Mantenimiento preventivo PM2 programado",
  ],
];

type EstadoCot = "Pendiente" | "Aprobada" | "Rechazada" | "Anulada";

const COTIZACIONES_SEED: readonly (readonly [
  placa: string,
  tipoDoc: string,
  estado: EstadoCot,
  offsetFecha: string,
])[] = [
  ["V4K-815", "Cotizacion", "Aprobada", "-9 day"],
  ["D9T-204", "Cotizacion", "Pendiente", "-4 day"],
  ["F3H-771", "Cotizacion", "Rechazada", "-6 day"],
  ["B7R-392", "Proforma", "Pendiente", "-1 day"],
];

const DETALLES_SEED: readonly (readonly [
  placa: string,
  tipoDoc: string,
  estado: EstadoCot,
  tipoItem: "Repuesto" | "Servicio",
  referencia: string, // código (Repuesto) o nombre (Servicio)
  cantidad: number,
  precio: number,
])[] = [
  ["V4K-815", "Cotizacion", "Aprobada", "Repuesto", "FIL-001", 2, 45.0],
  ["V4K-815", "Cotizacion", "Aprobada", "Servicio", "Hora técnico", 1, 60.0],
  ["D9T-204", "Cotizacion", "Pendiente", "Repuesto", "FRE-010", 1, 135.0],
  [
    "D9T-204",
    "Cotizacion",
    "Pendiente",
    "Servicio",
    "Revisión de frenos",
    1,
    100.0,
  ],
  ["F3H-771", "Cotizacion", "Rechazada", "Repuesto", "AMO-020", 1, 310.0],
  [
    "F3H-771",
    "Cotizacion",
    "Rechazada",
    "Servicio",
    "Diagnóstico general",
    1,
    80.0,
  ],
  ["B7R-392", "Proforma", "Pendiente", "Repuesto", "EMP-045", 1, 120.0],
  [
    "B7R-392",
    "Proforma",
    "Pendiente",
    "Servicio",
    "Revisión del sistema hidráulico",
    1,
    150.0,
  ],
];

const FOTOS_SEED: readonly (readonly [
  placa: string,
  tipoDoc: string,
  estado: EstadoCot,
  url: string,
  offsetFecha: string,
])[] = [
  [
    "D9T-204",
    "Cotizacion",
    "Pendiente",
    "https://cdn.bitrix24.es/b13800517/landing/55c/55cdcf5f9a681864c48af3f11a601d4b/por_que_se_desgastan_tan_rapido_las_pastillas_de_freno_1x.jpg",
    "-4 day",
  ],
  [
    "B7R-392",
    "Proforma",
    "Pendiente",
    "https://hydraflu.com/wp-content/uploads/2024/11/Oil-leakage-in-hydraulic-system.png",
    "-1 day",
  ],
];

/** Subconsulta: id de la cotización identificada por placa + tipo de documento + estado. */
const SQL_COTIZACION_POR_CLAVE = `(
  SELECT c.id_cotizacion FROM Cotizacion c
   WHERE c.id_activo = (SELECT id_activo FROM Activo WHERE placa = ?)
     AND c.id_tipo_documento = (SELECT id_tipo_documento FROM TipoDocumento WHERE nombre = ?)
     AND c.estado = ?
   ORDER BY c.id_cotizacion DESC LIMIT 1
)`;

/**
 * Precarga datos operativos (tipos de documento/mantenimiento, servicios,
 * proveedores, repuestos, órdenes y cotizaciones de demostración).
 * Idempotente por tabla. Los ids se resuelven por subconsulta; si un activo
 * demo no existe, esa fila se omite. Nunca lanza errores hacia arriba.
 */
export async function sembrarDatosOperativos(
  db: SQLiteDatabase,
): Promise<void> {
  try {
    await db.withTransactionAsync(async () => {
      if (await tablaVacia(db, "TipoDocumento")) {
        for (const [nombre, externo] of TIPOS_DOCUMENTO_SEED) {
          await db.runAsync(
            `INSERT OR IGNORE INTO TipoDocumento (nombre, es_documento_externo) VALUES (?, ?);`,
            [nombre, externo],
          );
        }
      }

      if (await tablaVacia(db, "TipoMantenimiento")) {
        for (const [nombre, intervalo, medidor] of TIPOS_MANTENIMIENTO_SEED) {
          await db.runAsync(
            `INSERT OR IGNORE INTO TipoMantenimiento
               (nombre, intervalo_valor, tipo_medidor_aplicable) VALUES (?, ?, ?);`,
            [nombre, intervalo, medidor],
          );
        }
      }

      if (await tablaVacia(db, "CatalogoServicio")) {
        for (const [nombre, descripcion, precio] of SERVICIOS_SEED) {
          await db.runAsync(
            `INSERT OR IGNORE INTO CatalogoServicio (nombre, descripcion, precio_referencial)
             VALUES (?, ?, ?);`,
            [nombre, descripcion, precio],
          );
        }
      }

      if (await tablaVacia(db, "Proveedor")) {
        for (const [
          ruc,
          razon,
          comercial,
          contacto,
          ubicacion,
        ] of PROVEEDORES_SEED) {
          await db.runAsync(
            `INSERT OR IGNORE INTO Proveedor
               (ruc, razon_social, nombre_comercial, contacto, ubicacion)
             VALUES (?, ?, ?, ?, ?);`,
            [ruc, razon, comercial, contacto, ubicacion],
          );
        }
      }

      if (await tablaVacia(db, "Repuesto")) {
        for (const [
          nombre,
          codigo,
          stock,
          comercial,
          estado,
          url,
        ] of REPUESTOS_SEED) {
          await db.runAsync(
            `INSERT OR IGNORE INTO Repuesto
               (nombre, codigo_referencia, stock_actual, es_comercial, estado_operativo, url_imagen)
             VALUES (?, ?, ?, ?, ?, ?);`,
            [nombre, codigo, stock, comercial, estado, url],
          );
        }
      }

      if (await tablaVacia(db, "RepuestoProveedor")) {
        for (const [codigo, ruc, precio] of PRECIOS_SEED) {
          await db.runAsync(
            `INSERT OR IGNORE INTO RepuestoProveedor (id_repuesto, id_proveedor, precio_ofrecido)
             VALUES (
               (SELECT id_repuesto FROM Repuesto WHERE codigo_referencia = ?),
               (SELECT id_proveedor FROM Proveedor WHERE ruc = ?),
               ?
             );`,
            [codigo, ruc, precio],
          );
        }
      }

      if (await tablaVacia(db, "OrdenDeTrabajo")) {
        for (const [
          placa,
          tipoMant,
          estado,
          offset,
          descripcion,
        ] of ORDENES_SEED) {
          await db.runAsync(
            `INSERT OR IGNORE INTO OrdenDeTrabajo
               (id_activo, id_medidor, id_tipo_mantenimiento, responsable_id,
                valor_lectura, fecha, descripcion, es_auxilio, ubicacion_auxilio, estado)
             SELECT a.id_activo, m.id_medidor,
                    (SELECT id_tipo_mantenimiento FROM TipoMantenimiento WHERE nombre = ?),
                    (SELECT t.id_trabajador FROM Trabajador t
                       JOIN Rol r ON r.id_rol = t.id_rol
                      WHERE t.correo = 'alex@taller.com' AND r.nombre = 'admin'),
                    m.lectura_actual, date('now', ?), ?, 0, NULL, ?
               FROM Activo a
               JOIN Medidor m ON m.id_activo = a.id_activo
              WHERE a.placa = ?
              ORDER BY m.id_medidor LIMIT 1;`,
            [tipoMant, offset, descripcion, estado, placa],
          );
        }
      }

      if (await tablaVacia(db, "Cotizacion")) {
        for (const [placa, tipoDoc, estado, offset] of COTIZACIONES_SEED) {
          await db.runAsync(
            `INSERT OR IGNORE INTO Cotizacion (id_activo, id_tipo_documento, fecha_emision, estado)
             VALUES (
               (SELECT id_activo FROM Activo WHERE placa = ?),
               (SELECT id_tipo_documento FROM TipoDocumento WHERE nombre = ?),
               date('now', ?),
               ?
             );`,
            [placa, tipoDoc, offset, estado],
          );
        }
      }

      if (await tablaVacia(db, "DetalleCotizacion")) {
        for (const [
          placa,
          tipoDoc,
          estado,
          tipoItem,
          ref,
          cantidad,
          precio,
        ] of DETALLES_SEED) {
          const subItem =
            tipoItem === "Repuesto"
              ? `(SELECT id_repuesto FROM Repuesto WHERE codigo_referencia = ?), NULL`
              : `NULL, (SELECT id_servicio FROM CatalogoServicio WHERE nombre = ? ORDER BY id_servicio LIMIT 1)`;
          await db.runAsync(
            `INSERT OR IGNORE INTO DetalleCotizacion
               (id_cotizacion, id_repuesto, id_servicio, tipo_item, cantidad, precio_unitario)
             VALUES (${SQL_COTIZACION_POR_CLAVE}, ${subItem}, ?, ?, ?);`,
            [placa, tipoDoc, estado, ref, tipoItem, cantidad, precio],
          );
        }
      }

      if (await tablaVacia(db, "FotoCotizacion")) {
        for (const [placa, tipoDoc, estado, url, offset] of FOTOS_SEED) {
          await db.runAsync(
            `INSERT OR IGNORE INTO FotoCotizacion (id_cotizacion, url_imagen, fecha_subida)
             VALUES (${SQL_COTIZACION_POR_CLAVE}, ?, date('now', ?));`,
            [placa, tipoDoc, estado, url, offset],
          );
        }
      }
    });
  } catch (e) {
    console.warn("[seed] No se pudieron sembrar los datos operativos:", e);
  }
}
