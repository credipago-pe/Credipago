import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient"; // Ajusta la ruta a tu cliente Supabase
import "../Styles/RegistroUsuario.css";


export default function RegistroUsuarios() {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState(""); // Este campo ahora es OBLIGATORIO para todos
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("cobrador");
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminAccessToken, setAdminAccessToken] = useState(null); 
  const navigate = useNavigate();

  // useEffect para obtener el token del admin al cargar el componente
  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("Error al obtener la sesión del admin:", sessionError?.message);
        setError("No se pudo cargar la sesión del administrador. Inicie sesión de nuevo.");
        // Opcional: redirigir a login si no hay sesión
        // navigate("/login"); 
      } else {
        setAdminAccessToken(session.access_token);
        console.log("Admin Access Token obtenido:", session.access_token);
      }
    };
    getSession();
  }, []);

  const handleRegistro = async () => {
    // Validar campos obligatorios, incluyendo el email
    if (!nombre || !email || !password || !telefono) {
      setError("Todos los campos (Nombre, Email, Teléfono, Contraseña) son obligatorios.");
      setMensaje(null);
      return;
    }
    // Validación básica de email
    if (!email.includes('@') || !email.includes('.')) {
        setError("El formato del email es inválido.");
        setMensaje(null);
        return;
    }

    if (!adminAccessToken) {
      setError("No se ha podido autenticar al administrador. Intente recargar la página o iniciar sesión de nuevo.");
      return;
    }

    setLoading(true);
    setError(null);
    setMensaje(null);

    console.log("Token admin:", adminAccessToken);
    try {
      const response = await fetch(
        "https://bitjxwvxetvnddkjwyuw.functions.supabase.co/crear-usuario",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${adminAccessToken}`, // Envía el token del admin
          },
          body: JSON.stringify({
            nombre,
            telefono,
            email, // Ahora el email es el proporcionado por el usuario
            password,
            rol,
          }),
        }
      );

      let data;
      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = typeof data === "string" ? data : data.error || "Error desconocido al crear el usuario.";
        setError(`Error (${response.status}): ${errorMsg}`);
        setMensaje(null);
        console.error("Error response:", { status: response.status, data: data });
        return;
      }

      setMensaje("Usuario creado correctamente.");
      setNombre("");
      setTelefono("");
      setEmail(""); // Limpiar también el email
      setPassword("");
      setRol("cobrador");

    } catch (err) {
      setError("Error de conexión o problema inesperado. Intente de nuevo.");
      setMensaje(null);
      console.error("Error en handleRegistro:", err);
    } finally {
      setLoading(false);
    }
  };
 return (
    <div className="registro-container">

      <button className="boton-volver" onClick={() => navigate(-1)}>
      ← Volver
     </button>

      <h2>Registrar nuevo usuario</h2>

      {error && <p className="error-msg">{error}</p>}
      {mensaje && <p className="success-msg">{mensaje}</p>}

      <input
        type="text"
        placeholder="Nombre de usuario"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        disabled={loading}
      />
      <input
        type="email"
        placeholder="Email (obligatorio)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <input
        type="text"
        placeholder="Teléfono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />

      <select
        value={rol}
        onChange={(e) => setRol(e.target.value)}
        disabled={loading}
      >
        <option value="cobrador">Cobrador</option>
        <option value="admin">Administrador</option>
      </select>

      <button onClick={handleRegistro} disabled={loading}>
        {loading ? "Registrando..." : "Registrar Usuario"}
      </button>
    </div>
  );
}