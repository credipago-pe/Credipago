import { useEffect, useState, useRef } from "react";
import { supabase } from "../components/supabaseClient";
import "../Styles/PanelAdmin.css";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { FaSignOutAlt, FaUsers, FaMapMarkerAlt, FaTrash, FaMoneyBill, FaTools, FaCalendarDay,} from "react-icons/fa";
import { motion } from "framer-motion";


export default function AdminPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalMotivoVisible, setModalMotivoVisible] = useState(false);
  const [modalConfirmVisible, setModalConfirmVisible] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [motivoEliminacion, setMotivoEliminacion] = useState("");
  const navigate = useNavigate();


const hoy = dayjs().format("YYYY-MM-DD");

// Función robusta: convierte la fecha del registro a fecha en zona "America/Lima" (YYYY-MM-DD)
const formatDatePeru = (fecha) => {
  try {
    // new Date acepta strings ISO/timestamps; si fecha ya es Date, funciona igual
    const d = new Date(fecha);
    // 'en-CA' genera 'YYYY-MM-DD' en la mayoría de navegadores
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  } catch (e) {
    return null;
  }
};

const totalizarHoy = (arr, campo, fechaCampo) => {
  try {
    if (!Array.isArray(arr) || arr.length === 0) return 0;

    const hoyPeru = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

    return arr
      .filter((item) => {
        if (!item) return false;
        const fechaItem = item[fechaCampo];
        if (!fechaItem) return false;
        const fechaFmt = formatDatePeru(fechaItem);
        // debug opcional:
        // console.log('check fecha', { fechaItem, fechaFmt, hoyPeru, campo: item[campo] });
        return fechaFmt === hoyPeru;
      })
      .reduce((acc, curr) => acc + Number(curr[campo] || 0), 0);
  } catch (err) {
    console.error("totalizarHoy error:", err);
    return 0;
  }
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
    .select("id, nombre, auth_id")
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
      .select("*")
      .in("usuario_id", userAuthIds);

    if (errGastos) {
      setErrorMsg("Error cargando gastos: " + errGastos.message);
      setLoading(false);
      return;
    }

    

    const usuariosConTotales = users.map(u => ({
  ...u,
  totalRecaudoDia: totalizarHoy(pagosData.filter(p => p.usuario_id === u.auth_id), "monto_pagado", "fecha_pago"),
  totalVentasDia: totalizarHoy(creditosData.filter(c => c.usuario_id === u.auth_id), "monto", "fecha_inicio"),
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

  // Primer paso: abrir modal para motivo
  const eliminarUsuario = (usuarioId) => {
    setUsuarioAEliminar(usuarioId);
    setMotivoEliminacion("");
    setModalMotivoVisible(true);
  };

  // Segundo paso: mostrar confirmación
  const continuarEliminacion = () => {
    if (!motivoEliminacion.trim()) {
      alert("Por favor, escribe un motivo de eliminación.");
      return;
    }
    setModalMotivoVisible(false);
    setModalConfirmVisible(true);
  };

  // Confirmar y eliminar definitivamente
  const confirmarEliminacion = async () => {
    try {
      const { error } = await supabase
        .from("usuarios")
        .delete()
        .eq("id", usuarioAEliminar);

      if (error) {
        alert("Error al eliminar usuario: " + error.message);
      } else {
        alert("✅ Usuario eliminado correctamente.\nMotivo: " + motivoEliminacion);
        cargarDatos();
      }
    } catch (err) {
      alert("Error inesperado: " + err.message);
    } finally {
      setModalConfirmVisible(false);
      setUsuarioAEliminar(null);
    }
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
  <motion.div
  whileHover={{ rotate: -15, scale: 1.2 }}
  whileTap={{ rotate: 15, scale: 0.9 }}
  transition={{ type: "spring", stiffness: 300 }}
  style={{ display: "inline-block", cursor: "pointer" }}
  title="Eliminar cobrador"
  onClick={() => eliminarUsuario(u.id)}
>
  <FaTrash color="#f44336" size={18} />
</motion.div>
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
  {/* Modal 1: Motivo */}
      {modalMotivoVisible && (
        <div className="modal-elim">
          <div className="elim-card">
            <h3>📝 Motivo de eliminación</h3>
            <p>Por favor escribe el motivo por el cual deseas eliminar esta ruta.</p>
            <textarea
              rows="3"
              value={motivoEliminacion}
              onChange={(e) => setMotivoEliminacion(e.target.value)}
              placeholder="Ejemplo: ruta duplicada, cobrador inactivo, etc."
            />
            <div className="modal-actions">
              <button onClick={() => setModalMotivoVisible(false)}>Cancelar</button>
              <button onClick={continuarEliminacion} disabled={!motivoEliminacion.trim()}>
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Confirmación final */}
      {modalConfirmVisible && (
        <div className="modal-elim">
          <div className="elim-card">
            <h3>⚠️ Confirmar eliminación ⚠️</h3>
            <p>¿Seguro que deseas eliminar esta ruta?</p>
            <p><strong>Esta acción NO se puede deshacer.</strong></p>
            <div className="modal-actions">
              <button onClick={() => setModalConfirmVisible(false)}>Cancelar</button>
              <button onClick={confirmarEliminacion} className="danger">
                Sí, eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos rápidos para los modales */}
      <style>{`
        .modal-elim {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
        }
        .elim-card {
          background: #fff;
          padding: 20px;
          border-radius: 10px;
          width: 400px;
          max-width: 90%;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 15px;
        }
        textarea {
          width: 100%;
          resize: none;
          padding: 8px;
          margin-top: 8px;
          border-radius: 5px;
          border: 1px solid #ccc;
        }
        .danger {
          background-color: #d9534f;
          color: white;
        }
          .icon-trash {
  transition: transform 0.3s ease, color 0.3s ease;
}

.icon-trash:hover {
  color: #ff0000;
  transform: rotate(-15deg) scale(1.2);
}

      `}</style>
    </div>
  );
}