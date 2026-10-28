import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  eliminarActivo,
  getVehiculosConDetalle,
  VehiculoConDetalle,
} from "../../db/database";

const COLORS = {
  red: "#C1272D",
  white: "#FFFFFF",
  dark: "#2f3640",
  gray: "#f5f6fa",
  border: "#dcdde1",
  muted: "#718093",
  placeholder: "#a4b0be",
  warnBg: "#fff4e6",
  warnText: "#b8720a",
  editBg: "#eef2f7",
  editText: "#2f3640",
};

export default function BuscarScreen() {
  const [activos, setActivos] = useState<VehiculoConDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useFocusEffect(
    useCallback(() => {
      cargarActivos();
    }, []),
  );

  const cargarActivos = async () => {
    try {
      setCargando(true);
      const data = await getVehiculosConDetalle();
      setActivos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  // Filtrado en tiempo real: placa, cliente y tipo de unidad, sin distinguir mayúsculas/minúsculas
  const activosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) return activos;

    return activos.filter((activo) => {
      const placa = activo.placa?.toLowerCase() ?? "";
      const cliente = activo.nombre_cliente?.toLowerCase() ?? "";
      const tipoUnidad = activo.tipo_unidad?.toLowerCase() ?? "";

      return (
        placa.includes(query) ||
        cliente.includes(query) ||
        tipoUnidad.includes(query)
      );
    });
  }, [activos, busqueda]);

  const hayBusquedaActiva = busqueda.trim().length > 0;

  /**
   * Elimina un activo en la BD y, si tiene éxito, lo quita de la lista
   * en memoria para que la tarjeta desaparezca sin recargar la pantalla.
   * Devuelve true/false para que la tarjeta sepa si debe resetear su
   * estado de "eliminando" (si falla, la tarjeta sigue ahí).
   */
  const handleEliminar = async (idActivo: number): Promise<boolean> => {
    try {
      await eliminarActivo(idActivo);
      setActivos((prev) => prev.filter((a) => a.id_activo !== idActivo));
      return true;
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error al eliminar",
        "No se pudo eliminar el activo. Intenta nuevamente.",
      );
      return false;
    }
  };

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.header}>Activos Registrados</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.placeholder} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por placa, cliente o tipo de unidad..."
          placeholderTextColor={COLORS.placeholder}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {hayBusquedaActiva && (
          <Ionicons
            name="close-circle"
            size={18}
            color={COLORS.placeholder}
            onPress={() => setBusqueda("")}
          />
        )}
      </View>

      <FlatList
        data={activosFiltrados}
        keyExtractor={(item) => String(item.id_activo)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              {hayBusquedaActiva
                ? "No se encontraron activos."
                : "Aún no hay activos registrados."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ActivoCard activo={item} onEliminar={handleEliminar} />
        )}
      />
    </View>
  );
}

function ActivoCard({
  activo,
  onEliminar,
}: {
  activo: VehiculoConDetalle;
  onEliminar: (idActivo: number) => Promise<boolean>;
}) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);

  // Regla de placa: EquipoEstacionario puede no tener placa (placa es NULL en el modelo)
  const sinPlaca =
    activo.tipo_activo === "EquipoEstacionario" &&
    (!activo.placa || activo.placa.trim() === "");

  const tituloTarjeta = sinPlaca
    ? "Equipo Estacionario (Sin placa)"
    : (activo.placa ?? "—");

  const handleEditar = () => {
    router.push({
      pathname: "/edit-activo",
      params: { id: String(activo.id_activo) },
    });
  };

  const confirmarEliminacion = () => {
    Alert.alert(
      "Eliminar Activo",
      `¿Seguro que deseas eliminar "${tituloTarjeta}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setEliminando(true);
            const exito = await onEliminar(activo.id_activo);
            // Si falló, la tarjeta sigue existiendo: reseteamos el spinner.
            // Si tuvo éxito, el padre ya la quitó de la lista y este
            // componente se desmontará solo.
            if (!exito) setEliminando(false);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons
          name={activo.tipo_activo === "Vehiculo" ? "car-sport" : "construct"}
          size={24}
          color={COLORS.red}
        />
        {sinPlaca ? (
          <View style={styles.badgeSinPlaca}>
            <Text style={styles.badgeSinPlacaText}>{tituloTarjeta}</Text>
          </View>
        ) : (
          <Text style={styles.placaText}>{tituloTarjeta}</Text>
        )}
      </View>

      <View style={styles.cardBody}>
        <InfoRow label="Cliente" value={activo.nombre_cliente} />
        <InfoRow label="Tipo de Unidad" value={activo.tipo_unidad} />
        <InfoRow label="Marca" value={activo.marca ?? "Sin Marca"} />
        <InfoRow
          label="Medidor"
          value={`${activo.lectura_actual} (${activo.tipo_medidor})`}
        />
        {activo.capacidad != null && (
          <InfoRow label="Capacidad" value={String(activo.capacidad)} />
        )}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={handleEditar}
          disabled={eliminando}
        >
          <Ionicons name="pencil" size={16} color={COLORS.editText} />
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={confirmarEliminacion}
          disabled={eliminando}
        >
          {eliminando ? (
            <ActivityIndicator size="small" color={COLORS.red} />
          ) : (
            <>
              <Ionicons name="trash" size={16} color={COLORS.red} />
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.gray,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.dark,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
  },
  listContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 15,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  placaText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    letterSpacing: 0.5,
  },
  badgeSinPlaca: {
    backgroundColor: COLORS.warnBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSinPlacaText: {
    color: COLORS.warnText,
    fontWeight: "700",
    fontSize: 13,
  },
  cardBody: {
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.dark,
    flexShrink: 1,
    textAlign: "right",
  },
  cardFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: COLORS.editBg,
  },
  editButtonText: {
    color: COLORS.editText,
    fontWeight: "600",
    fontSize: 13,
  },
  deleteButton: {
    backgroundColor: COLORS.warnBg,
  },
  deleteButtonText: {
    color: COLORS.red,
    fontWeight: "600",
    fontSize: 13,
  },
});
