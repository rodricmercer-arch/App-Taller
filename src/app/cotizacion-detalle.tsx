import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
    Stack,
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { CotizacionError } from "../db/cotizacion-error";
import {
    cambiarEstadoCotizacion,
    getCotizacionCabecera,
    getFotosCotizacion,
    type CotizacionCabecera,
    type EstadoCambiable,
} from "../db/cotizaciones-estado";
import { getDetalleCotizacion } from "../db/database";
import { esAdmin } from "../db/sesion";
import type { DetalleCotizacionResuelto, EstadoCotizacion } from "../db/types";

const COLORS = {
  bgDark: "#121212",
  red: "#C1272D",
  yellow: "#E8B923",
  green: "#3DBE5C",
  gray: "#9A9A9A",
  cardDark: "#2A2A2A",
  cardBorder: "#3A3A3A",
  white: "#FFFFFF",
  textMuted: "#A8A8A8",
};

const COLOR_ESTADO: Record<EstadoCotizacion, string> = {
  Pendiente: COLORS.yellow,
  Aprobada: COLORS.green,
  Rechazada: COLORS.red,
  Anulada: COLORS.gray,
};

const MENSAJE_EXITO: Record<EstadoCambiable, string> = {
  Aprobada: "Cotización aprobada",
  Rechazada: "Cotización rechazada",
  Anulada: "Cotización anulada",
};

const formatearSoles = (monto: number): string => `S/ ${monto.toFixed(2)}`;
const numeroCotizacion = (id: number): string =>
  `N° ${String(id).padStart(4, "0")}`;

function FotoMiniatura({ uri }: { uri: string }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [uri]);

  if (error) {
    return (
      <View style={[styles.foto, styles.fotoFallback]}>
        <MaterialCommunityIcons
          name="image-broken-variant"
          size={32}
          color={COLORS.textMuted}
        />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={styles.foto}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
}

function DatoFila({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.datoRow}>
      <Text style={styles.datoLabel}>{label}</Text>
      <Text style={styles.datoValue}>{value}</Text>
    </View>
  );
}

