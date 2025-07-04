import { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/FormularioCredito.css";

const RenovarCredito = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [formularioCredito, setFormularioCredito] = useState({
    monto: "",
    interes: 20,
    valor_cuota: "",
    forma_pago: "diario",
  });
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [bloquearFormulario, setBloquearFormulario] = useState(false);
  const getFechaLocalSinZona = () => {
  const fecha = new Date();
  const offsetMs = fecha.getTimezoneOffset() * 60000;
  const localTime = new Date(fecha.getTime() - offsetMs);
  return localTime.toISOString().slice(0, 19).replace("T", " ");
};


  useEffect(() => {
    if (location.state?.clienteNombre) {
      setBusqueda(location.state.clienteNombre);
      buscarClientes(location.state.clienteNombre);
    }
  }, [location.state]);

  const buscarClientes = async (searchTerm) => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .ilike("nombre", `%${searchTerm}%`);
    if (!error) setClientes(data);
  };

  const verificarCreditoActivo = async (clienteId) => {
    const { data, error } = await supabase
      .from("creditos")
      .select("id")
      .eq("cliente_id", clienteId)
      .eq("estado", "Activo");
    return !error && data.length > 0;
  };

  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    setMensajeError("");
    setMensajeExito("");
    setBloquearFormulario(false);

    const tieneActivo = await verificarCreditoActivo(cliente.id);
    if (tieneActivo) {
      setMensajeError("Este cliente ya tiene un crédito activo. No puede renovar.");
      setBloquearFormulario(true);
    } else {
      setFormularioCredito({
        monto: "",
        interes: 20,
        valor_cuota: "",
        forma_pago: "diario",
      });
    }
  };

  const manejarFormulario = async (e) => {
    e.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (!clienteSeleccionado) {
      setMensajeError("Por favor, selecciona un cliente.");
      return;
    }

    const tieneActivo = await verificarCreditoActivo(clienteSeleccionado.id);
    if (tieneActivo) {
      setMensajeError("Este cliente ya tiene un crédito activo. No se puede renovar.");
      setBloquearFormulario(true);
      return;
    }

    let { monto, interes, forma_pago } = formularioCredito;
    monto = parseFloat(monto) || 0;
    interes = parseFloat(interes) || 0;
    if (monto <= 0) {
      setMensajeError("El monto debe ser mayor que 0.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const usuarioId = session.user.id;

    const { data: cajaActiva, error: errCaja } = await supabase
      .from("cajas")
      .select("id")
      .eq("usuario_auth_id", usuarioId)
      .eq("estado", "abierta")
      .order("fecha_apertura", { ascending: false })
      .limit(1)
      .single();

    if (errCaja || !cajaActiva?.id) {
      setMensajeError("No se encontró caja activa para este usuario.");
      return;
    }

   const fechaInicio = getFechaLocalSinZona();
   const fechaVencimiento = getFechaLocalSinZona(calcularFechaVencimiento(new Date(), forma_pago));


    const { error } = await supabase.from("creditos").insert([
      {
        cliente_id: clienteSeleccionado.id,
        monto,
        interes,
        forma_pago,
        estado: "Activo",
        fecha_inicio: fechaInicio,
        fecha_vencimiento: fechaVencimiento,
        usuario_id: usuarioId,
        caja_id: cajaActiva.id,
      },
    ]);

    if (error) {
      setMensajeError("Error al registrar el nuevo crédito: " + error.message);
    } else {
      setMensajeExito("¡Renovación exitosa!");
      setTimeout(() => navigate("/cobrador"), 2000);
    }
  };

  const calcularFechaVencimiento = (fecha, formaPago) => {
    const d = new Date(fecha);
    if (formaPago === "diario") {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    } else if (formaPago === "semanal") {
      d.setDate(d.getDate() + 7);
    } else if (formaPago === "mensual") {
      d.setMonth(d.getMonth() + 1);
    } else if (formaPago === "quincenal") {
      d.setDate(d.getDate() + 15);
    }
    return d;
  };

  return (
    <div className="contenedor-registro">
      <h2>Renovar Crédito</h2>
      {mensajeError && <p className="error">{mensajeError}</p>}
      {mensajeExito && <p className="exito">{mensajeExito}</p>}

      <input
        type="text"
        placeholder="Buscar cliente..."
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          buscarClientes(e.target.value);
        }}
      />

      <ul className="resultados">
        {clientes.map((c) => (
          <li key={c.id} onClick={() => seleccionarCliente(c)}>
            {c.nombre}
          </li>
        ))}
      </ul>

      {clienteSeleccionado && !bloquearFormulario && (
        <form onSubmit={manejarFormulario}>
          <p>
            <strong>Cliente:</strong> {clienteSeleccionado.nombre}
          </p>

          <label>Monto:</label>
          <input
            type="number"
            step="0.01"
            value={formularioCredito.monto}
            onChange={(e) =>
              setFormularioCredito((f) => ({
                ...f,
                monto: e.target.value,
              }))
            }
            required
          />

          <label>Interés (%):</label>
          <input
            type="number"
            step="0.01"
            value={formularioCredito.interes}
            onChange={(e) =>
              setFormularioCredito((f) => ({
                ...f,
                interes: e.target.value,
              }))
            }
          />

          <label>Forma de Pago:</label>
          <select
            value={formularioCredito.forma_pago}
            onChange={(e) =>
              setFormularioCredito((f) => ({
                ...f,
                forma_pago: e.target.value,
              }))
            }
          >
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>

          <button type="submit">Renovar Crédito</button>
        </form>
      )}
    </div>
  );
};

export default RenovarCredito;
