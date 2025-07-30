import React, { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import {BarChart, Bar, XAxis, YAxis, Tooltip, Legend,ResponsiveContainer, CartesianGrid, LabelList, Line} from "recharts";
import "../Styles/DashboardAdmin.css";
import { Cell } from "recharts";


export default function Dashboard() {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("todos");
  const [totalesResumen, setTotalesResumen] = useState([]);
  const [recaudosGastos, setRecaudosGastos] = useState([]);



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
  if (!startDate || !endDate || !usuarios || usuarios.length === 0) return;

  const fetchData = async () => {
    try {
      let listaIds = [];

      if (usuarioSeleccionado === "todos") {
        listaIds = usuarios.map((u) => u.auth_id);
      } else {
        listaIds = [usuarioSeleccionado];
      }

      const [resPagos, resGastos, resCreditos] = await Promise.all([
        supabase
          .from("pagos")
          .select("fecha_pago, monto_pagado, usuario_id")
          .in("usuario_id", listaIds),
        supabase
          .from("gastos")
          .select("fecha, valor, usuario_id")
          .in("usuario_id", listaIds),
        supabase
          .from("creditos")
          .select("fecha_inicio, monto, usuario_id")
          .in("usuario_id", listaIds),
      ]);

      if (resPagos.error) console.error("Error en pagos:", resPagos.error.message);
      if (resGastos.error) console.error("Error en gastos:", resGastos.error.message);
      if (resCreditos.error) console.error("Error en créditos:", resCreditos.error.message);

      const pagos = resPagos.data || [];
      const gastos = resGastos.data || [];
      const creditos = resCreditos.data || [];

      const limpiarFecha = (iso) => iso.split("T")[0];

      const filtrarPorFecha = (arr, campoFecha) =>
        arr.filter((item) => {
          const fecha = limpiarFecha(item[campoFecha]);
          return fecha >= startDate && fecha <= endDate;
        });

      const pagosFiltrados = filtrarPorFecha(pagos, "fecha_pago");
      const gastosFiltrados = filtrarPorFecha(gastos, "fecha");
      const creditosFiltrados = filtrarPorFecha(creditos, "fecha_inicio");

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

      const totalRecaudos = Object.values(mapRecaudos).reduce((a, b) => a + b, 0);
      const totalVentas = Object.values(mapVentas).reduce((a, b) => a + b, 0);
      const totalGastos = Object.values(mapGastos).reduce((a, b) => a + b, 0);

      console.log("Totales resumen:", {
        totalRecaudos,
        totalVentas,
        totalGastos,
      });

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
          const ganancia =
            recaudo > 0 ? recaudo - recaudo / 1.2 - gastos : 0;

          return {
            fecha,
            Ganancia: Number(ganancia.toFixed(2)),
          };
        })
      );
    } catch (e) {
      console.error("Error inesperado en fetchData:", e);
    }
  };

  fetchData();
}, [startDate, endDate, usuarioSeleccionado, usuarios]);


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
      margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
      className="custom-bar-chart"
    >
      <defs>
        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2196F3" stopOpacity={1} />
          <stop offset="100%" stopColor="#64B5F6" stopOpacity={1} />
        </linearGradient>
        <linearGradient id="colorRecaudos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4CAF50" stopOpacity={1} />
          <stop offset="100%" stopColor="#81C784" stopOpacity={1} />
        </linearGradient>
        <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F44336" stopOpacity={1} />
          <stop offset="100%" stopColor="#E57373" stopOpacity={1} />
        </linearGradient>
      </defs>

      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip formatter={(value) => `S/ ${Number(value).toFixed(2)}`} />
      <Legend />

      <Bar dataKey="Total" radius={[6, 6, 0, 0]}>
        {totalesResumen.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={
              entry.name === "Recaudos"
                ? "url(#colorRecaudos)"
                : entry.name === "Ventas"
                ? "url(#colorVentas)"
                : "url(#colorGastos)"
            }
          />
        ))}
        <LabelList dataKey="Total" position="top" formatter={(v) => `S/ ${v}`} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>

</div>
  );
}
