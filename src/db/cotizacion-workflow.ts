import { CotizacionError } from "./cotizacion-error";
import { getDb } from "./database";
import { esAdmin } from "./sesion";
import type { DetalleCotizacionResuelto } from "./types";

export type EstadoCotizacion =
  | "Pendiente"
  | "Aprobada"
  | "Rechazada"
  | "Anulada";

export interface CotizacionResumen {
  id_cotizacion: number;
  id_activo: number;
  placa: string | null;
  tipo_activo: "Vehiculo" | "EquipoEstacionario";
  marca: string | null;
  tipo_unidad: string;
  id_cliente: number;
  nombre_cliente: string;
  id_tipo_documento: number;
  tipo_documento: string;
  es_documento_externo: number;
  fecha_emision: string;
  monto_total: number;
  estado: EstadoCotizacion;
  total_fotos: number;
  total_items: number;
}

export interface FotoCotizacionItem {
  id_foto: number;
  id_cotizacion: number;
  url_imagen: string;
  fecha_subida: string;
}

export interface CotizacionDetalleCompleto {
  cotizacion: CotizacionResumen;
  items: DetalleCotizacionResuelto[];
  fotos: FotoCotizacionItem[];
}

export interface NuevoDetalleItemInput {
  tipo_item: "Repuesto" | "Servicio";
  id_repuesto?: number | null;
  id_servicio?: number | null;
  cantidad: number;
  precio_unitario: number;
}

export interface CrearCotizacionInput {
  id_activo: number;
  id_tipo_documento: number;
  fecha_emision?: string;
  items: NuevoDetalleItemInput[];
  fotos?: string[];
}

const TRANSICIONES_VALIDAS: Record<EstadoCotizacion, EstadoCotizacion[]> = {
  Pendiente: ["Aprobada", "Rechazada", "Anulada"],
  Aprobada: ["Anulada"],
  Rechazada: [],
  Anulada: [],
};

function validarItemInput(item: NuevoDetalleItemInput): void {
  if (
    !Number.isFinite(item.cantidad) ||
    item.cantidad <= 0 ||
    !Number.isInteger(item.cantidad)
  ) {
    throw new CotizacionError(
      "DATOS_INVALIDOS",
      "La cantidad de cada ítem debe ser un entero mayor a 0.",
    );
  }
  if (!Number.isFinite(item.precio_unitario) || item.precio_unitario < 0) {
    throw new CotizacionError(
      "DATOS_INVALIDOS",
      "El precio unitario no puede ser negativo.",
    );
  }
  if (item.tipo_item === "Repuesto") {
    if (!item.id_repuesto || item.id_servicio) {
      throw new CotizacionError(
        "DATOS_INVALIDOS",
        "Un ítem de tipo Repuesto requiere id_repuesto y no debe tener id_servicio.",
      );
    }
  } else if (item.tipo_item === "Servicio") {
    if (!item.id_servicio || item.id_repuesto) {
      throw new CotizacionError(
        "DATOS_INVALIDOS",
        "Un ítem de tipo Servicio requiere id_servicio y no debe tener id_repuesto.",
      );
    }
  } else {
    throw new CotizacionError("DATOS_INVALIDOS", "Tipo de ítem no válido.");
  }
}

