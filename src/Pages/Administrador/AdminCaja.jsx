import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";  // agrego useNavigate para el botón de volver
import { supabase } from "../../components/supabaseClient";
import "../../styles/AdminCaja.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaSignOutAlt } from "react-icons/fa";
import dayjs from "dayjs";


const AdminCaja = () => {
  const [caja, setCaja] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState("ingreso");
  const [descripcion, setDescripcion] = useState("");
  const { auth_id } = useParams();
  const navigate = useNavigate();
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalSalidas, setTotalSalidas] = useState(0);
  const numeroFormateado = totalIngresos.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [totalPagos, setTotalPagos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [totalVentas, setTotalVentas] = useState(0);
  const totalIngresosReales = totalIngresos + totalPagos;
  const saldoCalculado = caja? totalIngresosReales - totalSalidas - totalGastos: 0;




  // Estado para modal abrir caja
  const [modalAbrirCaja, setModalAbrirCaja] = useState(false);
  const [baseCaja, setBaseCaja] = useState("");

  const obtenerCaja = async () => {
    const { data, error } = await supabase
      .from("cajas")
      .select("*")
      .eq("usuario_auth_id", auth_id)
      .eq("estado", "abierta")
      .single();

    if (error) {
      console.error("Error al obtener caja:", error.message);
      setCaja(null);
    } else {
      setCaja(data);
    }
  };

  const obtenerMovimientos = async () => {
    if (!caja) return;
    const { data, error } = await supabase
      .from("caja_movimientos")
      .select("*")
      .eq("caja_id", caja.id)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error al obtener movimientos:", error.message);
    } else {
      setMovimientos(data);
      // Calcular totales
    let ingresos = 0;
    let salidas = 0;
    data.forEach(mov => {
      if (mov.tipo === "ingreso") ingresos += parseFloat(mov.monto);
      else if (mov.tipo === "salida") salidas += parseFloat(mov.monto);
    });
    setTotalIngresos(ingresos);
    setTotalSalidas(salidas);
  
    }
  };

  const registrarMovimiento = async (e) => {
    e.preventDefault();

    if (!caja) {
      toast.error("No hay caja abierta para este usuario.", { toastId: "err-no-caja" });
      return;
    }

    if (!monto || parseFloat(monto) <= 0) {
      toast.error("El monto debe ser mayor a cero.", { toastId: "err-monto" });
      return;
    }

    if (tipo !== "ingreso" && tipo !== "salida") {
      toast.error("Tipo de movimiento inválido. Solo ingreso o salida.", { toastId: "err-tipo" });
      return;
    }

    if (!descripcion.trim()) {
      toast.error("La descripción es obligatoria.", { toastId: "err-descripcion" });
      return;
    }

    try {
      const { error } = await supabase.from("caja_movimientos").insert([
        {
          caja_id: caja.id,
          tipo,
          monto: parseFloat(monto),
          descripcion: descripcion.trim(),
          fecha: new Date().toISOString(),
        },
      ]);

      if (error) {
        toast.error("Error al registrar movimiento: " + error.message, { toastId: "err-registro" });
      } else {
        toast.success("Movimiento registrado con éxito", { toastId: "ok-registro" });
        setMonto("");
        setDescripcion("");
        setTipo("ingreso");
        await obtenerCaja();
        await obtenerMovimientos();
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado al registrar movimiento.", { toastId: "err-interno" });
    }
  };

  // Función para crear caja nueva desde modal
  const crearCajaParaUsuario = async () => {
  // 1) Validar base
  if (!baseCaja || isNaN(parseFloat(baseCaja)) || parseFloat(baseCaja) < 0) {
    toast.error("Ingrese una base válida para la caja.");
    return;
  }

  // 2) Definir inicio y fin del día de hoy
  const inicioDia = dayjs().startOf("day").toISOString();
  const finDia    = dayjs().endOf("day").toISOString();

  // 3) Verificar si ya existe caja abierta HOY para este usuario
  const { data: cajasAbiertasHoy, error: errorCheck } = await supabase
    .from("cajas")
    .select("id")
    .eq("usuario_auth_id", auth_id)
    .eq("estado", "abierta")
    .gte("fecha_apertura", inicioDia)
    .lte("fecha_apertura", finDia);

  if (errorCheck) {
    toast.error("Error al verificar caja abierta: " + errorCheck.message);
    return;
  }
  if (cajasAbiertasHoy.length > 0) {
    toast.error("Ya hay una caja abierta para este usuario HOY.");
    setModalAbrirCaja(false);
    return;
  }

  // 4) Crear la caja y obtenerla en 'nuevaCaja'
  const { data: nuevaCaja, error: errorCrear } = await supabase
    .from("cajas")
    .insert([
      {
        usuario_auth_id: auth_id,
        base: parseFloat(baseCaja),
        saldo: parseFloat(baseCaja),
        estado: "abierta",
        fecha_apertura: dayjs().format("YYYY-MM-DDTHH:mm:ss"),
      },
    ])
    .select()
    .single();

  if (errorCrear || !nuevaCaja) {
    toast.error("Error al crear caja: " + (errorCrear?.message || ""));
    return;
  }

  // 5) Registrar el primer movimiento de apertura
  const { error: errMov } = await supabase
    .from("caja_movimientos")
    .insert([
      {
        caja_id: nuevaCaja.id,
        tipo: "ingreso",
        monto: parseFloat(baseCaja),
        descripcion: "Apertura de caja",
        fecha: dayjs().format("YYYY-MM-DDTHH:mm:ss"),
      },
    ]);

  if (errMov) {
    toast.error("Caja creada, pero falló registrar movimiento: " + errMov.message);
  } else {
    toast.success("Caja y primer movimiento registrados");
  }

  // 6) Cerrar modal y recargar vista
  setModalAbrirCaja(false);
  setBaseCaja("");
  await obtenerCaja();
  await obtenerMovimientos();
};

  const obtenerTotalesExternos = async () => {
  // Pagos (Recaudos)
  const { data: pagosData, error: errorPagos } = await supabase
    .from("pagos")
    .select("monto_pagado")
    .eq("usuario_id", auth_id);

  if (!errorPagos && pagosData) {
    const total = pagosData.reduce((sum, item) => sum + parseFloat(item.monto_pagado), 0);
    setTotalPagos(total);
  }

  // Gastos
  const { data: gastosData, error: errorGastos } = await supabase
    .from("gastos")
    .select("valor")
    .eq("usuario_id", auth_id);

  if (!errorGastos && gastosData) {
    const total = gastosData.reduce((sum, item) => sum + parseFloat(item.valor), 0);
    setTotalGastos(total);
  }

  // Ventas (Créditos)
  const { data: ventasData, error: errorVentas } = await supabase
    .from("creditos")
    .select("monto")
    .eq("usuario_id", auth_id);

  if (!errorVentas && ventasData) {
    const total = ventasData.reduce((sum, item) => sum + parseFloat(item.monto), 0);
    setTotalVentas(total);
  }
};

useEffect(() => {
  if (auth_id) {
    obtenerTotalesExternos();
  }
}, [auth_id]);


  useEffect(() => {
    obtenerCaja();
  }, []);

  useEffect(() => {
    obtenerMovimientos();
  }, [caja]);

  return (
    <div className="admin-caja-container">
      <ToastContainer
  position="top-right"
  autoClose={2500}
  hideProgressBar={false}
  newestOnTop={false}
  closeOnClick={false}
  pauseOnFocusLoss={false}
  draggable
  pauseOnHover={false}   // aquí cambió a false
  closeButton={false}    // oculta la X de cerrar
  theme="colored"
  limit={1}
/>


      <h2>Gestión de Caja</h2>

      <button
        onClick={() => navigate("/admin")}className="btn-ir-panel"title="Volver al Panel Admin">
        <FaSignOutAlt />
      </button>

      {caja ? (
        <table className="tabla-caja-abierta">
  <thead>
    <tr>
      <th>Ingreso Base</th>
      <th>Pagos (Recaudos)</th>
      <th>Total Egresos</th> 
      <th>Ventas</th>
      <th>Gastos</th>
      <th>Saldo Actual</th>

    </tr>
  </thead>
  <tbody>
    <tr>
      <td style={{ color: "green" }}>${totalIngresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
      <td style={{ color: "green" }}>${totalPagos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
      <td style={{ color: "red" }}>${(totalSalidas + totalGastos).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
      <td style={{ color: "red" }}>${totalVentas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
      <td style={{ color: "red" }}>${totalGastos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
      <td style={{ color: "green" }}>${saldoCalculado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
    </tr>
  </tbody>
</table>



      ) : (
        <>
          <p>No hay caja abierta para este usuario.</p>
          <button
            onClick={() => setModalAbrirCaja(true)}
            className="btn-abrir-caja"
          >
            Abrir Caja
          </button>
        </>
      )}

      {/* Modal para abrir caja */}
      {modalAbrirCaja && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Abrir nueva caja</h3>
            <label>Base inicial:</label>
            <input
              type="number"
              step="0.01"
              value={baseCaja}
              onChange={(e) => setBaseCaja(e.target.value)}
              placeholder="Monto base inicial"
              min="0"
            />
            <div className="modal-actions">
              <button onClick={crearCajaParaUsuario}>Crear caja</button>
              <button onClick={() => setModalAbrirCaja(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <form className="formulario-caja" onSubmit={registrarMovimiento}>
  <div className="fila-input">
    <label>Monto:</label>
    <input
      type="number"
      step="0.01"
      value={monto}
      onChange={(e) => setMonto(e.target.value)}
      required
    />
  </div>
  <div className="fila-input">
    <label>Tipo:</label>
    <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
      <option value="ingreso">Ingreso</option>
      <option value="salida">Salida</option>
    </select>
  </div>
  <div className="fila-descripcion">
    <label>Descripción:</label>
    <input
  type="text"
  className="input-descripcion"
  value={descripcion}
  onChange={(e) => setDescripcion(e.target.value)}
  placeholder="Descripción del movimiento"
  required
/>
  </div>
  <button type="submit">Registrar movimiento</button>
</form>


      <div className="movimientos-lista">
        <h3>Movimientos recientes</h3>
        <div className="tabla-scrollable">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((mov) => (
                <tr key={mov.id}>
                  <td>{new Date(mov.fecha).toLocaleString()}</td>
                  <td className={mov.tipo}>{mov.tipo}</td>
                  <td>${mov.monto}</td>
                  <td>{mov.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCaja;
