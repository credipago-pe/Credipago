import React, { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import {BarChart, Bar, XAxis, YAxis, Tooltip, Legend,ResponsiveContainer, CartesianGrid, LineChart, Line} from "recharts";
import "../Styles/DashboardAdmin.css";
import { Cell } from "recharts";


export default function Dashboard() {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [recaudosGastos, setRecaudosGastos] = useState([]);
  const [ventasRecaudos, setVentasRecaudos] = useState([]);
  const [gananciasPorDia, setGananciasPorDia] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("todos");
  const [totalesResumen, setTotalesResumen] = useState([]);
  const [resumenMensual, setResumenMensual] = useState([]);


  const toYMD = (isoString) => {
  return isoString.split("T")[0]; // ← sin new Date, sin zona horaria
};

  useEffect(() => {
  const fetchUsuarios = async () => {
    // Obtener usuario logueado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("No hay sesión activa");
      return;
    }

    // Buscar al admin en la tabla usuarios
    const { data: adminData, error: adminError } = await supabase
      .from("usuarios")
      .select("auth_id")
      .eq("auth_id", user.id)
      .eq("rol", "admin")
      .single();

    if (adminError || !adminData) {
      console.error("No se encontró el administrador.");
      return;
    }

    const adminAuthId = adminData.auth_id;
    localStorage.setItem("admin_auth_id", adminAuthId);

    // Buscar usuarios (cobradores) de ese admin
    const { data: cobradores, error: usuariosError } = await supabase
      .from("usuarios")
      .select("auth_id, nombre")
      .eq("rol", "cobrador")
      .eq("admin_id", adminAuthId);

    if (usuariosError) {
      console.error("Error al traer usuarios:", usuariosError.message);
    } else {
      setUsuarios(cobradores);
    }
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

    // Calcular totales sumados
const totalRecaudos = Object.values(mapRecaudos).reduce((a, b) => a + b, 0);
const totalVentas = Object.values(mapVentas).reduce((a, b) => a + b, 0);
const totalGastos = Object.values(mapGastos).reduce((a, b) => a + b, 0);

// Guardar como resumen general
setTotalesResumen([
  { name: "Recaudos", Total: totalRecaudos },
  { name: "Ventas", Total: totalVentas },
  { name: "Gastos", Total: totalGastos },
]);


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
  fechas.map((fecha) => {
    const recaudo = Number(mapRecaudos[fecha] || 0);
    const gastos = Number(mapGastos[fecha] || 0);
    const ganancia = recaudo > 0 ? ((recaudo)-(recaudo / 1.2)) - gastos : 0;

    return {
      fecha,
      Ganancia: Number(ganancia.toFixed(2)),
    };
  })
);
  };

  fetchData();
}, [startDate, endDate, usuarioSeleccionado]);



const obtenerResumenMensual = async () => {
  const auth_id_admin = localStorage.getItem('auth_id_admin');
  const auth_id_usuario = usuarioSeleccionado === 'todos' ? null : usuarioSeleccionado;

  const { data, error } = await supabase.rpc('resumen_mensual_financiero', {
  auth_id_input: idCobrador,
});


  if (error) {
    console.error('Error al obtener resumen mensual:', error.message, error.details);
  } else {
    console.log("Resumen mensual recibido:", data);
    setResumenMensual(data);
  }
};

useEffect(() => {
  obtenerResumenMensual();
}, [usuarioSeleccionado]);


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
  <h3>🧾 Resumen General</h3>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart
      data={totalesResumen}
      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip formatter={(value) => `$ ${Number(value).toFixed(2)}`} />
      <Legend />
     <Bar dataKey="Total">
  {totalesResumen.map((entry, index) => (
    <Cell
      key={`cell-${index}`}
      fill={
        entry.name === "Recaudos"
          ? "#4CAF50" // Verde
          : entry.name === "Ventas"
          ? "#2196F3" // Azul
          : "#F44336" // Rojo
      }
    />
  ))}
</Bar>

    </BarChart>
  </ResponsiveContainer>
</div>

      <h2 className="subtitulo-dashboard">Resumen Financiero Últimos 6 Meses</h2>

<div className="tabla-resumen-mensual">
  <table>
    <thead>
      <tr>
        <th>Mes</th>
        <th>Recaudo</th>
        <th>Ventas s/interés</th>
        <th>Ventas c/interés</th>
        <th>Gastos</th>
        <th>Ganancia</th>
      </tr>
    </thead>
    <tbody>
      {resumenMensual.map((fila) => (
        <tr key={fila.mes}>
          <td>{fila.mes}</td>
          <td>S/ {Number(fila.recaudo).toFixed(2)}</td>
          <td>S/ {Number(fila.ventas_sin_interes).toFixed(2)}</td>
          <td>S/ {Number(fila.ventas_con_interes).toFixed(2)}</td>
          <td>S/ {Number(fila.gastos).toFixed(2)}</td>
          <td>S/ {Number(fila.ganancias).toFixed(2)}</td>
        </tr>
      ))}
    </tbody>
  </table>
  <BarChart width={600} height={250} data={resumenMensual}>
  <XAxis dataKey="mes" />
  <Tooltip />
  <Legend />
  <Bar dataKey="ganancias" fill="#4caf50" name="Ganancia" />
  <Bar dataKey="recaudo" fill="#2196f3" name="Recaudo" />
  <Bar dataKey="gastos" fill="#f44336" name="Gastos" />
</BarChart>

</div>

    </div>
  );
}
