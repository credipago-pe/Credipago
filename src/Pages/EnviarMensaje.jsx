import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import dayjs from "dayjs";
import { Clock, List, ReceiptText, ArrowLeft } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import "../Styles/EnviarMensaje.css";

export default function EnviarMensaje() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [credito, setCredito] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [clienteId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: clienteData, error: clienteError } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (clienteError) {
      console.error("Error al obtener cliente:", clienteError.message);
      setLoading(false);
      return;
    }

    const { data: creditoData, error: creditoError } = await supabase
      .from("creditos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("fecha_inicio", { ascending: false })
      .limit(1)
      .single();

    if (creditoError) {
      console.error("Error al obtener crédito:", creditoError.message);
      setLoading(false);
      return;
    }

    let pagosData = [];
    if (creditoData) {
      const { data: pagosRes, error: pagosError } = await supabase
        .from("pagos")
        .select("*")
        .eq("credito_id", creditoData.id)
        .order("fecha_pago", { ascending: false });

      if (pagosError) {
        console.error("Error al obtener pagos:", pagosError.message);
      } else {
        pagosData = pagosRes || [];
      }
    }

    setCliente(clienteData);
    setCredito(creditoData);
    setPagos(pagosData);
    setLoading(false);
  };

  const generarMensaje = (tipo) => {
    if (!cliente || !credito) return;

    const nombre = cliente.nombre;
    const saldo = credito.saldo?.toFixed(2) ?? "0.00";
    const valorCuota = credito.valor_cuota?.toFixed(2) ?? "0.00";
    const cuotasPendientes = Math.ceil(credito.saldo / credito.valor_cuota);
    const fechaVencimiento = dayjs(credito.fecha_vencimiento).format("DD/MM/YYYY");
   
    if (tipo === "recordatorio") {
      setMensaje(`Hola, ${nombre},!!! 📢
    
Le recordamos pagar su cuota: $${valorCuota},
Saldo pendiente: $${saldo}.
Cuotas restantes: ${cuotasPendientes} de ${credito.cuotas}
Crédito vence el:  ${fechaVencimiento}
 
Por favor, no olvide realizar su pago hoy. ¡Gracias! 🙌`

);

   } else if (tipo === "historial") {
  if (pagos.length === 0) {
    setMensaje(`📄 HISTORIAL DE PAGOS\nCliente: ${nombre}\n\nAún no se registran pagos.`);
    return;
  }

  const historial = pagos.map((p, i) =>
    `${(i + 1).toString().padStart(2, "0")}. ${dayjs(p.fecha_pago).format("DD/MM/YYYY")} | $${Number(p.monto_pagado).toFixed(2)} | ${p.metodo_pago.toUpperCase()}`
  ).join("\n");

  const totalAbonado = pagos.reduce((sum, p) => sum + Number(p.monto_pagado || 0), 0).toFixed(2);

  setMensaje(`               📄 HISTORIAL DE PAGOS
   
Cliente: ${nombre}
ID.Crédito #: ${credito.id}
Fecha de inicio: ${dayjs(credito.fecha_inicio).format("DD/MM/YYYY")}
Fecha de vencimiento: ${dayjs(credito.fecha_vencimiento).format("DD/MM/YYYY")}
Monto del crédito: $${Number(credito.monto).toFixed(2)}
----------------------------
${historial}
----------------------------
Total abonado:   $${totalAbonado}
Último pago:     ${dayjs(pagos[0].fecha_pago).format("DD/MM/YYYY")}
Saldo actual:    $${saldo}`);


  } else if (tipo === "recibo") {
  const ultimoPago = pagos[0];
  if (ultimoPago) {
    const montoCredito = Number(credito.monto).toFixed(2);
    const saldoAnterior = (Number(ultimoPago.saldo) + Number(ultimoPago.monto_pagado)).toFixed(2);
    const saldoActual = Number(ultimoPago.saldo).toFixed(2);
    const cuotasTotales = Number(credito.cuotas);
    const cuotasPagadas = pagos.length;
    const cuotasRestantes = Math.max(cuotasTotales - cuotasPagadas, 0);

    setMensaje(`            🧾 RECIBO DE PAGO            
----------------------------------------
Cliente: ${cliente.nombre}
Crédito #: ${credito.id}
Fecha:   ${dayjs(ultimoPago.fecha_pago).format("DD/MM/YYYY")}
Monto del crédito:  $${montoCredito}
----------------------------------------
Saldo anterior:     $${saldoAnterior}
Pago realizado:     $${Number(ultimoPago.monto_pagado).toFixed(2)}
Saldo actual:       $${saldoActual}
Cuotas restantes:   ${cuotasPendientes}
Método de pago:     ${ultimoPago.metodo_pago.toUpperCase()}
----------------------------------------
¡Gracias por su pago puntual!`);
  } else {
    setMensaje(`            🧾 RECIBO DE PAGO            
----------------------------------------
Cliente: ${cliente.nombre}
Crédito #: ${credito.id}
----------------------------------------
Aún no registramos pagos en este crédito.`);
  }
}


  };

  const enviarWhatsApp = () => {
    if (!cliente?.telefono) {
      alert("Este cliente no tiene número de teléfono registrado.");
      return;
    }
    const numero = cliente.telefono.replace(/\D/g, "");
    const mensajeCodificado = encodeURIComponent(mensaje);
    window.open(`https://wa.me/${numero}?text=${mensajeCodificado}`, "_blank");
  };

  if (loading) return <p className="cargando">Cargando datos...</p>;

  return (
    <div className="mensaje-container">
      <h2>📨 Enviar mensaje a {cliente?.nombre}</h2>

      <div className="botones-opciones">
        <button onClick={() => generarMensaje("recordatorio")}>📅 Recordatorio de pago</button>
        <button onClick={() => generarMensaje("historial")}>📋 Historial de pagos</button>
        <button onClick={() => generarMensaje("recibo")}>🧾 Recibo de pago</button>
      </div>

      <textarea
        rows="10"
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="Aquí aparecerá el mensaje..."
      />

      <div className="acciones-mensaje">
        <button onClick={enviarWhatsApp} disabled={!mensaje}>
         <FaWhatsapp style={{ marginRight: "8px" }} />Enviar por WhatsApp
        </button>

        <button onClick={() => navigate(-2)}>⬅ Volver</button>
      </div>
    </div>
  );
}
