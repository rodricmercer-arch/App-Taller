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
