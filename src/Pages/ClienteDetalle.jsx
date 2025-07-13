import { useState, useEffect } from "react"; 
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import { FaWhatsapp, FaSignOutAlt, FaMoneyBillWave, FaMapMarkedAlt, FaTimes, FaMobileAlt } from "react-icons/fa";
import {User, Phone, MessageCircle, Send, CreditCard, DollarSign,Clock, History, MapPin, FileText, Calendar
} from "lucide-react";
import "../Styles/ClienteDetalle.css";

const ClienteDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [creditos, setCreditos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [saldo, setSaldo] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [modalPago, setModalPago] = useState(false);
  const [montoPago, setMontoPago] = useState(0);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarConfirmacionRecibo, setMostrarConfirmacionRecibo] = useState(false);
  



  useEffect(() => {
    const obtenerUsuario = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (data?.user) {
      setUsuario(data.user); // ← aquí debes tener el auth.uid()
    }
  };
  obtenerUsuario();

    const fetchDatos = async () => {
      try {
        setLoading(true);

        const [clienteData, creditosData] = await Promise.all([
          supabase.from("clientes").select("*").eq("id", id).single(),
          supabase.from("creditos").select("*").eq("cliente_id", id),
        ]);
        
        if (clienteData.error) throw clienteData.error;
        if (creditosData.error) throw creditosData.error;

        setCliente(clienteData.data);
        setCreditos(creditosData.data || []);

        const creditoActivo = creditosData.data.find(c => c.estado === "Activo");

        if (creditoActivo) {
          const { data: pagosData, error: pagosError } = await supabase
            .from("pagos")
            .select("*")
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

  const obtenerCreditoDelCliente = (clienteId) =>
    creditos.find((c) => c.cliente_id === clienteId && c.estado === "Activo");

  const abrirModalPago = (cliente) => {
    const credito = obtenerCreditoDelCliente(cliente.id);
    setMontoPago(credito?.valor_cuota || 0);
    setClienteSeleccionado(cliente);
    setModalPago(true);
  };

  const cerrarModalPago = () => {
    setModalPago(false);
    setClienteSeleccionado(null);
  };

  const registrarPago = async (tipoPago) => {
    if (!clienteSeleccionado) return;

    const credito = obtenerCreditoDelCliente(clienteSeleccionado.id);
    if (!credito) {
      alert("No se encontró un crédito para este cliente.");
      return;
    }

    if (montoPago <= 0 || isNaN(montoPago)) {
      alert("Ingrese un monto válido.");
      return;
    }

    if (montoPago > credito.saldo) {
      alert(`El monto ingresado excede el saldo pendiente (${credito.saldo}).`);
      return;
    }

    const fechaPago = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
    const fechaPagoFormatted = fechaPago.toISOString().slice(0, 19).replace("T", " ");

    const { error } = await supabase.from("pagos").insert([{
     credito_id: credito.id,
      metodo_pago: tipoPago.toLowerCase(),
      monto_pagado: Number(parseFloat(montoPago).toFixed(2)),
      fecha_pago: fechaPagoFormatted,
      usuario_id: usuario?.id,
    }]);

    if (error) {
      alert("Error al registrar pago: " + error.message);
    } else {
      alert("Pago registrado con éxito.");
      cerrarModalPago();
    }
  };

  if (loading) return <p>Cargando datos...</p>;
  if (!cliente) return <p>Cliente no encontrado.</p>;

  const creditoActivo = creditos.find(c => c.estado === "Activo");


  return (
  <div className="cliente-detalle ampliado">

  {/* 🔹 Franja superior fija con volver y acciones */}
  <div className="fixed-header-container">
    
    {/* Volver */}
    <div className="barra-volver">
            <button
              onClick={() => navigate("/cobrador")}className="btn-ir-panel"title="Volver al Panel Admin">
              <FaSignOutAlt />
            </button>
    </div>

    {/* Acciones de contacto */}
    <div className="acciones-contacto">
      <Phone
        className="icono DC"
        onClick={() => window.location.href = `tel:${cliente.telefono}`}
      />
      <MessageCircle
        className="icono DC"
        onClick={() => navigate(`/enviar-mensaje/${cliente.id}`)}
      />
      <FaWhatsapp
        className="icono whatsapp"
        onClick={() => window.open(`https://wa.me/${cliente.telefono}`, "_blank")}
      />
      <FaMapMarkedAlt
        className="icono-ubicacion"
        onClick={() =>
          window.open(`https://www.google.com/maps/search/?api=1&query=${cliente.ubicacion}`, "_blank")
        }
      />
    </div>

  {/* 🔸 Información del cliente (nombre + estrellas) */}
  <div className="cliente-info">
    <div className="cliente-header">
      <div className="info-cliente">
        <User className="icono-cliente" onClick={() => setInfoVisible(true)} />
        <h2 className="nombre cliente">{cliente.nombre}</h2>
      </div>
    </div>
  </div>

      <div className="credito-activo compacto ampliado">

  <div className="encabezado-credito">

    <h3>Crédito Activo</h3>

    <button className="botton-pago" onClick={() => abrirModalPago(cliente)}>
      <FaMoneyBillWave /> Pago
    </button>
  </div>

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
{/* Modal de Pago embebido */}
      {modalPago && (
        <div className="modal-pago">
          <div className="modal-pagocontenido">
            <button className="cerrar-modal" onClick={cerrarModalPago}><FaTimes /></button>
            <h3>Registrar Pago</h3>
            <p>Cliente: {clienteSeleccionado?.nombre}</p>
            <label htmlFor="montoPago">Valor a Pagar:</label>
            <input
              id="montoPago"
              type="number"
              min="1"
              placeholder="Ingrese monto"
              value={montoPago || ''}
              onChange={(e) => setMontoPago(e.target.value)}
              className="input-pago"
            />
            <div className="botones-pago">
              <button onClick={() => registrarPago("Efectivo")} className="btn-pago efectivo">
                <FaMoneyBillWave className="icono" /> Efectivo
              </button>
              <button onClick={() => registrarPago("Deposito")} className="btn-pago yape">
                <FaMobileAlt className="icono" /> Yape
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteDetalle;