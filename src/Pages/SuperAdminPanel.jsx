import React, { useEffect, useState } from "react"
import { supabase } from "../components/supabaseClient"
import { useNavigate } from "react-router-dom"
import { BellRing, CircleDollarSign, CreditCard, LockKeyhole, LogOut, Map } from "lucide-react"
import "../Styles/SuperAdminPanel.css"

export default function SuperAdminPanel() {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [modalRutas, setModalRutas] = useState(false)
  const [modalPagos, setModalPagos] = useState(false)
  const [rutasAdmin, setRutasAdmin] = useState([])
  const [historialPagos, setHistorialPagos] = useState([])
  const [modalPagoOk, setModalPagoOk] = useState(false)
  const [mensajePago, setMensajePago] = useState("")
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null)
  const [valorPago, setValorPago] = useState("")
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [busquedaAdmin, setBusquedaAdmin] = useState("")

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  const cargarAdmins = async () => {
    const { data } = await supabase.from("vista_admin_suscripciones").select("*")
    if (data) setAdmins(data)
  }

  const cargarDashboard = async () => {
    const { data } = await supabase.from("vista_dashboard_superadmin").select("*").single()
    if (data) setDashboard(data)
  }

  const cargarRutasAdmin = async (adminId) => {
    const { data } = await supabase.from("vista_rutas_admin").select("*").eq("admin_id", adminId)
    if (data) {
      setRutasAdmin(data)
      setModalRutas(true)
    }
  }

  const cargarPagosAdmin = async (adminId) => {
    const { data } = await supabase.from("vista_historial_pagos_admin").select("*").eq("admin_id", adminId)
    if (data) {
      setHistorialPagos(data)
      setModalPagos(true)
    }
  }

  const abrirRegistroPago = async (adminId) => {
    const ahora = new Date()
    const anioActual = ahora.getFullYear()
    const mesActual = ahora.getMonth() + 1

    const { data, error } = await supabase
      .from("suscripciones_pagos")
      .select("*")
      .eq("admin_id", adminId)
      .eq("anio", anioActual)
      .eq("mes", mesActual)
      .maybeSingle()

    if (error) {
      setMensajePago("No se pudo cargar el periodo actual")
      setModalPagoOk(true)
      return
    }

    const admin = admins.find((item) => item.admin_id === adminId)
    const rutasActuales = data ? [] : await cargarRutasParaPago(adminId)
    const pagoActual = data || {
      admin_id: adminId,
      admin_nombre: admin?.admin_nombre || "",
      mes: mesActual,
      anio: anioActual,
      rutas: rutasActuales,
      esNuevo: true,
    }

    setPagoSeleccionado(pagoActual)
    setValorPago(data?.total ?? "")
  }

  const cargarRutasParaPago = async (adminId) => {
    const { data } = await supabase
      .from("vista_rutas_admin")
      .select("*")
      .eq("admin_id", adminId)

    return (data || []).map((ruta) => ({
      auth_id: ruta.auth_id ?? ruta.ruta_id,
      nombre: ruta.nombre ?? ruta.ruta_nombre,
    }))
  }

  const toggleBloqueoRutas = async (adminId, estado) => {
    await supabase
      .from("usuarios")
      .update({ acceso_activo: !estado })
      .eq("admin_id", adminId)
      .eq("rol", "cobrador")
    cargarAdmins()
  }

  const enviarRecordatorio = async (adminId) => {
    const { error } = await supabase.from("notificaciones").insert({
      usuario_id: adminId,
      tipo_usuario: "admin",
      titulo: "Pago de suscripción",
      mensaje: "Recuerda pagar tu suscripción antes del día 5 para evitar suspensión de rutas.",
    })
    if (!error) alert("Recordatorio enviado")
  }

  const registrarPago = async () => {
    if (!pagoSeleccionado || !valorPago || Number(valorPago) <= 0) {
      setMensajePago("Ingresa un valor de pago válido")
      setModalPagoOk(true)
      return
    }

    setGuardandoPago(true)
    const pagoNuevo = !pagoSeleccionado.id
    const consulta = supabase.from("suscripciones_pagos")
    const resultado = pagoNuevo
      ? await consulta.insert([{
          admin_id: pagoSeleccionado.admin_id,
          admin_nombre: pagoSeleccionado.admin_nombre,
          rutas: pagoSeleccionado.rutas || [],
          total: Number(valorPago),
          estado: "pagado",
          metodo_pago: "efectivo",
          mes: pagoSeleccionado.mes,
          anio: pagoSeleccionado.anio,
        }]).select()
      : await consulta
          .update({ total: Number(valorPago), estado: "pagado", metodo_pago: "efectivo" })
          .eq("id", pagoSeleccionado.id)
          .select()

    const { data, error } = resultado

    if (error) {
      setMensajePago("Error al registrar el pago")
    } else if (!data || data.length === 0) {
      setMensajePago("No se encontró el pago para actualizar")
    } else {
      setMensajePago("Pago registrado correctamente")
      setPagoSeleccionado(null)
      setValorPago("")
      cargarAdmins()
      cargarDashboard()
    }

    setGuardandoPago(false)
    setModalPagoOk(true)
  }

  useEffect(() => {
    cargarAdmins()
    cargarDashboard()
  }, [])

  const renderAdminActions = (admin) => (
    <div className="sap-action-grid">
      <button className="sap-button sap-button-blue" onClick={() => cargarRutasAdmin(admin.admin_id)}><Map size={15} aria-hidden="true" />Rutas</button>
      <button className="sap-button sap-button-green" onClick={() => cargarPagosAdmin(admin.admin_id)}><CreditCard size={15} aria-hidden="true" />Pagos</button>
      <button className="sap-button sap-button-red" onClick={() => toggleBloqueoRutas(admin.admin_id, admin.acceso_activo)}>
        <LockKeyhole size={15} aria-hidden="true" />{admin.acceso_activo ? "Bloquear" : "Activar"}
      </button>
      <button className="sap-button sap-button-yellow" onClick={() => enviarRecordatorio(admin.admin_id)}><BellRing size={15} aria-hidden="true" />Recordar pago</button>
      <button className="sap-button sap-button-teal" onClick={() => abrirRegistroPago(admin.admin_id)}><CircleDollarSign size={15} aria-hidden="true" />Registrar pago</button>
    </div>
  )

  const adminsFiltrados = admins.filter((admin) =>
    (admin.admin_nombre || "").toLowerCase().includes(busquedaAdmin.toLowerCase().trim())
  )

  return (
    <main className="superadmin-page">
      <div className="sap-container">
        <header className="sap-header">
          <div>
            <span className="sap-kicker">Control general</span>
            <h1>Panel SuperAdmin</h1>
            <p>Administra suscripciones, rutas y accesos desde un solo lugar.</p>
          </div>
          <div className="sap-header-actions">
            <div className="sap-live-status"><span /> Sistema activo</div>
            <button className="sap-button sap-button-logout" onClick={cerrarSesion}>
              <LogOut size={15} aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </header>

        {dashboard && (
          <section className="sap-dashboard-grid" aria-label="Resumen general">
            <article className="sap-summary-card sap-summary-green"><span>Ingresos del mes</span><strong>S/ {dashboard.ingresos_mes}</strong><small>Recaudación actual</small></article>
            <article className="sap-summary-card sap-summary-orange"><span>Pagos pendientes</span><strong>{dashboard.pagos_proceso}</strong><small>Requieren seguimiento</small></article>
            <article className="sap-summary-card sap-summary-blue"><span>Administradores</span><strong>{dashboard.total_admins}</strong><small>Usuarios registrados</small></article>
            <article className="sap-summary-card sap-summary-purple"><span>Rutas activas</span><strong>{dashboard.total_rutas}</strong><small>Operación disponible</small></article>
          </section>
        )}

        <section className="sap-admin-section">
          <div className="sap-section-heading">
            <div><span className="sap-kicker">Gestión operativa</span><h2>Administradores</h2></div>
            <div className="sap-section-tools">
              <label className="sap-search-field" htmlFor="buscar-admin">
                <span aria-hidden="true">⌕</span>
                <input
                  id="buscar-admin"
                  type="search"
                  placeholder="Buscar administrador"
                  value={busquedaAdmin}
                  onChange={(event) => setBusquedaAdmin(event.target.value)}
                />
              </label>
              <span className="sap-count">{adminsFiltrados.length} de {admins.length}</span>
            </div>
          </div>

          <div className="sap-admin-list">
            {adminsFiltrados.map((admin) => (
              <article className="sap-admin-card" key={admin.admin_id}>
                <div className="sap-admin-main">
                  <div className="sap-admin-avatar">{(admin.admin_nombre || "A").charAt(0).toUpperCase()}</div>
                  <div><h3>{admin.admin_nombre}</h3><p>{admin.total_rutas} rutas asignadas</p></div>
                </div>
                <div className="sap-admin-data"><span>Estado de pago<strong className={`sap-payment-status ${admin.estado_pago || "pendiente"}`}>{admin.estado_pago || "pendiente"}</strong></span><span>Total pagado<strong>S/ {admin.total_pagado || 0}</strong></span><span>Acceso<strong className={admin.acceso_activo ? "sap-access-on" : "sap-access-off"}>{admin.acceso_activo ? "Activo" : "Bloqueado"}</strong></span></div>
                {renderAdminActions(admin)}
              </article>
            ))}
            {adminsFiltrados.length === 0 && <div className="sap-empty-state">No se encontraron administradores.</div>}
          </div>
        </section>
      </div>

      {modalRutas && <div className="sap-modal-backdrop"><div className="sap-modal-card"><div className="sap-modal-heading"><div><span className="sap-kicker">Operación</span><h2>Rutas del administrador</h2></div><button className="sap-icon-button" onClick={() => setModalRutas(false)} aria-label="Cerrar">×</button></div><div className="sap-route-list">{rutasAdmin.map((route) => <div className="sap-route-item" key={route.ruta_id}><span>↗</span>{route.ruta_nombre}</div>)}</div><button className="sap-button sap-button-neutral" onClick={() => setModalRutas(false)}>Cerrar</button></div></div>}

      {modalPagos && <div className="sap-modal-backdrop"><div className="sap-modal-card sap-history-modal"><div className="sap-modal-heading"><div><span className="sap-kicker">Historial</span><h2>Pagos del administrador</h2></div><button className="sap-icon-button" onClick={() => setModalPagos(false)} aria-label="Cerrar">×</button></div><div className="sap-payment-list">{historialPagos.map((payment) => <article className="sap-payment-item" key={payment.id}><div><strong>{payment.mes} / {payment.anio}</strong><span className={`sap-payment-status ${payment.estado}`}>{payment.estado}</span></div><strong>S/ {payment.total}</strong>{payment.url_evidencia && <a href={payment.url_evidencia} target="_blank" rel="noreferrer">Ver comprobante</a>}{payment.estado !== "pagado" && <button className="sap-button sap-button-teal" onClick={() => { setPagoSeleccionado(payment); setValorPago(payment.total ?? "") }}>Registrar pago</button>}</article>)}</div><button className="sap-button sap-button-neutral" onClick={() => setModalPagos(false)}>Cerrar</button></div></div>}

      {pagoSeleccionado && <div className="sap-modal-backdrop sap-payment-backdrop"><div className="sap-payment-form"><button className="sap-icon-button" onClick={() => setPagoSeleccionado(null)} aria-label="Cerrar">×</button><span className="sap-kicker">Suscripción</span><h2>Registrar pago</h2><p>Periodo: {pagoSeleccionado.mes} / {pagoSeleccionado.anio}</p><label htmlFor="valor-pago">Valor pagado</label><div className="sap-money-field"><span>S/</span><input id="valor-pago" type="number" min="0.01" step="0.01" value={valorPago} onChange={(event) => setValorPago(event.target.value)} autoFocus /></div><div className="sap-form-actions"><button className="sap-button sap-button-neutral" onClick={() => setPagoSeleccionado(null)}>Cancelar</button><button className="sap-button sap-button-teal" onClick={registrarPago} disabled={guardandoPago}>{guardandoPago ? "Guardando..." : "Confirmar pago"}</button></div></div></div>}

      {modalPagoOk && <div className="sap-modal-backdrop"><div className="sap-result-card"><div className="sap-result-icon">✓</div><h2>{mensajePago}</h2><button className="sap-button sap-button-teal" onClick={() => setModalPagoOk(false)}>Continuar</button></div></div>}
    </main>
  )
}
