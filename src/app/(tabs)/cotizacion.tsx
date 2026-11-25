import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Sidebar from "../../components/Sidebar";
import {
  listarCotizaciones,
  type CotizacionResumen,
} from "../../db/cotizaciones-estado";
import type { EstadoCotizacion } from "../../db/types";

// ---------- Colores institucionales (mismos que home.tsx) ----------
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

type Filtro = "Todas" | EstadoCotizacion;
const FILTROS: readonly Filtro[] = [
  "Todas",
  "Pendiente",
  "Aprobada",
  "Rechazada",
  "Anulada",
];

// ---------- Utilidades ----------
const formatearSoles = (monto: number): string => `S/ ${monto.toFixed(2)}`;
const numeroCotizacion = (id: number): string =>
  `N° ${String(id).padStart(4, "0")}`;

// ---------- Componentes internos ----------
function TarjetaCotizacion({
  cotizacion,
  onPress,
}: {
  cotizacion: CotizacionResumen;
  onPress: () => void;
}) {
  const colorBadge = COLOR_ESTADO[cotizacion.estado];
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardNumero}>
          {numeroCotizacion(cotizacion.id_cotizacion)}
        </Text>
        <View style={[styles.badge, { backgroundColor: colorBadge }]}>
          <Text
            style={[
              styles.badgeText,
              cotizacion.estado === "Rechazada" && { color: COLORS.white },
            ]}
          >
            {cotizacion.estado}
          </Text>
        </View>
      </View>
      <Text style={styles.cardPlaca}>{cotizacion.placa ?? "Sin placa"}</Text>
      <Text style={styles.cardCliente} numberOfLines={1}>
        {cotizacion.nombre_cliente}
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.cardMeta}>
          {cotizacion.fecha_emision} · {cotizacion.tipo_documento}
        </Text>
        <Text style={styles.cardTotal}>
          {formatearSoles(cotizacion.monto_total)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------- Pantalla principal ----------
export default function CotizacionScreen() {
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("Todas");
  const [cotizaciones, setCotizaciones] = useState<CotizacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  const cargar = useCallback(
    async (esCancelado: () => boolean = () => false) => {
      try {
        setErrorCarga(false);
        const data = await listarCotizaciones(
          filtro === "Todas" ? undefined : filtro,
        );
        if (esCancelado()) return;
        setCotizaciones(data);
      } catch (error) {
        console.error("No se pudieron cargar las cotizaciones:", error);
        if (!esCancelado()) setErrorCarga(true);
      } finally {
        if (!esCancelado()) setCargando(false);
      }
    },
    [filtro],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      setCargando(true);
      void cargar(() => cancelado);
      return () => {
        cancelado = true;
      };
    }, [cargar]),
  );

  const abrirDetalle = (id: number) =>
    router.push({
      pathname: "/cotizacion-detalle",
      params: { id: String(id) },
    });

  const mensajeVacio =
    filtro === "Todas"
      ? "Aún no hay cotizaciones"
      : `No hay cotizaciones con estado ${filtro}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.red} />

      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerSide}
            onPress={() => setSidebarVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Cotizaciones</Text>
          <TouchableOpacity
            style={[styles.headerSide, styles.headerSideRight]}
            onPress={() => router.push("/nueva-cotizacion")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.nuevaText}>+ Nueva</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {FILTROS.map((f) => {
            const activo = f === filtro;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.chip, activo && styles.chipActive]}
                onPress={() => setFiltro(f)}
              >
                <Text
                  style={[styles.chipText, activo && styles.chipTextActive]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {cargando ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      ) : errorCarga ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            No se pudieron cargar las cotizaciones.
          </Text>
        </View>
      ) : (
        <FlatList
          data={cotizaciones}
          keyExtractor={(item) => String(item.id_cotizacion)}
          renderItem={({ item }) => (
            <TarjetaCotizacion
              cotizacion={item}
              onPress={() => abrirDetalle(item.id_cotizacion)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{mensajeVacio}</Text>
          }
        />
      )}

      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </View>
  );
}

// ---------- Estilos ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  headerSafeArea: { backgroundColor: COLORS.red },
  header: {
    backgroundColor: COLORS.red,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSide: { width: 70 },
  headerSideRight: { alignItems: "flex-end" },
  headerText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  nuevaText: { color: COLORS.yellow, fontSize: 16, fontWeight: "800" },
  chipsContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardDark,
  },
  chipActive: { backgroundColor: COLORS.red, borderColor: COLORS.red },
  chipText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: COLORS.white },
  devButton: {
    alignSelf: "flex-start",
    marginLeft: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  devButtonText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 24,
  },
  card: {
    backgroundColor: COLORS.cardDark,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardNumero: { color: COLORS.textMuted, fontSize: 14, fontWeight: "700" },
  cardPlaca: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  cardCliente: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  cardMeta: { color: COLORS.textMuted, fontSize: 12, flex: 1, marginRight: 8 },
  cardTotal: { color: COLORS.white, fontSize: 18, fontWeight: "800" },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { color: COLORS.bgDark, fontSize: 12, fontWeight: "700" },
});
