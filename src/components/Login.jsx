import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import "../styles/Login.css";
import { FaUser, FaLock } from "react-icons/fa";

const Login = () => {
  const [username, setUsername] = useState(""); // Aquí usarás el email para Auth
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    try {
      // 1. Login con Supabase Auth usando email y password
     const { data, error: loginError } = await supabase.auth.signInWithPassword({
  email: username,
  password,
});

const user = data?.user;


      if (loginError) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }

      if (!user) {
        setError("Error al iniciar sesión.");
        return;
      }

      // 2. Buscar si es admin por auth_id
      let { data: adminData, error: adminError } = await supabase
        .from("admin")
        .select("*")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (adminError) {
        console.error("Error en consulta admin:", adminError.message);
        setError("Error interno, intenta más tarde.");
        return;
      }

      if (adminData) {
        localStorage.setItem(
          "usuario",
          JSON.stringify({ role: "admin", username: adminData.nombre, auth_id: user.id })
        );
        navigate("/admin");
        return;
      }

      // 3. Si no es admin, buscar en usuarios (cobrador)
      let { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_id", user.id)
        .eq("rol", "cobrador")
        .maybeSingle();

      if (userError) {
        console.error("Error en consulta usuarios:", userError.message);
        setError("Error interno, intenta más tarde.");
        return;
      }

      if (userData) {localStorage.setItem(
        "usuario",
        JSON.stringify({ role: "cobrador",username: userData.email,auth_id: user.id,
         })
        );
        navigate("/cobrador");
        return;
      }

      setError("Usuario sin rol asignado o no registrado.");
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
      setError("Error al iniciar sesión. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="login-container">
      <img src="/logo.png" alt="CrediPago" className="login-logo" />
      <h2>Bienvenido a CrediPago</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-container">
          <FaUser className="icon" />
          <input
            type="email"
            placeholder="Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="input-container">
          <FaLock className="icon" />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Ingresar</button>
      </form>
    </div>
  );
};

export default Login;
