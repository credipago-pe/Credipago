import { useState, useEffect } from "react"; 
import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import { FaWhatsapp, FaMobileAlt, FaEnvelopeOpenText, FaUserEdit, FaPhone, FaMoneyBillWave,  FaMapMarkedAlt,  FaExclamationCircle, FaTimes,  } from "react-icons/fa";      // para cerrar modales FaMobileAlt     // para botón de Yape/Efectivo
import {  User, Phone, Send, CreditCard, DollarSign, Clock, History, MapPin, FileText, Calendar } from "lucide-react";
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
  const [modalMulta, setModalMulta] = useState(false);
  const [montoMulta, setMontoMulta] = useState("");
  const [descripcionMulta, setDescripcionMulta] = useState("");
  const [multas, setMultas] = useState([]);
  const inputFileRef = useRef(null);
  const [fotoUrl, setFotourl] = useState("/default-avatar.png");


    const handleClick = () => {
    if (inputFileRef.current) inputFileRef.current.click();
  };

  // Manejar cambio de archivo
  const handleFileChange = async (e) => {
  if (!cliente) return; // ⚠ asegurarse que cliente exista

  const file = e.target.files[0];
  if (!file) return;

  try {
    const fileName = `${cliente.id}/${file.name}`;

    // Subir al storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("clientes")
      .upload(fileName, file, { upsert: true });
    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: urlData, error: urlError } = supabase.storage
      .from("clientes")
      .getPublicUrl(fileName);
    if (urlError) throw urlError;

    const publicUrl = urlData.publicUrl;

    // Actualizar tabla
    const { error: updateError } = await supabase
      .from("clientes")
      .update({ fotourl: publicUrl })
      .eq("id", cliente.id);
    if (updateError) throw updateError;

    // Actualizar estado
    setFotourl(publicUrl);
    setCliente({
  ...cliente,
  fotourl: publicUrl
});

alert("Foto actualizada correctamente ✅");

  } catch (err) {
    console.error("Error al subir foto:", err.message);
  }
};


  const cargarDatos = async () => {
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

      const { data: multasData, error: multasError } = await supabase
        .from("multas")
        .select("*")
        .eq("credito_id", creditoActivo.id)
        .order("fecha", { ascending: false });

      if (multasError) throw multasError;

      setMultas(multasData || []);
    }
  } catch (error) {
    console.error("Error al cargar datos:", error.message);
  } finally {
    setLoading(false);
  }
};

    

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
    const { data: multasData, error: multasError } = await supabase
          .from("multas")
          .select("*")
          .eq("credito_id", creditoActivo.id)
          .order("fecha", { ascending: false });

  if (multasError) throw multasError;

  setMultas(multasData || []);

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

  const registrarMulta = async () => {
  if (!montoMulta || isNaN(montoMulta)) {
    alert("Ingresa un monto válido");
    return;
  }

  try {
    // 1. Insertar multa
    const { error: multaError } = await supabase
      .from("multas")
      .insert([
        {
          cliente_id: cliente.id,
          credito_id: creditoActivo.id,
          monto: montoMulta,
          descripcion: "Multa por atraso",
          fecha: new Date(),
          auth_id: localStorage.auth_id_cobrador_actual,
        },
      ]);

    if (multaError) throw multaError;

    // 2. Actualizar saldo del crédito
    const nuevoSaldo = creditoActivo.saldo + montoMulta;

    const { error: updateError } = await supabase
      .from("creditos")
      .update({ saldo: nuevoSaldo })
      .eq("id", creditoActivo.id);

    if (updateError) throw updateError;

    alert("Multa registrada y saldo actualizado.");
    setMontoMulta("");
    setMostrarModalMulta(false);
    cargarDatos(); // recarga pagos, multas, saldo, etc.
  } catch (error) {
    console.error("Error al registrar multa:", error.message);
  }
};


  if (loading) return <p>Cargando datos...</p>;
  if (!cliente) return <p>Cliente no encontrado.</p>;

  const creditoActivo = creditos.find(c => c.estado === "Activo");

  
 return (
    <div className="cliente-detalle">

     <div className="acciones-contacto">

       <div className="accion" onClick={() => setInfoVisible(true)}>
    <FaUserEdit />
    <span>Info/Editar</span>
  </div>

   <div className="accion" onClick={() => navigate(`/enviar-mensaje/${cliente.id}`)}>
   <FaEnvelopeOpenText />
    <span>Mensaje/Recibo</span>
  </div>

  <div className="accion" onClick={() => window.location.href = `tel:${cliente.telefono}`}>
    <FaPhone />
    <span>Llamar</span>
  </div>

  <div className="accion" onClick={() => window.open(`https://wa.me/${cliente.telefono}`, "_blank")}>
    <FaWhatsapp />
    <span>WhatsApp</span>
  </div>

  <div className="accion" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${cliente.ubicacion}`, "_blank")}>
    <FaMapMarkedAlt />
    <span>Ubicación</span>
  </div>

   <div className="accion" onClick={() => setModalMulta(true)}>
    <FaExclamationCircle />
    <span>Multa</span>
  </div>

  <div className="accion" onClick={() => abrirModalPago(cliente)}>
    <FaMoneyBillWave />
    <span>Pago</span>
  </div>
</div>

       {/* Crédito activo con foto */}
      <div className="credito-activo">
        <div className="cliente-info">
          <div className="cliente-header">
           <div className="info-cliente">
          <div className="info-cliente">
          <img
             src={cliente.fotourl || fotoUrl} // usa 'fotourl' del cliente
             alt="Foto"            
             className="icono-cliente"            
              onClick={handleClick}
            
            />
          <input
            type="file"
            ref={inputFileRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept="image/*"
          />
          <h2 className="nombre cliente">{cliente.nombre}</h2>
        </div>
      </div>
    </div>
 
{creditoActivo && (
  <div className="seccion-credito-activo">
    <h3 className="titulo-seccion">Crédito Activo</h3>

    <div className="credit-info">
      <div className="info-item">
        <CreditCard className="info-icon" />
        <span>Saldo:</span>
        <strong>${creditoActivo.saldo?.toFixed(2)}</strong>
      </div>

      <div className="info-item">
        <DollarSign className="info-icon" />
        <span>Cuota:</span>
        <strong>${creditoActivo.valor_cuota?.toFixed(2)}</strong>
      </div>

      <div className="info-item">
        <Clock className="info-icon" />
        <span>Vence:</span>
        <strong>{new Date(creditoActivo.fecha_vencimiento).toLocaleDateString()}</strong>
      </div>

      <div className="info-item">
        <DollarSign className="info-icon" />
        <span>Multas:</span>
        <strong>${multas.reduce((sum, m) => sum + m.monto, 0).toFixed(2)}</strong>
      </div>
    </div>
  </div>
)}

        </div>


      {/* Historial de pagos */}
      <div className="scrollable-body">
        <div className="historial-pagos">
          <h3><History className="iconoH" /> Historial de Pagos</h3>
          <div className="tabla-pagos">
            <table>
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr key={pago.id}>
                    <td>#{pago.id}</td>
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
<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
  <input
    type="text"
    value={cliente.ubicacion || ""}
    onChange={(e) => setCliente({ ...cliente, ubicacion: e.target.value })}
    style={{
      width: "60%", // 🔹 Ajusta el ancho que quieras
      padding: "6px",
    }}
  />
  <button
    type="button"
    style={{
      width: "100px", // 🔹 Ancho fijo pequeño
      height: "32px",
      fontSize: "14px",
      borderRadius: "6px",
      backgroundColor: "#4CAF50",
      color: "white",
      border: "none",
      cursor: "pointer",
    }}
    onClick={() => {
      if (!navigator.geolocation) {
        alert("La geolocalización no está soportada en este navegador.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
          setCliente({ ...cliente, ubicacion: coords });
          window.open(
            `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`,
            "_blank"
          );
        },
        (err) => {
          alert("No se pudo obtener la ubicación.");
          console.error(err);
        }
      );
    }}
  >
   Ubicacion📍
  </button>
</div>
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
      {modalMulta && (
  <div className="modal-pago">
    <div className="modal-pagocontenido">
      <button className="cerrar-modal" onClick={() => setModalMulta(false)}><FaTimes /></button>
      <h3>Registrar Multa</h3>
      <p>Cliente: {cliente?.nombre}</p>

      <label>Monto de la multa:</label>
      <input
        type="number"
        min="1"
        placeholder="Ej: 10"
        value={montoMulta}
        onChange={(e) => setMontoMulta(e.target.value)}
        className="input-pago"
      />

      <label>Motivo / descripción:</label>
      <textarea
        placeholder="Ej: Incumplimiento, retraso, etc."
        value={descripcionMulta}
        onChange={(e) => setDescripcionMulta(e.target.value)}
        className="input-pago"
      />

      <button
  onClick={async () => {
    if (!montoMulta || isNaN(montoMulta)) {
      alert("Ingresa un monto válido");
      return;
    }

    try {
      const nuevoMonto = parseFloat(montoMulta);

      // 1. Insertar la multa
      const { data: usuarioData } = await supabase.auth.getUser();

      const { error: multaError } = await supabase.from("multas").insert([
        {
          cliente_id: cliente.id,
          credito_id: creditoActivo.id,
          monto: nuevoMonto,
          descripcion: descripcionMulta,
          fecha: new Date(),
          auth_id: usuarioData.user.id,
        },
      ]);

      if (multaError) throw multaError;

      // 2. Actualizar saldo del crédito
      const nuevoSaldo = creditoActivo.saldo + nuevoMonto;
      const { error: updateError } = await supabase
        .from("creditos")
        .update({ saldo: nuevoSaldo })
        .eq("id", creditoActivo.id);

      if (updateError) throw updateError;

      alert("Multa registrada con éxito");

      // 3. Reset UI y recarga
      setModalMulta(false);
      setMontoMulta("");
      setDescripcionMulta("");
      await cargarDatos(); // recarga toda la info

    } catch (error) {
      alert("Error al registrar la multa: " + error.message);
    }
  }}
  className="btn-pago efectivo"
>
  Registrar Multa
</button>

    </div>
  </div>
)}

    </div>
    </div>
  );
};

export default ClienteDetalle;