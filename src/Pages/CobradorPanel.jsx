import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../components/supabaseClient";  // Asegúrate de que esté correctamente configurado
import "../Styles/CobradorPanel.css";
import { useRef } from "react";
import { CheckCircle } from "lucide-react";
import dayjs from "dayjs";
import { FaBars, FaMobileAlt, FaUser, FaBuilding, FaEye, FaSearch, FaBullhorn, FaFilter, FaMoneyBill, FaMoneyBillWave, FaInfoCircle, FaTimes, FaCaretDown, FaSignOutAlt } from "react-icons/fa";
import { calcularTotalRecaudarHoy } from "../components/utils";

const CobradorPanel = () => {
  const [usuarioId, setUsuarioId] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [ordenClientes, setOrdenClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("id");
  const [modalPago, setModalPago] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [montoPago, setMontoPago] = useState(0);
  const [mensaje, setMensaje] = useState(null);
  const [creditos, setCreditos] = useState([]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [submenuClientes, setSubmenuClientes] = useState(false);
  const [submenuOficina, setSubmenuOficina] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clientesConPagoHoy, setClientesConPagoHoy] = useState([]);
  const [soloPagadosHoy, setSoloPagadosHoy] = useState(false);
  const [mostrarConfirmacionRecibo, setMostrarConfirmacionRecibo] = useState(false);
  const [clienteParaRecibo, setClienteParaRecibo] = useState(null);
  const [pagando, setPagando] = useState(false);
  const [pagosHoy, setPagosHoy] = useState([]); // guarda objetos de pago con monto_pagado
  const clientesPagadosHoy = clientesConPagoHoy.length;

  
  const mensajeRef = useRef(null);
  const authId = usuario?.id;

  
  const mostrarToast = () => {
    setMensajeExito("¡Pago registrado con éxito!");
    setTimeout(() => setMensajeExito(""), 3000); // desaparece a los 3s
  };

    const enviarReciboPorWhatsApp = () => {
  const currentMensaje = mensajeRef.current;
  const currentCliente = clienteParaRecibo;

  console.log("📦 clienteParaRecibo:", currentCliente);
  console.log("📨 mensaje desde ref:", currentMensaje);

  const numero = currentCliente?.telefono?.replace(/\D/g, "");
  const texto = currentMensaje?.texto;

  if (!numero || !texto) {
    alert("Falta el número o el mensaje del recibo.");
    return;
  }

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");

  setMostrarConfirmacionRecibo(false);
  setMensaje(null);
  mensajeRef.current = null;
};

  const toggleMenu = () => setMenuAbierto(!menuAbierto);
    const toggleSubmenuClientes = () => {
  setSubmenuClientes((prev) => !prev);
  setSubmenuOficina(false); // cerrar Oficina si abres Clientes
};
    const toggleSubmenuOficina = () => {
  setSubmenuOficina((prev) => !prev);
  setSubmenuClientes(false); // cerrar Clientes si abres Oficina
};
    const navigate = useNavigate();
    const handleMenuToggle = () => setMenuOpen(!menuOpen);

  useEffect(() => {
  const verificarSesion = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUsuario(session.user);
    } else {
      setUsuario(null);
      navigate("/");
    }
  };

  verificarSesion(); // Verifica al montar

  const { data: authListener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (session?.user) {
        setUsuario(session.user);
      } else {
        setUsuario(null);
        navigate("/");
      }
    }
  );

  return () => {
    authListener.subscription.unsubscribe();
  };
}, [navigate]);

useEffect(() => {
    const fetchUsuario = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("❌ Error al obtener usuario:", error.message);
        return;
      }
      setUsuarioId(data.user.id); // ← auth_id
    };

    fetchUsuario();
  }, []);


    useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data: clientesData, error: clientesError } = await supabase
          .from("clientes")
          .select("*")
          .eq("usuario_id", usuarioId);

        if (clientesError) throw clientesError;

        const { data: ordenData, error: ordenError } = await supabase
          .from("cobrador_cliente_orden")
          .select("cliente_id, orden")
          .eq("usuario_id", usuarioId);

        if (ordenError) throw ordenError;

        const ordenMap = new Map(
          ordenData.map((item) => [item.cliente_id, item.orden])
        );

        const clientesConOrden = clientesData
          .map((cliente, index) => ({
            ...cliente,
            orden: ordenMap.get(cliente.id) ?? index + 1000, // default alto si no tiene orden
          }))
          .sort((a, b) => a.orden - b.orden);

        setClientes(clientesConOrden);
        setOrdenClientes(clientesConOrden);
        setClientesFiltrados(clientesConOrden);
      } catch (error) {
        console.error("❌ Error al obtener clientes:", error.message);
      }
    };

    if (usuarioId) fetchClientes(); // solo si ya tenemos el usuario
  }, [usuarioId]);



