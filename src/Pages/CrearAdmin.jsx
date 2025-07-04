import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";

export default function CrearAdmin() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const navigate = useNavigate();

  const handleCrearAdmin = async () => {
    if (!nombre || !email || !password) {
      setError("Todos los campos son obligatorios");
      return;
    }

    try {
      const response = await fetch("/api/crear-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Aquí puedes agregar Authorization si tu edge function lo requiere
        },
        body: JSON.stringify({ nombre, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al crear admin");
        setExito(null);
        return;
      }

      setExito("Administrador creado correctamente");
      setError(null);
      setNombre("");
      setEmail("");
      setPassword("");

      setTimeout(() => navigate("/admin"), 1500);
    } catch (err) {
      setError("Error en la conexión");
      setExito(null);
      console.error(err);
    }
  };

  return (
    <div className="crear-admin-container">
      <h2>Crear nuevo administrador</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {exito && <p style={{ color: "green" }}>{exito}</p>}

      <input
        type="text"
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleCrearAdmin}>Crear Administrador</button>
    </div>
  );
}
