import { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";
import "../Styles/FormularioCredito.css";

const RegistroCredito = () => {
  const [cliente, setCliente] = useState(null);
  const [monto, setMonto] = useState("");
  const [interes, setInteres] = useState(20); // 💰 interés por defecto 20%
  const [formaPago, setFormaPago] = useState("diario_24");
  const [mensaje, setMensaje] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const clienteId = location.state?.clienteId;
  const returnTo = location.state?.returnTo;
  

  // 🔹 Función para obtener fecha local sin zona horaria
  const getFechaLocalSinZona = () => {
    const fecha = new Date();
    const offsetMs = fecha.getTimezoneOffset() * 60000;
    const localTime = new Date(fecha.getTime() - offsetMs);
    return localTime.toISOString().slice(0, 19).replace("T", " ");
  };

  // Cargar el cliente concreto que originó este registro de crédito.
  useEffect(() => {
    const fetchCliente = async () => {
      if (!clienteId) {
        setMensaje("No se recibió el ID del cliente. Regresa al registro de cliente.");
        return;
      }

      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre")
        .eq("id", clienteId)
        .single();

      if (error) {
        console.error("Error al obtener el cliente:", error);
        setMensaje("No se pudo cargar el cliente seleccionado.");
      } else {
        setCliente(data);
      }
    };

    fetchCliente();
  }, [clienteId]);

  // 🔹 Registrar el crédito en Supabase
  const registrarCredito = async (e) => {
  e.preventDefault();

  // Evitar múltiples clics mientras se procesa el crédito
  if (registrando) return;

  setRegistrando(true);
  setMensaje("");

  try {
    if (!cliente) {
      alert("No se recibió un cliente válido para este crédito.");
      return;
    }

    if (!monto || parseFloat(monto) <= 0) {
      alert("El monto debe ser mayor que 0.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const usuarioId = session?.user?.id;

    if (!usuarioId) {
      alert("No se pudo identificar al usuario.");
      return;
    }

    // Buscar caja activa del cobrador
    const { data: cajaActiva, error: errorCaja } = await supabase
      .from("cajas")
      .select("id")
      .eq("usuario_auth_id", usuarioId)
      .eq("estado", "abierta")
      .order("fecha_apertura", { ascending: false })
      .limit(1)
      .single();

    if (errorCaja || !cajaActiva?.id) {
      alert("No se encontró una caja activa para este usuario.");
      console.error("Error buscando caja:", errorCaja);
      return;
    }

    const fechaInicio = getFechaLocalSinZona();

    // Insertar el crédito
    const { data, error } = await supabase
      .from("creditos")
      .insert([
        {
          cliente_id: cliente.id,
          monto: parseFloat(monto),
          interes: parseFloat(interes),
          forma_pago: formaPago,
          fecha_inicio: fechaInicio,
          usuario_id: usuarioId,
          caja_id: cajaActiva.id,
          estado: "Activo",
        },
      ])
      .select();

    if (error) {
      console.error("Error al registrar crédito:", error);
      alert("Error al registrar crédito: " + error.message);
      return;
    }

    console.log("Crédito creado:", data);

    alert("Crédito registrado correctamente ✅");

    setMonto("");
    setInteres(20);
    setFormaPago("diario_24");

    navigate(returnTo || `/clientedetalle/${cliente.id}`);

  } catch (error) {
    console.error("Error inesperado:", error);
    alert("Ocurrió un error al registrar el crédito.");
  } finally {
    // Siempre liberar el bloqueo
    setRegistrando(false);
  }
};

  return (
    <div className="contenedor-registro">
      <button className="back-button" onClick={() => navigate(-1)}>
        Volver
      </button>

      <h2>Registrar Crédito</h2>

      {cliente ? (
        <p>
          <strong>Cliente:</strong> {cliente.nombre} (ID: {cliente.id})
        </p>
      ) : (
        <p>{mensaje || "Cargando cliente..."}</p>
      )}

      <form onSubmit={registrarCredito}>
        <label>Monto (S/):</label>
        <input
          type="number"
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
        />

        <label>Interés (%):</label>
        <input
          type="number"
          step="0.01"
          value={interes}
          onChange={(e) => setInteres(e.target.value)}
          required
        />

        <label>Forma de Pago:</label>
        <select
          value={formaPago}
          onChange={(e) => setFormaPago(e.target.value)}
        >
          <option value="diario_24">Diario (24 días)</option>
          <option value="diario_25">Diario (25 días)</option>
          <option value="diario_20">Diario (20 días)</option>
          <option value="diario_11">Diario (11 días)</option>
          <option value="semanal">Semanal (4 semanas)</option>
          <option value="quincenal">Quincenal (2 semanas)</option>
          <option value="mensual">Mensual (1 mes)</option>
        </select>

        <button type="submit" disabled={registrando || !cliente}>
  {registrando ? "Registrando crédito..." : "Registrar Crédito"}
</button>
      </form>

      {mensaje && <p className="info">{mensaje}</p>}
    </div>
  );
};

export default RegistroCredito;
