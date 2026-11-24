import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { CotizacionError } from "../db/cotizacion-error";
import {
    agregarFotoCotizacion,
    cambiarEstadoCotizacion,
    eliminarFotoCotizacion,
    obtenerCotizacionCompleta,
    type CotizacionDetalleCompleto,
} from "../db/cotizacion-workflow";
import { esAdmin } from "../db/sesion";

export default function CotizacionDetalleScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const idCotizacion = Number(params.id);

  const [data, setData] = useState<CotizacionDetalleCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [nuevaFotoUrl, setNuevaFotoUrl] = useState("");

  const puedeAprobar = esAdmin();

  const cargar = useCallback(async () => {
    if (!Number.isFinite(idCotizacion) || idCotizacion <= 0) {
      setCargando(false);
      return;
    }
    try {
      setCargando(true);
      const res = await obtenerCotizacionCompleta(idCotizacion);
      setData(res);
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo cargar la cotización.",
      );
    } finally {
      setCargando(false);
    }
  }, [idCotizacion]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const manejarCambioEstado = async (
    nuevoEstado: "Aprobada" | "Rechazada" | "Anulada",
  ) => {
    try {
      setProcesando(true);
      await cambiarEstadoCotizacion(idCotizacion, nuevoEstado);
      await cargar();
      Alert.alert(
        "Estado actualizado",
        `La cotización ahora está en estado "${nuevoEstado}".`,
      );
    } catch (e) {
      if (e instanceof CotizacionError) {
        Alert.alert(`Error (${e.codigo})`, e.message);
      } else {
        Alert.alert(
          "Error",
          e instanceof Error ? e.message : "No se pudo cambiar el estado.",
        );
      }
    } finally {
      setProcesando(false);
    }
  };

  const manejarAgregarFotoUri = async (uri: string) => {
    try {
      setProcesando(true);
      await agregarFotoCotizacion(idCotizacion, uri);
      setNuevaFotoUrl("");
      await cargar();
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo agregar la foto.",
      );
    } finally {
      setProcesando(false);
    }
  };

  const manejarGaleria = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permiso denegado",
        "Concede permiso de galería o ingresa la ruta/URL.",
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!res.canceled && res.assets.length > 0) {
      await manejarAgregarFotoUri(res.assets[0].uri);
    }
  };

  const manejarEliminarFoto = async (idFoto: number) => {
    try {
      setProcesando(true);
      await eliminarFotoCotizacion(idFoto);
      await cargar();
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo eliminar la foto.",
      );
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Cotización no encontrada.</Text>
      </View>
    );
  }

  const { cotizacion, items, fotos } = data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Cotización #{cotizacion.id_cotizacion}</Text>
        <Text style={styles.estadoBadge}>Estado: {cotizacion.estado}</Text>
        <Text style={styles.line}>Cliente: {cotizacion.nombre_cliente}</Text>
        <Text style={styles.line}>
          Activo: {cotizacion.placa ? `[${cotizacion.placa}] ` : ""}
          {cotizacion.tipo_unidad}
          {cotizacion.marca ? ` ${cotizacion.marca}` : ""}
        </Text>
        <Text style={styles.line}>
          Documento: {cotizacion.tipo_documento} · Fecha:{" "}
          {cotizacion.fecha_emision}
        </Text>
        <Text style={styles.monto}>
          Monto Total: S/ {cotizacion.monto_total.toFixed(2)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ítems ({items.length})</Text>
        {items.map((it) => (
          <View key={it.id_detalle} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>
                [{it.tipo_item}] {it.descripcion_item}
              </Text>
              <Text style={styles.muted}>
                {it.cantidad} x S/ {it.precio_unitario.toFixed(2)}
              </Text>
            </View>
            <Text style={styles.subtotal}>
              S/ {it.subtotal_calculado.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fotos ({fotos.length})</Text>

        {cotizacion.estado !== "Anulada" &&
        cotizacion.estado !== "Rechazada" ? (
          <>
            <Pressable
              style={styles.btnSecundario}
              disabled={procesando}
              onPress={manejarGaleria}
            >
              <Text style={styles.btnSecundarioText}>
                + Adjuntar foto desde galería
              </Text>
            </Pressable>

            <View style={styles.rowFoto}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={nuevaFotoUrl}
                onChangeText={setNuevaFotoUrl}
                placeholder="Ruta o URL de imagen..."
              />
              <Pressable
                style={styles.btnMini}
                disabled={procesando}
                onPress={() => manejarAgregarFotoUri(nuevaFotoUrl)}
              >
                <Text style={styles.btnMiniText}>Añadir</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {fotos.length === 0 ? (
          <Text style={styles.muted}>Sin fotos adjuntas.</Text>
        ) : (
          fotos.map((f) => (
            <View key={f.id_foto} style={styles.fotoCard}>
              <Image source={{ uri: f.url_imagen }} style={styles.fotoImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fotoUrl} numberOfLines={2}>
                  {f.url_imagen}
                </Text>
                <Text style={styles.muted}>Subida: {f.fecha_subida}</Text>
              </View>
              {cotizacion.estado !== "Aprobada" ? (
                <Pressable
                  disabled={procesando}
                  onPress={() => manejarEliminarFoto(f.id_foto)}
                >
                  <Text style={styles.dangerText}>Eliminar</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </View>

      {puedeAprobar ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Acciones de Administrador</Text>

          {cotizacion.estado === "Pendiente" ? (
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.btnAccion, { backgroundColor: "#15803d" }]}
                disabled={procesando}
                onPress={() => manejarCambioEstado("Aprobada")}
              >
                <Text style={styles.btnAccionText}>
                  Aprobar (Descuenta stock)
                </Text>
              </Pressable>

              <Pressable
                style={[styles.btnAccion, { backgroundColor: "#b91c1c" }]}
                disabled={procesando}
                onPress={() => manejarCambioEstado("Rechazada")}
              >
                <Text style={styles.btnAccionText}>Rechazar</Text>
              </Pressable>
            </View>
          ) : null}

          {cotizacion.estado === "Pendiente" ||
          cotizacion.estado === "Aprobada" ? (
            <Pressable
              style={[
                styles.btnAccion,
                { backgroundColor: "#4b5563", marginTop: 8 },
              ]}
              disabled={procesando}
              onPress={() => manejarCambioEstado("Anulada")}
            >
              <Text style={styles.btnAccionText}>
                {cotizacion.estado === "Aprobada"
                  ? "Anular (Reintegra stock)"
                  : "Anular cotización"}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.muted}>
              Esta cotización está en estado final ({cotizacion.estado}).
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.muted}>
            Inicia sesión como Administrador para aprobar, rechazar o anular
            cotizaciones.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  estadoBadge: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1d4ed8",
    marginTop: 4,
    marginBottom: 8,
  },
  line: { fontSize: 14, color: "#374151", marginTop: 3 },
  monto: { fontSize: 17, fontWeight: "700", color: "#111827", marginTop: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  subtotal: { fontSize: 14, fontWeight: "700", color: "#111827" },
  muted: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  btnSecundario: {
    backgroundColor: "#e0e7ff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  btnSecundarioText: { color: "#1e40af", fontWeight: "700", fontSize: 13 },
  rowFoto: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
  },
  btnMini: {
    backgroundColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  btnMiniText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  fotoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  fotoImg: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
  },
  fotoUrl: { fontSize: 12, fontWeight: "600", color: "#111827" },
  dangerText: { color: "#dc2626", fontWeight: "700", fontSize: 12 },
  actionsRow: { gap: 8 },
  btnAccion: { padding: 12, borderRadius: 8, alignItems: "center" },
  btnAccionText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
});