useEffect(() => {
  const fetchCreditos = async () => {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const { data: creditos, error: errorCreditos } = await supabase
        .from("creditos")
        .select("*");

      if (errorCreditos) throw errorCreditos;

      const { data: pagos, error: errorPagos } = await supabase
        .from("pagos")
        .select("credito_id, fecha_pago,monto_pagado");

      if (errorPagos) throw errorPagos;

      const obtenerAyer = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  return ayer;
};

const contarDiasHabiles = (inicio, fin) => {
  let contador = 0;
  const fecha = new Date(inicio);
  fecha.setHours(0, 0, 0, 0);
  while (fecha <= fin) {
    const diaSemana = fecha.getDay();
    if (diaSemana !== 0) contador++; // excluye domingo
    fecha.setDate(fecha.getDate() + 1);
  }
  return contador;
};

const contarSemanas = (inicio, fin) => {
  let contador = 0;
  const fecha = new Date(inicio);
  fecha.setHours(0, 0, 0, 0);
  while (fecha <= fin) {
    contador++;
    fecha.setDate(fecha.getDate() + 7);
  }
  return contador;
};

const creditosConAtraso = creditos.map((credito) => {
  if (!credito.fecha_inicio || !credito.valor_cuota) {
    return { ...credito, dias_atraso: 0, estado_semaforo: "verde" };
  }

  const fechaInicio = new Date(credito.fecha_inicio);
  fechaInicio.setHours(0, 0, 0, 0);
  const ayer = obtenerAyer();

  // Si el crédito empezó hoy, no hay atraso
  if (fechaInicio > ayer) {
    return { ...credito, dias_atraso: 0, estado_semaforo: "verde" };
  }

  let cuotasEsperadas = 0;

  if (credito.tipo_credito === "semanal") {
    cuotasEsperadas = contarSemanas(fechaInicio, ayer);
  } else {
    cuotasEsperadas = contarDiasHabiles(fechaInicio, ayer);
  }

  // Cuotas pagadas derivadas del saldo
  const totalCuotas = credito.tipo_credito === "semanal" ? 4 : 24;
  const saldoPagado = (credito.saldo_total || (credito.valor_cuota * totalCuotas)) - credito.saldo;
  const cuotasPagadas = Math.floor((saldoPagado / credito.valor_cuota) + 0.0001);

  const atraso = Math.max(0, cuotasEsperadas - cuotasPagadas);

  const estado_semaforo =
    credito.tipo_credito === "semanal"
      ? atraso >= 4
        ? "rojo"
        : atraso > 1
        ? "naranja"
        : "verde"
      : atraso >= 24
        ? "rojo"
        : atraso > 8
        ? "naranja"
        : "verde";

  return {
    ...credito,
    dias_atraso: atraso,
    estado_semaforo,
  };
});

setCreditos(creditosConAtraso);


      
            
    } catch (error) {
      console.error("Error al obtener créditos:", error.message);
    }
  };

  fetchCreditos();
}, []);



  useEffect(() => {
  const obtenerPagosDeHoy = async () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyUTC5 = new Date(hoy.getTime() - 5 * 60 * 60 * 1000); // ajuste por UTC-5
    const isoInicio = hoyUTC5.toISOString().slice(0, 10); // YYYY-MM-DD

    const { data, error } = await supabase
      .from("pagos")
      .select("credito_id, fecha_pago, monto_pagado") // 👈 incluye monto
      .gte("fecha_pago", `${isoInicio} 00:00:00`)
      .lte("fecha_pago", `${isoInicio} 23:59:59`);

    if (error) {
      console.error("Error al obtener pagos del día:", error);
    } else {
      const idsPagadosHoy = data.map(pago => pago.credito_id);
      setClientesConPagoHoy(idsPagadosHoy);

      setPagosHoy(data); // 👈 ahora sí guardamos los pagos del día
    }
  };

  obtenerPagosDeHoy();
}, []);



  useEffect(() => {
  // Estado para controlar carga
  setUsuario(null); // Reinicia usuario al montar

  const { data: authListener } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (session?.user) {
        setUsuario(session.user);
      } else {
        setUsuario(null);
      }
    }
  );
  

  // Por si ya hay sesión activa al montar:
  supabase.auth.getUser().then(({ data }) => {
    if (data?.user) setUsuario(data.user);
  });

  // Limpieza al desmontar
  return () => {
    authListener.subscription.unsubscribe();
  };
  
}, 
[]);
useEffect(() => {
  const checkUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error al obtener usuario:", error.message);
    } else {
      console.log("Usuario obtenido con getUser():", data?.user);
      setUsuario(data?.user || null);
    }
  };

  checkUser();
  }, []);

  const guardarOrdenEnSupabase = async () => {
  if (!usuarioId || ordenClientes.length === 0) return;

  const ordenes = ordenClientes.map((cliente) => ({
    cliente_id: cliente.id,
    usuario_id: usuarioId,
    orden: cliente.orden,
  }));

  const { error } = await supabase
    .from("cobrador_cliente_orden")
    .upsert(ordenes, { onConflict: ['cliente_id', 'usuario_id'] });

  if (error) {
    console.error("❌ Error al guardar orden:", error.message);
  } else {
    console.log("✅ Orden guardada exitosamente");
  }
};