export async function listarCotizaciones(
  filtroEstado?: EstadoCotizacion | "Todas",
): Promise<CotizacionResumen[]> {
  const db = getDb();
  const params: (string | number)[] = [];
  let whereSql = "";

  if (filtroEstado && filtroEstado !== "Todas") {
    whereSql = "WHERE c.estado = ?";
    params.push(filtroEstado);
  }

  return db.getAllAsync<CotizacionResumen>(
    `
    SELECT
      c.id_cotizacion,
      c.id_activo,
      a.placa,
      a.tipo_activo,
      ma.nombre AS marca,
      tu.nombre AS tipo_unidad,
      cl.id_cliente,
      cl.nombre_razon_social AS nombre_cliente,
      c.id_tipo_documento,
      td.nombre AS tipo_documento,
      td.es_documento_externo,
      c.fecha_emision,
      c.monto_total,
      c.estado,
      (SELECT COUNT(*) FROM FotoCotizacion fc WHERE fc.id_cotizacion = c.id_cotizacion) AS total_fotos,
      (SELECT COUNT(*) FROM DetalleCotizacion dc WHERE dc.id_cotizacion = c.id_cotizacion) AS total_items
    FROM Cotizacion c
    JOIN Activo a ON a.id_activo = c.id_activo
    JOIN Cliente cl ON cl.id_cliente = a.id_cliente
    JOIN TipoUnidad tu ON tu.id_tipo_unidad = a.id_tipo_unidad
    LEFT JOIN Marca ma ON ma.id_marca = a.id_marca
    JOIN TipoDocumento td ON td.id_tipo_documento = c.id_tipo_documento
    ${whereSql}
    ORDER BY c.id_cotizacion DESC;
    `,
    params,
  );
}

export async function obtenerCotizacionCompleta(
  idCotizacion: number,
): Promise<CotizacionDetalleCompleto> {
  const db = getDb();

  const cotizacion = await db.getFirstAsync<CotizacionResumen>(
    `
    SELECT
      c.id_cotizacion,
      c.id_activo,
      a.placa,
      a.tipo_activo,
      ma.nombre AS marca,
      tu.nombre AS tipo_unidad,
      cl.id_cliente,
      cl.nombre_razon_social AS nombre_cliente,
      c.id_tipo_documento,
      td.nombre AS tipo_documento,
      td.es_documento_externo,
      c.fecha_emision,
      c.monto_total,
      c.estado,
      (SELECT COUNT(*) FROM FotoCotizacion fc WHERE fc.id_cotizacion = c.id_cotizacion) AS total_fotos,
      (SELECT COUNT(*) FROM DetalleCotizacion dc WHERE dc.id_cotizacion = c.id_cotizacion) AS total_items
    FROM Cotizacion c
    JOIN Activo a ON a.id_activo = c.id_activo
    JOIN Cliente cl ON cl.id_cliente = a.id_cliente
    JOIN TipoUnidad tu ON tu.id_tipo_unidad = a.id_tipo_unidad
    LEFT JOIN Marca ma ON ma.id_marca = a.id_marca
    JOIN TipoDocumento td ON td.id_tipo_documento = c.id_tipo_documento
    WHERE c.id_cotizacion = ?;
    `,
    [idCotizacion],
  );

  if (!cotizacion) {
    throw new CotizacionError(
      "NO_ENCONTRADA",
      `No se encontró la cotización #${idCotizacion}.`,
    );
  }

  const items = await db.getAllAsync<DetalleCotizacionResuelto>(
    `
    SELECT
      dc.id_detalle,
      dc.tipo_item,
      CASE WHEN dc.tipo_item = 'Repuesto' THEN r.nombre ELSE cs.nombre END AS descripcion_item,
      dc.cantidad,
      dc.precio_unitario,
      (dc.cantidad * dc.precio_unitario) AS subtotal_calculado
    FROM DetalleCotizacion dc
    LEFT JOIN Repuesto r ON r.id_repuesto = dc.id_repuesto
    LEFT JOIN CatalogoServicio cs ON cs.id_servicio = dc.id_servicio
    WHERE dc.id_cotizacion = ?
    ORDER BY dc.id_detalle ASC;
    `,
    [idCotizacion],
  );

  const fotos = await db.getAllAsync<FotoCotizacionItem>(
    `
    SELECT id_foto, id_cotizacion, url_imagen, fecha_subida
    FROM FotoCotizacion
    WHERE id_cotizacion = ?
    ORDER BY id_foto DESC;
    `,
    [idCotizacion],
  );

  return { cotizacion, items, fotos };
}

