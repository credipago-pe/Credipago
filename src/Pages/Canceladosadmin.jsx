import React, { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import "../Styles/Cancelados.css";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

const Canceladosadmin = () => {
  const [fechaDesde, setFechaDesde] = useState(dayjs().format("YYYY-MM-DD"));
  const [fechaHasta, setFechaHasta] = useState(dayjs().format("YYYY-MM-DD"));
  const [clientesCancelados, setClientesCancelados] = useState([]);

  useEffect(() => {
    const fetchClientesCancelados = async () => {
      try {
        const usuarioId = localStorage.getItem("auth_id_cobrador_actual");
        const { data: creditos, error } = await supabase
          .from("creditos")
          .select( "id, cliente_id, saldo, estado, clientes(nombre, telefono, usuario_id)")
          .eq("estado", "cancelado");

        if (error) throw error;

        const creditosFiltrados = creditos.filter(
       (credito) => credito.clientes?.usuario_id === usuarioId
       );
        const creditosConFecha = await Promise.all(creditosFiltrados.map(async (credito) => {
        const { data: pagos } = await supabase
      .from("pagos")
      .select("fecha_pago")
      .eq("credito_id", credito.id)
      .order("fecha_pago", { ascending: false })
      .limit(1);

        const fechaUltimoPago = pagos?.[0]?.fecha_pago || null;
        return { ...credito, fechaUltimoPago };
       })
     );

        setClientesCancelados(creditosConFecha);
      } catch (error) {
        console.error("Error al obtener clientes cancelados:", error.message);
      }
    };

    fetchClientesCancelados();
  }, []);

  const filtradosPorFecha = clientesCancelados.filter((credito) => {
    if (!credito.fechaUltimoPago) return false;
    const fechaPago = dayjs(credito.fechaUltimoPago).startOf("day");
    const desde = dayjs(fechaDesde).startOf("day");
    const hasta = dayjs(fechaHasta).endOf("day");
    return fechaPago.isBetween(desde, hasta, null, "[]");
  });

  return (
    <div className="clientes-cancelados-container">
      <div className="clientes-cancelados-content">
        <div className="clientes-cancelados-header">
          <h2 className="clientes-cancelados-title">
            Clientes con Créditos Cancelados
          </h2>
          <div className="clientes-cancelados-filtro">
            <label>Desde:</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
            <label>Hasta:</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>
        <div className="clientes-cancelados-scroll">
          <table className="clientes-cancelados-table">
            <thead>
              <tr>
                <th>ID Crédito</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Fecha Cancelación</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filtradosPorFecha.map((credito) => (
            <tr key={credito.id}>
               <td>{credito.id}</td>
               <td>{credito.clientes?.nombre}</td>
               <td>{credito.clientes?.telefono}</td>
               <td> {credito.fechaUltimoPago? dayjs(credito.fechaUltimoPago).format("YYYY-MM-DD HH:mm"): "No disponible"}
              </td>
             <td className="acciones-cancelados">
        <Link
          to={`/detallecancelados/${credito.id}`}className="btn-clientes-detalle">
          <Eye size={18} /> Detalle
        </Link>
        
        <Link
          to="/renovar"state={{ clienteNombre: credito.clientes?.nombre }}
          className="btn-renovar-credito">
         <span className="icono-renovar">🔁</span> Renovar
      </Link>

      </td>
    </tr>
  ))}

              {filtradosPorFecha.length === 0 && (
                <tr>
                  <td colSpan="6">No hay créditos cancelados para esta fecha.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="clientes-cancelados-footer">
</div> <Link to="/admin/vistacobrador" className="btn-volver">
    Volver
  </Link>
      </div>
    </div>
  );
};

export default Canceladosadmin;
