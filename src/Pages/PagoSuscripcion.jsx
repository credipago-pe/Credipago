import React, { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "../Styles/PagoSuscripcion.css";
import "dayjs/locale/es";

const PRECIO_POR_RUTA = 30;

export default function PagoSuscripcion() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [evidenciaFile, setEvidenciaFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [evidenceUrl, setEvidenceUrl] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const hoy = dayjs();
  const anioActual = hoy.year();
  const mesActual = hoy.month() + 1;
  const mesAnterior = hoy.subtract(1, "month").month() + 1;

  const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const mesNombre = capitalizar(hoy.subtract(1, "month").format("MMMM"));
  const mesActualNombre = capitalizar(hoy.format("MMMM"));
  const periodoTexto = `🕒 Periodo: ${mesNombre} (${anioActual}) — pago del 1 al 5 de ${mesActualNombre}`;

  // 🔹 1️⃣ Cargar admin
  useEffect(() => {
    const cargarAdmin = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setMessage({ type: "error", text: "No hay sesión activa." });
          return;
        }

        const { data: adminData, error: adminErr } = await supabase
          .from("usuarios")
          .select("id, nombre, telefono, auth_id")
          .eq("auth_id", user.id)
          .single();

        if (adminErr || !adminData) {
          setMessage({ type: "error", text: "No se pudo obtener admin." });
          return;
        }

        setAdmin(adminData);
      } catch (err) {
        console.error("Error cargando admin:", err);
      }
    };

    cargarAdmin();
  }, []);

  // 🔹 2️⃣ Cargar rutas y estados de pago actualizados
  const cargarEstadosRutas = async () => {
    if (!admin) return;

    try {
      // 🔸 Obtener rutas (cobradores)
      const { data: rutasData, error: rutasErr } = await supabase
        .from("usuarios")
        .select("id, nombre, auth_id")
        .eq("admin_id", admin.auth_id)
        .eq("rol", "cobrador");

      if (rutasErr) throw rutasErr;

      // 🔸 Obtener pagos del mes actual
      const { data: pagosData, error: pagosErr } = await supabase
        .from("suscripciones_pagos")
        .select("*")
        .eq("admin_id", admin.auth_id)
        .eq("anio", anioActual)
        .eq("mes", mesActual);

      if (pagosErr) throw pagosErr;

      // 🔸 Analizar rutas y estados
      const rutasConEstado = rutasData.map((ruta) => {
        const pagoRuta = pagosData.find((p) => {
          let rutasPago = [];
          if (typeof p.rutas === "string") {
            try {
              rutasPago = JSON.parse(p.rutas);
            } catch {
              console.warn("Error parseando rutas:", p.rutas);
            }
          } else if (Array.isArray(p.rutas)) {
            rutasPago = p.rutas;
          }
          return rutasPago.some((r) => r.auth_id === ruta.auth_id);
        });

        const estado = pagoRuta
          ? pagoRuta.estado
          : hoy.date() > 5
          ? "vencido"
          : "pendiente";

        return { ...ruta, estado };
      });

      setRutas(rutasConEstado);
      setPagos(pagosData);
    } catch (err) {
      console.error("Error obteniendo estados de rutas:", err);
    }
  };

  useEffect(() => {
    cargarEstadosRutas();
  }, [admin]);

  // 🔹 Subir comprobante
  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setEvidenciaFile(f);
  };

  const handleEnviarPago = async () => {
    if (!rutas.length) {
      setMessage({ type: "error", text: "No tienes rutas registradas." });
      return;
    }

    if (!evidenciaFile) {
      setMessage({ type: "error", text: "Selecciona un comprobante." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado.");
      const adminAuthId = user.id;

      // Subir archivo al bucket
      const filename = `${adminAuthId}/${Date.now()}_${evidenciaFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("pagos_suscripciones")
        .upload(filename, evidenciaFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("pagos_suscripciones")
        .getPublicUrl(filename);
      const url = publicUrlData?.publicUrl || null;
      setEvidenceUrl(url);

      // Guardar en la base de datos
      const rutasArray = rutas.map((r) => ({
        auth_id: r.auth_id,
        nombre: r.nombre,
      }));

      const totalNumeric = rutasArray.length * PRECIO_POR_RUTA;

      const { data: existing } = await supabase
        .from("suscripciones_pagos")
        .select("id, estado")
        .eq("admin_id", adminAuthId)
        .eq("mes", mesActual)
        .eq("anio", anioActual)
        .maybeSingle();

      if (!existing) {
        await supabase.from("suscripciones_pagos").insert([
          {
            admin_id: adminAuthId,
            admin_nombre: admin?.nombre || null,
            rutas: rutasArray,
            total: totalNumeric,
            estado: "proceso",
            url_evidencia: url,
            filename,
            metodo_pago: "yape",
            mes: mesActual,
            anio: anioActual,
          },
        ]);
      } else {
        await supabase
          .from("suscripciones_pagos")
          .update({
            estado: "proceso",
            rutas: rutasArray,
            url_evidencia: url,
          })
          .eq("id", existing.id);
      }

      setMessage({ type: "success", text: "Comprobante enviado. Estado: EN PROCESO." });
      setShowModal(false);
      setEvidenciaFile(null);

      // 🔁 Recargar estados de rutas después de enviar
      await cargarEstadosRutas();
    } catch (err) {
      console.error("Error subiendo evidencia:", err);
      setMessage({
        type: "error",
        text: "Error subiendo evidencia: " + (err.message || err),
      });
    } finally {
      setUploading(false);
    }
  };

  const renderEstado = (estado) => {
    switch (estado) {
      case "pagado":
        return <span className="ps-estado pagado">✅ Pagado</span>;
      case "proceso":
        return <span className="ps-estado proceso">🕒 En proceso</span>;
      case "vencido":
        return <span className="ps-estado vencido">❌ Vencido</span>;
      default:
        return <span className="ps-estado pendiente">⌛ Pendiente</span>;
    }
  };

  return (
    <div className="ps-container">
      <header className="ps-header-card">
        <h2>💼 Pago de Suscripción</h2>
        <div className="ps-header-row">
          <div className="ps-admin">
            <strong>Administrador:</strong> {admin?.nombre || "Cargando..."}
          </div>
          <div className="ps-total">
            <span>Total a pagar:</span>
            <td className="ps-amount">
              S/{" "}
              {rutas
                .reduce(
                  (acc, r) =>
                    acc + (["pagado", "proceso"].includes(r.estado) ? 0 : PRECIO_POR_RUTA),
                  0
                )
                .toFixed(2)}
            </td>
          </div>
        </div>

        <section className="ps-factura-card">
          {rutas.length === 0 ? (
            <p>No hay rutas activas registradas.</p>
          ) : (
            <div className="ps-tabla">
              <table>
                <thead>
                  <tr>
                    <th>Ruta</th>
                    <th>Estado</th>
                    <th>Precio (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {rutas.map((r) => (
                    <tr key={r.id}>
                      <td>{r.nombre}</td>
                      <td>{renderEstado(r.estado)}</td>
                      <td>
                        S/ {["pagado", "proceso"].includes(r.estado) ? "0.00" : "30.00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="ps-periodo">{periodoTexto}</div>
      </header>

      {/* QR y Subida */}
      <section className="ps-qr">
        <div className="ps-qr-content">
          <h3 className="ps-qr-title">📱 Escanea el QR en Yape</h3>
          <img
            src={
              qrUrl ||
              "https://bitjxwvxetvnddkjwyuw.supabase.co/storage/v1/object/public/qr_yape/QR_YAPE.jpeg"
            }
            alt="QR Yape"
            className="ps-qr-img"
            onClick={() => {
              const link = document.createElement("a");
              link.href =
                qrUrl ||
                "https://bitjxwvxetvnddkjwyuw.supabase.co/storage/v1/object/public/qr_yape/QR_YAPE.jpeg";
              link.download = "QR_Yape.jpeg";
              link.click();
            }}
            style={{ cursor: "pointer" }}
          />
          <p className="ps-qr-download-text">Click en la imagen para descargar 📥</p>
        </div>
      </section>

      <div className="ps-evidencia-btns">
        <button onClick={() => setShowModal(true)} className="ps-pague-btn">
          💸 Ya pagué
        </button>
      </div>

      {showModal && (
        <div className="ps-modal-overlay">
          <div className="ps-modal">
            <h3>📷 Subir evidencia del pago</h3>
            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
            <div className="ps-modal-btns">
              <button onClick={handleEnviarPago} disabled={uploading}>
                {uploading ? "Subiendo..." : "Enviar captura"}
              </button>
              <button onClick={() => setShowModal(false)} className="ps-cerrar-modal">
                ❌ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`ps-msg ${message.type === "error" ? "error" : "success"}`}>
          {message.text}
        </div>
      )}

      {evidenceUrl && (
        <div className="ps-evidencia-link">
          <a href={evidenceUrl} target="_blank" rel="noreferrer">
            📎 Ver evidencia subida
          </a>
        </div>
      )}

      <footer className="ps-footer">
        <button onClick={() => navigate(-1)} className="ps-back-btn">
          ⬅️ Volver
        </button>
      </footer>
    </div>
  );
}
