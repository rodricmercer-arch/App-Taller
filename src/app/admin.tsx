import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  actualizarTrabajador,
  eliminarTrabajador,
  errorDeCampo,
  getTrabajadores,
  TrabajadorError,
} from "../db/database";
import { esAdmin } from "../db/sesion";
import type { TipoContrato, TrabajadorPublico } from "../db/types";

const CONTRATOS: TipoContrato[] = ["Fijo", "Subcontratado"];

const COLORS = {
  bgDark: "#121212",
  red: "#C1272D",
  yellow: "#E8B923",
  white: "#FFFFFF",
  textLight: "#EDEDED",
  cardGray: "#1E1E1E",
  green: "#3DBE5C",
};

export default function AdminScreen() {
  const router = useRouter();
  const [trabajadores, setTrabajadores] = useState<TrabajadorPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [idEnProceso, setIdEnProceso] = useState<number | null>(null);
  const [editando, setEditando] = useState<TrabajadorPublico | null>(null);
  const [form, setForm] = useState({ nombre: "", telefono: "", dni: "", tipo_contrato: "Fijo" as TipoContrato });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  // Guardián de ruta: si no es admin, fuera de aquí de inmediato.
  useEffect(() => {
    if (!esAdmin()) {
      router.replace("/(tabs)/home" as any);
    }
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await getTrabajadores();
      setTrabajadores(lista);
    } catch {
      Alert.alert("Error", "No se pudo cargar la lista de trabajadores.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const alternarActivo = async (t: TrabajadorPublico) => {
    setIdEnProceso(t.id_trabajador);
    try {
      await actualizarTrabajador(t.id_trabajador, { activo: t.activo !== 1 });
      await cargar();
    } catch (e) {
      Alert.alert(
        "No se pudo actualizar",
        e instanceof TrabajadorError ? e.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setIdEnProceso(null);
    }
  };

    const abrirEdicion = (t: TrabajadorPublico) => {
    setForm({
      nombre: t.nombre,
      telefono: t.telefono ?? "",
      dni: t.dni ?? "",
      tipo_contrato: t.tipo_contrato,
    });
    setEditando(t);
  };

  const errNombre = editando ? errorDeCampo("nombre", form.nombre) : null;
  const errTelefono = editando ? errorDeCampo("telefono", form.telefono) : null;
  const errDni = editando ? errorDeCampo("dni", form.dni) : null;
  const formValido = !errNombre && !errTelefono && !errDni;

  const guardarEdicion = async () => {
    if (!editando) return;
    setGuardandoEdicion(true);
    try {
      await actualizarTrabajador(editando.id_trabajador, {
        nombre: form.nombre,
        telefono: form.telefono,
        dni: form.dni,
        tipo_contrato: form.tipo_contrato,
      });
      setEditando(null);
      await cargar();
    } catch (e) {
      Alert.alert(
        "No se pudo guardar",
        e instanceof TrabajadorError ? e.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const confirmarEliminar = (t: TrabajadorPublico) => {
    Alert.alert(
      "Eliminar trabajador",
      `¿Seguro que deseas eliminar a ${t.nombre}? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => eliminar(t) },
      ],
    );
  };

  const eliminar = async (t: TrabajadorPublico) => {
    setEliminandoId(t.id_trabajador);
    try {
      await eliminarTrabajador(t.id_trabajador);
      await cargar();
    } catch (e) {
      if (e instanceof TrabajadorError && e.codigo === "TIENE_HISTORIAL") {
        Alert.alert(
          "No se puede eliminar",
          "Este trabajador tiene órdenes de trabajo asociadas. Desactívalo en su lugar (usa el interruptor).",
        );
      } else if (e instanceof TrabajadorError && e.codigo === "ULTIMO_ADMIN") {
        Alert.alert("No se puede eliminar", "No puedes eliminar al único administrador activo.");
      } else {
        Alert.alert(
          "Error",
          e instanceof TrabajadorError ? e.message : "Ocurrió un error inesperado.",
        );
      }
    } finally {
      setEliminandoId(null);
    }
  };

  if (!esAdmin()) return null; // Evita parpadeo mientras el useEffect redirige

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Trabajadores</Text>
        <View style={{ width: 26 }} />
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.yellow} />
      ) : (
        <FlatList
          data={trabajadores}
          keyExtractor={(item) => String(item.id_trabajador)}
          contentContainerStyle={styles.listContent}
          onRefresh={cargar}
          refreshing={cargando}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay trabajadores registrados.</Text>
          }
                    renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.detalle}>{item.correo ?? "Sin correo"}</Text>
                <Text style={styles.detalle}>DNI: {item.dni ?? "—"}</Text>
                                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.badge,
                      item.rol === "admin" ? styles.badgeAdmin : styles.badgeTrabajador,
                    ]}
                  >
                    <Text style={styles.badgeText}>{item.rol}</Text>
                  </View>
                  <View style={[styles.badge, item.activo === 1 ? styles.badgeActivo : styles.badgeInactivo]}>
                    <Text style={styles.badgeText}>{item.activo === 1 ? "Activo" : "Inactivo"}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.accionesColumna}>
                {idEnProceso === item.id_trabajador ? (
                  <ActivityIndicator color={COLORS.yellow} />
                ) : (
                  <Switch
                    value={item.activo === 1}
                    onValueChange={() => alternarActivo(item)}
                    trackColor={{ false: "#555", true: COLORS.green }}
                    thumbColor={COLORS.white}
                  />
                )}
                <View style={styles.botonesRow}>
                  <TouchableOpacity onPress={() => abrirEdicion(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="create-outline" size={20} color={COLORS.yellow} />
                  </TouchableOpacity>
                  {eliminandoId === item.id_trabajador ? (
                    <ActivityIndicator size="small" color={COLORS.red} />
                  ) : (
                    <TouchableOpacity onPress={() => confirmarEliminar(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={20} color={COLORS.red} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={editando !== null} animationType="slide" transparent onRequestClose={() => setEditando(null)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.modalCard} keyboardShouldPersistTaps="handled">
            <Text style={styles.headerTitle}>Editar trabajador</Text>

            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={form.nombre}
              onChangeText={(t) => setForm({ ...form, nombre: t })}
              placeholderTextColor="#777"
              autoCapitalize="words"
            />
            {errNombre && <Text style={styles.errorText}>{errNombre}</Text>}

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={form.telefono}
              onChangeText={(t) => setForm({ ...form, telefono: t })}
              placeholderTextColor="#777"
              keyboardType="phone-pad"
            />
            {errTelefono && <Text style={styles.errorText}>{errTelefono}</Text>}

            <Text style={styles.label}>DNI</Text>
            <TextInput
              style={styles.input}
              value={form.dni}
              onChangeText={(t) => setForm({ ...form, dni: t })}
              placeholderTextColor="#777"
              keyboardType="number-pad"
            />
            {errDni && <Text style={styles.errorText}>{errDni}</Text>}

            <Text style={styles.label}>Tipo de contrato</Text>
            <View style={styles.badgesRow}>
              {CONTRATOS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, form.tipo_contrato === c && styles.chipActive]}
                  onPress={() => setForm({ ...form, tipo_contrato: c })}
                >
                  <Text style={[styles.chipText, form.tipo_contrato === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBotonesRow}>
              <TouchableOpacity style={styles.botonSecundario} onPress={() => setEditando(null)}>
                <Text style={styles.botonSecundarioTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonPrimario, (!formValido || guardandoEdicion) && { opacity: 0.5 }]}
                disabled={!formValido || guardandoEdicion}
                onPress={guardarEdicion}
              >
                <Text style={styles.botonPrimarioTexto}>{guardandoEdicion ? "Guardando..." : "Guardar"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 16,
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: "700" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyText: { color: COLORS.textLight, textAlign: "center", marginTop: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardGray,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  nombre: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  detalle: { color: COLORS.textLight, fontSize: 13, marginTop: 2 },
  badgesRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#3A3A3A",
  },
  badgeTrabajador: { backgroundColor: "#3B82F6" },
  badgeActivo: { backgroundColor: COLORS.green },
  badgeInactivo: { backgroundColor: COLORS.red },
  badgeAdmin: { backgroundColor: COLORS.yellow },
  badgeText: { color: COLORS.bgDark, fontSize: 11, fontWeight: "700" },
    accionesColumna: { alignItems: "center", gap: 10 },
  botonesRow: { flexDirection: "row", gap: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.bgDark, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  label: { color: COLORS.white, fontSize: 14, fontWeight: "700", marginTop: 14, marginBottom: 6 },
  input: {
    color: COLORS.white,
    fontSize: 15,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.yellow,
  },
  errorText: { color: COLORS.red, fontSize: 12, marginTop: 4 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
  },
  chipActive: { backgroundColor: COLORS.yellow },
  chipText: { color: COLORS.yellow, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: COLORS.bgDark },
  modalBotonesRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  botonSecundario: { flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: "center", backgroundColor: "#2A2A2A" },
  botonSecundarioTexto: { color: COLORS.white, fontWeight: "700" },
  botonPrimario: { flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: "center", backgroundColor: COLORS.yellow },
  botonPrimarioTexto: { color: COLORS.bgDark, fontWeight: "700" },
});