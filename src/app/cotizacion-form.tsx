import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    crearCotizacionConDetalle,
    getCatalogosParaCotizacion,
    type NuevoDetalleItemInput,
} from "../db/cotizacion-workflow";

interface ItemBorrador {
  key: string;
  tipo_item: "Repuesto" | "Servicio";
  id_repuesto: number | null;
  id_servicio: number | null;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export default function CotizacionFormScreen() {
  const router = useRouter();

  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [activos, setActivos] = useState<
    { id_activo: number; label: string }[]
  >([]);
  const [tiposDocumento, setTiposDocumento] = useState<
    { id_tipo_documento: number; nombre: string }[]
  >([]);
  const [repuestos, setRepuestos] = useState<
    { id_repuesto: number; nombre: string; stock_actual: number }[]
  >([]);
  const [servicios, setServicios] = useState<
    { id_servicio: number; nombre: string; precio_referencial: number }[]
  >([]);

  const [idActivo, setIdActivo] = useState<number | null>(null);
  const [idTipoDoc, setIdTipoDoc] = useState<number | null>(null);
  const [fechaEmision, setFechaEmision] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const [tipoItemActual, setTipoItemActual] = useState<"Repuesto" | "Servicio">(
    "Repuesto",
  );
  const [idRepuestoSel, setIdRepuestoSel] = useState<number | null>(null);
  const [idServicioSel, setIdServicioSel] = useState<number | null>(null);
  const [cantidadTxt, setCantidadTxt] = useState<string>("1");
  const [precioTxt, setPrecioTxt] = useState<string>("");

  const [items, setItems] = useState<ItemBorrador[]>([]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [fotoUrlManual, setFotoUrlManual] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const cat = await getCatalogosParaCotizacion();
        setActivos(cat.activos);
        setTiposDocumento(cat.tiposDocumento);
        setRepuestos(cat.repuestos);
        setServicios(cat.servicios);

        if (cat.activos.length > 0) setIdActivo(cat.activos[0].id_activo);
        if (cat.tiposDocumento.length > 0)
          setIdTipoDoc(cat.tiposDocumento[0].id_tipo_documento);
        if (cat.repuestos.length > 0)
          setIdRepuestoSel(cat.repuestos[0].id_repuesto);
        if (cat.servicios.length > 0) {
          setIdServicioSel(cat.servicios[0].id_servicio);
          setPrecioTxt(String(cat.servicios[0].precio_referencial));
        }
      } catch (e) {
        Alert.alert(
          "Error",
          e instanceof Error
            ? e.message
            : "No se pudieron cargar los catálogos.",
        );
      } finally {
        setCargandoCatalogos(false);
      }
    })();
  }, []);

  const seleccionarTipoItem = (tipo: "Repuesto" | "Servicio") => {
    setTipoItemActual(tipo);
    if (tipo === "Servicio" && idServicioSel) {
      const srv = servicios.find((s) => s.id_servicio === idServicioSel);
      if (srv) setPrecioTxt(String(srv.precio_referencial));
    } else if (tipo === "Repuesto") {
      setPrecioTxt("");
    }
  };

  const agregarItem = () => {
    const cantidad = Number(cantidadTxt);
    const precio = Number(precioTxt);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      Alert.alert(
        "Dato inválido",
        "La cantidad debe ser un número entero mayor a 0.",
      );
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      Alert.alert(
        "Dato inválido",
        "Ingresa un precio unitario válido (0 o mayor).",
      );
      return;
    }

    if (tipoItemActual === "Repuesto") {
      const rep = repuestos.find((r) => r.id_repuesto === idRepuestoSel);
      if (!rep) {
        Alert.alert("Falta repuesto", "Selecciona un repuesto.");
        return;
      }
      setItems((prev) => [
        ...prev,
        {
          key: `${Date.now()}-${Math.random()}`,
          tipo_item: "Repuesto",
          id_repuesto: rep.id_repuesto,
          id_servicio: null,
          nombre: `${rep.nombre} (Stock: ${rep.stock_actual})`,
          cantidad,
          precio_unitario: precio,
        },
      ]);
    } else {
      const srv = servicios.find((s) => s.id_servicio === idServicioSel);
      if (!srv) {
        Alert.alert("Falta servicio", "Selecciona un servicio.");
        return;
      }
      setItems((prev) => [
        ...prev,
        {
          key: `${Date.now()}-${Math.random()}`,
          tipo_item: "Servicio",
          id_repuesto: null,
          id_servicio: srv.id_servicio,
          nombre: srv.nombre,
          cantidad,
          precio_unitario: precio,
        },
      ]);
    }

    setCantidadTxt("1");
    if (tipoItemActual === "Repuesto") setPrecioTxt("");
  };

  const eliminarItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const elegirFotoGaleria = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permiso denegado",
          "Permite el acceso a la galería o escribe la ruta/URL de la foto.",
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!res.canceled && res.assets.length > 0) {
        setFotos((prev) => [...prev, res.assets[0].uri]);
      }
    } catch {
      Alert.alert(
        "Aviso",
        "No se pudo abrir la galería; puedes agregar la URL manualmente.",
      );
    }
  };

  const agregarFotoManual = () => {
    const limpia = fotoUrlManual.trim();
    if (!limpia) return;
    setFotos((prev) => [...prev, limpia]);
    setFotoUrlManual("");
  };

  const guardarCotizacion = async () => {
    if (!idActivo || !idTipoDoc) {
      Alert.alert(
        "Campos obligatorios",
        "Selecciona un vehículo/activo y un tipo de documento.",
      );
      return;
    }
    if (items.length === 0) {
      Alert.alert(
        "Sin ítems",
        "Agrega al menos un repuesto o servicio antes de guardar.",
      );
      return;
    }

    const payloadItems: NuevoDetalleItemInput[] = items.map((i) => ({
      tipo_item: i.tipo_item,
      id_repuesto: i.id_repuesto,
      id_servicio: i.id_servicio,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
    }));

    try {
      setGuardando(true);
      const nuevoId = await crearCotizacionConDetalle({
        id_activo: idActivo,
        id_tipo_documento: idTipoDoc,
        fecha_emision: fechaEmision,
        items: payloadItems,
        fotos,
      });
      Alert.alert("Éxito", `Cotización #${nuevoId} registrada.`, [
        {
          text: "Ver detalle",
          onPress: () =>
            router.replace({
              pathname: "/cotizacion-detalle" as never,
              params: { id: String(nuevoId) },
            } as never),
        },
      ]);
    } catch (e) {
      Alert.alert(
        "Error al guardar",
        e instanceof Error ? e.message : "No se pudo guardar la cotización.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const totalEstimado = items.reduce(
    (acc, i) => acc + i.cantidad * i.precio_unitario,
    0,
  );

  if (cargandoCatalogos) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Nueva Cotización</Text>

      <Text style={styles.label}>Vehículo / Activo</Text>
      <View style={styles.selectorList}>
        {activos.map((a) => (
          <Pressable
            key={a.id_activo}
            style={[
              styles.optionBtn,
              idActivo === a.id_activo && styles.optionBtnActive,
            ]}
            onPress={() => setIdActivo(a.id_activo)}
          >
            <Text
              style={[
                styles.optionText,
                idActivo === a.id_activo && styles.optionTextActive,
              ]}
            >
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Tipo de Documento</Text>
      <View style={styles.rowWrap}>
        {tiposDocumento.map((td) => (
          <Pressable
            key={td.id_tipo_documento}
            style={[
              styles.chip,
              idTipoDoc === td.id_tipo_documento && styles.chipActive,
            ]}
            onPress={() => setIdTipoDoc(td.id_tipo_documento)}
          >
            <Text
              style={[
                styles.chipText,
                idTipoDoc === td.id_tipo_documento && styles.chipTextActive,
              ]}
            >
              {td.nombre}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Fecha de Emisión (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={fechaEmision}
        onChangeText={setFechaEmision}
        placeholder="2026-11-24"
      />

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>
          Agregar Ítem (Repuesto o Servicio)
        </Text>

        <View style={styles.rowWrap}>
          <Pressable
            style={[
              styles.chip,
              tipoItemActual === "Repuesto" && styles.chipActive,
            ]}
            onPress={() => seleccionarTipoItem("Repuesto")}
          >
            <Text
              style={[
                styles.chipText,
                tipoItemActual === "Repuesto" && styles.chipTextActive,
              ]}
            >
              Repuesto
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.chip,
              tipoItemActual === "Servicio" && styles.chipActive,
            ]}
            onPress={() => seleccionarTipoItem("Servicio")}
          >
            <Text
              style={[
                styles.chipText,
                tipoItemActual === "Servicio" && styles.chipTextActive,
              ]}
            >
              Servicio
            </Text>
          </Pressable>
        </View>

        {tipoItemActual === "Repuesto" ? (
          <View style={styles.selectorList}>
            {repuestos.map((r) => (
              <Pressable
                key={r.id_repuesto}
                style={[
                  styles.optionBtn,
                  idRepuestoSel === r.id_repuesto && styles.optionBtnActive,
                ]}
                onPress={() => setIdRepuestoSel(r.id_repuesto)}
              >
                <Text
                  style={[
                    styles.optionText,
                    idRepuestoSel === r.id_repuesto && styles.optionTextActive,
                  ]}
                >
                  {r.nombre} (Stock: {r.stock_actual})
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.selectorList}>
            {servicios.map((s) => (
              <Pressable
                key={s.id_servicio}
                style={[
                  styles.optionBtn,
                  idServicioSel === s.id_servicio && styles.optionBtnActive,
                ]}
                onPress={() => {
                  setIdServicioSel(s.id_servicio);
                  setPrecioTxt(String(s.precio_referencial));
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    idServicioSel === s.id_servicio && styles.optionTextActive,
                  ]}
                >
                  {s.nombre} (Ref: S/ {s.precio_referencial.toFixed(2)})
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.twoCols}>
          <View style={styles.col}>
            <Text style={styles.label}>Cantidad</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={cantidadTxt}
              onChangeText={setCantidadTxt}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Precio Unit. (S/)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={precioTxt}
              onChangeText={setPrecioTxt}
              placeholder="0.00"
            />
          </View>
        </View>

        <Pressable style={styles.btnSecundario} onPress={agregarItem}>
          <Text style={styles.btnSecundarioText}>
            + Añadir ítem a la cotización
          </Text>
        </Pressable>

        {items.map((item) => (
          <View key={item.key} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemNombre}>
                [{item.tipo_item}] {item.nombre}
              </Text>
              <Text style={styles.itemSub}>
                {item.cantidad} x S/ {item.precio_unitario.toFixed(2)} = S/{" "}
                {(item.cantidad * item.precio_unitario).toFixed(2)}
              </Text>
            </View>
            <Pressable onPress={() => eliminarItem(item.key)}>
              <Text style={styles.quitarText}>Quitar</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.totalTxt}>
          Total estimado: S/ {totalEstimado.toFixed(2)}
        </Text>
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Fotos de Evidencia (Opcional)</Text>
        <Pressable style={styles.btnSecundario} onPress={elegirFotoGaleria}>
          <Text style={styles.btnSecundarioText}>
            Seleccionar foto de galería
          </Text>
        </Pressable>

        <View style={styles.rowFoto}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={fotoUrlManual}
            onChangeText={setFotoUrlManual}
            placeholder="O pega ruta/URL de imagen..."
          />
          <Pressable style={styles.btnMini} onPress={agregarFotoManual}>
            <Text style={styles.btnMiniText}>Agregar</Text>
          </Pressable>
        </View>

        {fotos.map((f, idx) => (
          <View key={`${f}-${idx}`} style={styles.fotoRow}>
            <Text style={styles.fotoText} numberOfLines={1}>
              {f}
            </Text>
            <Pressable
              onPress={() =>
                setFotos((prev) => prev.filter((_, i) => i !== idx))
              }
            >
              <Text style={styles.quitarText}>Quitar</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        style={[styles.btnGuardar, guardando && { opacity: 0.6 }]}
        disabled={guardando}
        onPress={guardarCotizacion}
      >
        <Text style={styles.btnGuardarText}>
          {guardando ? "Guardando..." : "Guardar Cotización"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#111827",
    marginBottom: 8,
  },
  selectorList: { gap: 6, marginBottom: 8 },
  optionBtn: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
  },
  optionBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  optionText: { fontSize: 13, color: "#374151" },
  optionTextActive: { color: "#1d4ed8", fontWeight: "700" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#1d4ed8" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "#ffffff" },
  sectionBox: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  twoCols: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  btnSecundario: {
    backgroundColor: "#e0e7ff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  btnSecundarioText: { color: "#1e40af", fontWeight: "700", fontSize: 13 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemNombre: { fontSize: 13, fontWeight: "600", color: "#111827" },
  itemSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  quitarText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 8,
  },
  totalTxt: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 10,
    textAlign: "right",
  },
  rowFoto: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  btnMini: {
    backgroundColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnMiniText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  fotoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  fotoText: { flex: 1, fontSize: 12, color: "#4b5563" },
  btnGuardar: {
    backgroundColor: "#15803d",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 18,
  },
  btnGuardarText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
});
