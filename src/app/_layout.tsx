import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { getDb, initDatabase } from "../db/database"; // Ajusta la ruta según dónde esté tu database.ts

const COLORS = {
  red: "#C1272D",
  white: "#FFFFFF",
};

// Solo se monta cuando la BD ya está inicializada, así getDb() no falla.
function DrizzleStudioDev() {
  useDrizzleStudio(getDb());
  return null;
}

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    async function setupDatabase() {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error("Error crítico al inicializar la base de datos:", error);
      }
    }

    setupDatabase();
  }, []);

  // Mientras la base de datos se abre y configura, mostramos un indicador de carga
  if (!isDbReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={COLORS.red} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {__DEV__ && <DrizzleStudioDev />}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Pantallas sueltas fuera del menú inferior */}
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="profile" />
        {/* Carpeta con la barra de navegación inferior */}
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
});
