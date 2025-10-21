import React, { useState, useEffect } from 'react';
import { supabase } from '../components/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaHandHoldingUsd, FaShoppingCart, FaPiggyBank, FaCashRegister } from 'react-icons/fa';
import '../Styles/Liquidacion.css';

const Liquidacion = () => {
  const [fechaInicio, setFechaInicio] = useState(() =>
    new Date().toLocaleDateString("en-CA")
  );
  const [fechaFin, setFechaFin] = useState(() =>
    new Date().toLocaleDateString("en-CA")
  );
  const [baseCaja, setBaseCaja] = useState("");
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalDeposito, setTotalDeposito] = useState(0);
  const [ventasEfectivo, setVentasEfectivo] = useState(0);
  const [ventasDeposito, setVentasDeposito] = useState(0);
  const [gastos, setGastos] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    obtenerDatos();
  }, [fechaInicio, fechaFin]);

  const obtenerDatos = async () => {
    const fechaInicioStr = fechaInicio; // formato YYYY-MM-DD
    const fechaFinStr = fechaFin;

  // === PAGOS ===
const { data: pagos, error: errorPagos } = await supabase
  .from("pagos")
  .select("id, fecha_pago, metodo_pago, monto_pagado")
  .order("fecha_pago", { ascending: false });

if (errorPagos) {
  console.error("❌ Error cargando pagos:", errorPagos);
  return;
}

console.log("📅 Pagos brutos:", pagos?.length || 0, pagos);

// 🕒 Convertimos las fechas del filtro a UTC para evitar desfases de zona
const fechaInicioObj = new Date(`${fechaInicioStr}T00:00:00Z`);
const fechaFinObj = new Date(`${fechaFinStr}T23:59:59Z`);

console.log("🕒 Rango de filtro UTC:", fechaInicioObj, "→", fechaFinObj);

const pagosFiltrados =
  pagos?.filter((p) => {
    if (!p.fecha_pago) return false;

    // Convertir el pago a objeto Date (interpreta UTC)
    const fechaPagoObj = new Date(p.fecha_pago);

    const dentro =
      fechaPagoObj >= fechaInicioObj && fechaPagoObj <= fechaFinObj;

    if (!dentro) {
      console.log("🚫 Fuera de rango:", {
        fechaPago: p.fecha_pago,
        fechaPagoObj,
      });
    }

    return dentro;
  }) || [];

console.log("✅ Pagos filtrados:", pagosFiltrados?.length || 0, pagosFiltrados);

// 💰 Totales por método
const efectivo = pagosFiltrados
  .filter((p) => p.metodo_pago?.trim().toLowerCase() === "efectivo")
  .reduce((acc, p) => acc + Number(p.monto_pagado || 0), 0);

const deposito = pagosFiltrados
  .filter((p) => p.metodo_pago?.trim().toLowerCase() === "deposito")
  .reduce((acc, p) => acc + Number(p.monto_pagado || 0), 0);

setTotalEfectivo(efectivo);
setTotalDeposito(deposito);



    // VENTAS
    const { data: ventas } = await supabase.from("creditos").select("*");

    const ventasFiltradas =
      ventas?.filter((v) => {
        const fecha = v.fecha_inicio?.split("T")[0];
        return fecha >= fechaInicioStr && fecha <= fechaFinStr;
      }) || [];

    const ventasEf = ventasFiltradas
      .filter((c) => c.metodo_pago === "efectivo")
      .reduce((acc, c) => acc + Number(c.monto), 0);

    const ventasDp = ventasFiltradas
      .filter((c) => c.metodo_pago === "deposito")
      .reduce((acc, c) => acc + Number(c.monto), 0);

    setVentasEfectivo(ventasEf);
    setVentasDeposito(ventasDp);

    // GASTOS
    const { data: gastosData } = await supabase.from("gastos").select("*");

    const gastosFiltrados =
      gastosData?.filter((g) => {
        const fecha = g.fecha?.split("T")[0];
        return fecha >= fechaInicioStr && fecha <= fechaFinStr;
      }) || [];

    const totalGastos = gastosFiltrados.reduce(
      (acc, g) => acc + Number(g.valor),
      0
    );

    setGastos(totalGastos);
  };

  const totalRecaudo = totalEfectivo + totalDeposito;
  const totalVentas = ventasEfectivo + ventasDeposito;
  const balance = baseCaja + totalRecaudo - totalVentas - gastos;
  const totalEntregar = baseCaja + totalEfectivo - ventasEfectivo - gastos;

  return (
    <div className="liquidacion-contenedor">
      <h2 className="titulo-liquidacion">📋 Liquidación del Día</h2>

      <div className="filtro-fecha">
        <label>Desde:
          <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
        </label>
        <label>Hasta:
          <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
        </label>
      </div>

      <div className="caja-base">
        <label>💵 Caja Base Entregada:
          <input type="number" value={baseCaja} onChange={e => setBaseCaja(Number(e.target.value))} />
        </label>
      </div>

      <div className="resumen-liquidacion">
  <div className="resumen-item">
    <span><FaHandHoldingUsd /> Recaudo en efectivo:</span>
    <span className="resumen-valor">${totalEfectivo.toFixed(2)}</span>
  </div>
  <div className="resumen-item">
    <span><FaPiggyBank /> Recaudo por depósito:</span>
    <span className="resumen-valor">${totalDeposito.toFixed(2)}</span>
  </div>
  <div className="resumen-item">
    <span><FaShoppingCart /> Ventas en efectivo:</span>
    <span className="resumen-valor">${ventasEfectivo.toFixed(2)}</span>
  </div>
  <div className="resumen-item">
    <span><FaShoppingCart /> Ventas por depósito:</span>
    <span className="resumen-valor">${ventasDeposito.toFixed(2)}</span>
  </div>
  <div className="resumen-item">
    <span><FaCashRegister /> Gastos del día:</span>
    <span className="resumen-valor">${gastos.toFixed(2)}</span>
  </div>
</div>


      <div className="balance-box">📊 Balance: ${balance.toFixed(2)}</div>
      <div className="entrega-box">💰 Efectivo que debe entregar: ${totalEntregar.toFixed(2)}</div>

      <button className="boton-volver" onClick={() => navigate(-1)}>⬅ Volver</button>
    </div>
  );
};

export default Liquidacion;
