import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    listarCotizaciones,
    type CotizacionResumen,
    type EstadoCotizacion,
} from "../db/cotizacion-workflow";

const FILTROS: (EstadoCotizacion | "Todas")[] = [
  "Todas",
  "Pendiente",
  "Aprobada",
  "Rechazada",
  "Anulada",
];

function colorEstado(estado: EstadoCotizacion): { bg: string; fg: string } {
  switch (estado) {
    case "Aprobada":
      return { bg: "#dcfce7", fg: "#166534" };
    case "Pendiente":
      return { bg: "#fef3c7", fg: "#92400e" };
    case "Rechazada":
      return { bg: "#fee2e2", fg: "#991b1b" };
    case "Anulada":
      return { bg: "#e5e7eb", fg: "#374151" };
  }
}

export default function CotizacionesScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<EstadoCotizacion | "Todas">("Todas");
  const [lista, setLista] = useState<CotizacionResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargar = useCallback(
    async (esRefresh = false) => {
      try {
        if (esRefresh) setRefrescando(true);
        else setCargando(true);
        setErrorMsg(null);
        const data = await listarCotizaciones(filtro);
        setLista(data);
      } catch (e) {
        setErrorMsg(
          e instanceof Error
            ? e.message
            : "No se pudieron cargar las cotizaciones.",
        );
      } finally {
        setCargando(false);
        setRefrescando(false);
      }
    },
    [filtro],
  );

  useFocusEffect(
    useCallback(() => {
      cargar(false);
    }, [cargar]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cotizaciones</Text>
          <Text style={styles.subtitle}>
            Gestión, ítems, fotos y aprobación
          </Text>
        </View>
        <Pressable
          style={styles.btnNueva}
          onPress={() => router.push("/cotizacion-form" as never)}
        >
          <Text style={styles.btnNuevaText}>+ Nueva</Text>
        </Pressable>
      </View>

      <View style={styles.filtrosRow}>
        {FILTROS.map((f) => {
          const activo = filtro === f;
          return (
            <Pressable
              key={f}
              style={[styles.chip, activo && styles.chipActivo]}
              onPress={() => setFiltro(f)}
            >
              <Text style={[styles.chipText, activo && styles.chipTextActivo]}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => String(item.id_cotizacion)}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => cargar(true)}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No hay cotizaciones para el filtro seleccionado.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = colorEstado(item.estado);
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/cotizacion-detalle" as never,
                    params: { id: String(item.id_cotizacion) },
                  } as never)
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardId}>
                    Cotización #{item.id_cotizacion}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.fg }]}>
                      {item.estado}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardCliente}>{item.nombre_cliente}</Text>
                <Text style={styles.cardActivo}>
                  {item.placa ? `Placa ${item.placa} · ` : ""}
                  {item.tipo_unidad}
                  {item.marca ? ` ${item.marca}` : ""}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardMeta}>
                    {item.tipo_documento} · {item.fecha_emision}
                  </Text>
                  <Text style={styles.cardMonto}>
                    S/ {item.monto_total.toFixed(2)}
                  </Text>
                </View>

                <Text style={styles.cardSubmeta}>
                  {item.total_items} ítem(s) · {item.total_fotos} foto(s)
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  btnNueva: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnNuevaText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  filtrosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  chipActivo: { backgroundColor: "#1d4ed8" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  chipTextActivo: { color: "#ffffff" },
  listContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardId: { fontSize: 15, fontWeight: "700", color: "#111827" },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  cardCliente: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  cardActivo: { fontSize: 13, color: "#4b5563", marginTop: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cardMeta: { fontSize: 12, color: "#6b7280" },
  cardMonto: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardSubmeta: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorBox: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  errorText: { color: "#991b1b", fontSize: 13 },
  emptyBox: { padding: 32, alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 14, textAlign: "center" },
});
