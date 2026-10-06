// =====================================================================
// COMPONENTE REUTILIZABLE: SearchableSelect
// Desplegable buscable genérico para cualquier catálogo (Cliente, Marca,
// TipoUnidad, etc.). Incluye botón "+ Nuevo" opcional para alta rápida.
//
// Ubicación sugerida: components/SearchableSelect.tsx
// =====================================================================

import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  red: "#C1272D",
  yellow: "#E8B923",
  white: "#FFFFFF",
  dark: "#2f3640",
  gray: "#f5f6fa",
  border: "#dcdde1",
  placeholder: "#a4b0be",
};

interface SearchableSelectProps<T> {
  label: string;
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  onQuickAddPress?: () => void; // si se pasa, se muestra el botón "+ Nuevo"
  quickAddLabel?: string;
}

export default function SearchableSelect<T>({
  label,
  items,
  getId,
  getLabel,
  selectedId,
  onSelect,
  placeholder = "Selecciona una opción",
  loading = false,
  disabled = false,
  onQuickAddPress,
  quickAddLabel = "+ Nuevo",
}: SearchableSelectProps<T>) {
  const [modalVisible, setModalVisible] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const selectedItem = items.find((item) => getId(item) === selectedId);

  const itemsFiltrados = useMemo(() => {
    if (!busqueda.trim()) return items;
    const q = busqueda.trim().toLowerCase();
    return items.filter((item) => getLabel(item).toLowerCase().includes(q));
  }, [items, busqueda, getLabel]);

  const abrir = () => {
    if (disabled || loading) return;
    setBusqueda("");
    setModalVisible(true);
  };

  const seleccionar = (item: T) => {
    onSelect(getId(item));
    setModalVisible(false);
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {onQuickAddPress && (
          <TouchableOpacity
            onPress={onQuickAddPress}
            style={styles.quickAddButton}
            disabled={disabled}
          >
            <Ionicons name="add-circle-outline" size={16} color={COLORS.red} />
            <Text style={styles.quickAddText}>{quickAddLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={abrir}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.red} />
        ) : (
          <Text
            style={
              selectedItem
                ? styles.selectorTextFilled
                : styles.selectorTextPlaceholder
            }
            numberOfLines={1}
          >
            {selectedItem ? getLabel(selectedItem) : placeholder}
          </Text>
        )}
        <Ionicons name="chevron-down" size={18} color={COLORS.dark} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={COLORS.placeholder} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar..."
                placeholderTextColor={COLORS.placeholder}
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus
              />
            </View>

            {onQuickAddPress && (
              <TouchableOpacity
                style={styles.modalQuickAdd}
                onPress={() => {
                  setModalVisible(false);
                  onQuickAddPress();
                }}
              >
                <Ionicons name="add-circle" size={20} color={COLORS.red} />
                <Text style={styles.modalQuickAddText}>
                  {quickAddLabel} {label.toLowerCase()}
                </Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={itemsFiltrados}
              keyExtractor={(item) => getId(item)}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const activo = getId(item) === selectedId;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, activo && styles.listItemActive]}
                    onPress={() => seleccionar(item)}
                  >
                    <Text
                      style={[
                        styles.listItemText,
                        activo && styles.listItemTextActive,
                      ]}
                    >
                      {getLabel(item)}
                    </Text>
                    {activo && (
                      <Ionicons name="checkmark" size={18} color={COLORS.red} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Sin resultados
                  {onQuickAddPress
                    ? ` — usa "${quickAddLabel}" para crear uno`
                    : ""}
                  .
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
  quickAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickAddText: {
    color: COLORS.red,
    fontWeight: "600",
    fontSize: 13,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#dfddd171",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#1e272e",
    minHeight: 46,
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorTextFilled: {
    fontSize: 16,
    color: COLORS.placeholder,
    flex: 1,
  },
  selectorTextPlaceholder: {
    fontSize: 16,
    color: COLORS.placeholder,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.gray,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
  },
  modalQuickAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 6,
  },
  modalQuickAddText: {
    color: COLORS.red,
    fontWeight: "700",
    fontSize: 15,
  },
  list: {
    flexGrow: 0,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f2f6",
  },
  listItemActive: {
    backgroundColor: "#fdf2f2",
  },
  listItemText: {
    fontSize: 15,
    color: COLORS.dark,
  },
  listItemTextActive: {
    color: COLORS.red,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.placeholder,
    paddingVertical: 30,
    fontSize: 14,
  },
});
