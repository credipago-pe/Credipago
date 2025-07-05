// src/Pages/NotFound.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirige al login ("/") o cambia por otra ruta segura si lo prefieres
    navigate("/");
  }, []);

  return <p>Redirigiendo...</p>;
}
