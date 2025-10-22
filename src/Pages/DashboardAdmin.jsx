import React, { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";
import "../Styles/DashboardAdmin.css";

export default function Dashboard() {
  // FECHAS
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // USUARIOS
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("todos");

  // ESTADOS
  const [totalesResumen, setTotalesResumen] = useState([]);

  // Convierte cualquier fecha a formato YYYY-MM-DD
  const toYMDDate = (date) => {
    const d = new Date(date);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  };

  // TRAER USUARIOS
  useEffect(() => {
    const fetchUsuarios = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return console.error("No hay sesión activa");

      const { data: adminData, error: adminError } = await supabase
        .from("usuarios")
        .select("auth_id")
        .eq("auth_id", user.id)
        .eq("rol", "admin")
        .single();

      if (adminError || !adminData)
        return console.error("No se encontró el administrador.");

      const adminAuthId = adminData.auth_id;

      const { data: cobradores, error: usuariosError } = await supabase
        .from("usuarios")
        .select("auth_id, nombre")
        .eq("rol", "cobrador")
        .eq("admin_id", adminAuthId);

      if (usuariosError) return console.error("Error al traer usuarios:", usuariosError.message);

      setUsuarios(cobradores);
    };

    fetchUsuarios();
  }, []);

  // TRAER DATOS FILTRADOS
useEffect(() => {
  if (!startDate || !endDate || !usuarios || usuarios.length === 0) return;

  const fetchData = async () => {
    try {
      // Lista de IDs a filtrar
      const listaIds = usuarioSeleccionado === "todos"
        ? usuarios.map(u => u.auth_id)
        : [usuarioSeleccionado];

      console.log("IDs filtrados:", listaIds);

      // Traer datos de Supabase
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

      const pagos = resPagos.data || [];
      const gastos = resGastos.data || [];
      const creditos = resCreditos.data || [];

      // Convertir fechas de filtro a objetos Date
      const fechaInicioObj = new Date(`${startDate}T00:00:00`);
      const fechaFinObj = new Date(`${endDate}T23:59:59`);

      // Función para filtrar por fecha (ignora la hora)
      const filtrarPorFecha = (arr, campoFecha) =>
        arr.filter(item => {
          if (!item[campoFecha]) return false;
          const fechaItem = new Date(item[campoFecha]);
          const dentro = fechaItem >= fechaInicioObj && fechaItem <= fechaFinObj;
          if (!dentro) {
            console.log("🚫 Fuera de rango:", {
              campoFecha: item[campoFecha],
              fechaItem,
            });
          }
          return dentro;
        });

      const pagosFiltrados = filtrarPorFecha(pagos, "fecha_pago");
      const gastosFiltrados = filtrarPorFecha(gastos, "fecha");
      const creditosFiltrados = filtrarPorFecha(creditos, "fecha_inicio");

      console.log("✅ Pagos filtrados:", pagosFiltrados.length, pagosFiltrados);

      // Agrupar y sumar por día
      const agruparPorDia = (arr, campoFecha, campoMonto) =>
        arr.reduce((acc, item) => {
          const fecha = new Date(item[campoFecha]).toISOString().split("T")[0];
          acc[fecha] = (acc[fecha] || 0) + Number(item[campoMonto] || 0);
          return acc;
        }, {});

      const mapRecaudos = agruparPorDia(pagosFiltrados, "fecha_pago", "monto_pagado");
      const mapGastos = agruparPorDia(gastosFiltrados, "fecha", "valor");
      const mapVentas = agruparPorDia(creditosFiltrados, "fecha_inicio", "monto");

      // Totales
      const totalRecaudos = Object.values(mapRecaudos).reduce((a, b) => a + b, 0);
      const totalGastos = Object.values(mapGastos).reduce((a, b) => a + b, 0);
      const totalVentas = Object.values(mapVentas).reduce((a, b) => a + b, 0);

      console.log("📊 Totales resumen:", { totalRecaudos, totalVentas, totalGastos });

      // Actualizar estados
      setTotalesResumen([
        { name: "Recaudos", Total: totalRecaudos },
        { name: "Ventas", Total: totalVentas },
        { name: "Gastos", Total: totalGastos },
      ]);

      // Generar array de fechas para gráfico por día
      const fechas = Array.from(new Set([
        ...Object.keys(mapRecaudos),
        ...Object.keys(mapGastos),
        ...Object.keys(mapVentas),
      ])).sort();

      // Aquí estaba el error: asegurar que setRecaudosGastos existe
      setRecaudosGastos(
        fechas.map(fecha => ({
          fecha,
          Recaudos: mapRecaudos[fecha] || 0,
          Gastos: mapGastos[fecha] || 0,
          Ventas: mapVentas[fecha] || 0,
        }))
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

      {/* FILTROS */}
      <div className="dashboard-filtro">
        <label className="dashboard-label">
          Desde:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          Hasta:
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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

      {/* GRAFICA */}
      <div className="chart-wrapper">
        <h3>🧾 Resumen General</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={totalesResumen} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
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
