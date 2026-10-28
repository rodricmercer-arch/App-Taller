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
import { autenticarTrabajador } from "../db/database";
import { iniciarSesion } from "../db/sesion";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
  const r = await autenticarTrabajador(email, password);
  if (!r.ok) {
    Alert.alert(
      "Error",
      r.motivo === "USUARIO_INACTIVO"
        ? "Tu usuario está inactivo."
        : "Correo o contraseña incorrectos.",
    );
    return;
  }
  iniciarSesion(r.usuario);
  router.replace("/(tabs)/home" as any);
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

          <Text style={styles.headerTitle}>Inicio de sesión</Text>

          {/* Logo */}
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="truck" size={60} color="#FFFFFF" />
            <View style={styles.starsRow}>
              <MaterialCommunityIcons name="star" size={12} color="#FFFFFF" />
              <MaterialCommunityIcons name="star" size={12} color="#FFFFFF" />
              <MaterialCommunityIcons name="star" size={12} color="#FFFFFF" />
            </View>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder=""
                placeholderTextColor="#777"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder=""
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

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botón Ingresar */}
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={handleLogin}
          >
            <Text style={styles.primaryButtonText}>Ingresar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.registerLinkText}>
              ¿No tienes cuenta?{" "}
              <Text style={styles.registerLinkBold}>Registrarse</Text>
            </Text>
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
    marginBottom: 24,
  },
  logoBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 36,
  },
  starsRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    color: "#FFFFFF",
    fontSize: 15,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "#E8B923",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#E8B923",
    paddingBottom: 8,
  },
  passwordInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  forgotPassword: {
    marginTop: 4,
  },
  forgotPasswordText: {
    color: "#E8B923",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  primaryButton: {
    backgroundColor: "#E8B923",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 20,
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
  registerLink: {
    alignItems: "center",
  },
  registerLinkText: {
    color: "#CCCCCC",
    fontSize: 14,
  },
  registerLinkBold: {
    color: "#E8B923",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
