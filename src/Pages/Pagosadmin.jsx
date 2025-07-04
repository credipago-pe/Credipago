import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import dayjs from "dayjs";
import "../Styles/Pagos.css";

export default function Pagosadmin() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(dayjs().format("YYYY-MM-DD"));
  const [fechaFin, setFechaFin] = useState(dayjs().format("YYYY-MM-DD"));
  const [totalPagos, setTotalPagos] = useState(0);
  const [totalMonto, setTotalMonto] = useState(0);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalDeposito, setTotalDeposito] = useState(0);
  

  useEffect(() => {
    obtenerPagos();
  }, [fechaInicio, fechaFin]);

  const obtenerPagos = async () => {
    const session = await supabase.auth.getSession();
    const idCobradorActual = localStorage.getItem("auth_id_cobrador_actual");

    const { data, error } = await supabase
      .from("pagos")
      .select(`
        id,
        fecha_pago,
        monto_pagado,
        metodo_pago,
        saldo,
        creditos:credito_id (
          cliente_id,
          clientes:cliente_id (
            nombre,
            usuario_id
          )
        )
      `)
      .gte("fecha_pago", fechaInicio + "T00:00:00")
      .lte("fecha_pago", fechaFin + "T23:59:59")
      .order("fecha_pago", { ascending: false });

    if (error) {
      console.error("Error al obtener pagos:", error.message);
      return;
    }

    // Filtra pagos solo de los clientes del usuario actual
     const pagosFiltrados = data.filter(
    (p) => p.creditos?.clientes?.usuario_id === idCobradorActual
  );

    setPagos(pagosFiltrados);

    // Calcular resumen
    const total = pagosFiltrados.length;
    const montoTotal = pagosFiltrados.reduce((sum, pago) => sum + parseFloat(pago.monto_pagado || 0), 0);
    const efectivo = pagosFiltrados
      .filter((p) => p.metodo_pago?.toLowerCase() === "efectivo")
      .reduce((sum, p) => sum + parseFloat(p.monto_pagado || 0), 0);
    const deposito = pagosFiltrados
      .filter((p) => p.metodo_pago?.toLowerCase() === "deposito")
      .reduce((sum, p) => sum + parseFloat(p.monto_pagado || 0), 0);

    setTotalPagos(total);
    setTotalMonto(montoTotal);
    setTotalEfectivo(efectivo);
    setTotalDeposito(deposito);
  };

  return (
    <div className="pagos-contenedor">
      <h2 className="titulo-pagos">Pagos del Día</h2>

      <div className="filtro-fecha">
        <label>Desde:</label>
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        <label>Hasta:</label>
        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
      </div>

      <div className="tabla-scroll">
        <table className="tabla-pagos">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <tr>
                <td colSpan="5">No se encontraron pagos.</td>
              </tr>
            ) : (
              pagos.map((pago) => (
                <tr key={pago.id}>
                  <td>{dayjs(pago.fecha_pago).format("YYYY-MM-DD HH:mm")}</td>
                  <td>{pago.creditos?.clientes?.nombre || "Desconocido"}</td>
                  <td>${parseFloat(pago.monto_pagado).toFixed(2)}</td>
                  <td>{pago.metodo_pago}</td>
                  <td>${parseFloat(pago.saldo || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="resumen-pagos">
        <div className="resumen-columna">
          <div>Total efectivo: ${totalEfectivo.toFixed(2)}</div>
          <div>Total depósito: ${totalDeposito.toFixed(2)}</div>
        </div>
        <div className="resumen-columna derecha">
          <div>Total de pagos: {totalPagos}</div>
          <div>Monto recaudado: ${totalMonto.toFixed(2)}</div>
        </div>
      </div>

      <button className="boton-volver" onClick={() => navigate(-1)}>Volver</button>
    </div>
  );
}
