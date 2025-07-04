import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import "../Styles/RegistrosAdmin.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoneyBillWave, faFileInvoiceDollar, faUsers, faReceipt } from "@fortawesome/free-solid-svg-icons";
import { FaSignOutAlt } from "react-icons/fa";


const ENTIDADES = [
  { key: "pagos", label: "Pagos", icon: faMoneyBillWave },
  { key: "creditos", label: "Créditos", icon: faFileInvoiceDollar },
  { key: "clientes", label: "Clientes", icon: faUsers },
  { key: "gastos", label: "Gastos", icon: faReceipt },
];

// columnas de fecha para cada entidad
const columnasFecha = {
  pagos: "fecha_pago",
  creditos: "fecha_inicio",
  clientes: "fecha_registro",
  gastos: "fecha",
};

// columnas de usuario según entidad
const columnasUsuario = {
  pagos: "usuario_id",
  creditos: "usuario_id",
  clientes: "usuario_id",
  gastos: "usuario_id",
  cajas: "usuario_auth_id", // solo cajas tiene otro nombre
};

export default function RegistrosAdmin() {
  const { id_usuario } = useParams();
  console.log("ID USUARIO DESDE URL:", id_usuario);

  const [entidad, setEntidad] = useState("pagos");
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fechaHoy = new Date().toISOString().slice(0, 10);
  const [filtroFechaInicio, setFiltroFechaInicio] = useState(fechaHoy);
  const [filtroFechaFin, setFiltroFechaFin] = useState(fechaHoy);
   const navigate = useNavigate();

  const cargarDatos = async () => {
    if (!id_usuario) return;

    setLoading(true);
    setError(null);

    const columnaFecha = columnasFecha[entidad];
    const columnaUsuario = columnasUsuario[entidad];

    let query = supabase.from(entidad).select("*");

    // Filtro por usuario según columna correcta
    if (columnaUsuario && id_usuario) {
      query = query.eq(columnaUsuario, id_usuario);
    }

    // Filtro por fechas
    if (columnaFecha) {
      if (filtroFechaInicio) query = query.gte(columnaFecha, filtroFechaInicio);
      if (filtroFechaFin) {const fechaFinCompleta = filtroFechaFin + "T23:59:59";
      query = query.lte(columnaFecha, fechaFinCompleta);}
    } else {
      query = query.order("id", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
      setDatos([]);
    } else {
      setDatos(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [entidad, filtroFechaInicio, filtroFechaFin, id_usuario]);

  const eliminarRegistro = async (id) => {
    const { error } = await supabase.from(entidad).delete().eq("id", id);
    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      alert("Registro eliminado");
      setConfirmDeleteId(null);
      cargarDatos();
    }
  };

  return (
    <div className="registros-admin-container">
      <h2>Gestión de Registros - {entidad.toUpperCase()}</h2>
       <button
        onClick={() => navigate("/admin")}className="btn-ir-panel"title="Volver al Panel Admin">
        <FaSignOutAlt />
      </button>
      {/* Menú 2x2 con iconos */}
      <div className="grid-menu-2x2">
        {ENTIDADES.map(({ key, label, icon }) => (
          <button
            key={key}
            className={key === entidad ? "active grid-btn" : "grid-btn"}
            onClick={() => setEntidad(key)}
          >
            <FontAwesomeIcon icon={icon} size="2x" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="filtros-fecha">
        <label>
          Desde:{" "}
          <input
            type="date"
            value={filtroFechaInicio}
            onChange={(e) => setFiltroFechaInicio(e.target.value)}
          />
        </label>
        <label>
          Hasta:{" "}
          <input
            type="date"
            value={filtroFechaFin}
            onChange={(e) => setFiltroFechaFin(e.target.value)}
          />
        </label>
      </div>

      <div className="tabla-scroll-container">
        {loading && <p>Cargando...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {!loading && !error && (
          <table className="tabla-registros">
            <thead>
              <tr>
                <th>ID</th>
                {entidad === "pagos" && (
                  <>
                    <th>ID Crédito</th>
                    <th>Valor</th>
                    <th>Fecha</th>
                  </>
                )}
                {entidad === "creditos" && (
                  <>
                    <th>Cliente ID</th>
                    <th>Monto</th>
                    <th>Fecha Inicio</th>
                  </>
                )}
                {entidad === "clientes" && (
                  <>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Dirección</th>
                  </>
                )}
                {entidad === "gastos" && (
                  <>
                    <th>Concepto</th>
                    <th>Valor</th>
                    <th>Fecha</th>
                  </>
                )}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.length === 0 && (
                <tr>
                  <td colSpan="99">No hay datos</td>
                </tr>
              )}
              {datos.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  {entidad === "pagos" && (
                    <>
                      <td>{item.credito_id}</td>
                      <td>${item.monto_pagado}</td>
                      <td>{item.fecha_pago?.slice(0, 10) || "—"}</td>
                    </>
                  )}
                  {entidad === "creditos" && (
                    <>
                      <td>{item.cliente_id}</td>
                      <td>${item.monto}</td>
                      <td>{item.fecha_inicio?.slice(0, 10) || "—"}</td>
                    </>
                  )}
                  {entidad === "clientes" && (
                    <>
                      <td>{item.nombre}</td>
                      <td>{item.telefono}</td>
                      <td>{item.direccion}</td>
                    </>
                  )}
                  {entidad === "gastos" && (
                    <>
                      <td>{item.concepto}</td>
                      <td>{item.valor}</td>
                      <td>{item.fecha?.slice(0, 10) || "—"}</td>
                    </>
                  )}
                  <td>
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      style={{
                        backgroundColor: "#dc2626",
                        color: "white",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDeleteId && (
        <div className="modal-eliminar">
          <div className="modal-content">
            <p>¿Está seguro que desea eliminar el registro ID {confirmDeleteId}?</p>
            <button
              onClick={() => eliminarRegistro(confirmDeleteId)}
              style={{
                marginRight: "1rem",
                backgroundColor: "#dc2626",
                color: "white",
                cursor: "pointer",
              }}
            >
              Sí, eliminar
            </button>
            <button onClick={() => setConfirmDeleteId(null)} style={{ cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
