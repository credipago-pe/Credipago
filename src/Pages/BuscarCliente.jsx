import React, { useState } from "react";
import {
  FaSearch,
  FaUser,
  FaStar,
  FaCreditCard,
  FaMoneyBillWave,
  FaIdCard,
  FaPhoneAlt,
  FaHome,
} from "react-icons/fa";
import { supabase } from "../components/supabaseClient";
import "../Styles/BuscarCliente.css";

const BuscarCliente = () => {
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState([]);
  const [creditosAbiertos, setCreditosAbiertos] = useState({});
  const [pagosAbiertos, setPagosAbiertos] = useState({});
  const [calificaciones, setCalificaciones] = useState({});

  const buscarCliente = async () => {
    if (!busqueda.trim()) return;

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .ilike("nombre", `%${busqueda}%`);

    if (!error) {
      setClientes(data);
      setCalificaciones({});
    }
  };

  const calcularEstrellas = (pagos) => {
    if (!pagos || pagos.length === 0) return 0;
    const fechas = pagos.map((p) => new Date(p.fecha_pago));
    const fechaMin = new Date(Math.min(...fechas));
    const fechaMax = new Date(Math.max(...fechas));
    const dias = Math.round((fechaMax - fechaMin) / (1000 * 60 * 60 * 24));

    if (dias <= 20) return 5;
    if (dias <= 24) return 4;
    if (dias <= 30) return 3;
    if (dias <= 35) return 2;
    return 1;
  };

  const toggleCreditos = async (clienteId) => {
    if (creditosAbiertos[clienteId]) {
      setCreditosAbiertos((prev) => ({ ...prev, [clienteId]: null }));
      return;
    }

    const { data: creditos, error } = await supabase
      .from("creditos")
      .select("*")
      .eq("cliente_id", clienteId);

    if (!error && creditos) {
      const creditosConPagos = await Promise.all(
        creditos.map(async (c) => {
          const { data: pagos } = await supabase
            .from("pagos")
            .select("*")
            .eq("credito_id", c.id);
          return { ...c, pagos };
        })
      );

      // Calcular promedio general de estrellas del cliente
      const estrellasPorCredito = creditosConPagos.map((c) =>
        calcularEstrellas(c.pagos)
      );
      const promedio =
        estrellasPorCredito.reduce((a, b) => a + b, 0) /
        (estrellasPorCredito.length || 1);

      setCalificaciones((prev) => ({
        ...prev,
        [clienteId]: promedio,
      }));

      setCreditosAbiertos((prev) => ({
        ...prev,
        [clienteId]: creditosConPagos,
      }));
    }
  };

  const togglePagos = (creditoId) => {
    setPagosAbiertos((prev) => ({
      ...prev,
      [creditoId]: prev[creditoId] ? null : true,
    }));
  };

  return (
    <div className="buscarcliente-page">
      <div className="buscarcliente-header">
        <h2><FaSearch /> Buscar Cliente</h2>
        <div className="buscarcliente-bar">
          <input
            type="text"
            placeholder="🔍 Escribe el nombre del cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarCliente()}
          />
          <button onClick={buscarCliente}>Buscar</button>
        </div>
      </div>

      <div className="buscarcliente-results">
        {clientes.map((cliente) => (
          <div key={cliente.id} className="buscarcliente-card">
            {/* --- Cabecera del cliente --- */}
            <div className="buscarcliente-info">
              <div className="buscarcliente-avatar">
                <FaUser />
              </div>
              <div className="buscarcliente-details">
                <h3>{cliente.nombre}</h3>
                <p><FaIdCard /> DNI: {cliente.dni}</p>
                <p><FaPhoneAlt /> {cliente.telefono}</p>
                <p><FaHome /> {cliente.direccion}</p>
              </div>
              <div className="buscarcliente-stars">
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    className={`buscarcliente-star ${
                      i < Math.round(calificaciones[cliente.id] || 0)
                        ? "active"
                        : "inactive"
                    }`}
                  />
                ))}
                <span className="buscarcliente-score">
                       {(calificaciones[cliente.id] || 0).toFixed(1)} / 5
                </span>
              </div>
            </div>

            <button
              className="buscarcliente-btn"
              onClick={() => toggleCreditos(cliente.id)}
            >
              {creditosAbiertos[cliente.id]
                ? "Ocultar Créditos"
                : "Ver Créditos"}
            </button>

            {/* --- Créditos del cliente --- */}
            {creditosAbiertos[cliente.id] &&
              creditosAbiertos[cliente.id].map((credito) => (
                <div key={credito.id} className="buscarcliente-credito">
                  <div className="buscarcliente-credito-header">
                    <FaCreditCard /> <b>Monto:</b> S/.{credito.monto}
                  </div>
                  <p>
                    <b>Inicio:</b>{" "}
                    {new Date(credito.fecha_inicio).toLocaleDateString()}
                  </p>
                  <p>
                    <b>Vencimiento:</b>{" "}
                    {new Date(credito.fecha_vencimiento).toLocaleDateString()}
                  </p>
                  <p>
                    <b>Estado:</b> {credito.estado}
                  </p>

                  <button
                    className="buscarcliente-btn-secondary"
                    onClick={() => togglePagos(credito.id)}
                  >
                    {pagosAbiertos[credito.id]
                      ? "Ocultar Pagos"
                      : "Ver Pagos"}
                  </button>

                  {pagosAbiertos[credito.id] &&
                    credito.pagos.map((pago) => (
                      <div key={pago.id} className="buscarcliente-pago">
                        <FaMoneyBillWave />{" "}
                        <b>{new Date(pago.fecha_pago).toLocaleDateString()}</b>{" "}
                        — S/.{pago.monto_pagado}
                      </div>
                    ))}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BuscarCliente;
