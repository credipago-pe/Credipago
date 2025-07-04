import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import dayjs from "dayjs";
import { FaSignOutAlt } from "react-icons/fa";
import '../styles/ResumenDiario.css';

export default function ResumenDiario() {
  const { auth_id } = useParams();
  const navigate = useNavigate();
  const [fechaInicio, setFechaInicio] = useState(dayjs().format('YYYY-MM-DD'));
  const [fechaFin, setFechaFin] = useState(dayjs().format('YYYY-MM-DD'));
  const [resumen, setResumen] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
  }
);


  const handleLogout = () => {
    navigate(-1); // 👈 Vuelve a la página anterior
  };

  return (
    <div className="resumen-container">
      <div className="header">
        <h2>Resumen Diario de Caja</h2>
      </div>
       <button 
              onClick={() => navigate("/admin")}className="btn-ir-panel"title="Volver al Panel Admi">
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
            </tr>
          </thead>
          <tbody>
            {resumen.map((row, idx) => (
              <tr key={idx}>
                <td>{row.fecha}</td>
                <td>{row.ingresos}</td>
                <td>{row.ventas}</td>
                <td>{row.gastos}</td> 
                <td>{row.caja_dia}</td>
                <td>{row.total_cartera}</td>
                <td>{row.caja_dia_anterior}</td>
                <td>{row.entrada_efectivo}</td>
                <td>{row.salida_efectivo}</td>
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
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