export async function crearCotizacionConDetalle(
  input: CrearCotizacionInput,
): Promise<number> {
  if (!input.id_activo || !input.id_tipo_documento) {
    throw new CotizacionError(
      "DATOS_INVALIDOS",
      "Debes seleccionar un vehículo/activo y un tipo de documento.",
    );
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new CotizacionError(
      "DATOS_INVALIDOS",
      "La cotización debe tener al menos un ítem (repuesto o servicio).",
    );
  }

  for (const item of input.items) {
    validarItemInput(item);
  }

  const db = getDb();
  const fechaEmision =
    input.fecha_emision && input.fecha_emision.trim() !== ""
      ? input.fecha_emision.trim()
      : new Date().toISOString().split("T")[0];
  const fechaHoy = new Date().toISOString().split("T")[0];

  let nuevoId = 0;

  await db.withTransactionAsync(async () => {
    const activo = await db.getFirstAsync<{ id_activo: number }>(
      `SELECT id_activo FROM Activo WHERE id_activo = ?;`,
      [input.id_activo],
    );
    if (!activo) {
      throw new CotizacionError(
        "NO_ENCONTRADA",
        "El activo seleccionado no existe.",
      );
    }

    const tipoDoc = await db.getFirstAsync<{ id_tipo_documento: number }>(
      `SELECT id_tipo_documento FROM TipoDocumento WHERE id_tipo_documento = ?;`,
      [input.id_tipo_documento],
    );
    if (!tipoDoc) {
      throw new CotizacionError(
        "DATOS_INVALIDOS",
        "El tipo de documento seleccionado no existe.",
      );
    }

    for (const item of input.items) {
      if (item.tipo_item === "Repuesto" && item.id_repuesto) {
        const rep = await db.getFirstAsync<{
          id_repuesto: number;
          nombre: string;
        }>(`SELECT id_repuesto, nombre FROM Repuesto WHERE id_repuesto = ?;`, [
          item.id_repuesto,
        ]);
        if (!rep) {
          throw new CotizacionError(
            "NO_ENCONTRADA",
            `El repuesto #${item.id_repuesto} no existe.`,
          );
        }
      } else if (item.tipo_item === "Servicio" && item.id_servicio) {
        const srv = await db.getFirstAsync<{
          id_servicio: number;
          nombre: string;
        }>(
          `SELECT id_servicio, nombre FROM CatalogoServicio WHERE id_servicio = ?;`,
          [item.id_servicio],
        );
        if (!srv) {
          throw new CotizacionError(
            "NO_ENCONTRADA",
            `El servicio #${item.id_servicio} no existe.`,
          );
        }
      }
    }

    const resCot = await db.runAsync(
      `
      INSERT INTO Cotizacion (id_activo, id_tipo_documento, fecha_emision, monto_total, estado)
      VALUES (?, ?, ?, 0, 'Pendiente');
      `,
      [input.id_activo, input.id_tipo_documento, fechaEmision],
    );
    nuevoId = resCot.lastInsertRowId;

    for (const item of input.items) {
      await db.runAsync(
        `
        INSERT INTO DetalleCotizacion (id_cotizacion, id_repuesto, id_servicio, tipo_item, cantidad, precio_unitario)
        VALUES (?, ?, ?, ?, ?, ?);
        `,
        [
          nuevoId,
          item.tipo_item === "Repuesto" ? (item.id_repuesto ?? null) : null,
          item.tipo_item === "Servicio" ? (item.id_servicio ?? null) : null,
          item.tipo_item,
          item.cantidad,
          item.precio_unitario,
        ],
      );
    }

    if (input.fotos && input.fotos.length > 0) {
      for (const uri of input.fotos) {
        const limpia = uri.trim();
        if (limpia.length > 0) {
          await db.runAsync(
            `INSERT INTO FotoCotizacion (id_cotizacion, url_imagen, fecha_subida) VALUES (?, ?, ?);`,
            [nuevoId, limpia, fechaHoy],
          );
        }
      }
    }
  });

  return nuevoId;
}

