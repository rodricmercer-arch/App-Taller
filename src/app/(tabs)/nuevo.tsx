import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SearchableSelect from "../../components/SearchableSelect";
import {
  crearCliente,
  crearMarca,
  crearTipoUnidad,
  crearVehiculo,
  getClientes,
  getMarcas,
  getTiposUnidad,
} from "../../db/database";
import type { Cliente, Marca, TipoUnidad } from "../../db/types";

const COLORS = {
  red: "#C1272D",
  yellow: "#E8B923",
  white: "#FFFFFF",
  dark: "#2f3640",
  gray: "#f5f6fa",
  border: "#dcdde1",
  placeholder: "#a4b0be",
    black: "#000000",
};

type TipoActivo = "Vehiculo" | "EquipoEstacionario";
type TipoMedidor = "Odometro" | "Horometro" | "Ciclos";

// Sentinel para "Sin Marca" en el desplegable (id_marca es NULL permitido en Activo)
const SIN_MARCA_ID = "__sin_marca__";
const SIN_MARCA_ITEM: Marca = { id_marca: -1, nombre: "Sin Marca" };

export default function NuevoVehiculoScreen() {
  const router = useRouter();

  // --- Estado general del formulario ---
  const [loading, setLoading] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  // --- Catálogos dinámicos (vienen de SQLite) ---
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [tiposUnidad, setTiposUnidad] = useState<TipoUnidad[]>([]);

  // --- Selección (FK obligatorias / opcional en Activo) ---
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [idMarca, setIdMarca] = useState<string | null>(SIN_MARCA_ID);
  const [idTipoUnidad, setIdTipoUnidad] = useState<string | null>(null);

  // --- Discriminador de tipo (ENUM NOT NULL: chip estático, define reglas de negocio) ---
  const [tipoActivo, setTipoActivo] = useState<TipoActivo>("Vehiculo");

  const [placa, setPlaca] = useState("");
  const [capacidad, setCapacidad] = useState(""); // opcional en el modelo
  const [tipoMedidor, setTipoMedidor] = useState<TipoMedidor>("Odometro");
  const [lecturaInicial, setLecturaInicial] = useState("");

  // --- Visibilidad de los modales de alta rápida ---
  const [modalMarcaVisible, setModalMarcaVisible] = useState(false);
  const [modalTipoUnidadVisible, setModalTipoUnidadVisible] = useState(false);
  const [modalClienteVisible, setModalClienteVisible] = useState(false);

  const esVehiculo = tipoActivo === "Vehiculo";

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      setCargandoCatalogos(true);
      const [clientesData, marcasData, tiposUnidadData] = await Promise.all([
        getClientes(),
        getMarcas(),
        getTiposUnidad(),
      ]);
      setClientes(clientesData);
      setMarcas(marcasData);
      setTiposUnidad(tiposUnidadData);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error al cargar catálogos",
        "No se pudieron cargar Clientes, Marcas o Tipos de Unidad desde la base de datos.",
      );
    } finally {
      setCargandoCatalogos(false);
    }
  };

  const resetForm = () => {
    setIdCliente(null);
    setIdMarca(SIN_MARCA_ID);
    setIdTipoUnidad(null);
    setTipoActivo("Vehiculo");
    setPlaca("");
    setCapacidad("");
    setTipoMedidor("Odometro");
    setLecturaInicial("");
  };

  const handleGuardar = async () => {
    // 1. Campos obligatorios por FK NOT NULL: id_cliente, id_tipo_unidad
    if (!idCliente || !idTipoUnidad) {
      Alert.alert(
        "Faltan datos",
        "Selecciona el Cliente y el Tipo de Unidad; ambos son obligatorios.",
      );
      return;
    }

    // 2. Placa: obligatoria solo si es Vehículo (índice UNIQUE condicional;
    //    un EquipoEstacionario debe insertarse con placa = NULL)
    if (esVehiculo && !placa.trim()) {
      Alert.alert(
        "Falta la placa",
        "La placa es obligatoria para un Vehículo. Si es un equipo estacionario, cambia el tipo de activo.",
      );
      return;
    }

    // 3. Capacidad es opcional, pero si se ingresa debe ser numérica válida
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

    // 4. Medidor.lectura_actual es NOT NULL: obligatorio y numérico (>= 0)
    const lecturaTrim = lecturaInicial.trim();
    if (!lecturaTrim || isNaN(Number(lecturaTrim)) || Number(lecturaTrim) < 0) {
      Alert.alert(
        "Lectura inicial inválida",
        "Ingresa la lectura inicial del medidor (0 o un número positivo).",
      );
      return;
    }

    try {
      setLoading(true);

      await crearVehiculo(
        Number(idTipoUnidad),
        idMarca === SIN_MARCA_ID ? null : Number(idMarca), // id_marca NULL si "Sin Marca"
        Number(idCliente),
        tipoActivo,
        esVehiculo ? placa.toUpperCase().trim() : null, // placa NULL si es EquipoEstacionario
        capacidadTrim ? Number(capacidadTrim) : null,
        tipoMedidor,
        Number(lecturaTrim),
      );

      Alert.alert(
        "¡Éxito!",
        `${esVehiculo ? "Vehículo" : "Equipo estacionario"} registrado correctamente en la base de datos local.`,
        [
          {
            text: "OK",
            onPress: () => {
              resetForm();
              router.push("/(tabs)/home");
            },
          },
        ],
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error de Base de Datos",
        esVehiculo
          ? "No se pudo registrar el activo. Verifica que la placa no esté duplicada."
          : "No se pudo registrar el activo. Intenta nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Lista de marcas mostrada en el SearchableSelect: incluye "Sin Marca" al inicio
  const marcasConOpcionNula = [SIN_MARCA_ITEM, ...marcas];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Ionicons name="car-sport" size={40} color={COLORS.red} />
        <Text style={styles.title}>Registrar Nuevo Activo</Text>
        <Text style={styles.subtitle}>Taller "Alexander"</Text>
      </View>

      <View style={styles.form}>
        {/* ESTÁTICO: Tipo de Activo — define reglas de negocio (placa obligatoria u NULL) */}
        <Text style={styles.label}>Tipo de Activo *</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, esVehiculo && styles.chipActive]}
            onPress={() => setTipoActivo("Vehiculo")}
          >
            <Text
              style={[styles.chipText, esVehiculo && styles.chipTextActive]}
            >
              Vehículo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, !esVehiculo && styles.chipActive]}
            onPress={() => {
              setTipoActivo("EquipoEstacionario");
              setPlaca("");
            }}
          >
            <Text
              style={[styles.chipText, !esVehiculo && styles.chipTextActive]}
            >
              Equipo Estacionario
            </Text>
          </TouchableOpacity>
        </View>

        {/* DINÁMICO: Cliente — desplegable buscable + alta rápida */}
        <SearchableSelect<Cliente>
          label="Cliente / Propietario *"
          items={clientes}
          getId={(c) => String(c.id_cliente)}
          getLabel={(c) => c.nombre_razon_social}
          selectedId={idCliente}
          onSelect={setIdCliente}
          placeholder="Selecciona un cliente"
          loading={cargandoCatalogos}
          onQuickAddPress={() => setModalClienteVisible(true)}
          quickAddLabel="+ Nuevo"
        />

        {/* DINÁMICO: Tipo de Unidad — desplegable buscable + alta rápida */}
        <SearchableSelect<TipoUnidad>
          label="Tipo de Unidad *"
          items={tiposUnidad}
          getId={(t) => String(t.id_tipo_unidad)}
          getLabel={(t) => t.nombre}
          selectedId={idTipoUnidad}
          onSelect={setIdTipoUnidad}
          placeholder="Selecciona un tipo de unidad"
          loading={cargandoCatalogos}
          onQuickAddPress={() => setModalTipoUnidadVisible(true)}
          quickAddLabel="+ Nuevo"
        />

        {/* DINÁMICO: Marca — desplegable buscable + alta rápida (opcional, incluye "Sin Marca") */}
        <SearchableSelect<Marca>
          label="Marca del Activo"
          items={marcasConOpcionNula}
          getId={(m) => (m.id_marca === -1 ? SIN_MARCA_ID : String(m.id_marca))}
          getLabel={(m) => m.nombre}
          selectedId={idMarca}
          onSelect={setIdMarca}
          placeholder="Selecciona una marca"
          loading={cargandoCatalogos}
          onQuickAddPress={() => setModalMarcaVisible(true)}
          quickAddLabel="+ Nueva"
        />

        {/* Placa: solo obligatoria/relevante si es Vehículo */}
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

        {/* ESTÁTICO: Tipo de Medidor — define cálculos de mantenimiento en la app */}
        <Text style={styles.label}>Tipo de Medidor Inicial *</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.chip,
              tipoMedidor === "Odometro" && styles.chipActive,
            ]}
            onPress={() => setTipoMedidor("Odometro")}
          >
            <Text
              style={[
                styles.chipText,
                tipoMedidor === "Odometro" && styles.chipTextActive,
              ]}
            >
              Odómetro (Km)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chip,
              tipoMedidor === "Horometro" && styles.chipActive,
            ]}
            onPress={() => setTipoMedidor("Horometro")}
          >
            <Text
              style={[
                styles.chipText,
                tipoMedidor === "Horometro" && styles.chipTextActive,
              ]}
            >
              Horómetro (Hrs)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, tipoMedidor === "Ciclos" && styles.chipActive]}
            onPress={() => setTipoMedidor("Ciclos")}
          >
            <Text
              style={[
                styles.chipText,
                tipoMedidor === "Ciclos" && styles.chipTextActive,
              ]}
            >
              Ciclos
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Lectura Inicial del Medidor *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 15000"
          placeholderTextColor={COLORS.placeholder}
          value={lecturaInicial}
          onChangeText={setLecturaInicial}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleGuardar}
          disabled={loading || cargandoCatalogos}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Guardar en Base de Datos</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ---- Modales de alta rápida ---- */}
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

      <ModalNuevoCliente
        visible={modalClienteVisible}
        onClose={() => setModalClienteVisible(false)}
        onCreated={(nuevoCliente) => {
          setClientes((prev) => [...prev, nuevoCliente]);
          setIdCliente(String(nuevoCliente.id_cliente));
        }}
      />
    </ScrollView>
  );
}

