import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { cerrarSesion, esAdmin, getSesion } from "../db/sesion";

const COLORS = {
  bgDark: "#121212",
  red: "#C1272D",
  yellow: "#E8B923",
  white: "#FFFFFF",
  textLight: "#EDEDED",
};

const SIDEBAR_WIDTH = 280;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const router = useRouter();
  const sesion = getSesion();
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -SIDEBAR_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const irAPerfil = () => {
    onClose();
    router.push("/profile" as any);
  };

  const irAGestionTrabajadores = () => {
    onClose();
    router.push("/admin" as any);
  };

  const salir = () => {
    cerrarSesion();
    onClose();
    router.replace("/login" as any);
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents={visible ? "auto" : "none"}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <View style={styles.panelHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={COLORS.bgDark} />
          </View>
          <Text style={styles.nombre}>{sesion?.nombre ?? "Usuario"}</Text>
          <Text style={styles.subtitulo}>Taller Alexander</Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.item} onPress={irAPerfil}>
          <Ionicons name="person-circle-outline" size={22} color={COLORS.white} />
          <Text style={styles.itemText}>Mi Perfil</Text>
        </TouchableOpacity>

        {esAdmin() && (
          <TouchableOpacity style={styles.item} onPress={irAGestionTrabajadores}>
            <Ionicons name="people-outline" size={22} color={COLORS.yellow} />
            <Text style={styles.itemText}>Gestión de Trabajadores</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.item} onPress={salir}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.red} />
          <Text style={[styles.itemText, { color: COLORS.red }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.bgDark,
    paddingTop: 60,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  panelHeader: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  nombre: { color: COLORS.white, fontSize: 17, fontWeight: "700" },
  subtitulo: { color: COLORS.textLight, fontSize: 13, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#2A2A2A", marginBottom: 12 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  itemText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
});