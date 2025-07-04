import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Inicializa Supabase con tus datos (ajusta según tu proyecto)
const supabaseUrl = "https://TU_SUPABASE_URL.supabase.co";
const supabaseAnonKey = "TU_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GeolocalizacionCobrador({ authUserId }) {
  const [error, setError] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);

  useEffect(() => {
    if (!authUserId) return; // No hacer nada si no hay usuario logueado

    // Función para actualizar la ubicación en Supabase
    const actualizarUbicacionEnSupabase = async (lat, lng) => {
      const { data, error } = await supabase
        .from("usuarios")
        .update({ latitud: lat, longitud: lng })
        .eq("auth_id", authUserId);

      if (error) {
        console.error("Error al actualizar ubicación:", error.message);
        setError("Error actualizando ubicación en la base");
      } else {
        setError(null);
      }
    };

    // Función para obtener ubicación y actualizarla
    const obtenerYActualizarUbicacion = () => {
      if (!navigator.geolocation) {
        setError("Geolocalización no soportada en este navegador");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUbicacion({ lat, lng });
          actualizarUbicacionEnSupabase(lat, lng);
        },
        (err) => {
          setError("No se pudo obtener ubicación: " + err.message);
        }
      );
    };

    // Obtener la ubicación inicial
    obtenerYActualizarUbicacion();

    // Actualizar ubicación cada 30 segundos
    const intervalo = setInterval(obtenerYActualizarUbicacion, 30000);

    // Limpiar intervalo al desmontar componente
    return () => clearInterval(intervalo);
  }, [authUserId]);

  return (
    <div>
      <h3>Ubicación actual:</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {ubicacion ? (
        <p>
          Latitud: {ubicacion.lat.toFixed(6)}, Longitud: {ubicacion.lng.toFixed(6)}
        </p>
      ) : (
        <p>Obteniendo ubicación...</p>
      )}
    </div>
  );
}
