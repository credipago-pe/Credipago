import { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import dayjs from "dayjs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import "../Styles/DashboardAdmin.css";

// estilos internos
const cardStyle = (bgColor, width = "170px", height = "80px") => ({
  flex: `0 0 ${width}`,   // flex-basis fijo
  padding: 16,
  minHeight: height,
  borderRadius: 12,
  background: bgColor,
  color: "#050505ff",
  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
});

const cardTitleStyle = { fontSize: 15, marginBottom: 8 };
const cardValueStyle = { fontSize: 22, fontWeight: 700 };

export default function DashboardAdmin() {
  const [fechaInicio, setFechaInicio] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [fechaFin, setFechaFin] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));
  const [cobradores, setCobradores] = useState([]);
  const [cobradorSeleccionado, setCobradorSeleccionado] = useState("");
  const [dataResumen, setDataResumen] = useState([]);
  const [totales, setTotales] = useState({
    total_monto: 0,
    total_efectivo: 0,
    total_deposito: 0,
    total_pagos: 0,
  });

  // Obtener cobradores del admin logueado
  useEffect(() => {
    const obtenerCobradores = async () => {
      const session = await supabase.auth.getSession();
      const adminId = session.data.session.user.id;

      const { data, error } = await supabase
        .from("usuarios")
        .select("nombre, auth_id")
        .eq("admin_id", adminId)
        .eq("rol", "cobrador");

      if (error) {
        console.error("Error obteniendo cobradores:", error);
        return;
      }

      setCobradores(data);
    };

    obtenerCobradores();
  }, []);

  // Consultar resumen usando función RPC SQL
  useEffect(() => {
    const obtenerResumen = async () => {
      const session = await supabase.auth.getSession();
      const adminId = session.data.session.user.id;

      const { data, error } = await supabase.rpc("obtener_resumen_pagos", {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        admin: adminId,
        cobrador: cobradorSeleccionado || null,
      });

      if (error) {
        console.error("Error en RPC obtener_resumen_pagos:", error);
        setDataResumen([]);
        return;
      }

      setDataResumen(data);

      // Calcular totales generales
      const total_monto = data.reduce((sum, d) => sum + Number(d.total_monto || 0), 0);
      const total_efectivo = data.reduce((sum, d) => sum + Number(d.total_efectivo || 0), 0);
      const total_deposito = data.reduce((sum, d) => sum + Number(d.total_deposito || 0), 0);
      const total_pagos = data.reduce((sum, d) => sum + Number(d.total_pagos || 0), 0);

      setTotales({
        total_monto,
        total_efectivo,
        total_deposito,
        total_pagos,
      });
    };

    obtenerResumen();
  }, [fechaInicio, fechaFin, cobradorSeleccionado]);

  return (
    <div className="dashboard-container" style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ marginBottom: 20 }}>📊 Dashboard Financiero — Admin</h2>

      {/* Filtros */}
      <div className="filtros" style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <label>Desde:</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={{ marginLeft: 6 }} />
        </div>
        <div>
          <label>Hasta:</label>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={{ marginLeft: 6 }} />
        </div>
        <div>
          <label>Cobrador:</label>
          <select value={cobradorSeleccionado} onChange={(e) => setCobradorSeleccionado(e.target.value)} style={{ marginLeft: 6 }}>
            <option value="">Todos</option>
            {cobradores.map((c) => (
              <option key={c.auth_id} value={c.auth_id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumen tarjetas */}
      <div className="resumen-cards" style={{ display: "flex", gap: 16, marginBottom: 30, flexWrap: "wrap" }}>
        <motion.div className="card verde" style={cardStyle("#4ade80")} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div style={cardTitleStyle}>💰 Total Recaudado</div>
          <div style={cardValueStyle}>S/ {totales.total_monto.toFixed(2)}</div>
        </motion.div>

        <motion.div className="card amarillo" style={cardStyle("#facc15")} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div style={cardTitleStyle}>💵 Efectivo</div>
          <div style={cardValueStyle}>S/ {totales.total_efectivo.toFixed(2)}</div>
        </motion.div>

        <motion.div className="card azul" style={cardStyle("#3b82f6")} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <div style={cardTitleStyle}>🏦 Depósito</div>
          <div style={cardValueStyle}>S/ {totales.total_deposito.toFixed(2)}</div>
        </motion.div>

        <motion.div className="card morado" style={cardStyle("#8b5cf6")} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <div style={cardTitleStyle}>🧾 Pagos</div>
          <div style={cardValueStyle}>{totales.total_pagos}</div>
        </motion.div>
      </div>

      {/* Gráfico barras */}
      <div className="grafico-barra" style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 6px 20px rgba(0,0,0,0.04)" }}>
        <h3 style={{ marginBottom: 12 }}>Recaudación diaria</h3>
        {dataResumen.length === 0 ? (
          <div style={{ padding: 24 }}>No hay datos en el rango seleccionado.</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dataResumen}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" tickFormatter={(v) => dayjs(v).format("DD/MM")} />
              <YAxis />
              <Tooltip formatter={(value) => `S/ ${parseFloat(value).toFixed(2)}`} />
              <Bar dataKey="total_monto" fill="#4ade80" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