// =====================================================================
// MODALES DE ALTA RÁPIDA ("+ Nuevo" inline)
// =====================================================================

function FormModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Alta rápida de Marca: solo requiere `nombre` (UNIQUE NOT NULL). */
function ModalNuevaMarca({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (marca: Marca) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Alert.alert("Falta el nombre", "Ingresa el nombre de la marca.");
      return;
    }
    try {
      setGuardando(true);
      const id = await crearMarca(nombre);
      onCreated({ id_marca: id, nombre: nombre.trim() });
      setNombre("");
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "No se pudo crear la marca. ¿Ya existe una con ese nombre?",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal visible={visible} title="Nueva Marca" onClose={onClose}>
      <Text style={modalStyles.label}>Nombre de la marca *</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="Ej: Volvo"
        placeholderTextColor={COLORS.placeholder}
        value={nombre}
        onChangeText={setNombre}
        autoFocus
      />
      <TouchableOpacity
        style={modalStyles.saveButton}
        onPress={handleGuardar}
        disabled={guardando}
      >
        {guardando ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={modalStyles.saveButtonText}>Guardar Marca</Text>
        )}
      </TouchableOpacity>
    </FormModal>
  );
}

/** Alta rápida de Tipo de Unidad: solo requiere `nombre` (UNIQUE NOT NULL). */
function ModalNuevoTipoUnidad({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (tipo: TipoUnidad) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Alert.alert("Falta el nombre", "Ingresa el nombre del tipo de unidad.");
      return;
    }
    try {
      setGuardando(true);
      const id = await crearTipoUnidad(nombre);
      onCreated({ id_tipo_unidad: id, nombre: nombre.trim() });
      setNombre("");
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "No se pudo crear el tipo de unidad. ¿Ya existe uno con ese nombre?",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal visible={visible} title="Nuevo Tipo de Unidad" onClose={onClose}>
      <Text style={modalStyles.label}>Nombre del tipo de unidad *</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="Ej: Camión Grúa"
        placeholderTextColor={COLORS.placeholder}
        value={nombre}
        onChangeText={setNombre}
        autoFocus
      />
      <TouchableOpacity
        style={modalStyles.saveButton}
        onPress={handleGuardar}
        disabled={guardando}
      >
        {guardando ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={modalStyles.saveButtonText}>Guardar Tipo de Unidad</Text>
        )}
      </TouchableOpacity>
    </FormModal>
  );
}

