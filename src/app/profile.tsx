import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  actualizarPerfil,
  cambiarPassword,
  errorDeCampo,
  getTrabajadorPorId,
  TrabajadorError,
} from "../db/database";
import { actualizarSesion, getSesion } from "../db/sesion";
import type { TipoContrato, TrabajadorPublico } from "../db/types";

type FormPerfil = {
  nombre: string;
  correo: string;
  telefono: string;
  dni: string;
  tipo_contrato: TipoContrato;
};

const aForm = (p: TrabajadorPublico): FormPerfil => ({
  nombre: p.nombre,
  correo: p.correo ?? "",
  telefono: p.telefono ?? "",
  dni: p.dni ?? "",
  tipo_contrato: p.tipo_contrato,
});

const CONTRATOS: TipoContrato[] = ["Fijo", "Subcontratado"];

type CampoProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string | null;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "words";
};

function Campo({ label, value, onChangeText, error, secure, keyboardType, autoCapitalize }: CampoProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        placeholderTextColor="#777"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const sesion = getSesion();

  const [form, setForm] = useState<FormPerfil | null>(null);
  const [original, setOriginal] = useState<FormPerfil | null>(null);
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState(false);

  const [pw, setPw] = useState({ actual: "", nueva: "", confirmar: "" });
  const [tocadosPw, setTocadosPw] = useState<Record<string, boolean>>({});
  const [verPw, setVerPw] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  
  const [mensajePerfil, setMensajePerfil] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [mensajePassword, setMensajePassword] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  useEffect(() => {
    if (!sesion) {
      router.replace("/login" as any);
      return;
    }
    getTrabajadorPorId(sesion.id_trabajador).then((p) => {
      if (p) {
        setForm(aForm(p));
        setOriginal(aForm(p));
      }
    });
  }, []);

  // 👇 MOSTRAR CARGA MIENTRAS OBTIENE LOS DATOS Y EVITAR EL SALTO AL LOGIN
  if (!form || !original) {
    return (
      <View style={{ flex: 1, backgroundColor: "#121212", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#E8B923" />
      </View>
    );
  }

  // ---- Validación en tiempo real (perfil) ----
  const errPerfil = {
    nombre: errorDeCampo("nombre", form.nombre),
    correo: errorDeCampo("correo", form.correo),
    telefono: errorDeCampo("telefono", form.telefono),
    dni: errorDeCampo("dni", form.dni),
  };
  const perfilValido = Object.values(errPerfil).every((e) => e === null);
  const hayCambios = JSON.stringify(form) !== JSON.stringify(original);
  const verErr = (k: keyof typeof errPerfil) => (tocados[k] ? errPerfil[k] : null);

  const setCampo = (k: keyof FormPerfil) => (t: string) => {
    setForm({ ...form, [k]: t });
    setTocados({ ...tocados, [k]: true });
    setMensajePerfil(null);
  };

  // ---- Validación en tiempo real (contraseña) ----
  const errPw = {
    actual: pw.actual === "" ? "Ingresa tu contraseña actual." : null,
    nueva:
      errorDeCampo("passwordNueva", pw.nueva) ??
      (pw.nueva === pw.actual ? "Debe ser distinta a la actual." : null),
    confirmar: pw.confirmar !== pw.nueva ? "Las contraseñas no coinciden." : null,
  };
  const pwValido = Object.values(errPw).every((e) => e === null);
  const verErrPw = (k: keyof typeof errPw) => (tocadosPw[k] ? errPw[k] : null);
  const setCampoPw = (k: keyof typeof pw) => (t: string) => {
    setPw({ ...pw, [k]: t });
    setTocadosPw({ ...tocadosPw, [k]: true });
    setMensajePassword(null);
  };

  const guardarPerfil = async () => {
    if (!sesion) return;
    setGuardando(true);
    setMensajePerfil(null);
    try {
      const p = await actualizarPerfil(sesion.id_trabajador, form);
      actualizarSesion({
        nombre: p.nombre,
        correo: p.correo ?? sesion.correo,
        tipo_contrato: p.tipo_contrato,
      });
      setForm(aForm(p));
      setOriginal(aForm(p));
      setTocados({});
      setMensajePerfil({ tipo: "exito", texto: "Tus datos fueron actualizados." });
    } catch (e) {
      setMensajePerfil({
        tipo: "error",
        texto: e instanceof TrabajadorError ? e.message : "No se pudo guardar. Intenta de nuevo.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const guardarPassword = async () => {
    if (!sesion) return;
    setCambiando(true);
    setMensajePassword(null);
    try {
      await cambiarPassword(sesion.id_trabajador, pw.actual, pw.nueva);
      setPw({ actual: "", nueva: "", confirmar: "" });
      setTocadosPw({});
      setMensajePassword({ tipo: "exito", texto: "Tu contraseña fue cambiada." });
    } catch (e) {
      setMensajePassword({
        tipo: "error",
        texto: e instanceof TrabajadorError ? e.message : "No se pudo cambiar la contraseña.",
      });
    } finally {
      setCambiando(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1503376780353-7e6692767b70" }}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi perfil</Text>

          {/* Datos personales */}
          <Text style={styles.sectionTitle}>Datos personales</Text>
          <Campo label="Nombre" value={form.nombre} onChangeText={setCampo("nombre")}
            error={verErr("nombre")} autoCapitalize="words" />
          <Campo label="E-mail" value={form.correo} onChangeText={setCampo("correo")}
            error={verErr("correo")} keyboardType="email-address" />
          <Campo label="Teléfono" value={form.telefono} onChangeText={setCampo("telefono")}
            error={verErr("telefono")} keyboardType="phone-pad" />
          <Campo label="DNI" value={form.dni} onChangeText={setCampo("dni")}
            error={verErr("dni")} keyboardType="number-pad" />

          <Text style={styles.label}>Tipo de contrato</Text>
          <View style={styles.chipsRow}>
            {CONTRATOS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, form.tipo_contrato === c && styles.chipActive]}
                onPress={() => setForm({ ...form, tipo_contrato: c })}
              >
                <Text style={[styles.chipText, form.tipo_contrato === c && styles.chipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (!perfilValido || !hayCambios || guardando) && styles.buttonDisabled]}
            activeOpacity={0.8}
            disabled={!perfilValido || !hayCambios || guardando}
            onPress={guardarPerfil}
          >
            <Text style={styles.primaryButtonText}>{guardando ? "Guardando..." : "Guardar cambios"}</Text>
          </TouchableOpacity>
          {mensajePerfil && (
            <View style={[styles.banner, mensajePerfil.tipo === "error" ? styles.bannerError : styles.bannerExito]}>
              <Text style={styles.bannerText}>{mensajePerfil.texto}</Text>
            </View>
          )}

          {/* Cambio de contraseña */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Cambiar contraseña</Text>
            <TouchableOpacity onPress={() => setVerPw(!verPw)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={verPw ? "eye-off" : "eye"} size={22} color="#E8B923" />
            </TouchableOpacity>
          </View>
          <Campo label="Contraseña actual" value={pw.actual} onChangeText={setCampoPw("actual")}
            error={verErrPw("actual")} secure={!verPw} />
          <Campo label="Nueva contraseña" value={pw.nueva} onChangeText={setCampoPw("nueva")}
            error={verErrPw("nueva")} secure={!verPw} />
          <Campo label="Confirmar nueva contraseña" value={pw.confirmar} onChangeText={setCampoPw("confirmar")}
            error={verErrPw("confirmar")} secure={!verPw} />

          <TouchableOpacity
            style={[styles.primaryButton, (!pwValido || cambiando) && styles.buttonDisabled]}
            activeOpacity={0.8}
            disabled={!pwValido || cambiando}
            onPress={guardarPassword}
          >
            <Text style={styles.primaryButtonText}>{cambiando ? "Cambiando..." : "Cambiar contraseña"}</Text>
          </TouchableOpacity>
          {mensajePassword && (
            <View style={[styles.banner, mensajePassword.tipo === "error" ? styles.bannerError : styles.bannerExito]}>
              <Text style={styles.bannerText}>{mensajePassword.texto}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(10, 10, 10, 0.75)" },
  scrollContent: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40, flexGrow: 1 },
  backButton: { marginBottom: 8 },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", marginBottom: 24 },
  sectionTitle: { color: "#E8B923", fontSize: 16, fontWeight: "700", marginBottom: 16 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
  },
  inputGroup: { marginBottom: 22 },
  label: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginBottom: 10 },
  input: {
    color: "#FFFFFF",
    fontSize: 15,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "#E8B923",
  },
  inputError: { borderBottomColor: "#FF5A5F" },
  errorText: { color: "#FF5A5F", fontSize: 12, marginTop: 6 },
  chipsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E8B923",
  },
  chipActive: { backgroundColor: "#E8B923" },
  chipText: { color: "#E8B923", fontWeight: "700", fontSize: 14 },
  chipTextActive: { color: "#1A1A1A" },
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
  buttonDisabled: { opacity: 0.4 },
  banner: { borderRadius: 12, padding: 12, marginBottom: 20 },
  bannerExito: { backgroundColor: "rgba(61, 190, 92, 0.15)", borderWidth: 1, borderColor: "#3DBE5C" },
  bannerError: { backgroundColor: "rgba(255, 90, 95, 0.15)", borderWidth: 1, borderColor: "#FF5A5F" },
  bannerText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  primaryButtonText: { color: "#1A1A1A", fontSize: 17, fontWeight: "700" },
});