export async function agregarFotoCotizacion(
  idCotizacion: number,
  urlImagen: string,
): Promise<number> {
  const limpia = urlImagen.trim();
  if (!limpia) {
    throw new CotizacionError(
      "DATOS_INVALIDOS",
      "La ruta o URL de la foto no puede estar vacía.",
    );
  }

  const db = getDb();
  const cot = await db.getFirstAsync<{
    id_cotizacion: number;
    estado: EstadoCotizacion;
  }>(`SELECT id_cotizacion, estado FROM Cotizacion WHERE id_cotizacion = ?;`, [
    idCotizacion,
  ]);
  if (!cot) {
    throw new CotizacionError(
      "NO_ENCONTRADA",
      `No se encontró la cotización #${idCotizacion}.`,
    );
  }
  if (cot.estado === "Anulada" || cot.estado === "Rechazada") {
    throw new CotizacionError(
      "ESTADO_INVALIDO",
      `No se pueden adjuntar fotos a una cotización ${cot.estado}.`,
    );
  }

  const fechaHoy = new Date().toISOString().split("T")[0];
  const res = await db.runAsync(
    `INSERT INTO FotoCotizacion (id_cotizacion, url_imagen, fecha_subida) VALUES (?, ?, ?);`,
    [idCotizacion, limpia, fechaHoy],
  );
  return res.lastInsertRowId;
}

export async function eliminarFotoCotizacion(idFoto: number): Promise<void> {
  const db = getDb();
  const foto = await db.getFirstAsync<{
    id_foto: number;
    id_cotizacion: number;
  }>(`SELECT id_foto, id_cotizacion FROM FotoCotizacion WHERE id_foto = ?;`, [
    idFoto,
  ]);
  if (!foto) {
    throw new CotizacionError("NO_ENCONTRADA", "La foto no existe.");
  }

  const cot = await db.getFirstAsync<{ estado: EstadoCotizacion }>(
    `SELECT estado FROM Cotizacion WHERE id_cotizacion = ?;`,
    [foto.id_cotizacion],
  );
  if (cot && cot.estado === "Aprobada") {
    throw new CotizacionError(
      "ESTADO_INVALIDO",
      "No se pueden eliminar fotos de una cotización ya aprobada.",
    );
  }

  await db.runAsync(`DELETE FROM FotoCotizacion WHERE id_foto = ?;`, [idFoto]);
}