useEffect(() => {
  const filtrados = ordenClientes
    .filter(cliente => {
      const credito = obtenerCreditoDelCliente(cliente.id);
      return credito && credito.saldo > 0;
    })
    .filter(cliente => {
      const nombre = cliente.nombre?.toLowerCase() || "";
      return nombre.includes(busqueda.toLowerCase());
    })
        .sort((a, b) => {
      if (filtro === "nombre") return a.nombre.localeCompare(b.nombre);
      if (filtro === "fecha_pago") {
        const creditoA = obtenerCreditoDelCliente(a.id);
        const creditoB = obtenerCreditoDelCliente(b.id);
        if (creditoA?.fecha_pago && creditoB?.fecha_pago) {
          return new Date(creditoA.fecha_pago) - new Date(creditoB.fecha_pago);
        }
      }
      if (filtro === "color") {
        const creditoA = obtenerCreditoDelCliente(a.id);
        const creditoB = obtenerCreditoDelCliente(b.id);
        const aPagado = clientesConPagoHoy.includes(creditoA?.id);
        const bPagado = clientesConPagoHoy.includes(creditoB?.id);
        return aPagado === bPagado ? 0 : aPagado ? -1 : 1;
      }
      return a.orden - b.orden; // fallback: mantener el orden actual
    });

    console.log("Resultado filtrado:", filtrados.map(c => c.nombre));

  setClientesFiltrados(filtrados);
}, [busqueda, filtro, ordenClientes, creditos, clientesConPagoHoy]);

const handleOrdenChange = (clienteId, nuevoOrden) => {
  const nuevo = parseInt(nuevoOrden);
  if (isNaN(nuevo) || nuevo < 1 || nuevo > ordenClientes.length) return;

  const clienteActual = ordenClientes.find((c) => c.id === clienteId);
  if (!clienteActual) return;

  const sinCliente = ordenClientes.filter((c) => c.id !== clienteId);

  sinCliente.splice(nuevo - 1, 0, clienteActual);

  const actualizados = sinCliente.map((c, i) => ({
    ...c,
    orden: i + 1,
  }));

  setOrdenClientes(actualizados);
  guardarOrdenEnSupabase(); // ⬅️ guarda en Supabase
};


