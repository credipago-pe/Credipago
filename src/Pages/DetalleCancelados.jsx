import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import { ArrowLeft } from "lucide-react";
import dayjs from "dayjs";
import "../styles/DetalleCancelados.css";

const formatearFecha = (fecha) => {
  return dayjs(fecha).format("YYYY-MM-DD HH:mm:ss");
};

const DetalleCancelados = () => {

  const { creditoId } = useParams();
  const [credito, setCredito] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [fechaCancelacion, setFechaCancelacion] = useState(null);

  useEffect(() => {
    const fetchCredito = async () => {
      const { data, error } = await supabase
        .from("creditos")
        .select("id, monto, cliente_id, clientes!inner(nombre, dni)")
        .eq("id", creditoId)
        .single();

      if (!error) setCredito(data);
    };

    const fetchPagos = async () => {
      const { data, error } = await supabase
        .from("pagos")
        .select("id, fecha_pago, monto_pagado, metodo_pago")
        .eq("credito_id", creditoId)
        .order("fecha_pago", { ascending: false });

      if (!error) {
        setPagos(data);
        if (data.length > 0) {
          setFechaCancelacion(data[0].fecha_pago);
        }
      }
    };

    fetchCredito();
    fetchPagos();
  }, [creditoId]);

  const totalRecaudado = pagos.reduce((acc, pago) => acc + pago.monto_pagado, 0);

  return (
    <div className="detalle-cancelados-container">
      <h2>Detalle del Crédito Cancelado</h2>

      {credito ? (
        <div className="detalle-cancelados-info">
          <p><strong>ID Crédito:</strong> {credito.id}</p>
          <p><strong>Cliente:</strong> {credito.clientes?.nombre}</p>
          <p><strong>DNI:</strong> {credito.clientes?.dni}</p>
          <p><strong>Monto del Crédito:</strong> ${credito.monto}</p>
         <p><strong>Fecha de Cancelación:</strong>{" "} {fechaCancelacion ? dayjs(fechaCancelacion).format("YYYY-MM-DD HH:mm") : "No disponible"}</p>
        </div>
      ) : (
        <p>Cargando detalle del crédito...</p>
      )}

      <h3>Historial de Pagos</h3>

      {pagos.length > 0 ? (
        <>
          <div className="detalle-cancelados-resumen">
            <span><strong>Total pagos:</strong> {pagos.length}</span>
            <span><strong>Total recaudado:</strong> ${totalRecaudado}</span>
          </div>
          <div className="detalle-cancelados-tabla">
            <table>
              <thead>
                <tr>
                  <th>ID Pago</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr key={pago.id}>
                    <td>{pago.id}</td>
                    <td>{formatearFecha(pago.fecha_pago)}</td>
                    <td>${pago.monto_pagado}</td>
                    <td>{pago.metodo_pago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>No hay pagos registrados para este crédito.</p>
      )}

      <Link to="/clientescancelados" className="btn-volver">
        <ArrowLeft size={16} style={{ marginRight: "6px" }} />
        Volver
      </Link>
    </div>
  );
};

export default DetalleCancelados;
