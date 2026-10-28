// src/app/(tabs)/inventario.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
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
  precio: string;
  imagen: string;
}

// ---------- Datos de prueba (dummy data) ----------
const repuestos: Repuesto[] = [
  {
    id: "1",
    nombre: "Filtro de aceite",
    descripcion:
      "Filtro de alto rendimiento compatible con motores diésel de servicio pesado.",
    precio: "S/ 268.35",
    imagen:
      "https://provinnor.pe/wp-content/uploads/2025/09/filtro-de-aceite-sakura-c-65400.webp",
  },
  {
    id: "2",
    nombre: "Pastillas de freno",
    descripcion:
      "Juego delantero de pastillas cerámicas, baja emisión de polvo y mayor durabilidad.",
    precio: "S/ 189.90",
    imagen:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR7QPhG5T-U8zsDdvGVwdDYyys_UIcm8LGdxDiLrIL-A&s=10",
  },
  {
    id: "3",
    nombre: "Batería 12V 100Ah",
    descripcion:
      "Batería libre de mantenimiento para camiones y equipos estacionarios.",
    precio: "S/ 745.00",
    imagen:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdvf2vTRMt2Y9hQym3envw8sJ1hinfKYU0SdOy7SgAVQ&s=10",
  },
  {
    id: "4",
    nombre: "Amortiguador trasero",
    descripcion:
      "Amortiguador hidráulico reforzado, ideal para cargas pesadas y terrenos irregulares.",
    precio: "S/ 412.50",
    imagen:
      "https://cdn.club-magazin.autodoc.de/uploads/sites/11/2020/11/amortiguador-de-coche.jpg",
  },
];

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

function TarjetaRepuesto({ repuesto }: { repuesto: Repuesto }) {
  return (
    <View style={styles.productCard}>
      <ImagenRepuesto uri={repuesto.imagen} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {repuesto.nombre}
        </Text>
        <Text style={styles.productDescription} numberOfLines={3}>
          {repuesto.descripcion}
        </Text>
        <Text style={styles.productPrice}>{repuesto.precio}</Text>
      </View>
    </View>
  );
}

// ---------- Pantalla principal ----------
export default function InventarioScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);

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
          <Text style={styles.headerText}>Inventario</Text>
          <View style={styles.menuButtonSpacer} />
        </View>
      </SafeAreaView>

      <FlatList
        data={repuestos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TarjetaRepuesto repuesto={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Repuestos disponibles</Text>
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />

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
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: COLORS.cardDark,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    marginBottom: 14,
  },
  productImage: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: COLORS.cardBorder,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  productName: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "800",
  },
  productDescription: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  productPrice: {
    color: COLORS.red,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
});