export async function cambiarEstadoCotizacion(
  idCotizacion: number,
  nuevoEstado: EstadoCotizacion,
): Promise<void> {
  if (!esAdmin()) {
    throw new CotizacionError(
      "ESTADO_INVALIDO",
      "Solo un usuario con rol Administrador puede aprobar, rechazar o anular cotizaciones.",
    );
  }

  const db = getDb();

  await db.withTransactionAsync(async () => {
    const cot = await db.getFirstAsync<{
      id_cotizacion: number;
      estado: EstadoCotizacion;
    }>(
      `SELECT id_cotizacion, estado FROM Cotizacion WHERE id_cotizacion = ?;`,
      [idCotizacion],
    );
    if (!cot) {
      throw new CotizacionError(
        "NO_ENCONTRADA",
        `No se encontró la cotización #${idCotizacion}.`,
      );
    }

    const permitidos = TRANSICIONES_VALIDAS[cot.estado] ?? [];
    if (!permitidos.includes(nuevoEstado)) {
      throw new CotizacionError(
        "ESTADO_INVALIDO",
        `No se puede cambiar el estado de "${cot.estado}" a "${nuevoEstado}".`,
      );
    }

    const repuestosDetalle = await db.getAllAsync<{
      id_repuesto: number;
      cantidad: number;
    }>(
      `
      SELECT id_repuesto, SUM(cantidad) AS cantidad
      FROM DetalleCotizacion
      WHERE id_cotizacion = ? AND tipo_item = 'Repuesto' AND id_repuesto IS NOT NULL
      GROUP BY id_repuesto;
      `,
      [idCotizacion],
    );

    if (nuevoEstado === "Aprobada") {
      for (const r of repuestosDetalle) {
        const repActual = await db.getFirstAsync<{
          nombre: string;
          stock_actual: number;
        }>(`SELECT nombre, stock_actual FROM Repuesto WHERE id_repuesto = ?;`, [
          r.id_repuesto,
        ]);
        if (!repActual) {
          throw new CotizacionError(
            "NO_ENCONTRADA",
            `El repuesto #${r.id_repuesto} ya no existe.`,
          );
        }
        if (repActual.stock_actual < r.cantidad) {
          throw new CotizacionError(
            "STOCK_INSUFICIENTE",
            `Stock insuficiente para "${repActual.nombre}": disponible ${repActual.stock_actual}, requerido ${r.cantidad}.`,
          );
        }
      }

      for (const r of repuestosDetalle) {
        await db.runAsync(
          `UPDATE Repuesto SET stock_actual = stock_actual - ? WHERE id_repuesto = ?;`,
          [r.cantidad, r.id_repuesto],
        );
      }
    }

    if (cot.estado === "Aprobada" && nuevoEstado === "Anulada") {
      for (const r of repuestosDetalle) {
        await db.runAsync(
          `UPDATE Repuesto SET stock_actual = stock_actual + ? WHERE id_repuesto = ?;`,
          [r.cantidad, r.id_repuesto],
        );
      }
    }

    await db.runAsync(
      `UPDATE Cotizacion SET estado = ? WHERE id_cotizacion = ?;`,
      [nuevoEstado, idCotizacion],
    );
  });
}

export async function getCatalogosParaCotizacion(): Promise<{
  activos: { id_activo: number; label: string }[];
  tiposDocumento: { id_tipo_documento: number; nombre: string }[];
  repuestos: { id_repuesto: number; nombre: string; stock_actual: number }[];
  servicios: {
    id_servicio: number;
    nombre: string;
    precio_referencial: number;
  }[];
}> {
  const db = getDb();

  const activos = await db.getAllAsync<{
    id_activo: number;
    placa: string | null;
    tipo_unidad: string;
    marca: string | null;
    cliente: string;
  }>(
    `
    SELECT
      a.id_activo,
      a.placa,
      tu.nombre AS tipo_unidad,
      ma.nombre AS marca,
      c.nombre_razon_social AS cliente
    FROM Activo a
    JOIN TipoUnidad tu ON tu.id_tipo_unidad = a.id_tipo_unidad
    LEFT JOIN Marca ma ON ma.id_marca = a.id_marca
    JOIN Cliente c ON c.id_cliente = a.id_cliente
    ORDER BY a.id_activo DESC;
    `,
  );

  const tiposDocumento = await db.getAllAsync<{
    id_tipo_documento: number;
    nombre: string;
  }>(
    `SELECT id_tipo_documento, nombre FROM TipoDocumento ORDER BY id_tipo_documento ASC;`,
  );

  const repuestos = await db.getAllAsync<{
    id_repuesto: number;
    nombre: string;
    stock_actual: number;
  }>(
    `
    SELECT id_repuesto, nombre, stock_actual
    FROM Repuesto
    WHERE estado_operativo = 'Activo'
    ORDER BY nombre ASC;
    `,
  );

  const servicios = await db.getAllAsync<{
    id_servicio: number;
    nombre: string;
    precio_referencial: number;
  }>(
    `SELECT id_servicio, nombre, precio_referencial FROM CatalogoServicio ORDER BY nombre ASC;`,
  );

  return {
    activos: activos.map((a) => ({
      id_activo: a.id_activo,
      label: `${a.placa ? `[${a.placa}] ` : ""}${a.tipo_unidad}${a.marca ? ` ${a.marca}` : ""} — ${a.cliente}`,
    })),
    tiposDocumento,
    repuestos,
    servicios,
  };
}
