import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1503376780353-7e6692767b70",
      }}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="truck" size={70} color="#FFFFFF" />
            <View style={styles.starsRow}>
              <MaterialCommunityIcons name="star" size={14} color="#FFFFFF" />
              <MaterialCommunityIcons name="star" size={14} color="#FFFFFF" />
              <MaterialCommunityIcons name="star" size={14} color="#FFFFFF" />
            </View>
          </View>

          {/* Título */}
          <View style={styles.titleContainer}>
            <View style={styles.mecanicaTag}>
              <Text style={styles.mecanicaText}>MECÁNICA</Text>
            </View>
            <Text style={styles.alexanderText}>ALEXANDER</Text>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.8}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.primaryButtonText}>Ingresar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.7}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.secondaryButtonText}>
              ¿No tienes cuenta?{" "}
              <Text style={styles.secondaryButtonTextBold}>Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 10, 0.72)",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 50,
  },
  content: {
    alignItems: "center",
  },
  logoBadge: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  titleContainer: {
    alignItems: "center",
  },
  mecanicaTag: {
    backgroundColor: "#C1272D",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  mecanicaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
  },
  alexanderText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 3,
  },
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#E8B923",
    width: "100%",
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
  secondaryButton: {
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: "#CCCCCC",
    fontSize: 14,
  },
  secondaryButtonTextBold: {
    color: "#E8B923",
    fontWeight: "700",
  },
});
