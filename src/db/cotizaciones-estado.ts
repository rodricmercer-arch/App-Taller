// Frente C: lectura de cotizaciones y cambio de estado (con descuento de stock al aprobar).

import { CotizacionError } from "./cotizacion-error";
import { getDb } from "./database";
import type { EstadoCotizacion } from "./types";

export type EstadoCambiable = "Aprobada" | "Rechazada" | "Anulada";

export interface CotizacionResumen {
  id_cotizacion: number;
  fecha_emision: string;
  monto_total: number;
  estado: EstadoCotizacion;
  placa: string | null;
  nombre_cliente: string;
  tipo_documento: string;
}

export interface CotizacionCabecera extends CotizacionResumen {
  marca: string | null;
  tipo_unidad: string;
}

const ESTADOS_PERMITIDOS: readonly string[] = [
  "Aprobada",
  "Rechazada",
  "Anulada",
];

/** Cotizaciones de la más reciente a la más antigua; filtra por estado si se indica. */
export async function listarCotizaciones(
  estado?: EstadoCotizacion,
): Promise<CotizacionResumen[]> {
  const db = getDb();
  const where = estado ? "WHERE c.estado = ?" : "";
  return db.getAllAsync<CotizacionResumen>(
    `SELECT c.id_cotizacion, c.fecha_emision, c.monto_total, c.estado,
            a.placa, cl.nombre_razon_social AS nombre_cliente,
            td.nombre AS tipo_documento
       FROM Cotizacion c
       JOIN Activo a          ON a.id_activo = c.id_activo
       JOIN Cliente cl        ON cl.id_cliente = a.id_cliente
       JOIN TipoDocumento td  ON td.id_tipo_documento = c.id_tipo_documento
       ${where}
      ORDER BY c.fecha_emision DESC, c.id_cotizacion DESC;`,
    estado ? [estado] : [],
  );
}

export async function getCotizacionCabecera(
  id: number,
): Promise<CotizacionCabecera | null> {
  const db = getDb();
  const fila = await db.getFirstAsync<CotizacionCabecera>(
    `SELECT c.id_cotizacion, c.fecha_emision, c.monto_total, c.estado,
            a.placa, cl.nombre_razon_social AS nombre_cliente,
            td.nombre AS tipo_documento,
            m.nombre AS marca, tu.nombre AS tipo_unidad
       FROM Cotizacion c
       JOIN Activo a          ON a.id_activo = c.id_activo
       JOIN Cliente cl        ON cl.id_cliente = a.id_cliente
       JOIN TipoDocumento td  ON td.id_tipo_documento = c.id_tipo_documento
       JOIN TipoUnidad tu     ON tu.id_tipo_unidad = a.id_tipo_unidad
       LEFT JOIN Marca m      ON m.id_marca = a.id_marca
      WHERE c.id_cotizacion = ?;`,
    [id],
  );
  return fila ?? null;
}

export async function getFotosCotizacion(id: number): Promise<string[]> {
  const db = getDb();
  const filas = await db.getAllAsync<{ url_imagen: string }>(
    `SELECT url_imagen FROM FotoCotizacion WHERE id_cotizacion = ? ORDER BY id_foto;`,
    [id],
  );
  return filas.map((f) => f.url_imagen);
}

/**
 * Pasa una cotización Pendiente a Aprobada / Rechazada / Anulada.
 * Al aprobar descuenta el stock de sus repuestos. Cualquier error dentro de la
 * transacción deshace todo (estado y stock).
 */
export async function cambiarEstadoCotizacion(
  id: number,
  nuevoEstado: EstadoCambiable,
): Promise<void> {
  const db = getDb();

  await db.withTransactionAsync(async () => {
    if (!ESTADOS_PERMITIDOS.includes(nuevoEstado)) {
      throw new CotizacionError(
        "DATOS_INVALIDOS",
        "El estado solicitado no es válido.",
      );
    }

    const cot = await db.getFirstAsync<{ estado: string }>(
      `SELECT estado FROM Cotizacion WHERE id_cotizacion = ?;`,
      [id],
    );
    if (!cot) {
      throw new CotizacionError("NO_ENCONTRADA", "La cotización no existe.");
    }

    const mensajeFinal =
      "Esta cotización ya no está Pendiente. Aprobada, Rechazada y Anulada son estados finales y no se pueden cambiar.";
    if (cot.estado !== "Pendiente") {
      throw new CotizacionError("ESTADO_INVALIDO", mensajeFinal);
    }

    if (nuevoEstado === "Aprobada") {
      const lineas = await db.getAllAsync<{
        id_repuesto: number;
        cantidad: number;
      }>(
        `SELECT id_repuesto, cantidad FROM DetalleCotizacion
          WHERE id_cotizacion = ? AND tipo_item = 'Repuesto'
          ORDER BY id_detalle;`,
        [id],
      );

      for (const l of lineas) {
        const res = await db.runAsync(
          `UPDATE Repuesto SET stock_actual = stock_actual - ?
            WHERE id_repuesto = ? AND stock_actual >= ?;`,
          [l.cantidad, l.id_repuesto, l.cantidad],
        );
        if (res.changes === 0) {
          const r = await db.getFirstAsync<{ nombre: string }>(
            `SELECT nombre FROM Repuesto WHERE id_repuesto = ?;`,
            [l.id_repuesto],
          );
          throw new CotizacionError(
            "STOCK_INSUFICIENTE",
            `Stock insuficiente de ${r?.nombre ?? "un repuesto"}`,
          );
        }
      }
    }

    const upd = await db.runAsync(
      `UPDATE Cotizacion SET estado = ?
        WHERE id_cotizacion = ? AND estado = 'Pendiente';`,
      [nuevoEstado, id],
    );
    if (upd.changes === 0) {
      throw new CotizacionError("ESTADO_INVALIDO", mensajeFinal);
    }
  });
}