/**
 * Alta rápida de Cliente: a diferencia de Marca/TipoUnidad, Cliente tiene
 * 5 campos NOT NULL en el esquema (tipo_documento_identidad, numero_documento,
 * nombre_razon_social, telefono, tipo_cliente), así que el modal los pide todos.
 */
function ModalNuevoCliente({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (cliente: Cliente) => void;
}) {
  const [tipoDocumento, setTipoDocumento] = useState<"RUC" | "DNI">("DNI");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [nombreRazonSocial, setNombreRazonSocial] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoCliente, setTipoCliente] = useState<"Empresa" | "Persona Natural">(
    "Persona Natural",
  );
  const [guardando, setGuardando] = useState(false);

  const resetLocal = () => {
    setTipoDocumento("DNI");
    setNumeroDocumento("");
    setNombreRazonSocial("");
    setTelefono("");
    setTipoCliente("Persona Natural");
  };

  const handleGuardar = async () => {
    if (
      !numeroDocumento.trim() ||
      !nombreRazonSocial.trim() ||
      !telefono.trim()
    ) {
      Alert.alert(
        "Faltan datos",
        "Completa Número de Documento, Nombre/Razón Social y Teléfono.",
      );
      return;
    }
    try {
      setGuardando(true);
      const id = await crearCliente(
        tipoDocumento,
        numeroDocumento,
        nombreRazonSocial,
        telefono,
        tipoCliente,
      );
      onCreated({
        id_cliente: id,
        tipo_documento_identidad: tipoDocumento,
        numero_documento: numeroDocumento.trim(),
        nombre_razon_social: nombreRazonSocial.trim(),
        telefono: telefono.trim(),
        tipo_cliente: tipoCliente,
      });
      resetLocal();
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "No se pudo crear el cliente. Verifica que el número de documento no esté duplicado.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormModal visible={visible} title="Nuevo Cliente" onClose={onClose}>
      <Text style={modalStyles.label}>Tipo de Documento *</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.chip, tipoDocumento === "DNI" && styles.chipActive]}
          onPress={() => setTipoDocumento("DNI")}
        >
          <Text
            style={[
              styles.chipText,
              tipoDocumento === "DNI" && styles.chipTextActive,
            ]}
          >
            DNI
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, tipoDocumento === "RUC" && styles.chipActive]}
          onPress={() => setTipoDocumento("RUC")}
        >
          <Text
            style={[
              styles.chipText,
              tipoDocumento === "RUC" && styles.chipTextActive,
            ]}
          >
            RUC
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={modalStyles.label}>Número de Documento *</Text>
      <TextInput
        style={modalStyles.input}
        placeholder={
          tipoDocumento === "RUC" ? "Ej: 20123456789" : "Ej: 45678912"
        }
        placeholderTextColor={COLORS.placeholder}
        value={numeroDocumento}
        onChangeText={setNumeroDocumento}
        keyboardType="numeric"
      />

      <Text style={modalStyles.label}>Nombre / Razón Social *</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="Ej: Transportes Andinos SAC"
        placeholderTextColor={COLORS.placeholder}
        value={nombreRazonSocial}
        onChangeText={setNombreRazonSocial}
      />

      <Text style={modalStyles.label}>Teléfono *</Text>
      <TextInput
        style={modalStyles.input}
        placeholder="Ej: 987654321"
        placeholderTextColor={COLORS.placeholder}
        value={telefono}
        onChangeText={setTelefono}
        keyboardType="phone-pad"
      />

      <Text style={modalStyles.label}>Tipo de Cliente *</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.chip,
            tipoCliente === "Persona Natural" && styles.chipActive,
          ]}
          onPress={() => setTipoCliente("Persona Natural")}
        >
          <Text
            style={[
              styles.chipText,
              tipoCliente === "Persona Natural" && styles.chipTextActive,
            ]}
          >
            Persona Natural
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, tipoCliente === "Empresa" && styles.chipActive]}
          onPress={() => setTipoCliente("Empresa")}
        >
          <Text
            style={[
              styles.chipText,
              tipoCliente === "Empresa" && styles.chipTextActive,
            ]}
          >
            Empresa
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={modalStyles.saveButton}
        onPress={handleGuardar}
        disabled={guardando}
      >
        {guardando ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={modalStyles.saveButtonText}>Guardar Cliente</Text>
        )}
      </TouchableOpacity>
    </FormModal>
  );
}

// =====================================================================
// ESTILOS
// =====================================================================

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.black,
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
    color: COLORS.white,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#718093",
  },
  form: {
    backgroundColor: COLORS.dark,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dfddd171",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#1e272e",
    color: COLORS.white,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.white,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  chipText: {
    color: COLORS.black,
    fontWeight: "600",
  },
  chipTextActive: {
    color: COLORS.white,
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
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
    color: COLORS.white,
  },
  saveButton: {
    backgroundColor: COLORS.red,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 25,
    marginBottom: 10,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
});
