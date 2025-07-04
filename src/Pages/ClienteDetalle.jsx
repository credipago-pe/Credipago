import { useState, useEffect } from "react"; 
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import { FaWhatsapp,FaMapMarkedAlt,} from "react-icons/fa";
import { ArrowLeft, User, Phone, MessageCircle, Send, CreditCard, DollarSign, Clock, History, MapPin,FileText, Calendar, Star } from "lucide-react";
import "../styles/ClienteDetalle.css";

const ClienteDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [creditos, setCreditos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [saldo, setSaldo] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [calificacion, setCalificacion] = useState(0); // Estado para la calificación
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        setLoading(true);

        const manejarCalificacion = (nuevaCalificacion) => {
          setCalificacion(nuevaCalificacion);
        };

        // Obtener cliente y créditos en paralelo
        const [clienteData, creditosData] = await Promise.all([
          supabase.from("clientes").select("*").eq("id", id).single(),
          supabase.from("creditos").select("*").eq("cliente_id", id),
        ]);
        
        if (clienteData.error) throw clienteData.error;
        if (creditosData.error) throw creditosData.error;

        setCliente(clienteData.data);
        setCreditos(creditosData.data || []);

        // Buscar crédito activo
        const creditoActivo = creditosData.data.find((c) => c.estado === "Activo");

        if (creditoActivo) {
          // Obtener pagos del crédito activo
          const { data: pagosData, error: pagosError } = await supabase
            .from("pagos")
            .select("id, monto_pagado, saldo, fecha_pago, metodo_pago, credito_id")
            .eq("credito_id", creditoActivo.id)
            .order("fecha_pago", { ascending: false });

          if (pagosError) throw pagosError;

          setPagos(pagosData || []);
          setSaldo(pagosData.length > 0 ? pagosData[0].saldo : creditoActivo.saldo);
        }
      } catch (error) {
        console.error("Error al obtener datos:", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDatos();
  }, [id]);

  if (loading) return <p className="text-center text-gray-500">Cargando datos...</p>;
  if (!cliente) return <p className="text-center text-gray-500">Cliente no encontrado.</p>;

  const creditoActivo = creditos.find((c) => c.estado === "Activo");
  const creditosPasados = creditos.filter((c) => c.estado !== "Activo");

  const handleGuardarCliente = async () => {
  const { error } = await supabase
    .from("clientes")
    .update({
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      dni: cliente.dni,
      ubicacion: cliente.ubicacion,
      detalle: cliente.detalle,
    })
    .eq("id", cliente.id);

  if (error) {
    alert("Error al guardar: " + error.message);
  } else {
    alert("Cliente actualizado con éxito.");
    setInfoVisible(false);
    // recargar si es necesario
  }

};

  return (
  <div className="cliente-detalle ampliado">

    {/* Contenedor fijo para cabecera y botones */}
    <div className="fixed-header-container">
      {/* Botón de regreso */}
      <button className="botonD-regresar" onClick={() => navigate(-1)}>
        <ArrowLeft className="icono" /> Volver
      </button>

      <div className="cliente-info">
  {/* Cabecera del cliente y calificación en la misma fila */}
  <div className="cliente-header">
    {/* Nombre e ícono */}
    <div className="info-cliente">
      <User className="icono-cliente " onClick={() => setInfoVisible(true)} />
      <h2 className="nombre cliente">{cliente.nombre}</h2>
    </div>

    {/* Estrellas a la derecha */}
    <div className="calificacion-caja">
      <div className="calificacion">
        {[...Array(5)].map((_, index) => (
          <span
            key={index}
            className={`estrella ${index < calificacion ? 'seleccionada' : 'deseleccionada'}`}
            onClick={() => manejarCalificacion(index + 1)}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  </div>


        {/* Iconos de contacto */}
<div className="acciones-contacto">
  <Phone className="icono DC" onClick={() => window.location.href = `tel:${cliente.telefono}`} />
  <MessageCircle className="icono DC" onClick={() => navigate(`/enviar-mensaje/${cliente.id}`)} />
  <FaWhatsapp className="icono whatsapp" onClick={() => window.open(`https://wa.me/${cliente.telefono}`, "_blank")} />
  <FaMapMarkedAlt className="icono-ubicacion"onClick={() => window.open (`https://www.google.com/maps/search/?api=1&query=${cliente.ubicacion}`,"_blank")}/>
  </div>
</div>

      <div className="credito-activo compacto ampliado">
  <h3>Crédito Activo</h3>

  <div className="fila-detalles">
    <div className="detalle compacto">
      <CreditCard className="iconoDC" />
      <p>Saldo: ${creditoActivo.saldo}</p>
    </div>
    <div className="detalle compacto">
      <DollarSign className="iconoDC" />
      <p>Cuota: ${creditoActivo.valor_cuota}</p>
    </div>
    <div className="detalle compacto">
      <Clock className="iconoDC" />
      <p>Vence: {new Date(creditoActivo.fecha_vencimiento).toLocaleDateString()}</p>
    </div>
  </div>
</div>
</div>

    {/* Contenedor scrollable para el historial */}
    <div className="scrollable-body">
      {/* Historial de Pagos */}
      <div className="historial-pagos">
        <h3><History className="iconoH" /> Historial de Pagos</h3>
        <div className="tabla-pagos">
          <table>
            <thead>
              <tr>
                <th>Crédito</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => (
                <tr key={pago.id}>
                  <td>{pago.credito_id}</td>
                  <td>{new Date(pago.fecha_pago).toLocaleDateString()}</td>
                  <td>${pago.monto_pagado}</td>
                  <td>{pago.metodo_pago}</td>
                  <td>${pago.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

  {infoVisible && (
  <div className="modal">
    <div className="modal-contenido ampliado">
      <h3>Datos del Cliente</h3>
      <p><User className="iconoM" /> Nombre: {cliente.nombre}</p>
      <p><Phone className="iconoM" /> Teléfono: {cliente.telefono}</p>
      <p><MapPin className="iconoM" /> Dirección: {cliente.direccion}</p>
      <p><CreditCard className="iconoM" /> DNI: {cliente.dni}</p>
      <p><Send className="iconoM" /> Ubicación: {cliente.ubicacion || 'No especificada'}</p>
      <p><FileText className="iconoM" /> Detalle: {cliente.detalle || 'No especificado'}</p>
      <p><Calendar className="iconoM" /> Fecha de Registro: {cliente.fecha_registro?.slice(0, 10)}</p>

      <div className="acciones">
        <button className="guardar" onClick={() => {
          setInfoVisible(false);
          setEditVisible(true); // Abre el segundo modal
        }}>
          Editar
        </button>
        <button className="cerrar" onClick={() => setInfoVisible(false)}>Cerrar</button>
      </div>
    </div>
  </div>
)}
{/* Modal de edición */}
{editVisible && (
  <div className="modal">
    <div className="modal-contenido">
      <h3>✏️ Editar Cliente</h3>

      <label>Nombre:</label>
      <input
        type="text"
        value={cliente.nombre}
        onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
      />

      <label>DNI:</label>
      <input
        type="text"
        value={cliente.dni}
        onChange={(e) => setCliente({ ...cliente, dni: e.target.value })}
      />

      <label>Teléfono:</label>
      <input
        type="text"
        value={cliente.telefono}
        onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
      />

      <label>Dirección:</label>
      <input
        type="text"
        value={cliente.direccion}
        onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })}
      />

      <label>Ubicación:</label>
      <input
        type="text"
        value={cliente.ubicacion || ""}
        onChange={(e) => setCliente({ ...cliente, ubicacion: e.target.value })}
      />

      <label>Detalle:</label>
      <textarea
        value={cliente.detalle || ""}
        onChange={(e) => setCliente({ ...cliente, detalle: e.target.value })}
      />

      <p className="fecha-registro">
        📅 Fecha de registro: {cliente.fecha_registro?.slice(0, 10)}
      </p>

      <div className="acciones">
        <button
          className="guardar"
          onClick={async () => {
            // Guardar cambios en Supabase
            const { error } = await supabase
              .from("clientes")
              .update({
                nombre: cliente.nombre,
                dni: cliente.dni,
                telefono: cliente.telefono,
                direccion: cliente.direccion,
                ubicacion: cliente.ubicacion,
                detalle: cliente.detalle,
              })
              .eq("id", cliente.id);
            if (error) {
              alert("Error al guardar: " + error.message);
            } else {
              alert("Cliente actualizado con éxito.");
              setEditVisible(false);
              // si quieres recargar datos de API, llámalo aquí
            }
          }}
        >
          Guardar
        </button>
        <button className="cerrar" onClick={() => setEditVisible(false)}>
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}

  </div>
);

  };
  
  export default ClienteDetalle;
  