const handleKeyDown = (e, clienteId, nuevoOrden) => {
  if (e.key === "Enter") {
    handleOrdenChange(clienteId, nuevoOrden);
  }
};

  const obtenerCreditoDelCliente = (clienteId) => {
    return creditos.find(credito => credito.cliente_id === clienteId && credito.estado !== "cancelado");
  };

  const abrirModalPago = (cliente) => {
  const credito = obtenerCreditoDelCliente(cliente.id);
  if (credito) {
    setMontoPago(credito.valor_cuota || 0); // Usamos el valor de la cuota del crédito activo
  } else {
    setMontoPago(0);
  }
  setClienteSeleccionado(cliente);
  setModalPago(true);
};


  const cerrarModalPago = () => {
    setModalPago(false);
    setClienteSeleccionado(null);
  };

  const registrarPago = async (tipoPago) => {
  if (pagando) return; // 🚫 Evita doble clic
  setPagando(true);    // ⏳ Bloquea el botón

  if (!clienteSeleccionado) {
    setPagando(false);
    return;
  }

  const credito = obtenerCreditoDelCliente(clienteSeleccionado.id);
  if (!credito) {
    alert("No se encontró un crédito para este cliente.");
    setPagando(false);
    return;
  }

  if (clienteSeleccionado.saldo <= 0) {
    alert("El saldo del cliente ya ha sido saldado. No se pueden registrar más pagos.");
    setPagando(false);
    return;
  }

  if (montoPago <= 0 || isNaN(montoPago)) {
    alert("Ingrese un monto válido.");
    setPagando(false);
    return;
  }

  if (montoPago > credito.saldo) {
    alert(`El monto ingresado (${montoPago}) excede el saldo pendiente (${credito.saldo}).`);
    setPagando(false);
    return;
  }

  const fechaPago = new Date();
  const fechaPagoUTC5 = new Date(fechaPago.getTime() - (5 * 60 * 60 * 1000));
  const fechaPagoFormatted = fechaPagoUTC5.toISOString().slice(0, 19).replace("T", " ");

  try {
    const { error } = await supabase.from("pagos").insert([{
      credito_id: credito.id,
      metodo_pago: tipoPago.toLowerCase(),
      monto_pagado: Number(parseFloat(montoPago).toFixed(2)),
      fecha_pago: fechaPagoFormatted,
      usuario_id: usuario?.id,
    }]);

    if (error) {
      console.error("❌ Error al registrar pago:", error);
      setMensaje({ tipo: "error", texto: "Error al registrar el pago." });
      setPagando(false); // 🔓 Desbloquea si falla
      return;            // 👈 Importante, salimos
    }

    // ✅ Éxito: muestra mensaje y desbloquea inmediatamente
    setMensaje({ tipo: "pago-exito", texto: "Pago registrado correctamente." });
    setPagando(false); // 🔓 Ya puedes registrar otro pago (mismo u otro cliente)

    // (opcional) Cierra el modal después de mostrar el mensaje
    cerrarModalPago();

    // ✅ Actualiza la lista de pagos (esto recalcula automáticamente totalPagadoHoy)
  setPagosHoy((prev) => [
    ...prev,
    {
      monto_pagado: Number(montoPago),
      fecha_pago: fechaPagoFormatted,
      credito_id: credito.id,
      usuario_id: usuario?.id,
    },
  ]);


    // ✅ Marcar cliente con pago hoy
    setClientesConPagoHoy((prev) => [...new Set([...prev, credito.id])]);


    // ✅ Actualizar saldo en memoria (redondeo y tope en 0)
    const nuevoSaldo = Math.max(0, Number((credito.saldo - Number(montoPago)).toFixed(2)));
    setCreditos((prevCreditos) =>
      prevCreditos.map((c) => (c.id === credito.id ? { ...c, saldo: nuevoSaldo } : c))
    );

    

    // 👇 Generar mensaje del recibo
    const montoCredito = Number(credito.monto).toFixed(2);
    const saldoAnterior = Number(credito.saldo).toFixed(2);
    const saldoActual = nuevoSaldo.toFixed(2);
    const cuotasPendientes = Math.max(
      0,
      Math.ceil(nuevoSaldo / Number(credito.valor_cuota || 1))
    );
    const metodo = tipoPago.toUpperCase();
    // Asegúrate de tener importado dayjs. Si no, cambia esta línea por tu formateo preferido.
    const fechaPagoRecibo = dayjs ? dayjs(fechaPagoFormatted).format("DD/MM/YYYY") : fechaPagoFormatted;

    const mensajeRecibo = `            🧾 RECIBO DE PAGO            
----------------------------------------
Cliente: ${clienteSeleccionado.nombre}
Crédito #: ${credito.id}
Fecha:   ${fechaPagoRecibo}
Monto del crédito:  $${montoCredito}
----------------------------------------
Saldo anterior:     $${saldoAnterior}
Pago realizado:     $${Number(montoPago).toFixed(2)}
Saldo actual:       $${saldoActual}
Cuotas restantes:   ${cuotasPendientes}
Método de pago:     ${metodo}
----------------------------------------
¡Gracias por su pago puntual!`;

    // 🧠 Guardar mensaje y cliente en refs/estado
    mensajeRef.current = { tipo: "recibo", texto: mensajeRecibo };
    setClienteParaRecibo(clienteSeleccionado);

    // ⏳ Breve confirmación de recibo
    setTimeout(() => {
      setMensaje(null); // Oculta toast
      setMostrarConfirmacionRecibo(true); // Muestra confirmación
    }, 700);

  } catch (err) {
    console.error("❌ Error inesperado:", err);
    setMensaje({ tipo: "error", texto: "Ocurrió un error inesperado." });
    setPagando(false);
  }
};

 const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error al cerrar sesión:", error.message);
  } else {
    navigate("/"); // Redirige al login después del logout
  }
};
useEffect(() => {
  if (!usuario) return;

  let watchId;

  // Función para actualizar ubicación en Supabase
  const actualizarUbicacion = async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    if (usuario?.id) {
  const { error } = await supabase
    .from("usuarios")
    .update({
      latitud: lat,
      longitud: lon,
      ultima_actualizacion: new Date().toISOString(),
      equipo: navigator.userAgent

    })
    .eq("auth_id", usuario.id); // 👈 cláusula obligatoria

  if (error) console.error("Error actualizando ubicación:", error);
}
  };

  if (navigator.geolocation) {
    // Pide permiso y observa cambios en ubicación
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        actualizarUbicacion(pos);
      },
      (err) => {
        console.warn("Error al obtener ubicación:", err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  } else {
    console.warn("Geolocalización no soportada por este navegador.");
  }

  return () => {
    if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
  };
}, [usuario]);

