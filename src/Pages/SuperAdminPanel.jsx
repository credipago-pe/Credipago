import React, { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import dayjs from "dayjs";
import "../Styles/SuperAdmin.css";

export default function SuperAdminPanel() {
  const [admins, setAdmins] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const hoy = dayjs();
  const anioActual = hoy.year();
  const mesActual = hoy.month() + 1;

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);

        // 1️⃣ Obtener todos los administradores
        const { data: adminsData, error: adminsError } = await supabase
          .from("usuarios")
          .select("id, nombre, telefono, auth_id")
          .eq("rol", "admin");

        if (adminsError) throw adminsError;

        // 2️⃣ Obtener todos los pagos del mes actual
        const { data: pagosData, error: pagosError } = await supabase
          .from("suscripciones_pagos")
          .select("*")
          .eq("anio", anioActual)
          .eq("mes", mesActual);

        if (pagosError) throw pagosError;

        // ✅ Asegurar que rutas siempre sea un array
        const pagosLimpios = (pagosData || []).map((p) => ({
          ...p,
          rutas:
            Array.isArray(p.rutas)
              ? p.rutas
              : typeof p.rutas === "string"
              ? JSON.parse(p.rutas || "[]")
              : [],
        }));

        setAdmins(adminsData || []);
        setPagos(pagosLimpios);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setMensaje({ tipo: "error", texto: "Error al cargar datos." });
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const determinarEstadoAdmin = (adminAuthId) => {
    const pago = pagos.find((p) => p.admin_id === adminAuthId);
    if (!pago) return "pendiente";
    return pago.estado || "pendiente";
  };

  const renderEstado = (estado) => {
    switch (estado) {
      case "pagado":
        return <span className="estado estado-pagado">✅ Pagado</span>;
      case "proceso":
        return <span className="estado estado-proceso">🕒 En proceso</span>;
      case "vencido":
        return <span className="estado estado-vencido">❌ Vencido</span>;
      default:
        return <span className="estado estado-pendiente">⌛ Pendiente</span>;
    }
  };

  const verEvidencia = (pago) => {
    if (!pago?.url_evidencia) {
      alert("No hay evidencia disponible.");
      return;
    }
    window.open(pago.url_evidencia, "_blank");
  };

  const marcarPagado = async (pagoId) => {
    try {
      const { error } = await supabase
        .from("suscripciones_pagos")
        .update({ estado: "pagado" })
        .eq("id", pagoId);
      if (error) throw error;

      setPagos((prev) =>
        prev.map((p) => (p.id === pagoId ? { ...p, estado: "pagado" } : p))
      );

      setMensaje({ tipo: "success", texto: "Pago marcado como pagado ✅" });
    } catch (err) {
      console.error("Error marcando pago:", err);
      setMensaje({ tipo: "error", texto: "Error al marcar pago." });
    }
  };

  const enviarWhatsApp = (telefono, mensaje) => {
    if (!telefono) {
      alert("El administrador no tiene número registrado.");
      return;
    }
    const texto = encodeURIComponent(mensaje);
    const url = `https://wa.me/${telefono}?text=${texto}`;
    window.open(url, "_blank");
  };

  if (cargando) {
    return <div className="superadmin-loading">Cargando información...</div>;
  }

  return (
    <div className="superadmin-container">
      <h1 className="superadmin-title">📊 Panel del Super Administrador</h1>
      {mensaje && (
        <div className={`superadmin-msg ${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="superadmin-cards-container">
        {admins.map((admin) => {
          const pago = pagos.find((p) => p.admin_id === admin.auth_id);
          const estado = determinarEstadoAdmin(admin.auth_id);
          const rutas = pago?.rutas || [];

          return (
            <div className="cobrador-card" key={admin.id}>
              <div className="cobrador-card-header">
                <span>{admin.nombre}</span>
                <span
                  className={`estado-cobrador ${
                    estado === "pagado" ? "verde" : "rojo"
                  }`}
                >
                  {estado === "pagado" ? "✔ Pagado" : "❌ Pendiente"}
                </span>
              </div>

              <div className="cobrador-card-totales">
                <p>
                  <strong>Teléfono:</strong> {admin.telefono || "No registrado"}
                </p>
                <p>
                  <strong>Rutas:</strong>{" "}
                  {rutas.length > 0
                    ? rutas.map((r) => r.nombre).join(", ")
                    : "Sin rutas"}
                </p>
              </div>

              <div className="cobrador-card-buttons">
                {pago && pago.url_evidencia && (
                  <button
                    className="btn-evidencia"
                    onClick={() => verEvidencia(pago)}
                  >
                    📎 Ver evidencia
                  </button>
                )}

                {pago && estado !== "pagado" && (
                  <button
                    className="btn-verificar"
                    onClick={() => marcarPagado(pago.id)}
                  >
                    💰 Marcar como pagado
                  </button>
                )}

                <button
                  className="btn-recordatorio"
                  onClick={() =>
                    enviarWhatsApp(
                      admin.telefono,
                      estado === "pagado"
                        ? `✅ Hola ${admin.nombre}, confirmamos tu pago. ¡Gracias por mantenerte al día!`
                        : `⚠️ Hola ${admin.nombre}, recuerda realizar tu pago de suscripción. Estado actual: ${estado.toUpperCase()}.`
                    )
                  }
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
