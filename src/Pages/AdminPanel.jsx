import { useEffect, useState, useRef } from "react";
import { supabase } from "../components/supabaseClient";
import "../Styles/PanelAdmin.css";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { FaSignOutAlt,// logout
  FaUsers,        // Ver Clientes
  FaMapMarkerAlt, // Ubicar Cobrador
  FaTrash,        // Eliminar
  FaMoneyBill,    // Caja / Balance
  FaTools,        // Gestión de Registros
  FaCalendarDay, FaExclamationTriangle  // Informe del día
} from "react-icons/fa";


export default function AdminPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const navigate = useNavigate();
  const [cobradorSeleccionado, setCobradorSeleccionado] = useState(null);
  const handleDragEnd = (result) => {
    if (!result.destination) return; // si no suelta en un lugar válido
    const items = Array.from(usuarios);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setUsuarios(items);
    const hoy = dayjs().format("YYYY-MM-DD");
  };

const hoy = dayjs().format("YYYY-MM-DD");

const totalizarHoy = (arr, campo, fechaCampo) => {
  return arr
    .filter(item => {
      const fechaItem = item[fechaCampo];
      if (!fechaItem) return false;
      // Convertimos a dayjs y comparamos solo fecha sin hora
      return dayjs(fechaItem).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
    })
    .reduce((acc, curr) => acc + Number(curr[campo] || 0), 0);
};
  

  useEffect(() => {
    // Limpia el auth_id del cobrador si regresas al panel de admin
    localStorage.removeItem("auth_id_cobrador_actual");
    cargarDatos();
  }, []);

  async function cargarDatos() {
  setLoading(true);
  setErrorMsg("");

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    setErrorMsg("No hay sesión activa.");
    setLoading(false);
    return;
  }

  // Obtener el registro del admin con el auth_id igual a user.id
  const { data: adminData, error: adminError } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  if (adminError || !adminData) {
    setErrorMsg("No se pudo encontrar el administrador.");
    setLoading(false);
    return;
  }

  const adminId = adminData.auth_id;

  // Obtener los usuarios cobradores de este admin
  const { data: users, error: errUsers } = await supabase
    .from("usuarios")
    .select("id, nombre, telefono, auth_id")
    .eq("rol", "cobrador")
    .eq("admin_id", adminId);

  if (errUsers) {
    setErrorMsg("Error cargando usuarios: " + errUsers.message);
    setLoading(false);
    return;
  }

    const userAuthIds = users.map((u) => u.auth_id).filter(Boolean);
    if (userAuthIds.length === 0) {
      setUsuarios([]);
      setLoading(false);
      return;
    }

    const { data: creditosData, error: errCreditos } = await supabase
      .from("creditos")
      .select("*")
      .in("usuario_id", userAuthIds);

    if (errCreditos) {
      setErrorMsg("Error cargando créditos: " + errCreditos.message);
      setLoading(false);
      return;
    }

    const { data: pagosData, error: errPagos } = await supabase
      .from("pagos")
      .select("*")
      .in("usuario_id", userAuthIds);

    if (errPagos) {
      setErrorMsg("Error cargando pagos: " + errPagos.message);
      setLoading(false);
      return;
    }

    const { data: gastosData, error: errGastos } = await supabase
      .from("gastos")
      .select("usuario_id, valor")
      .in("usuario_id", userAuthIds);

    if (errGastos) {
      setErrorMsg("Error cargando gastos: " + errGastos.message);
      setLoading(false);
      return;
    }

    const totalizar = (arr, campo) =>
      arr.reduce((acc, curr) => {
        acc[curr.usuario_id] = (acc[curr.usuario_id] || 0) + Number(curr[campo]);
        return acc;
      }, {});

    const usuariosConTotales = users.map(u => ({
  ...u,
  totalRecaudoDia: totalizarHoy(pagosData.filter(p => p.usuario_id === u.auth_id), "monto_pagado", "fecha_pago"),
  totalVentasDia: totalizarHoy(creditosData.filter(c => c.usuario_id === u.auth_id), "monto", "fecha_creacion"),
  totalGastosDia: totalizarHoy(gastosData.filter(g => g.usuario_id === u.auth_id), "valor", "fecha"),
}));

    setUsuarios(usuariosConTotales);
    setLoading(false);
  
  }

  const entrarComoRuta = (authId) => {
    // Guarda el ID del cobrador que el admin quiere ver
    localStorage.setItem("auth_id_cobrador_actual", authId);
    navigate("/admin/vistacobrador");
  };

  const eliminarUsuario = (usuarioId) => {
    setUsuarioAEliminar(usuarioId);
    setModalVisible(true);
  };

  const confirmarConContraseña = async (password) => {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: "admin@tudominio.com", // ⚠️ Reemplaza con el correo del admin real
      password,
    });

    if (loginError) {
      alert("❌ Contraseña incorrecta. No se eliminó el usuario.");
      return;
    }

    const { error } = await supabase.from("usuarios").delete().eq("id", usuarioAEliminar);
    if (error) {
      alert("Error al eliminar usuario: " + error.message);
    } else {
      alert("✅ Usuario eliminado");
      cargarDatos();
    }

    setModalVisible(false);
    setUsuarioAEliminar(null);
  };

  return (
    <div className="admin-panel-container">
  <h2 className="admin-panel-title">📊 Panel de Administrador</h2>
  <div className="admin-panel-top-buttons">
  <button onClick={() => navigate("/")} className="btn-ir-panel" title="Volver al Panel Admin">
    <FaSignOutAlt />
  </button>
  <button onClick={() => navigate("/registro-usuarios")} className="admin-panel-btn">
    ➕ Crear nueva ruta
  </button>
  <button onClick={() => navigate("/dashboard-admin")} className="admin-panel-btn">
    📈 Ver resumen global
  </button>
  <button onClick={() => navigate("/admin/mapa")} className="admin-panel-btn">
    <FaMapMarkerAlt /> Ubicar Cobrador
  </button>
  <button onClick={() => navigate("/admin/pagar-suscripcion")} className="admin-panel-btn">
    <FaMoneyBill /> Pagar Suscripción
  </button>
</div>

  {errorMsg && <p className="admin-panel-error">{errorMsg}</p>}
  {loading ? (
    <p className="admin-panel-loading">Cargando datos...</p>
  ) : usuarios.length === 0 ? (
    <p className="admin-panel-empty">No hay rutas (usuarios cobradores) registradas.</p>
  ) : (
    <div className="admin-panel-cards-container">
      {usuarios.map((u) => (
        <div key={u.id} className="cobrador-card">
          <div className="cobrador-card-header">
  <span className="cobrador-nombre">{u.nombre}</span>
  <FaTrash
    onClick={() => eliminarUsuario(u.id)}
    style={{ cursor: "pointer", color: "#f44336", fontSize: "18px" }}
    title="Eliminar cobrador"
  />
</div>

          <div className="cobrador-card-totales">
  <p>💰 Total Recaudo Hoy: S/ {u.totalRecaudoDia}</p>
  <p>📈 Total Ventas Hoy: S/ {u.totalVentasDia}</p>
  <p>💸 Total Gastos Hoy: S/ {u.totalGastosDia}</p>
</div>

          <div className="cobrador-card-buttons">
            <button onClick={() => entrarComoRuta(u.auth_id)}><FaUsers /> Ver Clientes</button>
            
            <button onClick={() => navigate(`/admin/caja/${u.auth_id}`)}><FaMoneyBill /> Caja / Balance</button>
            <button onClick={() => navigate(`/registros-admin/${u.auth_id}`)}><FaTools /> Borrar Registros</button>
            <button onClick={() => navigate(`/admin/resumen/${u.auth_id}`)}><FaCalendarDay /> Resum. General</button>
          </div>
        </div>
      ))}
    </div>
    
  )}
</div>

    
  );
}
