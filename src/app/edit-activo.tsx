import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ModalNuevaMarca,
  ModalNuevoTipoUnidad,
} from "../components/CatalogQuickAddModals";
import SearchableSelect from "../components/SearchableSelect";
import {
  actualizarVehiculo,
  getActivoPorId,
  getMarcas,
  getTiposUnidad,
} from "../db/database";
import type { Marca, TipoUnidad } from "../db/types";

const COLORS = {
  red: "#C1272D",
  white: "#FFFFFF",
  dark: "#2f3640",
  gray: "#f5f6fa",
  border: "#dcdde1",
  placeholder: "#a4b0be",
  muted: "#718093",
  readOnlyBg: "#eef2f7",
};

// Sentinel para "Sin Marca" en el desplegable (id_marca es NULL permitido en Activo)
const SIN_MARCA_ID = "__sin_marca__";
const SIN_MARCA_ITEM: Marca = { id_marca: -1, nombre: "Sin Marca" };

export default function EditActivoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idActivo = Number(id);

  // --- Estado de carga ---
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // --- Catálogos dinámicos ---
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [tiposUnidad, setTiposUnidad] = useState<TipoUnidad[]>([]);

  // --- Campos editables ---
  const [idMarca, setIdMarca] = useState<string | null>(SIN_MARCA_ID);
  const [idTipoUnidad, setIdTipoUnidad] = useState<string | null>(null);
  const [placa, setPlaca] = useState("");
  const [capacidad, setCapacidad] = useState("");

  // --- Campos de solo lectura (contexto, no editables en esta etapa) ---
  const [tipoActivo, setTipoActivo] = useState<
    "Vehiculo" | "EquipoEstacionario" | null
  >(null);
  const [nombreCliente, setNombreCliente] = useState("");
  const [tipoMedidor, setTipoMedidor] = useState("");
  const [lecturaActual, setLecturaActual] = useState<number | null>(null);

  // --- Modales de alta rápida ---
  const [modalMarcaVisible, setModalMarcaVisible] = useState(false);
  const [modalTipoUnidadVisible, setModalTipoUnidadVisible] = useState(false);

  const esVehiculo = tipoActivo === "Vehiculo";
  const cargando = cargandoDatos || cargandoCatalogos;

  useEffect(() => {
    if (!idActivo || isNaN(idActivo)) {
      Alert.alert("Error", "No se recibió un ID de activo válido.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }
    cargarDatosIniciales();
  }, [idActivo]);

  const cargarDatosIniciales = async () => {
    try {
      setCargandoDatos(true);
      setCargandoCatalogos(true);

      const [activo, marcasData, tiposUnidadData] = await Promise.all([
        getActivoPorId(idActivo),
        getMarcas(),
        getTiposUnidad(),
      ]);

      setMarcas(marcasData);
      setTiposUnidad(tiposUnidadData);

      if (!activo) {
        Alert.alert(
          "No encontrado",
          "Este activo ya no existe en la base de datos.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        return;
      }

      // Precarga de campos editables
      setIdTipoUnidad(String(activo.id_tipo_unidad));
      setIdMarca(
        activo.id_marca != null ? String(activo.id_marca) : SIN_MARCA_ID,
      );
      // placa NULL (EquipoEstacionario) se muestra como campo vacío, sin romper la app
      setPlaca(activo.placa ?? "");
      setCapacidad(activo.capacidad != null ? String(activo.capacidad) : "");

      // Contexto de solo lectura
      setTipoActivo(activo.tipo_activo);
      setNombreCliente(activo.nombre_cliente);
      setTipoMedidor(activo.tipo_medidor);
      setLecturaActual(activo.lectura_actual);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudieron cargar los datos del activo.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setCargandoDatos(false);
      setCargandoCatalogos(false);
    }
  };

  const handleGuardar = async () => {
    // 1. Tipo de Unidad es obligatorio (FK NOT NULL)
    if (!idTipoUnidad) {
      Alert.alert("Falta el Tipo de Unidad", "Selecciona un Tipo de Unidad.");
      return;
    }

    // 2. Placa obligatoria solo si es Vehículo (índice UNIQUE condicional)
    if (esVehiculo && !placa.trim()) {
      Alert.alert(
        "Falta la placa",
        "La placa es obligatoria para un Vehículo.",
      );
      return;
    }

    // 3. Capacidad opcional, pero numérica si se ingresa
    const capacidadTrim = capacidad.trim();
    if (
      capacidadTrim &&
      (isNaN(Number(capacidadTrim)) || Number(capacidadTrim) <= 0)
    ) {
      Alert.alert(
        "Capacidad inválida",
        "Ingresa un número mayor a 0 o deja el campo vacío.",
      );
      return;
    }

    try {
      setGuardando(true);

      await actualizarVehiculo(
        idActivo,
        Number(idTipoUnidad),
        idMarca === SIN_MARCA_ID ? null : Number(idMarca),
        esVehiculo ? placa.toUpperCase().trim() : null, // placa NULL si es EquipoEstacionario
        capacidadTrim ? Number(capacidadTrim) : null,
      );

      Alert.alert("¡Guardado!", "Los cambios se guardaron correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error de Base de Datos",
        "No se pudieron guardar los cambios. Verifica que la placa no esté duplicada.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const marcasConOpcionNula = [SIN_MARCA_ITEM, ...marcas];

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name={esVehiculo ? "car-sport" : "construct"}
          size={40}
          color={COLORS.red}
        />
        <Text style={styles.title}>Editar Activo</Text>
        <Text style={styles.subtitle}>Taller "Alexander"</Text>
      </View>

      <View style={styles.form}>
        {/* Contexto de solo lectura: no editable en esta etapa */}
        <View style={styles.readOnlyBox}>
          <ReadOnlyRow
            label="Tipo de Activo"
            value={esVehiculo ? "Vehículo" : "Equipo Estacionario"}
          />
          <ReadOnlyRow label="Cliente / Propietario" value={nombreCliente} />
          <ReadOnlyRow
            label="Medidor"
            value={`${lecturaActual} (${tipoMedidor})`}
          />
        </View>

        {/* DINÁMICO: Tipo de Unidad — editable */}
        <SearchableSelect<TipoUnidad>
          label="Tipo de Unidad *"
          items={tiposUnidad}
          getId={(t) => String(t.id_tipo_unidad)}
          getLabel={(t) => t.nombre}
          selectedId={idTipoUnidad}
          onSelect={setIdTipoUnidad}
          placeholder="Selecciona un tipo de unidad"
          onQuickAddPress={() => setModalTipoUnidadVisible(true)}
          quickAddLabel="+ Nuevo"
        />

        {/* DINÁMICO: Marca — editable, opcional */}
        <SearchableSelect<Marca>
          label="Marca del Activo"
          items={marcasConOpcionNula}
          getId={(m) => (m.id_marca === -1 ? SIN_MARCA_ID : String(m.id_marca))}
          getLabel={(m) => m.nombre}
          selectedId={idMarca}
          onSelect={setIdMarca}
          placeholder="Selecciona una marca"
          onQuickAddPress={() => setModalMarcaVisible(true)}
          quickAddLabel="+ Nueva"
        />

        {/* Placa: solo editable/relevante si es Vehículo */}
        {esVehiculo && (
          <>
            <Text style={styles.label}>Placa del Vehículo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: XYZ-999"
              placeholderTextColor={COLORS.placeholder}
              value={placa}
              onChangeText={setPlaca}
              autoCapitalize="characters"
            />
          </>
        )}

        <Text style={styles.label}>Capacidad (Galones / Toneladas)</Text>
        <TextInput
          style={styles.input}
          placeholder="Opcional — Ej: 8000"
          placeholderTextColor={COLORS.placeholder}
          value={capacidad}
          onChangeText={setCapacidad}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleGuardar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>
      </View>

      <ModalNuevaMarca
        visible={modalMarcaVisible}
        onClose={() => setModalMarcaVisible(false)}
        onCreated={(nuevaMarca) => {
          setMarcas((prev) => [...prev, nuevaMarca]);
          setIdMarca(String(nuevaMarca.id_marca));
        }}
      />

      <ModalNuevoTipoUnidad
        visible={modalTipoUnidadVisible}
        onClose={() => setModalTipoUnidadVisible(false)}
        onCreated={(nuevoTipo) => {
          setTiposUnidad((prev) => [...prev, nuevoTipo]);
          setIdTipoUnidad(String(nuevoTipo.id_tipo_unidad));
        }}
      />
    </ScrollView>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readOnlyRow}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <Text style={styles.readOnlyValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gray,
  },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.gray,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.dark,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  readOnlyBox: {
    backgroundColor: COLORS.readOnlyBg,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginBottom: 10,
  },
  readOnlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  readOnlyLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },
  readOnlyValue: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: COLORS.dark,
  },
  button: {
    backgroundColor: COLORS.red,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
});