useEffect(() => {
  if (mensaje?.tipo === "recibo") {
    console.log("✅ mensaje actualizado listo para mostrar:", mensaje);
    setMostrarConfirmacionRecibo(true);
  }
}, [mensaje]);

  // ==== Totales para las cards (calculados en front)
  const clientesActivos = creditos.filter(c => c.estado !== "cancelado" && Number(c.saldo) > 0).length;
  const totalRecaudarHoy = calcularTotalRecaudarHoy(creditos);
  const totalPagadoHoy = pagosHoy.reduce((sum, p) => sum + Number(p.monto_pagado || 0), 0);
  const pendienteRecaudar = totalRecaudarHoy - totalPagadoHoy;

  // Logs útiles para debugging
  useEffect(() => {
    console.log("[CobradorPanel] creditos:", creditos.length, creditos);
    console.log("[CobradorPanel] pagosHoy:", pagosHoy.length, pagosHoy);
    console.log("[CobradorPanel] clientesConPagoHoy:", clientesConPagoHoy);
    console.log("totales -> clientesActivos:", clientesActivos, " totalRecaudarHoy:", totalRecaudarHoy, " totalPagadoHoy:", totalPagadoHoy);
  }, [creditos, pagosHoy, clientesConPagoHoy, totalRecaudarHoy, totalPagadoHoy]);

