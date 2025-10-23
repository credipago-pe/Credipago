import React, { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { FaQrcode, FaCheckCircle, FaUpload, FaCreditCard, FaShoppingCart } from "react-icons/fa";
import "../Styles/PagoSuscripcion.css"; // crea este archivo o adapta estilos

const PRECIO_POR_RUTA = 30; // S/ 30 por ruta

export default function PagoSuscripcion() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [rutas, setRutas] = useState([]); // { id, nombre, auth_id, seleccionado }
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [total, setTotal] = useState(0);

  const [evidenciaFile, setEvidenciaFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [evidenceUrl, setEvidenceUrl] = useState(null);
  const [qrUrl, setQrUrl] = useState(null); // si quieres colocar QR fijo

  useEffect(() => {
    // carga admin y rutas del admin
    const init = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setMessage({ type: "error", text: "No hay sesión activa." });
        return;
      }

      // obtener datos del admin en tabla usuarios
      const { data: adminData, error: adminErr } = await supabase
        .from("usuarios")
        .select("id, nombre, telefono, auth_id")
        .eq("auth_id", user.id)
        .single();

      if (adminErr) {
        setMessage({ type: "error", text: "No se pudo obtener admin." });
        return;
      }
      setAdmin(adminData);

      // traer rutas/cobradores que pertenezcan a este admin
      const { data: rutasData, error: rutasErr } = await supabase
        .from("usuarios")
        .select("id, nombre, auth_id")
        .eq("admin_id", adminData.auth_id)
        .eq("rol", "cobrador");

      if (rutasErr) {
        setMessage({ type: "error", text: "Error cargando rutas." });
        return;
      }

      // inicializar con seleccionado = false
      setRutas((rutasData || []).map(r => ({ ...r, seleccionado: false })));

      // Opcional: carga un QR por defecto (reemplaza la URL por la de tu imagen)
      // setQrUrl("https://tuservidor.com/qr-yape.png");
    };

    init();
  }, []);

  useEffect(() => {
    setTotal(selectedIds.size * PRECIO_POR_RUTA);
  }, [selectedIds]);

  const toggleRuta = (auth_id) => {
    const s = new Set(selectedIds);
    if (s.has(auth_id)) s.delete(auth_id);
    else s.add(auth_id);
    setSelectedIds(s);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setEvidenciaFile(f);
  };

  // Subida y registro
  const handleEnviarPago = async () => {
    if (selectedIds.size === 0) {
      setMessage({ type: "error", text: "Selecciona al menos una ruta." });
      return;
    }

    if (!evidenciaFile) {
      setMessage({ type: "error", text: "Sube una imagen o recibo como evidencia." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      // obtener admin auth id
      const { data: { user } } = await supabase.auth.getUser();
      const adminAuthId = user.id;

      // upload a storage
      const filename = `${adminAuthId}/${Date.now()}_${evidenciaFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pagos_suscripciones")
        .upload(filename, evidenciaFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // obtener public url (si bucket es público)
      const { data: publicUrlData } = supabase.storage
        .from("pagos_suscripciones")
        .getPublicUrl(filename);

      const url = publicUrlData?.publicUrl || null;
      setEvidenceUrl(url);

      // crear registro en la tabla suscripciones_pagos
      const rutasArray = Array.from(selectedIds); // array de auth_id de rutas
      const totalNumeric = total;

      const { error: insertError } = await supabase
        .from("suscripciones_pagos")
        .insert([{
          admin_id: adminAuthId,
          rutas: rutasArray,
          total: totalNumeric,
          estado: "pendiente",
          url_evidencia: url,
          filename: filename,
          metodo_pago: "yape", // o lo que quieras
        }]);

      if (insertError) throw insertError;

      setMessage({ type: "success", text: "Pago enviado. Estado: PENDIENTE de verificación." });
    } catch (err) {
      console.error("Error subiendo evidencia:", err);
      setMessage({ type: "error", text: "Error al subir evidencia: " + (err.message || err) });
    } finally {
      setUploading(false);
    }
  };

  const abrirWhatsAppConEnlace = () => {
    // prepara mensaje con info y (opcional) URL de evidencia si ya se subió
    const rutasSeleccionadas = Array.from(selectedIds).join(", ");
    const texto = `Pago de suscripción.\nAdmin: ${admin?.nombre || ""}\nRutas: ${rutasSeleccionadas}\nTotal: S/ ${total}\nEvidencia: ${evidenceUrl || "No subida aún"}`;
    const telefono = "51XXXXXXXXX"; // reemplaza por tu número (incluye código país)
    const waUrl = `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(texto)}`;
    window.open(waUrl, "_blank");
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
      <div className="ps-amount">S/ {total.toFixed(2)}</div>
    </div>
  </div>
</header>


    {/* --- Sección del QR --- */}
    <section className="ps-qr">
        <div className="ps-qr-content">
          <h3 className="ps-qr-title">📱 Escanea el QR en Yape</h3>
          {qrUrl ? (
            <img src={qrUrl} alt="QR" />
          ) : (
            <img
              src="https://bitjxwvxetvnddkjwyuw.supabase.co/storage/v1/object/public/qr_yape/QR_YAPE.jpeg"
              alt="QR Yape"
            />
          )}
        </div>
      </section>

    {/* --- Sección de rutas --- */}
    <section className="ps-rutas-card">
      
      <div className="ps-rutas">
        <h3 className="ps-section-title">
         🗺️ Selecciona Rutas a Pagar 
       </h3>
        {rutas.length === 0 ? (
          <p>No hay rutas registradas.</p>
        ) : (
          rutas.map((r) => (
            <label key={r.auth_id} className="ps-ruta-item">
              <input
                type="checkbox"
                checked={selectedIds.has(r.auth_id)}
                onChange={() => toggleRuta(r.auth_id)}
              />
              <span>{r.nombre}</span>
            </label>
          ))
        )}
      </div>
    </section>

    {/* --- Evidencia --- */}
    <section className="ps-evidencia-card">
      <h3 className="ps-section-title">📷 Subir evidencia del pago</h3>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />

      <div className="ps-evidencia-btns">
        <button onClick={handleEnviarPago} disabled={uploading}>
          {uploading ? "Subiendo..." : "Ya pagué (Enviar Captura)"}
        </button>
        <button onClick={abrirWhatsAppConEnlace} className="ps-whatsapp-btn">
          Enviar notificación por WhatsApp
        </button>
      </div>

      {message && (
        <div
          className={`ps-msg ${
            message.type === "error" ? "error" : "success"
          }`}
        >
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
    </section>

    <footer className="ps-footer">
      <button onClick={() => navigate(-1)} className="ps-back-btn">
        ⬅️ Volver
      </button>
    </footer>

    </div>
  );
}
