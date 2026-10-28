// =====================================================================
// COMPONENTE COMPARTIDO: modales de alta rápida para Marca y TipoUnidad.
// Usados tanto en nuevo.tsx (Etapa 1) como en edit-activo.tsx (Etapa 4)
// para no duplicar la misma lógica de "+ Nuevo" en dos archivos.
//
// Ubicación sugerida: components/CatalogQuickAddModals.tsx
//
// NOTA: nuevo.tsx actualmente define ModalNuevaMarca/ModalNuevoTipoUnidad
// de forma local. Puedes (opcional, no obligatorio) borrar esas
// definiciones locales de nuevo.tsx y reemplazarlas por un import desde
// este archivo, para evitar tener dos copias del mismo componente.
// =====================================================================

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
import { crearMarca, crearTipoUnidad } from "../db/database";
import type { Marca, TipoUnidad } from "../db/types";

const COLORS = {
  red: "#C1272D",
  white: "#FFFFFF",
  dark: "#2f3640",
  border: "#dcdde1",
  placeholder: "#a4b0be",
};

export function FormModal({
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
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
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
export function ModalNuevaMarca({
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
      <Text style={styles.label}>Nombre de la marca *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Volvo"
        placeholderTextColor={COLORS.placeholder}
        value={nombre}
        onChangeText={setNombre}
        autoFocus
      />
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleGuardar}
        disabled={guardando}
      >
        {guardando ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.saveButtonText}>Guardar Marca</Text>
        )}
      </TouchableOpacity>
    </FormModal>
  );
}

/** Alta rápida de Tipo de Unidad: solo requiere `nombre` (UNIQUE NOT NULL). */
export function ModalNuevoTipoUnidad({
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
      <Text style={styles.label}>Nombre del tipo de unidad *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Camión Grúa"
        placeholderTextColor={COLORS.placeholder}
        value={nombre}
        onChangeText={setNombre}
        autoFocus
      />
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleGuardar}
        disabled={guardando}
      >
        {guardando ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.saveButtonText}>Guardar Tipo de Unidad</Text>
        )}
      </TouchableOpacity>
    </FormModal>
  );
}

const styles = StyleSheet.create({
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
    color: COLORS.dark,
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
