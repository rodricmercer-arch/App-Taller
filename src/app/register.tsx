import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { crearTrabajador, TrabajadorError } from "../db/database";

export default function RegisterScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleRegister = async () => {
  setCargando(true);
  try {
    await crearTrabajador({
      nombre,
      correo,
      telefono,
      dni,
      password,
      rol: "trabajador",
      tipo_contrato: "Fijo",
    });
    Alert.alert("Cuenta creada", "Ya puedes iniciar sesión.", [
      { text: "OK", onPress: () => router.replace("/login" as any) },
    ]);
  } catch (e) {
    Alert.alert(
      "No se pudo registrar",
      e instanceof TrabajadorError ? e.message : "Ocurrió un error inesperado. Intenta de nuevo.",
    );
  } finally {
    setCargando(false);
  }
};

  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1503376780353-7e6692767b70",
      }}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Registro</Text>

          {/* Logo */}
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="truck" size={50} color="#FFFFFF" />
            <View style={styles.starsRow}>
              <MaterialCommunityIcons name="star" size={11} color="#FFFFFF" />
              <MaterialCommunityIcons name="star" size={11} color="#FFFFFF" />
              <MaterialCommunityIcons name="star" size={11} color="#FFFFFF" />
            </View>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#777"
                value={nombre}
                onChangeText={setNombre}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#777"
                value={correo}
                onChangeText={setCorreo}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#777"
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>DNI</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor="#777"
                value={dni}
                onChangeText={setDni}
                keyboardType="numeric"
                maxLength={8}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholderTextColor="#777"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#E8B923"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Botón Registrarse */}
          <TouchableOpacity
            style={[styles.primaryButton, cargando && { opacity: 0.6 }]}
            activeOpacity={0.8}
            onPress={handleRegister}
            disabled={cargando}
          >
            <Text style={styles.primaryButtonText}> {cargando ? "Creando cuenta..." : "Registrarse"} </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 10, 0.75)",
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    flexGrow: 1,
  },
  backButton: {
    marginBottom: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 28,
  },
  starsRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    color: "#FFFFFF",
    fontSize: 15,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: "#E8B923",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#E8B923",
    paddingBottom: 6,
  },
  passwordInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#E8B923",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#E8B923",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryButtonText: {
    color: "#1A1A1A",
    fontSize: 17,
    fontWeight: "700",
  },
});
