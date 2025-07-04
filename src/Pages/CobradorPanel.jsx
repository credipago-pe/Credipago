import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../components/supabaseClient";  // Asegúrate de que esté correctamente configurado
import "../styles/CobradorPanel.css";
import { CheckCircle } from "lucide-react";
import { FaBars, FaMobileAlt, FaUser, FaBuilding, FaEye, FaSearch, FaChevronDown, FaFilter, FaMoneyBill, FaMoneyBillWave, FaInfoCircle, FaTimes, FaCaretDown, FaSignOutAlt } from "react-icons/fa";



const CobradorPanel = () => {
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("nombre");
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
  
  const mostrarToast = () => {
    setMensajeExito("¡Pago registrado con éxito!");
    setTimeout(() => setMensajeExito(""), 3000); // desaparece a los 3s
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
    const fetchClientes = async () => {
      try {
        const { data, error } = await supabase.from("clientes").select("*");
        if (error) throw error;
        setClientes(data || []);
        setClientesFiltrados(data || []);
      } catch (error) {
        console.error("Error al obtener clientes:", error.message);
      }
    };
    fetchClientes();
  }, []);

  useEffect(() => {
    const fetchCreditos = async () => {
      try {
        const { data, error } = await supabase.from("creditos").select("*");
        if (error) throw error;
        setCreditos(data || []);
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
    const isoInicio = hoyUTC5.toISOString().slice(0, 10); // formato YYYY-MM-DD

    const { data, error } = await supabase
      .from("pagos")
      .select("credito_id, fecha_pago")
      .gte("fecha_pago", `${isoInicio} 00:00:00`)
      .lte("fecha_pago", `${isoInicio} 23:59:59`);

    if (error) {
      console.error("Error al obtener pagos del día:", error);
    } else {
      const idsPagadosHoy = data.map(pago => pago.credito_id);
      setClientesConPagoHoy(idsPagadosHoy);
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


  useEffect(() => {
    const clientesFiltrados = clientes
      .filter(cliente => {
        const credito = obtenerCreditoDelCliente(cliente.id);
        return credito && credito.saldo > 0; // Solo clientes con crédito activo
      })
      .filter(cliente =>
        cliente.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
      .sort((a, b) => {
        if (filtro === "nombre") return a.nombre.localeCompare(b.nombre);
        if (filtro === "fecha_pago" && a.fecha_pago && b.fecha_pago) {
          return new Date(a.fecha_pago) - new Date(b.fecha_pago);
        }
        return 0;
      });

    setClientesFiltrados(clientesFiltrados);
  }, [busqueda, filtro, clientes, creditos]);

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
  if (!clienteSeleccionado) return;

  const credito = obtenerCreditoDelCliente(clienteSeleccionado.id);
  if (!credito) {
    alert("No se encontró un crédito para este cliente.");
    return;
  }

  if (clienteSeleccionado.saldo <= 0) {
    alert("El saldo del cliente ya ha sido saldado. No se pueden registrar más pagos.");
    return;
  }

  if (montoPago <= 0 || isNaN(montoPago)) {
    alert("Ingrese un monto válido.");
    return;
  }

  if (montoPago > credito.saldo) {
    alert(`El monto ingresado (${montoPago}) excede el saldo pendiente (${credito.saldo}).`);
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
    } else {
      setMensaje({ tipo: "pago-exito", texto: "Pago registrado correctamente !!!." });
      setClientesConPagoHoy((prev) => [...new Set([...prev, clienteSeleccionado.id])]);
      setCreditos((prevCreditos) =>
        prevCreditos.map((c) =>
          c.id === credito.id ? { ...c, saldo: c.saldo - montoPago } : c
        )
      );
      setTimeout(() => setMensaje(null), 3000);
      cerrarModalPago();
    }
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    setMensaje({ tipo: "error", texto: "Ocurrió un error inesperado." });
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
            <button className="filtro-btn" onClick={() => setFiltro(filtro === "nombre" ? "fecha_pago" : "nombre")}>
              <FaFilter /> {filtro === "nombre" ? "Ordenar por ID" : "Ordenar por Nombre"}
            </button>
          </div>
        </div>
  
        <div className="tablaC-container">
          <table className="tablaC-cobros">
            <thead>
              <tr>
                <th>ID Cte.</th>
                <th>Nombre Cliente</th>
                <th>Fecha Inic-Venc.</th>
                <th>Valor Cuota </th>
                <th>Saldo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cliente) => {
                  const credito = obtenerCreditoDelCliente(cliente.id); // Obtenemos el crédito asociado al cliente
                  if (!credito) return null; // Si no hay crédito asociado, no mostramos nada
  
                  return (
                    <tr 
                      key={cliente.id}
                      className={clientesConPagoHoy.includes(credito.id) ? "fila-pagada" : ""}
                    >
                      <td>{cliente.id}</td>
                      <td>{cliente.nombre}</td>
                      <td>
                       <div>{new Date(credito.fecha_inicio).toLocaleDateString()}</div>
                       <div>{new Date(credito.fecha_vencimiento).toLocaleDateString()}</div>
                     </td>
                      <td>${credito.valor_cuota}</td>                
                      <td>${credito.saldo}</td>
                      <td>
                        <button className="btn-pagar" onClick={() => abrirModalPago(cliente,)}>
                          <FaMoneyBillWave /> Pago
                        </button>
                        <Link to={`/clientedetalle/${cliente.id}`} className="btn-detalle">
                          <FaEye size={16}/> Ver...
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-center">No hay clientes disponibles.</td>
                </tr>
              )}
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
              <button onClick={() => registrarPago("Efectivo")} className="btn-pago efectivo">
              <FaMoneyBillWave className="icono" /> Efectivo</button>
              <button onClick={() => registrarPago("Deposito")} className="btn-pago yape">
              <FaMobileAlt className="icono" /> Yape
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