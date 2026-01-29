import { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";
import "../Styles/FormularioCredito.css";

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
  const [permisosInputs, setPermisosInputs] = useState({
    pagina: true,
    monto: true,
    interes: true,
    forma_pago: true,
  });
  const [cargandoPermiso, setCargandoPermiso] = useState(true);

  // 🔹 Verificar permisos al cargar la página
  useEffect(() => {
    const verificarPermisos = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const auth_id = sessionData?.session?.user?.id;
        if (!auth_id) {
          setMensajeError("Sesión no válida. Inicia sesión nuevamente.");
          setCargandoPermiso(false);
          return;
        }

        // Lista de páginas/inputs a consultar
        const nombresPaginas = [
          "Renovar",
          "RenovarMonto",
          "RenovarInteres",
          "RenovarFormaPago",
        ];

        const { data: paginasData, error: paginasError } = await supabase
          .from("paginas")
          .select("*")
          .in("nombre", nombresPaginas);

        if (paginasError) throw paginasError;

        // Consultar permisos del usuario
        const { data: permisosData, error: permisosError } = await supabase
          .from("permisos_usuario_pagina")
          .select("pagina_id, estado")
          .eq("auth_id", auth_id);

        if (permisosError) throw permisosError;

        // Armar estado de permisos
        const nuevosPermisos = {
          pagina: true,
          monto: true,
          interes: true,
          forma_pago: true,
        };

        paginasData.forEach((p) => {
          const permiso = permisosData.find((perm) => perm.pagina_id === p.id);
          switch (p.nombre) {
            case "Renovar":
              nuevosPermisos.pagina = permiso ? permiso.estado : true;
              break;
            case "RenovarMonto":
              nuevosPermisos.monto = permiso ? permiso.estado : true;
              break;
            case "RenovarInteres":
              nuevosPermisos.interes = permiso ? permiso.estado : true;
              break;
            case "RenovarFormaPago":
              nuevosPermisos.forma_pago = permiso ? permiso.estado : true;
              break;
          }
        });

        setPermisosInputs(nuevosPermisos);
      } catch (e) {
        console.error("Error verificando permisos:", e);
      }
      setCargandoPermiso(false);
    };

    verificarPermisos();
  }, []);

  const getFechaLocalSinZona = () => {
    const fecha = new Date();
    const offsetMs = fecha.getTimezoneOffset() * 60000;
    const localTime = new Date(fecha.getTime() - offsetMs);
    return localTime.toISOString().slice(0, 19).replace("T", " ");
  };

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

  // 🔹 Traer último monto del crédito al seleccionar cliente
  const obtenerUltimoCredito = async (clienteId) => {
    const { data, error } = await supabase
      .from("creditos")
      .select("monto")
      .eq("cliente_id", clienteId)
      .order("fecha_inicio", { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) {
      return parseFloat(data[0].monto);
    }
    return "";
  };

  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    setBusqueda(cliente.nombre);
    setClientes([]);
    setMensajeError("");
    setMensajeExito("");
    setBloquearFormulario(false);

    // 🔹 Traer último crédito antes de bloquear inputs
    const ultimoMonto = await obtenerUltimoCredito(cliente.id);

    setFormularioCredito({
      monto: ultimoMonto || "",
      interes: 20,
      valor_cuota: "",
      forma_pago: "diario",
    });

    const tieneActivo = await verificarCreditoActivo(cliente.id);
    if (tieneActivo) {
      setMensajeError("Este cliente ya tiene un crédito activo. No puede renovar.");
      setBloquearFormulario(true);
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

    const { data: sessionData } = await supabase.auth.getSession();
    const usuarioId = sessionData?.session?.user?.id;

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
    const fechaVencimiento = getFechaLocalSinZona(
      calcularFechaVencimiento(new Date(), forma_pago)
    );

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
    switch (formaPago) {
      case "diario_24":
        d.setDate(d.getDate() + 24);
        break;
      case "diario_20":
        d.setDate(d.getDate() + 20);
        break;
      case "diario_11":
        d.setDate(d.getDate() + 11);
        break;
      case "semanal":
        d.setDate(d.getDate() + 7);
        break;
      case "quincenal":
        d.setDate(d.getDate() + 15);
        break;
      case "mensual":
        d.setMonth(d.getMonth() + 1);
        break;
      default:
        d.setDate(d.getDate() + 1);
        break;
    }
    return d;
  };

  if (cargandoPermiso) return <p>Cargando permisos...</p>;

  if (!permisosInputs.pagina) {
    return (
      <div className="contenedor-registro">
        <h2>🚫 Acceso bloqueado</h2>
        <p>No tienes permiso para acceder a esta página. Contacta al administrador.</p>
        <button onClick={() => navigate(-1)}>Volver</button>
      </div>
    );
  }

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
          const value = e.target.value;
          setBusqueda(value);
          if (value.trim() === "") setClientes([]);
          else buscarClientes(value);
        }}
        onBlur={() => setTimeout(() => setClientes([]), 150)}
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
          <p><strong>Cliente:</strong> {clienteSeleccionado.nombre}</p>

          <label>Monto:</label>
          <input
            type="number"
            step="0.01"
            value={formularioCredito.monto}
            onChange={(e) => setFormularioCredito(f => ({ ...f, monto: e.target.value }))}
            required
            disabled={!permisosInputs.monto} // 🔹 Bloqueo según permiso
          />

          <label>Interés (%):</label>
          <input
            type="number"
            step="0.01"
            value={formularioCredito.interes}
            onChange={(e) => setFormularioCredito(f => ({ ...f, interes: e.target.value }))}
            disabled={!permisosInputs.interes} // 🔹 Bloqueo según permiso
          />

          <label>Forma de Pago:</label>
          <select
            value={formularioCredito.forma_pago}
            onChange={(e) => setFormularioCredito(f => ({ ...f, forma_pago: e.target.value }))}
            disabled={!permisosInputs.forma_pago} // 🔹 Bloqueo según permiso
          >
            <option value="diario_24">Diario (24 días)</option>
            <option value="diario_20">Diario (20 días)</option>
            <option value="diario_11">Diario (11 días)</option>
            <option value="semanal">Semanal (4 semanas)</option>
            <option value="quincenal">Quincenal (2 semanas)</option>
            <option value="mensual">Mensual (30 días 1 pago)</option>
          </select>

          <button type="submit">Renovar Crédito</button>
        </form>
      )}
    </div>
  );
};

export default RenovarCredito;
