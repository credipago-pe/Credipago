import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export default function MapaUbicacion({ posicion }) {
  if (!posicion) return <p>Posición no disponible</p>;

  return (
    <MapContainer
      center={[posicion.lat, posicion.lng]}
      zoom={15}
      style={{ height: "400px", width: "100%", marginTop: "1rem" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[posicion.lat, posicion.lng]}>
        <Popup>Ubicación del cobrador</Popup>
      </Marker>
    </MapContainer>
  );
}
