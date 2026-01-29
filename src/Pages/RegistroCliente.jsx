import React, { useState, useEffect } from "react";
import { supabase } from "../components/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaUser, FaPhone, FaMapMarkerAlt, FaIdCard, FaInfoCircle, FaCopy } from "react-icons/fa";
import "../Styles/FormularioCliente.css";

const RegistroCliente = () => {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [dni, setDni] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState(null); // ID del cliente
  const [permisoActivo, setPermisoActivo] = useState(true); // Por defecto activo
  const [cargandoPermiso, setCargandoPermiso] = useState(true);

  // 🔹 Consultar permiso al cargar la página
  useEffect(() => {
    const verificarPermiso = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const auth_id = sessionData?.session?.user?.id;

        if (!auth_id) {
          setError("Sesión no válida. Inicia sesión nuevamente.");
          setCargandoPermiso(false);
          return;
        }

        // Obtener el id de la página "RegistroCliente"
        const { data: paginaData, error: paginaError } = await supabase
          .from("paginas")
          .select("id")
          .eq("nombre", "RegistroCliente")
          .single();

        if (paginaError || !paginaData) {
          setError("No se pudo consultar la página.");
          setCargandoPermiso(false);
          return;
        }

        const pagina_id = paginaData.id;

        // Consultar permisos para este usuario y página
        const { data: permisoData, error: permisoError } = await supabase
          .from("permisos_usuario_pagina")
          .select("estado")
          .eq("auth_id", auth_id)
          .eq("pagina_id", pagina_id)
          .single();

        if (permisoError && permisoError.code !== "PGRST116") {
          console.error("Error consultando permisos:", permisoError);
        }

        // Si hay permiso, tomar el estado, si no hay, asumimos activo
        setPermisoActivo(permisoData ? permisoData.estado : true);
      } catch (e) {
        console.error("Error verificando permiso:", e);
      }
      setCargandoPermiso(false);
    };

    verificarPermiso();
  }, []);

  const obtenerUbicacion = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUbicacion(`${latitude}, ${longitude}`);
        },
        () => {
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

    const { data: sessionData } = await supabase.auth.getSession();
    const auth_id = sessionData?.session?.user?.id;

    const { data, error } = await supabase.from("clientes").insert([
      {
        nombre,
        telefono,
        direccion,
        dni,
        ubicacion,
        detalle,
        usuario_id: auth_id,
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
      navigate("/registrocredito", { state: { clienteId: data[0].id } });
    } else {
      navigate("/clientes");
    }
  };

  const copiarAlPortapapeles = () => {
    if (mensaje) {
      navigator.clipboard.writeText(mensaje.id);
      alert("ID copiado al portapapeles");
    }
  };

  if (cargandoPermiso) return <p>Cargando...</p>;

  if (!permisoActivo) {
    return (
      <div className="formulario-cliente-container">
        <div className="formulario-cliente-card">
          <button className="back-button" onClick={() => navigate(-1)}>Volver</button>
          <h2>🚫 Acceso bloqueado</h2>
          <p>No tienes permiso para acceder a esta página. Contacta al administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="formulario-cliente-container">
      <div className="formulario-cliente-card">
        <button className="back-button" onClick={() => navigate(-1)}>Volver</button>
        <h2>Registro de Cliente</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label><FaUser /> Nombre</label>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ingrese el nombre" />

          <label><FaPhone /> Teléfono</label>
          <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ingrese el teléfono" />

          <label><FaMapMarkerAlt /> Dirección</label>
          <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Ingrese la dirección" />

          <label><FaIdCard /> DNI</label>
          <input type="text" value={dni} onChange={e => setDni(e.target.value)} placeholder="Ingrese el DNI" />

          <label><FaInfoCircle /> Detalle</label>
          <input type="text" value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Ingrese detalles (opcional)" />

          <label><FaMapMarkerAlt /> Ubicación</label>
          <div className="gps-container">
            <input type="text" value={ubicacion} readOnly placeholder="Ubicación GPS" />
            <button type="button" onClick={obtenerUbicacion} className="gps-button"><FaMapMarkerAlt /> Obtener GPS</button>
          </div>

          <button type="submit">Registrar Cliente</button>
        </form>
      </div>

      {mensaje && (
        <div className="mensaje-flotante">
          <p><strong>Cliente Creado:</strong> {mensaje.nombre} (ID: {mensaje.id})</p>
          <button onClick={copiarAlPortapapeles}><FaCopy className="icon" /> Copiar ID</button>
        </div>
      )}
    </div>
  );
};

export default RegistroCliente;