const generarMensaje = (cliente, credito, tipo) => {
  if (!cliente || !credito) return "";

  const nombre = cliente.nombre;
  const saldo = credito.saldo?.toFixed(2) ?? "0.00";
  const valorCuota = credito.valor_cuota?.toFixed(2) ?? "0.00";
  const cuotasPendientes = Math.ceil(credito.saldo / credito.valor_cuota);
  const fechaVencimiento = dayjs(credito.fecha_vencimiento).format("DD/MM/YYYY");

  if (tipo === "recordatorio") {
    return `Hola, ${nombre},!!! 📢
    
Le recordamos pagar su cuota: $${valorCuota},
Saldo pendiente: $${saldo}.
Cuotas restantes: ${cuotasPendientes} de ${credito.cuotas}
Crédito vence el: ${fechaVencimiento}
 
Por favor, no olvide realizar su pago hoy. ¡Gracias! 🙌`;
  }

  return "";
};
  

  return (
    <div className="panelC-container">
    {mensaje && mensaje.tipo === "pago-exito" && (
      <div className="toast-exito">
        <div className="toast-contenido">
          <span className="chulo">✔️</span>
          <span>{mensaje.texto}</span>
        </div>
      </div>
    )}
      <div className="content">
       <div className="usuario-logueado">
  {usuario ? (
    <p>ID usuario: {usuario.id}</p>
  ) : (
    <p>No hay usuario logueado</p>
  )}
</div>

        <h2>Panel de Cobrador</h2>
        <button onClick={() => navigate("/")}className="btn-ir-panel"title="Volver al Panel Admi">
      <FaSignOutAlt />
      </button>
  
{/* Botón para abrir/cerrar el menú */}
<button className="btn-menu" onClick={toggleMenu} aria-label="Abrir menú">
  {menuAbierto ? <FaTimes className="icon-menu" /> : <FaBars className="icon-menu" />}
</button>

{/* Menú tipo overlay */}
{menuAbierto && (
  <div className="overlay-menu">
    <nav className="menu-overlay-flex">
  <div className="menu-row">
    <div className="menu-col izquierda">
      {/* CLIENTES */}
      <div className="menu-item submenu-container">
        <button onClick={toggleSubmenuClientes} className="submenu-toggle">
          <FaUser className="icon" /> Clientes <FaCaretDown className="icon-caret" />
        </button>
        {submenuClientes && (
          <div className="submenu-flex">
            <Link to="/registrocliente" onClick={toggleMenu}>Crear Cliente</Link>
            <Link to="/renovar" onClick={toggleMenu}>Renovar Crédito</Link>
            <Link to="/clientescancelados" onClick={toggleMenu}>Cancelados</Link>
            <Link to="/clientescancelados" onClick={toggleMenu}>Buscar Cliente</Link>
          </div>
        )}
      </div>
    </div>

    <div className="menu-col derecha">
      {/* OFICINA */}
      <div className="menu-item submenu-container">
        <button onClick={toggleSubmenuOficina} className="submenu-toggle">
          <FaBuilding className="icon" /> Oficina <FaCaretDown className="icon-caret" />
        </button>
        {submenuOficina && (
          <div className="submenu-flex">
            <Link to="/pagos" onClick={toggleMenu}>Pagos</Link>
            <Link to="/ventas" onClick={toggleMenu}>Ventas</Link>
            <Link to="/gastos" onClick={toggleMenu}>Gastos</Link>
            <Link to="/liquidacion" onClick={toggleMenu}>Liquidación</Link>
            <Link to={`/admin/resumen/${authId}`} className="menu-link">Resumen</Link>
          </div>
        )}
      </div>
    </div>
  </div>

  <div className="menu-footer">
  </div>
</nav>
  </div>
)}

{/* ======= RESUMEN EN TARJETAS ======= */}
        <div className="info-dashboard">
        <div className="card-info clientes">
            <h4>Activos / Pagados</h4>
            <p>{clientesActivos} / {clientesPagadosHoy}</p>
          </div>
          <div className="card-info total">
            <h4>Total a Recaudar</h4>
            <p>${totalRecaudarHoy.toFixed(2)}</p>
          </div>
          
          <div className="card-info recaudado">
            <h4>Recaudado Hoy</h4>
            <p>${totalPagadoHoy.toFixed(2)}</p>
          </div>
        </div>

        <div className="filtro-busqueda">
          <div className="busqueda">
            <FaSearch className="icono-busqueda" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
  
          <div className="filtro">
           <button
  className="filtro-btn"
  onClick={() =>setFiltro(filtro === "color" ? "nombre": filtro === "nombre"? "id": "color")}>

  <FaFilter />{" "}
  {filtro === "color"
    ? "Ordenar por Nombre"
    : filtro === "nombre"
    ? "Ordenar por ruta"
    : "Ordenar por pagados"}
</button>


          </div>
        </div>
  
        <div className="tablaC-container">
          <table className="tablaC-cobros">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Nombre Cliente</th>
                <th>Fecha Inic-Venc.</th>
                <th>Valor Cuota </th>
                <th>Saldo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
  {clientesFiltrados.map((cliente) => {
    const credito = obtenerCreditoDelCliente(cliente.id);
    if (!credito) return null;

    return (
      <tr key={cliente.id} className={clientesConPagoHoy.includes(credito.id) ? "fila-pagada" : ""}>
        <td>
          <input
            type="number"
            className="input-orden"
            value={cliente.orden}
            onChange={(e) => {
              const nuevoValor = e.target.value;
              const copia = ordenClientes.map((c) =>
                c.id === cliente.id ? { ...c, orden: nuevoValor } : c
              );
              setOrdenClientes(copia);
            }}
            onKeyDown={(e) => handleKeyDown(e, cliente.id, cliente.orden)}
            />

       <a
      className="btn-msj"
      onClick={() => {
        const mensaje = generarMensaje(cliente, credito, "recordatorio");
        const url = `https://wa.me/${cliente.telefono}?text=${encodeURIComponent(
          mensaje
        )}`;
        window.open(url, "_blank");
      }}
    >
      <FaBullhorn size={14} />
    </a>
        </td>
        <td>{cliente.nombre}</td>
        <td>
          <div>{new Date(credito.fecha_inicio).toLocaleDateString()}</div>
          <div
            style={{
              color:
                new Date(credito.fecha_vencimiento).setHours(0, 0, 0, 0) <=
                new Date().setHours(0, 0, 0, 0)
                  ? "red"
                  : "black",
            }}
          >
            {new Date(credito.fecha_vencimiento).toLocaleDateString()}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "4px",
            }}
          >
            <span style={{ fontSize: "12px" }}>{credito.dias_atraso} días</span>
            <span
              className={`circulo ${
                credito.dias_atraso <= 5
                  ? "verde"
                  : credito.dias_atraso <= 15
                  ? "naranja"
                  : credito.dias_atraso < 16
                  ? "rojo"
                  : "rojo vencido"
              }`}
            />
          </div>
        </td>
        <td>${credito.valor_cuota}</td>
        <td>${credito.saldo}</td>
        <td>
          <button className="btn-pagar" onClick={() => abrirModalPago(cliente)}>
            <FaMoneyBillWave /> Pago
          </button>
           {/* Contenedor para agrupar Ver + Notificar */}
  <div className="detalle-actions">
    <Link to={`/clientedetalle/${cliente.id}`} className="btn-detalle">
      <FaEye size={16} /> Ver...
    </Link>
  </div>
        </td>
      </tr>
    );
  })}
