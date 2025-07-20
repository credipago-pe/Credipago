import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../components/supabaseClient";  // Asegúrate de que esté correctamente configurado
import "../Styles/CobradorPanel.css";
import { FaBars, FaMobileAlt, FaUser, FaBuilding, FaEye, FaSearch, FaChevronDown, FaFilter, FaMoneyBill, FaMoneyBillWave, FaInfoCircle, FaTimes, FaCaretDown, FaSignOutAlt } from "react-icons/fa";
import { useParams } from "react-router-dom";


const AdminVistacobrador = () => {
  const { id } = useParams();
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
  
  const authIdRuta = localStorage.getItem("auth_id_cobrador_actual");
  const esVistaAdminRuta = !!localStorage.getItem("auth_id_cobrador_actual");



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
        navigate("/admin");
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
      // Obtenemos authId tomando en cuenta la simulación del admin
      const authId = authIdRuta;


      // Traemos solo clientes de la ruta del usuario actual
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("usuario_id", authId);


      if (error) throw error;
      setClientes(data || []);
      setClientesFiltrados(data || []);
    } catch (error) {
      console.error("Error al obtener clientes:", error.message);
    }
  };

  if (authIdRuta) fetchClientes();
}, [usuario]);

useEffect(() => {
  const fetchCreditos = async () => {
    try {
      const authId = localStorage.getItem("auth_id_cobrador_actual");
      if (!authId) return;


      // Traemos créditos solo de la ruta del usuario actual
      // Suponiendo que en "creditos" también está "usuario_id" para filtrar
      const { data, error } = await supabase
        .from("creditos")
        .select("*")
        .eq("usuario_id", authId);

      if (error) throw error;
      setCreditos(data || []);
    } catch (error) {
      console.error("Error al obtener créditos:", error.message);
    }
  };

  if (authIdRuta) fetchCreditos();
}, [usuario]);

useEffect(() => {
  const obtenerPagosDeHoy = async () => {
    try {
      const authId = localStorage.getItem("auth_id_cobrador_actual");
      if (!authId) return;


      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const hoyUTC5 = new Date(hoy.getTime() - 5 * 60 * 60 * 1000);
      const isoInicio = hoyUTC5.toISOString().slice(0, 10);

      // Traemos solo pagos de créditos de la ruta actual
      // Para eso, asumimos que en "pagos" no hay usuario_id, 
      // entonces buscamos pagos cuyos créditos pertenecen a la ruta
      // Lo más directo: traer pagos de créditos cuyo usuario_id es authId

      // Traemos créditos para obtener IDs de créditos de la ruta:
      const { data: creditosRuta, error: errorCreditos } = await supabase
        .from("creditos")
        .select("id")
        .eq("usuario_id", authId);

      if (errorCreditos) throw errorCreditos;

      const creditosIds = creditosRuta.map(c => c.id);

      if (creditosIds.length === 0) {
        setClientesConPagoHoy([]);
        return;
      }

      const { data, error } = await supabase
        .from("pagos")
        .select("credito_id, fecha_pago")
        .in("credito_id", creditosIds)
        .gte("fecha_pago", `${isoInicio} 00:00:00`)
        .lte("fecha_pago", `${isoInicio} 23:59:59`);

      if (error) throw error;

      const idsPagadosHoy = data.map(pago => pago.credito_id);
      setClientesConPagoHoy(idsPagadosHoy);
    } catch (error) {
      console.error("Error al obtener pagos del día:", error.message);
    }
  };

  if (authIdRuta) obtenerPagosDeHoy();
}, [usuario]);

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
    const fechaPago = new Date();
    const fechaPagoUTC5 = new Date(fechaPago.getTime() - (5 * 60 * 60 * 1000));
    const fechaPagoFormatted = fechaPagoUTC5.toISOString().slice(0, 19).replace("T", " ");
    
    try {
      const { error } = await supabase.from("pagos").insert([{
        credito_id: credito.id,
        metodo_pago: tipoPago.toLowerCase(),
        monto_pagado: Number(parseFloat(montoPago).toFixed(2)),
        fecha_pago: fechaPagoFormatted,
        usuario_id: authIdRuta,
      }]);


      if (error) {
        console.error("❌ Error al registrar pago:", error);
        setMensaje({ tipo: "error", texto: "Error al registrar el pago." });
        
      } else {
        setMensaje({ tipo: "pago-exito", texto: "Pago registrado correctamente !!!." });
        setClientesConPagoHoy((prev) => [...new Set([...prev,clienteSeleccionado.id])]);
        setCreditos((prevCreditos) => prevCreditos.map((c) =>c.id === credito.id ? 
        { ...c, saldo: c.saldo - montoPago } : c

      )
    
      );
        
        setTimeout(() => setMensaje(null), 3000);
        cerrarModalPago();
        // ⏳ Espera 1.5 segundos antes de recargar
        
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


        <h2>Vista Administrador</h2>

<button 
  onClick={() => navigate("/admin")}className="btn-ir-panel"title="Volver al Panel Admin">
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
            <Link to="/admin/regcliente" onClick={toggleMenu}>Crear Cliente</Link>
            <Link to="/admin/revovar" onClick={toggleMenu}>Renovar Crédito</Link>
            <Link to="/admin/cancelados" onClick={toggleMenu}>Cancelados</Link>
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
            {esVistaAdminRuta && (
            <Link to="/admin/Pagos" onClick={toggleMenu}>Pagos</Link>)}
            <Link to="/admin/ventas" onClick={toggleMenu}>Ventas</Link>
            <Link to="/admin/gastos" onClick={toggleMenu}>Gastos</Link>
            <Link to="/admin/liqui" onClick={toggleMenu}>Liquidación</Link>
          </div>
        )}
      </div>
    </div>
  </div>

  {/* LOGOUT ABAJO */}
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
                        <Link to={`/adminclientedetalle/${cliente.id}`} className="btn-detalle">
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

  export default AdminVistacobrador;