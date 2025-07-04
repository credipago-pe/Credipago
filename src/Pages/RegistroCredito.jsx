import { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "../styles/FormularioCredito.css";

const RegistroCredito = () => {
  const [ultimoCliente, setUltimoCliente] = useState(null);
  const [monto, setMonto] = useState("");
  const [formaPago, setFormaPago] = useState("diario");
  const navigate = useNavigate();
  const fechaLocal = dayjs().format("YYYY-MM-DD HH:mm:ss"); // sin zona horaria

  // 🔹 Cargar el último cliente registrado
  useEffect(() => {
    const fetchUltimoCliente = async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("id", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error al obtener el último cliente:", error);
      } else if (data.length === 0) {
        console.warn("No hay clientes registrados aún.");
        setUltimoCliente(null);
      } else {
        console.log("Último cliente obtenido:", data[0]);
        setUltimoCliente(data[0]);
      }
    };

    fetchUltimoCliente();
  }, []);

  // 🔹 Registrar crédito con caja_id validado
  const registrarCredito = async (e) => {
    e.preventDefault();

    if (!ultimoCliente) {
      alert("No hay clientes registrados.");
      return;
    }

    const session = await supabase.auth.getSession();
    const auth_id = session.data.session.user.id;

    // Buscar caja activa
    const { data: cajaActiva, error: errorCaja } = await supabase
      .from("cajas")
      .select("id")
      .eq("usuario_auth_id", auth_id)
      .eq("estado", "abierta")
      .order("fecha_apertura", { ascending: false })
      .limit(1)
      .single();

    console.log("Caja activa encontrada:", cajaActiva);

    if (errorCaja || !cajaActiva || !cajaActiva.id) {
      alert("No se encontró una caja activa válida para este usuario.");
      console.error("Error buscando caja:", errorCaja);
      return;
    }

    // Confirmación de valores
    console.log("Valores a insertar:", {
      cliente_id: ultimoCliente?.id,
      monto: parseFloat(monto),
      forma_pago: formaPago,
      fecha_vencimiento: new Date().toISOString().split("T")[0],
      usuario_id: auth_id,
      caja_id: cajaActiva?.id,
    });

    const { data, error } = await supabase.from("creditos").insert([
      {
        cliente_id: ultimoCliente.id,
        monto: parseFloat(monto),
        forma_pago: formaPago,
        fecha_inicio: fechaLocal,
        fecha_vencimiento: fechaLocal,
        usuario_id: auth_id,
        caja_id: cajaActiva.id, // ✅ asegurado
        estado: "Activo", // si tu tabla exige un estado inicial
      },
    ]);

    if (error) {
      console.error("Error al registrar crédito:", JSON.stringify(error, null, 2));
      alert(`Error al registrar crédito: ${error.message}`);
    } else {
      console.log("Crédito registrado con éxito:", data);
      alert("Crédito registrado correctamente");
      setMonto("");
      navigate(-2);
    }
  };

  return (
    <div className="contenedor-registro">
    {/* Botón de volver */}
    <button className="back-button" onClick={() => navigate(-1)}>
      Volver
    </button>

      <h2>Registro de Crédito</h2>
      {ultimoCliente ? (
        <p><strong>ID Cliente:</strong> {ultimoCliente.id} - {ultimoCliente.nombre}</p>
      ) : (
        <p>Cargando último cliente...</p>
      )}

      <form onSubmit={registrarCredito}>
        <label>Monto: $</label>
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
        />

        <label>Forma de Pago:</label>
        <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
          <option value="diario">Diario</option>
          <option value="semanal">Semanal</option>
        </select>

        <button type="submit">Registrar Crédito</button>
      </form>
    </div>
  );
};

export default RegistroCredito;
