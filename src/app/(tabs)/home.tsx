import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Sidebar from "../../components/Sidebar";
import { getSesion } from "../../db/sesion";

// ---------- Colores institucionales ----------
const COLORS = {
  bgDark: "#121212",
  red: "#C1272D",
  cardGray: "#9A9A9A",
  cardGrayDark: "#2A2A2A",
  yellow: "#E8B923",
  green: "#3DBE5C",
  white: "#FFFFFF",
  textLight: "#EDEDED",
};

// ---------- Tipos ----------
type EstadoVehiculo = "En revisión" | "Listo";

interface VehiculoReciente {
  id: string;
  placa: string;
  modelo: string;
  estado: EstadoVehiculo;
  icono: "truck" | "car";
}

// ---------- Mock data ----------
const NOMBRE_USUARIO = "Alexander";

const resumen = {
  vehiculosActivos: 4,
  cotizacionesPendientes: 2,
};

const vehiculosRecientes: VehiculoReciente[] = [
  {
    id: "1",
    placa: "ABC - 123",
    modelo: "Volvo VNL'18",
    estado: "En revisión",
    icono: "truck",
  },
  {
    id: "2",
    placa: "XYZ - 789",
    modelo: "Volvo VNL'18",
    estado: "Listo",
    icono: "car",
  },
  {
    id: "3",
    placa: "MKL - 456",
    modelo: "Volvo VNL'18",
    estado: "En revisión",
    icono: "car",
  },
];

// ---------- Componentes internos ----------
function EstadoBadge({ estado }: { estado: EstadoVehiculo }) {
  const isListo = estado === "Listo";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: isListo ? COLORS.green : COLORS.yellow },
      ]}
    >
      <Text style={styles.badgeText}>{estado}</Text>
    </View>
  );
}

function VehiculoIcon({ tipo }: { tipo: "truck" | "car" }) {
  const name = tipo === "truck" ? "truck" : "car";
  return <MaterialCommunityIcons name={name} size={40} color={COLORS.bgDark} />;
}

function TarjetaResumen({
  icono,
  numero,
  label,
  iconColor,
}: {
  icono: React.ReactNode;
  numero?: number;
  label: string;
  iconColor: string;
}) {
  return (
    <View style={styles.summaryCard}>
      {numero !== undefined && (
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryBadgeText}>{numero}</Text>
        </View>
      )}
      <View style={styles.summaryIconWrapper}>{icono}</View>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function TarjetaVehiculoReciente({ vehiculo }: { vehiculo: VehiculoReciente }) {
  return (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleIconCircle}>
        <VehiculoIcon tipo={vehiculo.icono} />
      </View>
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehiclePlaca}>{vehiculo.placa}</Text>
        <Text style={styles.vehicleModelo}>{vehiculo.modelo}</Text>
      </View>
      <EstadoBadge estado={vehiculo.estado} />
    </View>
  );
}

// ---------- Pantalla principal ----------
export default function HomeScreen() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sesion = getSesion();
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
          <Text style={styles.headerText}>Bienvenido {sesion?.nombre ?? NOMBRE_USUARIO}</Text>
          <View style={styles.menuButtonSpacer} />
        </View>
      </SafeAreaView>

      

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tarjetas de resumen */}
        <View style={styles.summaryRow}>
          <TarjetaResumen
            icono={
              <MaterialCommunityIcons
                name="car"
                size={38}
                color={COLORS.yellow}
              />
            }
            numero={resumen.vehiculosActivos}
            label={"Vehículos\nActivos"}
            iconColor={COLORS.yellow}
          />
          <TarjetaResumen
            icono={
              <MaterialCommunityIcons
                name="file-document-edit"
                size={38}
                color="#E8672A"
              />
            }
            numero={resumen.cotizacionesPendientes}
            label={"Cotizaciones\nPendientes"}
            iconColor="#E8672A"
          />
          <TarjetaResumen
            icono={
              <Ionicons name="checkmark-sharp" size={40} color={COLORS.green} />
            }
            label={"Vehículos\nListos"}
            iconColor={COLORS.green}
          />
        </View>

        {/* Sección vehículos recientes */}
        <Text style={styles.sectionTitle}>Vehículos Recientes</Text>

        {vehiculosRecientes.map((vehiculo) => (
          <TarjetaVehiculoReciente key={vehiculo.id} vehiculo={vehiculo} />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.cardGray,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 110,
  },
  summaryBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.yellow,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.bgDark,
  },
  summaryIconWrapper: {
    marginBottom: 8,
  },
  summaryLabel: {
    color: COLORS.bgDark,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardGray,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  vehicleIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehiclePlaca: {
    color: COLORS.bgDark,
    fontSize: 18,
    fontWeight: "800",
  },
  vehicleModelo: {
    color: COLORS.bgDark,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    color: COLORS.bgDark,
    fontSize: 12,
    fontWeight: "700",
  },
});