</tbody>


          </table>
        </div>
  
       {modalPago && (
  <div className="modal-pago">
    <div className="modal-pagocontenido">
      <button className="cerrar-modal" onClick={cerrarModalPago}>
        <FaTimes />
      </button>
      <h3>Registrar Pago</h3>
      <p>Cliente: {clienteSeleccionado?.nombre}</p>

      <label htmlFor="montoPago">Valor a Pagar:</label>
      <input
        id="montoPago"
        type="number"
        min="1"
        placeholder="Ingrese monto"
        value={montoPago || ''}
        onChange={(e) => setMontoPago(e.target.value)}
        className="input-pago"
      />
              <div className="botones-pago">
              <button onClick={() => registrarPago("Efectivo")} className="btn-pago efectivo"
              disabled={pagando}>
             
              <FaMoneyBillWave className="icono" /> Efectivo</button>
              <button onClick={() => registrarPago("Deposito")} className="btn-pago yape"
              disabled={pagando}>
              <FaMobileAlt className="icono" /> Yape
              </button>
              </div>
            </div>
          </div>
        )}

        {mostrarConfirmacionRecibo && (
  <div className="modalRecibo">
    <div className="modalRecibo-contenido">
      <h3>¿Enviar recibo de pago?</h3>
  
      <p>Nombre: {clienteParaRecibo?.nombre}</p>
      <p>Telefono: {clienteParaRecibo?.telefono}</p>
      <div className="seleccion">
    
        <button className="confirmar" onClick={enviarReciboPorWhatsApp}>
  Sí, enviar
</button>

        <button
          className="cerrar"
          onClick={() => setMostrarConfirmacionRecibo(false)}>No, cerrar
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
  
  };

  export default CobradorPanel;