import { useEffect, useState, useRef } from "react";
import { supabase } from "../components/supabaseClient";
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../Styles/AdminMapa.css";

// 🔧 Corrige iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// 🏍️ Icono moto personalizado
const motoIcon = L.divIcon({
  html: "🏍️",
  className: "emoji-icon",
  iconSize: [35, 35],
  iconAnchor: [17, 17],
});

// 🌀 Interpolación de movimiento suave
function interpolatePosition(start, end, t) {
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
  ];
}

// 📍 Subcomponente: manejador de cobradores en tiempo real
function CobradoresMarkers({ cobradores }) {
  const map = useMap();
  const markersRef = useRef({});
  const rutasRef = useRef({});

  useEffect(() => {
    cobradores.forEach((c) => {
      if (!c.latitud || !c.longitud) return;
      const nuevaPos = [c.latitud, c.longitud];

      // Nuevo cobrador → crea marcador
      if (!markersRef.current[c.id]) {
        const marker = L.marker(nuevaPos, { icon: motoIcon })
          .addTo(map)
          .bindPopup(
            `<strong>${c.nombre}</strong><br>Última actualización:<br>${new Date(
              c.ultima_actualizacion
            ).toLocaleString()}`
          );
        markersRef.current[c.id] = { marker, lastPos: nuevaPos };
        rutasRef.current[c.id] = [nuevaPos];
      } else {
        // Movimiento animado
        const markerData = markersRef.current[c.id];
        const start = markerData.lastPos;
        const end = nuevaPos;

        let step = 0;
        const steps = 25;
        const interval = setInterval(() => {
          step++;
          const pos = interpolatePosition(start, end, step / steps);
          markerData.marker.setLatLng(pos);
          if (step >= steps) clearInterval(interval);
        }, 60);

        markerData.lastPos = end;
        rutasRef.current[c.id].push(end);
      }
    });
  }, [cobradores, map]);

  return (
    <>
      {Object.keys(rutasRef.current).map((id) => (
        <Polyline
          key={id}
          positions={rutasRef.current[id]}
          color="#007bff"
          weight={3}
          opacity={0.6}
        />
      ))}
    </>
  );
}

export default function AdminMapa() {
  const [cobradores, setCobradores] = useState([]);
  const [session, setSession] = useState(null);
  const [selectedCobrador, setSelectedCobrador] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [rutaDia, setRutaDia] = useState([]);

  // 🧩 Obtener sesión del admin
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    fetchSession();
  }, []);

  // 📦 Obtener cobradores del admin
  useEffect(() => {
    if (!session) return;
    const fetchUbicaciones = async () => {
      const { data } = await supabase
        .from("usuarios")
        .select("id, nombre, latitud, longitud, ultima_actualizacion")
        .eq("rol", "cobrador")
        .eq("admin_id", session.user.id)
        .not("latitud", "is", null)
        .not("longitud", "is", null);
      if (data) setCobradores(data);
    };
    fetchUbicaciones();
  }, [session]);

  // 🔴 Tiempo real
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("realtime-cobradores")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "usuarios",
          filter: `admin_id=eq.${session.user.id}`,
        },
        (payload) => {
          setCobradores((prev) =>
            prev.map((c) =>
              c.id === payload.new.id ? { ...c, ...payload.new } : c
            )
          );
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  // 📅 Ver ruta por día
  const verRutaPorDia = async () => {
    if (!selectedCobrador || !selectedDate)
      return alert("Selecciona cobrador y fecha");
    const { data, error } = await supabase
      .from("rutas_cobrador")
      .select("latitud, longitud, hora")
      .eq("usuario_id", selectedCobrador)
      .eq("fecha", selectedDate)
      .order("hora", { ascending: true });
    if (error) console.error("Error al cargar ruta:", error);
    else setRutaDia(data);
  };

  return (
    <div className="mapa-container">
      <h2>🛰️ Mapa en tiempo real de cobradores</h2>

      {/* 🔍 Filtros de búsqueda */}
      <div className="filtros-rutas">
        <select
          value={selectedCobrador}
          onChange={(e) => setSelectedCobrador(e.target.value)}
        >
          <option value="">Seleccionar cobrador</option>
          {cobradores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />

        <button onClick={verRutaPorDia}>Ver ruta</button>
      </div>

      {/* 🗺️ Mapa principal */}
      <MapContainer
        center={[-9.19, -75.015]}
        zoom={6}
        style={{
          height: "80vh",
          width: "100%",
          borderRadius: "12px",
          boxShadow: "0 0 15px rgba(0,0,0,0.2)",
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        />
        <CobradoresMarkers cobradores={cobradores} />
        {rutaDia.length > 0 && (
          <Polyline
            positions={rutaDia.map((p) => [p.latitud, p.longitud])}
            color="green"
            weight={4}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  );
}
