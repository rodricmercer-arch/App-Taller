import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";

const COLORS = {
  red: "#C1272D",
  yellow: "#E8B923",
  white: "#FFFFFF",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.yellow,
        tabBarInactiveTintColor: COLORS.white,
      }}
    >
      {/* Apunta a home.tsx */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Apunta a cotizacion.tsx */}
      <Tabs.Screen
        name="cotizacion"
        options={{
          title: "Cotizaciones",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />

      {/* Apunta a nuevo.tsx */}
      <Tabs.Screen
        name="nuevo"
        options={{
          title: "Nuevo",
          tabBarIcon: () => (
            <View style={styles.centralButton}>
              <Ionicons name="add" size={30} color={COLORS.red} />
            </View>
          ),
        }}
      />

      {/* Apunta a buscar.tsx */}
      <Tabs.Screen
        name="buscar"
        options={{
          title: "Buscar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />

      {/* Apunta a inventario.tsx */}
      <Tabs.Screen
        name="inventario"
        options={{
          title: "Inventario",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="warehouse"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.red,
    borderTopWidth: 0,
    height: Platform.OS === "ios" ? 88 : 68,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    paddingTop: 10,
    elevation: 0,
  },
  centralButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.yellow,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Platform.OS === "ios" ? 20 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});
