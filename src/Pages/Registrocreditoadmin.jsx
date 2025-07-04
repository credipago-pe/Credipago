import { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient"; // Asegúrate de importar Supabaseimport { useNavigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "../styles/FormularioCredito.css";

const RegistroCreditoadmin = () => {
  const [ultimoCliente, setUltimoCliente] = useState(null);
  const [monto, setMonto] = useState("");
  const [formaPago, setFormaPago] = useState("diario");
  const navigate = useNavigate(); // Hook de navegación

  // 🔹 Cargar el último cliente registrado en Supabase
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
        setUltimoCliente(data[0]); // ✅ Actualiza el estado correctamente
      }
    };

    fetchUltimoCliente();
  }, []);

  // 🔹 Función para registrar el crédito
  const registrarCredito = async (e) => {
    e.preventDefault();

    if (!ultimoCliente) {
      alert("No hay clientes registrados.");
      return;
    }

    const session = await supabase.auth.getSession();
    const usuarioId = localStorage.getItem("auth_id_cobrador_actual");

    const { data, error } = await supabase.from("creditos").insert([
      {
        cliente_id: ultimoCliente.id,
        monto: parseFloat(monto),
        forma_pago: formaPago,
        fecha_vencimiento: new Date().toISOString().split("T")[0],
        usuario_id: usuarioId, // <-- Asociar el crédito al usuario
      },
    ]);

    if (error) {
      console.error("Error al registrar crédito:", error);
      alert(`Error al registrar crédito: ${error.message}`);
    } else {
      console.log("Crédito registrado con éxito:", data);
      alert("Crédito registrado correctamente");
      setMonto(""); // ✅ Limpia el campo después del registro
      navigate(-2); // 🔹 Volver automáticamente a la página anterior
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

export default RegistroCreditoadmin;
