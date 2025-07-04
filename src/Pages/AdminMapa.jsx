import React, { useEffect, useState } from "react";
import MapaUbicacion from "../Pages/MapaUbicacion"; // o la ruta correcta

export default function AdminMapa() {
  const [posicion, setPosicion] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocalización no soportada por este navegador.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosicion({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        alert("Error al obtener ubicación: " + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div>
      <h2>Ubicación del cobrador</h2>
      <MapaUbicacion posicion={posicion} />
    </div>
  );
}
