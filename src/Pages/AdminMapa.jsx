import { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../Styles/AdminMapa.css"; // Asegúrate de tener este CSS para el mapa

// Corrige el icono por defecto de Leaflet (necesario en muchos entornos)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function AdminMapa() {
  const [cobradores, setCobradores] = useState([]);

  useEffect(() => {
    const fetchUbicaciones = async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, latitud, longitud, ultima_actualizacion")
        .eq("rol", "cobrador")
        .not("latitud", "is", null)
        .not("longitud", "is", null);
if (error) {
      console.error("Error obteniendo ubicaciones:", error);
    } else {
      console.log("📍 Ubicaciones obtenidas de Supabase:", data);
      setCobradores(data);
console.log("🧭 Estado final de cobradores:", data);

    }
  };
    fetchUbicaciones();

    // Refrescar cada 30 segundos
    const interval = setInterval(fetchUbicaciones, 30000);
    return () => clearInterval(interval);
  }, []);

  const motoIcon = L.divIcon({
  html: "🏍️",
  className: "emoji-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

  return (
    <div className="mapa-container">
      <h2>Ubicación de Cobradores</h2>
      <MapContainer
        center={[-9.19, -75.015]} // Coordenadas centrales de Perú
        zoom={6}
        style={{ height: "80vh", width: "100%", borderRadius: "12px" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {cobradores.map((cobrador) => (
           <Marker
          key={cobrador.id}
          position={[cobrador.latitud, cobrador.longitud]}
          icon={motoIcon} // usamos el icono de moto
        >
            <Popup>
              <strong>{cobrador.nombre}</strong>
              <br />
              Última conexión:<br />
              {new Date(cobrador.ultima_actualizacion).toLocaleString()}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