export default function CotizacionDetalleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idCotizacion = Number(id);
  const idValido = Number.isInteger(idCotizacion) && idCotizacion > 0;

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [cabecera, setCabecera] = useState<CotizacionCabecera | null>(null);
  const [lineas, setLineas] = useState<DetalleCotizacionResuelto[]>([]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [accionando, setAccionando] = useState(false);

  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/cotizacion");
  };

  const cargar = useCallback(
    async (esCancelado: () => boolean = () => false) => {
      if (!idValido) {
        setCabecera(null);
        setCargando(false);
        return;
      }
      try {
        setErrorCarga(false);
        const cab = await getCotizacionCabecera(idCotizacion);
        if (!cab) {
          if (!esCancelado()) setCabecera(null);
          return;
        }
        const [det, fts] = await Promise.all([
          getDetalleCotizacion(idCotizacion),
          getFotosCotizacion(idCotizacion),
        ]);
        if (esCancelado()) return;
        setCabecera(cab);
        setLineas(det);
        setFotos(fts);
      } catch (error) {
        console.error("No se pudo cargar la cotización:", error);
        if (!esCancelado()) setErrorCarga(true);
      } finally {
        if (!esCancelado()) setCargando(false);
      }
    },
    [idCotizacion, idValido],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      void cargar(() => cancelado);
      return () => {
        cancelado = true;
      };
    }, [cargar]),
  );

  const ejecutar = async (nuevo: EstadoCambiable) => {
    if ((nuevo === "Aprobada" || nuevo === "Rechazada") && !esAdmin()) {
      Alert.alert("Sin permiso", "Solo un administrador puede hacer esto.");
      return;
    }
    try {
      setAccionando(true);
      await cambiarEstadoCotizacion(idCotizacion, nuevo);
      await cargar();
      Alert.alert(MENSAJE_EXITO[nuevo]);
    } catch (error) {
      if (error instanceof CotizacionError) {
        Alert.alert("No se pudo completar", error.message);
      } else {
        console.error(error);
        Alert.alert(
          "Error",
          "No se pudo cambiar el estado. Intenta nuevamente.",
        );
      }
      await cargar();
    } finally {
      setAccionando(false);
    }
  };

  const confirmar = (nuevo: EstadoCambiable, verbo: string) => {
    Alert.alert(
      `${verbo} cotización`,
      `¿Seguro que deseas ${verbo.toLowerCase()} esta cotización? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: verbo, onPress: () => void ejecutar(nuevo) },
      ],
    );
  };

  const encabezado = (titulo: string) => (
    <SafeAreaView style={styles.headerSafeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={volver}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={26} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerText} numberOfLines={1}>
          {titulo}
        </Text>
        <View style={styles.headerSide} />
      </View>
    </SafeAreaView>
  );

  if (cargando) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={COLORS.red} />
        {encabezado("Cotización")}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      </View>
    );
  }

  if (errorCarga || !cabecera) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={COLORS.red} />
        {encabezado("Cotización")}
        <View style={styles.centered}>
          <Text style={styles.mensaje}>
            {errorCarga
              ? "No se pudo cargar la cotización."
              : "Cotización no encontrada"}
          </Text>
          <TouchableOpacity style={styles.botonVolver} onPress={volver}>
            <Text style={styles.botonVolverText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pendiente = cabecera.estado === "Pendiente";
  const admin = esAdmin();
  const detalleActivo = [
    cabecera.placa ?? "Sin placa",
    `${cabecera.marca ?? "Sin marca"} · ${cabecera.tipo_unidad}`,
  ].join(" — ");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={COLORS.red} />
      {encabezado(`Cotización ${numeroCotizacion(cabecera.id_cotizacion)}`)}

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.estadoRow}>
            <Text style={styles.datoLabel}>Estado</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: COLOR_ESTADO[cabecera.estado] },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  cabecera.estado === "Rechazada" && { color: COLORS.white },
                ]}
              >
                {cabecera.estado}
              </Text>
            </View>
          </View>
          <DatoFila label="Activo" value={detalleActivo} />
          <DatoFila label="Cliente" value={cabecera.nombre_cliente} />
          <DatoFila label="Fecha" value={cabecera.fecha_emision} />
          <DatoFila label="Documento" value={cabecera.tipo_documento} />
        </View>

        <Text style={styles.sectionTitle}>Detalle</Text>
        {lineas.map((l) => (
          <View key={l.id_detalle} style={styles.lineaCard}>
            <View style={styles.lineaInfo}>
              <Text style={styles.lineaNombre} numberOfLines={2}>
                {l.descripcion_item}
              </Text>
              <Text style={styles.lineaMeta}>
                {l.cantidad} × {formatearSoles(l.precio_unitario)} ·{" "}
                {l.tipo_item}
              </Text>
            </View>
            <Text style={styles.lineaSubtotal}>
              {formatearSoles(l.subtotal_calculado)}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatearSoles(cabecera.monto_total)}
          </Text>
        </View>

        {fotos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fotosContent}
            >
              {fotos.map((url, i) => (
                <FotoMiniatura key={`${url}-${i}`} uri={url} />
              ))}
            </ScrollView>
          </>
        )}

        {pendiente && (
          <View style={styles.acciones}>
            {admin && (
              <>
                <TouchableOpacity
                  style={[
                    styles.accion,
                    { backgroundColor: COLORS.green },
                    accionando && styles.accionDisabled,
                  ]}
                  disabled={accionando}
                  onPress={() => confirmar("Aprobada", "Aprobar")}
                >
                  <Text style={[styles.accionText, { color: COLORS.bgDark }]}>
                    Aprobar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.accion,
                    { backgroundColor: COLORS.red },
                    accionando && styles.accionDisabled,
                  ]}
                  disabled={accionando}
                  onPress={() => confirmar("Rechazada", "Rechazar")}
                >
                  <Text style={styles.accionText}>Rechazar</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[
                styles.accion,
                { backgroundColor: COLORS.gray },
                accionando && styles.accionDisabled,
              ]}
              disabled={accionando}
              onPress={() => confirmar("Anulada", "Anular")}
            >
              <Text style={[styles.accionText, { color: COLORS.bgDark }]}>
                Anular
              </Text>
            </TouchableOpacity>
            {accionando && (
              <ActivityIndicator
                style={{ marginTop: 8 }}
                size="small"
                color={COLORS.white}
              />
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  headerSafeArea: { backgroundColor: COLORS.red },
  header: {
    backgroundColor: COLORS.red,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSide: { width: 40 },
  headerText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 16 },
  mensaje: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  botonVolver: {
    backgroundColor: COLORS.red,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  botonVolverText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  card: {
    backgroundColor: COLORS.cardDark,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    gap: 8,
  },
  estadoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  datoLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  datoValue: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { color: COLORS.bgDark, fontSize: 12, fontWeight: "700" },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 22,
    marginBottom: 12,
  },
  lineaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardDark,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  lineaInfo: { flex: 1, marginRight: 12 },
  lineaNombre: { color: COLORS.white, fontSize: 15, fontWeight: "800" },
  lineaMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },
  lineaSubtotal: { color: COLORS.white, fontSize: 15, fontWeight: "800" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  totalLabel: { color: COLORS.textMuted, fontSize: 15, fontWeight: "700" },
  totalValue: { color: COLORS.red, fontSize: 24, fontWeight: "800" },
  fotosContent: { gap: 10 },
  foto: {
    width: 110,
    height: 110,
    borderRadius: 10,
    backgroundColor: COLORS.cardBorder,
  },
  fotoFallback: { alignItems: "center", justifyContent: "center" },
  acciones: { marginTop: 26, gap: 10 },
  accion: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  accionDisabled: { opacity: 0.5 },
  accionText: { color: COLORS.white, fontSize: 16, fontWeight: "800" },
});
