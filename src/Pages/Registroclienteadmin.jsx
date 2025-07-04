import React, { useState } from "react";
import { supabase } from "../components/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaUser, FaPhone, FaMapMarkerAlt, FaIdCard, FaInfoCircle, FaCopy } from "react-icons/fa";
import "../styles/FormularioCliente.css";

const RegistroClienteadmin = () => {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [dni, setDni] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState(null); // 🔹 Mensaje flotante con ID del cliente
  

  const obtenerUbicacion = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUbicacion(`${latitude}, ${longitude}`);
        },
        (error) => {
          setError("No se pudo obtener la ubicación.");
        }
      );
    } else {
      setError("Geolocalización no soportada por el navegador.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre || !telefono || !direccion || !dni) {
      setError("Todos los campos son obligatorios");
      return;
    }

    const usuarioId = localStorage.getItem("auth_id_cobrador_actual");
    const { data, error } = await supabase.from("clientes").insert([
      {
        nombre,
        telefono,
        direccion,
        dni,
        ubicacion,
        detalle,
        usuario_id: usuarioId, // 🔐 Clave para aplicar RLS después
      },
    ]).select("id, nombre");

    if (error) {
      setError("Error al registrar el cliente: " + error.message);
      return;
    }

    if (data && data.length > 0) {
      setMensaje({ id: data[0].id, nombre: data[0].nombre });
    }

    const confirmRegistroCredito = window.confirm("¿Desea registrar un crédito para este cliente?");
    if (confirmRegistroCredito) {
      navigate("/admin/regcredito", { state: { clienteId: data[0].id } });
    } else {
      navigate("/admin/vistacobrador");
    }
  };

  const copiarAlPortapapeles = () => {
    if (mensaje) {
      navigator.clipboard.writeText(mensaje.id);
      alert("ID copiado al portapapeles");
    }
  };

  return (
    <div className="formulario-cliente-container">
      <div className="formulario-cliente-card">
      <button className="back-button" onClick={() => navigate(-1)}>
      Volver
    </button>
        <h2>Registro de Cliente</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label><FaUser /> Nombre</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ingrese el nombre" />

          <label><FaPhone /> Teléfono</label>
          <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ingrese el teléfono" />

          <label><FaMapMarkerAlt /> Dirección</label>
          <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ingrese la dirección" />

          <label><FaIdCard /> DNI</label>
          <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Ingrese el DNI" />

          <label><FaInfoCircle /> Detalle</label>
          <input type="text" value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Ingrese detalles (opcional)" />

          <label><FaMapMarkerAlt /> Ubicación</label>
          <div className="gps-container">
            <input type="text" value={ubicacion} readOnly placeholder="Ubicación GPS" />
            <button type="button" onClick={obtenerUbicacion} className="gps-button">
              <FaMapMarkerAlt /> Obtener GPS
            </button>
          </div>

          <button type="submit">Registrar Cliente</button>
        </form>
      </div>

      {/* 🔹 Mensaje flotante con ID del cliente */}
      {mensaje && (
        <div className="mensaje-flotante">
          <p><strong>Cliente Creado:</strong> {mensaje.nombre} (ID: {mensaje.id})</p>
          <button onClick={copiarAlPortapapeles}>
            <FaCopy className="icon" /> Copiar ID
          </button>
        </div>
      )}
    </div>
  );
};

export default RegistroClienteadmin;
