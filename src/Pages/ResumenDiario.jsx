import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import dayjs from "dayjs";
import { FaSignOutAlt } from "react-icons/fa";
import '../Styles/ResumenDiario.css';

export default function ResumenDiario() {
  const { auth_id } = useParams();
  const navigate = useNavigate();
  const [fechaInicio, setFechaInicio] = useState(dayjs().format('YYYY-MM-DD'));
  const [fechaFin, setFechaFin] = useState(dayjs().format('YYYY-MM-DD'));
  const [resumen, setResumen] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [detalle, setDetalle] = useState([]);
  const [tituloModal, setTituloModal] = useState("");
  const [detalleRegistros, setDetalleRegistros] = useState([]);
  const [detalleTipo, setDetalleTipo] = useState("");
  const [detalleFecha, setDetalleFecha] = useState("");
  const toYMD = (f) => dayjs(f).format("YYYY-MM-DD");



  const obtenerResumen = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('resumen_diario_caja', {
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      auth_id: auth_id,
    });

    if (error) {
      console.error("Error al obtener resumen:", error);
      setError("No se pudo obtener el resumen.");
    } else {
      setResumen(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (auth_id) obtenerResumen();
  }, [fechaInicio, fechaFin, auth_id]);

  const totales = resumen.reduce(
  (acc, row, idx) => {
    acc.ingresos += Number(row.ingresos || 0);
    acc.entrada_efectivo += Number(row.entrada_efectivo || 0);
    acc.ventas += Number(row.ventas || 0);
    acc.gastos += Number(row.gastos || 0);
    acc.salida_efectivo += Number(row.salida_efectivo || 0);
    acc.interes_cobrado += Number(row.interes_cobrado || 0); // 👈 agregar esto
    acc.ganancia_neta += Number(row.ganancia_neta || 0);     // 👈 y esto también

    // Solo tomar el valor del último registro
    if (idx === resumen.length - 1) {
      acc.caja_dia_anterior = Number(row.caja_dia_anterior || 0);
      acc.caja_dia = Number(row.caja_dia || 0);
      acc.total_cartera = Number(row.total_cartera || 0);
    }

    return acc;
  },
  {
    ingresos: 0,
    caja_dia_anterior: 0,
    entrada_efectivo: 0,
    ventas: 0,
    gastos: 0,
    salida_efectivo: 0,
    caja_dia: 0,
    total_cartera: 0,
    interes_cobrado: 0, // 👈 inicializar aquí también
    ganancia_neta: 0,   // 👈 y aquí
  }
);

  // 👇 Nueva función que trae el detalle real desde Supabase
const handleCellClick = async (tipo, fechaRaw) => {
  const fecha = toYMD(fechaRaw);
  console.log("🔎 Click:", tipo, fecha);

  const desde = `${fecha} 00:00:00`;
  const hasta = `${fecha} 23:59:59`;
  let query = null;

  if (tipo === "ingresos") {
    // 🔹 Pagos realizados (ingresos)
    query = supabase
      .from("pagos")
      .select(`
        id,
        fecha_pago,
        monto_pagado,
        metodo_pago,
        saldo,
        creditos:credito_id (
          id,
          saldo,
          clientes:cliente_id (
            nombre
          )
        )
      `)
      .eq("usuario_id", auth_id)
      .gte("fecha_pago", desde)
      .lte("fecha_pago", hasta);

  } else if (tipo === "gastos") {
    // 🔹 Gastos (usa "concepto" y "valor")
    query = supabase
      .from("gastos")
      .select("id, fecha, concepto, valor")
      .eq("usuario_id", auth_id)
      .gte("fecha", desde)
      .lte("fecha", hasta);

  } else if (tipo === "ventas") {
    // 🔹 Créditos creados (ventas)
    query = supabase
      .from("creditos")
      .select(`
        id,
        fecha_inicio,
        monto,
        saldo,
        clientes:cliente_id (
          nombre
        )
      `)
      .eq("usuario_id", auth_id)
      .gte("fecha_inicio", desde)
      .lte("fecha_inicio", hasta);

  } else {
    return;
  }

  const { data, error } = await query;
  if (error) {
    console.error("❌ Error cargando detalles:", error);
    setDetalleRegistros([]);
  } else {
    console.log("✅ Datos cargados:", data);
    setDetalleRegistros(data || []);
  }

  setDetalleTipo(tipo);
  setDetalleFecha(fecha);
  setMostrarModal(true);
};



  const handleLogout = () => {
    navigate(-1); // 👈 Vuelve a la página anterior
  };

  return (
    <div className="resumen-container">
      <div className="header">
        <h2>Resumen Diario de Caja</h2>
      </div>
       <button   onClick={() => navigate(-1)}  className="btn-ir-panel"         title="Volver">
       <FaSignOutAlt />
       </button>


      <div className="filtros">
        <div className="filtro-item">
          <label>Desde:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div className="filtro-item">
          <label>Hasta:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
        <button className="consultar-button" onClick={obtenerResumen} disabled={loading}>
          {loading ? "Cargando..." : "Consultar"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="resumen-table-container">
        <table className="resumen-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Recaudo</th> 
              <th>Ventas</th>
              <th>Gastos</th>
              <th>Caja</th>
              <th>Total Cartera</th>
              <th>Caja Anterior</th>
              <th>Entrada Efectivo</th>
              <th>Salida Efectivo</th>
              <th>Interés Cobrado</th>
              <th>Ganancia Neta</th>

            </tr>
          </thead>
          <tbody>
            {resumen.map((row, idx) => (
             <tr key={idx}>
  <td className="col-fecha">{row.fecha}</td>
 <td className="col-ingresos" onClick={() => handleCellClick("ingresos", row.fecha)}>
    {row.ingresos}
  </td>
  <td className="col-ventas" onClick={() => handleCellClick("ventas", row.fecha)}>
    {row.ventas}
  </td>
  <td className="col-gastos" onClick={() => handleCellClick("gastos", row.fecha)}>
    {row.gastos}
  </td>
  <td className="col-caja-dia">{row.caja_dia}</td>
  <td className="col-cartera">{row.total_cartera}</td>
  <td className="col-caja-anterior">{row.caja_dia_anterior}</td>
  <td className="col-entrada">{row.entrada_efectivo}</td>
  <td className="col-salida">{row.salida_efectivo}</td>
  <td className="col-interes">{row.interes_cobrado}</td>
  <td className="col-ganancia">{row.ganancia_neta}</td>
</tr>

            ))}
            {resumen.length > 0 && (
              <tr className="totales-row">
                <td>Total</td>
                <td>{totales.ingresos}</td> 
                <td>{totales.ventas}</td>
                <td>{totales.gastos}</td>
                <td>{totales.caja_dia}</td>
                <td>{totales.total_cartera}</td>
                <td>{totales.caja_dia_anterior}</td>
                <td>{totales.entrada_efectivo}</td>
                <td>{totales.salida_efectivo}</td>
                <td>{totales.interes_cobrado}</td>
                <td>{totales.ganancia_neta}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
            {mostrarModal && (
  <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h3 className="modal-title">
        {detalleTipo === "ingresos" && `Recaudo del ${detalleFecha}`}
        {detalleTipo === "gastos" && `Gastos del ${detalleFecha}`}
        {detalleTipo === "ventas" && `Ventas del ${detalleFecha}`}
      </h3>

      {detalleRegistros.length > 0 ? (
        <table className="detalle-table">
          <thead>
            <tr>
              <th>Fecha</th>
              {detalleTipo !== "gastos" && <th>Cliente</th>}
              <th>Monto</th>
              {detalleTipo === "ingresos" && <th>Método / Saldo</th>}
              {detalleTipo === "gastos" && <th>Descripción</th>}
            </tr>
          </thead>
          <tbody>
            {detalleRegistros.map((row, i) => (
              <tr key={i}>
                {/* Fecha */}
                <td>
                  {new Date(
                    row.fecha_pago || row.fecha_inicio || row.fecha
                  ).toLocaleString("es-PE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>

                {/* Cliente (solo en ingresos y ventas) */}
                {detalleTipo !== "gastos" && (
                  <td>{row.clientes?.nombre || row.creditos?.clientes?.nombre || "—"}</td>
                )}

                {/* Monto */}
                <td>{row.monto_pagado || row.monto}</td>

                {/* Método + Saldo (solo ingresos) */}
                {detalleTipo === "ingresos" && (
                  <td>
                    {row.metodo_pago
                      ? `${row.metodo_pago} / Saldo: ${row.creditos?.saldo ?? row.saldo ?? 0}`
                      : `Saldo: ${row.saldo ?? 0}`}
                  </td>
                )}

                {/* Descripción (solo gastos) */}
                {detalleTipo === "gastos" && <td>{row.descripcion}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-registros">No hay registros</p>
      )}

      {/* Total del día */}
      <div className="modal-total">
        Total:{" "}
        {detalleRegistros
          .reduce((sum, r) => {
            if (detalleTipo === "ingresos") return sum + Number(r.monto_pagado || 0);
            if (detalleTipo === "gastos") return sum + Number(r.monto || 0);
            if (detalleTipo === "ventas") return sum + Number(r.monto || 0);
            return sum;
          }, 0)
          .toFixed(2)}
      </div>

      <div className="modal-footer">
        <button type="button" onClick={() => setMostrarModal(false)}>
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}




    </div>
  );
}
