import React, { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import {BarChart, Bar, XAxis, YAxis, Tooltip, Legend,ResponsiveContainer, CartesianGrid, LineChart, Line} from "recharts";
import "../Styles/DashboardAdmin.css";

export default function Dashboard() {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [recaudosGastos, setRecaudosGastos] = useState([]);
  const [ventasRecaudos, setVentasRecaudos] = useState([]);
  const [gananciasPorDia, setGananciasPorDia] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("todos");
  

  const toYMD = (isoString) => {
  return isoString.split("T")[0]; // ← sin new Date, sin zona horaria
};

  useEffect(() => {
    const fetchUsuarios = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("auth_id, nombre");
      if (!error) setUsuarios(data);
    };
    fetchUsuarios();
  }, []);

 useEffect(() => {
  if (!startDate || !endDate) return;

  const fetchData = async () => {
    const filtrosUsuario = (query) => {
      return usuarioSeleccionado !== "todos"
        ? query.eq("usuario_id", usuarioSeleccionado)
        : query;
    };

    const [{ data: pagos }, { data: gastos }, { data: creditos }] = await Promise.all([
      filtrosUsuario(
        supabase.from("pagos").select("fecha_pago, monto_pagado, usuario_id")
      ),
      filtrosUsuario(
        supabase.from("gastos").select("fecha, valor, usuario_id")
      ),
      filtrosUsuario(
        supabase.from("creditos").select("fecha_inicio, monto, usuario_id")
      ),
    ]);

    const limpiarFecha = (iso) => iso.split("T")[0]; // Sin zona horaria

    const filtrarPorFecha = (arr, campoFecha) =>
      arr.filter((item) => {
        const fecha = limpiarFecha(item[campoFecha]);
        return fecha >= startDate && fecha <= endDate;
      });

    const pagosFiltrados = filtrarPorFecha(pagos || [], "fecha_pago");
    const gastosFiltrados = filtrarPorFecha(gastos || [], "fecha");
    const creditosFiltrados = filtrarPorFecha(creditos || [], "fecha_inicio");

    const mapRecaudos = pagosFiltrados.reduce((acc, p) => {
      const fecha = limpiarFecha(p.fecha_pago);
      acc[fecha] = (acc[fecha] || 0) + Number(p.monto_pagado);
      return acc;
    }, {});

    const mapGastos = gastosFiltrados.reduce((acc, g) => {
      const fecha = limpiarFecha(g.fecha);
      acc[fecha] = (acc[fecha] || 0) + Number(g.valor);
      return acc;
    }, {});

    const mapVentas = creditosFiltrados.reduce((acc, c) => {
      const fecha = limpiarFecha(c.fecha_inicio);
      acc[fecha] = (acc[fecha] || 0) + Number(c.monto);
      return acc;
    }, {});

    const fechas = Array.from(
      new Set([
        ...Object.keys(mapRecaudos),
        ...Object.keys(mapGastos),
        ...Object.keys(mapVentas),
      ])
    ).sort();

    setRecaudosGastos(
      fechas.map((fecha) => ({
        fecha,
        Recaudos: mapRecaudos[fecha] || 0,
        Gastos: mapGastos[fecha] || 0,
      }))
    );

    setVentasRecaudos(
      fechas.map((fecha) => ({
        fecha,
        Ventas: mapVentas[fecha] || 0,
        Recaudos: mapRecaudos[fecha] || 0,
      }))
    );

    setGananciasPorDia(
      fechas.map((fecha) => ({
        fecha,
        Ganancia: (mapRecaudos[fecha] || 0) - (mapGastos[fecha] || 0),
      }))
    );
  };

  fetchData();
}, [startDate, endDate, usuarioSeleccionado]);

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">📊 Dashboard Financiero</h2>

      <div className="dashboard-filtro">
        <label className="dashboard-label">
          Desde:{" "}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          Hasta:{" "}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label className="dashboard-label">
          Ruta/Cobrador:
          <select
            value={usuarioSeleccionado}
            onChange={(e) => setUsuarioSeleccionado(e.target.value)}
          >
            <option value="todos">Todos</option>
            {usuarios.map((u) => (
              <option key={u.auth_id} value={u.auth_id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chart-wrapper">
        <h3>📊 Recaudos vs Gastos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={recaudosGastos}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip formatter={(value) => `$ ${value.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="Recaudos" fill="#8884d8" />
            <Bar dataKey="Gastos" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-wrapper">
        <h3>📈 Ventas vs Recaudos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={ventasRecaudos}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip formatter={(value) => `$ ${value.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="Ventas" fill="#ffc658" />
            <Bar dataKey="Recaudos" fill="#0088fe" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-wrapper">
        <h3>💰 Ganancias por Día (Recaudo - Gasto)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={gananciasPorDia}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip formatter={(value) => `$ ${value.toFixed(2)}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="Ganancia"
              stroke="#00C49F"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
