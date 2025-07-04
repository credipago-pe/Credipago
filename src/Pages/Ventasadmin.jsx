import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import dayjs from "dayjs";
import "../Styles/Ventas.css";


export default function Ventasadmin() {
  const [ventas, setVentas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(dayjs().format("YYYY-MM-DD"));
  const [fechaFin, setFechaFin] = useState(dayjs().format("YYYY-MM-DD"));
  const desde = new Date(fechaInicio + 'T00:00:00').toISOString();
  const hasta = new Date(fechaFin + 'T23:59:59').toISOString();

  const navigate = useNavigate();

  useEffect(() => {
    fetchVentas();
  }, [fechaInicio, fechaFin]);

const fetchVentas = async () => {
  const desde = new Date(fechaInicio + 'T00:00:00').toISOString();
  const hasta = new Date(fechaFin + 'T23:59:59').toISOString();
  const idCobradorActual = localStorage.getItem("auth_id_cobrador_actual") || usuarioId;

  const { data, error } = await supabase
    .from("creditos")
    .select(`monto, interes, forma_pago, valor_cuota, cuotas, saldo, metodo_pago, fecha_inicio, clientes(nombre,usuario_id)`)
    .gte("fecha_inicio", desde)
    .lte("fecha_inicio", hasta)
    .order("fecha_inicio", { ascending: false });

  if (error) {
    console.error("Error al obtener ventas:", error.message);
  } else {
    const ventasFiltradas = data.filter(
      (v) => v.clientes?.usuario_id === idCobradorActual
    );
    setVentas(ventasFiltradas);
  }
};

  const totalEfectivo = ventas
    .filter((v) => v.metodo_pago.toLowerCase() === "efectivo")
    .reduce((sum, v) => sum + Number(v.monto), 0);

  const totalDeposito = ventas
    .filter((v) => v.metodo_pago.toLowerCase() === "deposito")
    .reduce((sum, v) => sum + Number(v.monto), 0);

  const totalVentas = totalEfectivo + totalDeposito;

  return (
  <div className="ventas-container">

    <h2 className="titulo-ventas">📊 Ventas del Día</h2>

<div className="filtro-fecha-ventas">
  <label>Desde:</label>
  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
  <label>Hasta:</label>
  <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
</div>

<div className="tabla-scroll-ventas">
  <table className="tabla-ventas">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Cliente</th>
        <th>Monto</th>
        <th>Interés</th>
        <th>Forma de pago</th>
        <th>Valor cuota</th>
        <th>Cuotas</th>
        <th>Saldo</th>
        <th>Método de pago</th>
      </tr>
    </thead>
    <tbody>
      {ventas.map((venta, index) => (
        <tr key={index}>
          <td>{dayjs(venta.fecha_inicio).format("YYYY-MM-DD")}</td>
          <td>{venta.clientes?.nombre}</td>
          <td>${venta.monto.toFixed(2)}</td>
          <td>{venta.interes}%</td>
          <td>{venta.forma_pago}</td>
          <td>${venta.valor_cuota}</td>
          <td>{venta.cuotas}</td>
          <td>${venta.saldo?.toFixed(2)}</td>
          <td>{venta.metodo_pago}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

<div className="resumen-ventas">
  <div className="resumen-columna">
    <p>💵 Total efectivo: ${totalEfectivo.toFixed(2)}</p>
    <p>🏦 Total depósito: ${totalDeposito.toFixed(2)}</p>
  </div>
  <div className="resumen-columna derecha">
    <p>🧾 Total créditos: {ventas.length}</p>
    <p>💸 Total ventas: ${totalVentas.toFixed(2)}</p>
  </div>
</div>

<button className="boton-volver" onClick={() => navigate("/admin/vistacobrador")}>
  ⬅ Volver
</button>
  </div>
);

}
