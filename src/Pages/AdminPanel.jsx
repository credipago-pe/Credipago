import { useEffect, useState, useRef } from "react";
import { supabase } from "../components/supabaseClient";
import "../Styles/PanelAdmin.css";
import { useNavigate } from "react-router-dom";
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

    const ventasPorUsuario = totalizar(creditosData, "monto");
    const recaudoPorUsuario = totalizar(pagosData, "monto_pagado");
    const gastosPorUsuario = totalizar(gastosData, "valor");

    const usuariosConTotales = users.map((u) => ({
      ...u,
      totalVentas: ventasPorUsuario[u.auth_id] || 0,
      totalRecaudo: recaudoPorUsuario[u.auth_id] || 0,
      totalGastos: gastosPorUsuario[u.auth_id] || 0,
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
      <button onClick={() => navigate("/")}className="btn-ir-panel"title="Volver al Panel Admi">
      <FaSignOutAlt />
      </button>

      <button onClick={() => navigate("/registro-usuarios")} className="admin-panel-btn">
        ➕ Crear nueva ruta
      </button>
      <button
        onClick={() => navigate("/dashboard-admin")}
        className="admin-panel-btn"
      >
        📈 Ver resumen global
      </button>

      {errorMsg && <p className="admin-panel-error">{errorMsg}</p>}

      {loading ? (
        <p className="admin-panel-loading">Cargando datos...</p>
      ) : usuarios.length === 0 ? (
        <p className="admin-panel-empty">No hay rutas (usuarios cobradores) registradas.</p>
      ) : (
        <div className="admin-panel-table-container">
        <table className="admin-panel-table">
          <thead>
  <tr>
    <th>Cobrador</th>
    <th>Acciones</th>
  </tr>
</thead>
<tbody>
  {usuarios.map((u) => (
    <tr key={u.id}>
      <td>{u.nombre}</td>
      <td>
        <div className="acciones-td">
          <button onClick={() => entrarComoRuta(u.auth_id)} className="admin-panel-btn-ver">
    <FaUsers /> Ver Clientes
  </button>
  <button onClick={() => navigate("/admin/mapa")} className="admin-panel-btn-ubicacion">
    <FaMapMarkerAlt /> Ubicar Cobrador
  </button>
  <button onClick={() => eliminarUsuario(u.id)} className="admin-panel-btn-eliminar">
    <FaTrash /> Eliminar
  </button>
  <button onClick={() => navigate(`/admin/caja/${u.auth_id}`)} className="admin-panel-btn-caja">
    <FaMoneyBill /> Caja / Balance
  </button>
  <button onClick={() => navigate(`/registros-admin/${u.auth_id}`)} className="admin-panel-btn-gestion">
    <FaTools /> Gestión de Registros
  </button>
  <button onClick={() => navigate(`/admin/resumen/${u.auth_id}`)} className="admin-panel-btn-informe">
    <FaCalendarDay /> Info. General
  </button>
  
        </div>
      </td>
    </tr>
  ))}
</tbody>

        </table>
        </div>
      )}
    <ModalConfirmacion
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={confirmarConContraseña}
      />
    </div>
  );
}

function ModalConfirmacion({ visible, onClose, onConfirm }) {
  const inputRef = useRef();

  const handleConfirm = () => {
    const password = inputRef.current.value;
    onConfirm(password);
  };

  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div className="modalE">
        <h3 className="modal-titulo">
          <FaExclamationTriangle className="icono-alerta" /> Confirmar Eliminación
        </h3>
        <p>Ingresa la contraseña del administrador:</p>
        <input type="password" ref={inputRef} placeholder="Contraseña" />
        <div className="modal-buttonsE">
          <button onClick={handleConfirm}>Confirmar</button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
