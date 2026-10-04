// src/app/(tabs)/cotizacion.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Sidebar from "../../components/Sidebar";

// ---------- Colores institucionales (mismos que home.tsx) ----------
const COLORS = {
  bgDark: "#121212",
  red: "#C1272D",
  cardDark: "#2A2A2A",
  cardBorder: "#3A3A3A",
  white: "#FFFFFF",
  textMuted: "#A8A8A8",
};

// ---------- Tipos ----------
interface Repuesto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagen: string;
}

// ---------- Datos de prueba (dummy data) ----------
const repuestos: Repuesto[] = [
  {
    id: "1",
    nombre: "Amortiguador",
    descripcion: "Hidráulico reforzado para cargas pesadas.",
    precio: 412.5,
    stock: 8,
    imagen:
      "https://cdn.club-magazin.autodoc.de/uploads/sites/11/2020/11/amortiguador-de-coche.jpg",
  },
  {
    id: "2",
    nombre: "Bujías (x4)",
    descripcion: "Juego de iridio de encendido rápido.",
    precio: 96.9,
    stock: 20,
    imagen:
      "https://cdn.club-magazin.autodoc.de/uploads/sites/11/2020/10/bujias.jpg",
  },
  {
    id: "3",
    nombre: "Pistón",
    descripcion: "Pistón forjado con anillos incluidos.",
    precio: 268.35,
    stock: 5,
    imagen:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0CWS1_iNtoTtt_FGn3b1ndy2CKORbko-kQpdsWzzsAxtP3UHF-OoZefo&s=10",
  },
  {
    id: "4",
    nombre: "Filtro de aceite",
    descripcion: "Alto rendimiento para motores diésel.",
    precio: 45.0,
    stock: 30,
    imagen:
      "https://provinnor.pe/wp-content/uploads/2025/09/filtro-de-aceite-sakura-c-65400.webp",
  },
  {
    id: "5",
    nombre: "Pastillas de freno",
    descripcion: "Juego delantero cerámico, baja emisión de polvo.",
    precio: 189.9,
    stock: 12,
    imagen:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR7QPhG5T-U8zsDdvGVwdDYyys_UIcm8LGdxDiLrIL-A&s=10",
  },
  {
    id: "6",
    nombre: "Batería 12V 100Ah",
    descripcion: "Libre de mantenimiento para camiones.",
    precio: 745.0,
    stock: 3,
    imagen:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdvf2vTRMt2Y9hQym3envw8sJ1hinfKYU0SdOy7SgAVQ&s=10",
  },
];

// ---------- Utilidades ----------
const formatearSoles = (monto: number): string => `S/ ${monto.toFixed(2)}`;

// ---------- Componentes internos ----------
function ImagenRepuesto({ uri }: { uri: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={[styles.productImage, styles.imageFallback]}>
        <MaterialCommunityIcons
          name="car-cog"
          size={40}
          color={COLORS.textMuted}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.productImage}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
}

function TarjetaRepuesto({
  repuesto,
  seleccionado,
  onPress,
}: {
  repuesto: Repuesto;
  seleccionado: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.productCard, seleccionado && styles.productCardSelected]}
    >
      <ImagenRepuesto uri={repuesto.imagen} />
      <Text style={styles.productName} numberOfLines={1}>
        {repuesto.nombre}
      </Text>
      <Text style={styles.productDescription} numberOfLines={2}>
        {repuesto.descripcion}
      </Text>
      <Text style={styles.productStock}>Stock: {repuesto.stock}</Text>
      <Text style={styles.productPrice}>{formatearSoles(repuesto.precio)}</Text>
    </TouchableOpacity>
  );
}

// ---------- Pantalla principal ----------
export default function CotizacionScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [seleccionadoId, setSeleccionadoId] = useState<string>(repuestos[0].id);
  const [cantidad, setCantidad] = useState(1);

  const seleccionado =
    repuestos.find((r) => r.id === seleccionadoId) ?? repuestos[0];
  const subtotal = seleccionado.precio * cantidad;

  const seleccionar = (id: string) => {
    setSeleccionadoId(id);
    setCantidad(1);
  };

  const disminuir = () => setCantidad((c) => Math.max(1, c - 1));
  const aumentar = () =>
    setCantidad((c) => Math.min(seleccionado.stock, c + 1));

  const agregar = () => {
    Alert.alert(
      "Agregado (demo)",
      `${cantidad} x ${seleccionado.nombre}\nSubtotal: ${formatearSoles(subtotal)}`,
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.red} />

      {/* Franja superior roja */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSidebarVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Cotización</Text>
          <View style={styles.menuButtonSpacer} />
        </View>
      </SafeAreaView>

      {/* Catálogo en cuadrícula de 2 columnas */}
      <FlatList
        data={repuestos}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <TarjetaRepuesto
            repuesto={item}
            seleccionado={item.id === seleccionadoId}
            onPress={() => seleccionar(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Catálogo de repuestos</Text>
        }
      />

      {/* Panel inferior fijo (superpuesto) */}
      <View style={styles.footer}>
        <View style={styles.footerTop}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerName} numberOfLines={1}>
              {seleccionado.nombre}
            </Text>
            <Text style={styles.footerSubtotal}>
              {formatearSoles(subtotal)}
            </Text>
          </View>

          <View style={styles.counter}>
            <TouchableOpacity
              style={[
                styles.counterButton,
                cantidad <= 1 && styles.counterButtonDisabled,
              ]}
              onPress={disminuir}
              disabled={cantidad <= 1}
            >
              <Ionicons name="remove" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{cantidad}</Text>
            <TouchableOpacity
              style={[
                styles.counterButton,
                cantidad >= seleccionado.stock && styles.counterButtonDisabled,
              ]}
              onPress={aumentar}
              disabled={cantidad >= seleccionado.stock}
            >
              <Ionicons name="add" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={agregar}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>AGREGAR</Text>
        </TouchableOpacity>
      </View>

      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </View>
  );
}

// ---------- Estilos ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  headerSafeArea: {
    backgroundColor: COLORS.red,
  },
  header: {
    backgroundColor: COLORS.red,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuButton: {
    width: 28,
  },
  menuButtonSpacer: {
    width: 28,
  },
  headerText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 200, // espacio para que el footer no tape las últimas tarjetas
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  productCard: {
    width: "48%",
    backgroundColor: COLORS.cardDark,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    padding: 10,
    marginBottom: 14,
  },
  productCardSelected: {
    borderColor: COLORS.red,
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: COLORS.cardBorder,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
  },
  productDescription: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    minHeight: 32,
  },
  productStock: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  productPrice: {
    color: COLORS.red,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.cardDark,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  footerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  footerInfo: {
    flex: 1,
    marginRight: 12,
  },
  footerName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  footerSubtotal: {
    color: COLORS.red,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgDark,
    borderRadius: 12,
    padding: 4,
  },
  counterButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  counterButtonDisabled: {
    opacity: 0.4,
  },
  counterValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
    minWidth: 40,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: COLORS.red,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
