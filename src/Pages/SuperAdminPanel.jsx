import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../components/supabaseClient";
import "../Styles/Login.css";
import { FaUser, FaLock } from "react-icons/fa";

const Login = () => {
  const [username, setUsername] = useState("");
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
      // 1️⃣ Login con Supabase Auth
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

      // 2️⃣ Verificar si el usuario existe en la tabla usuarios
      const { data: existingUser, error: fetchError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error al buscar usuario:", fetchError.message);
      }

      if (existingUser) {
        // 🔄 Si ya existe, actualizamos el pin
        const { error: updateError } = await supabase
          .from("usuarios")
          .update({ pin: password })
          .eq("auth_id", user.id);

        if (updateError) {
          console.error("Error actualizando pin:", updateError.message);
        } else {
          console.log("✅ Pin actualizado correctamente");
        }
      } else {
        // 🆕 Si no existe, insertamos uno nuevo (por defecto sin rol)
        const { error: insertError } = await supabase.from("usuarios").insert([
          {
            auth_id: user.id,
            email: username,
            pin: password,
          },
        ]);

        if (insertError) {
          console.error("Error insertando usuario:", insertError.message);
        } else {
          console.log("✅ Nuevo usuario insertado con pin");
        }
      }

      // 3️⃣ Buscar si es superadmin
      let { data: superData, error: superError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_id", user.id)
        .eq("rol", "superadmin")
        .maybeSingle();

      if (superError) {
        console.error("Error consultando superadmin:", superError.message);
      }

      if (superData) {
        localStorage.setItem(
          "usuario",
          JSON.stringify({
            role: "superadmin",
            username: superData.email,
            auth_id: user.id,
          })
        );
        navigate("/superadmin");
        return;
      }

      // 4️⃣ Buscar si es admin
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
          JSON.stringify({
            role: "admin",
            username: adminData.nombre,
            auth_id: user.id,
          })
        );
        navigate("/admin");
        return;
      }

      // 5️⃣ Si no es admin ni superadmin, buscar si es cobrador
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

      if (userData) {
        localStorage.setItem(
          "usuario",
          JSON.stringify({
            role: "cobrador",
            username: userData.email,
            auth_id: user.id,
          })
        );
        navigate("/cobrador");
        return;
      }

      // 6️⃣ Ningún rol válido
      setError("Usuario sin rol asignado o no registrado.");
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
      setError("Error al iniciar sesión. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="login-container">
      <img src="/logo.png" alt="Logo Credipago" style={{ width: 220, marginBottom: 8 }} />
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
        <button type="submit" className="login-button">
          Ingresar
        </button>
      </form>
    </div>
  );
};

export default Login;
