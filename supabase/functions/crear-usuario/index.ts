import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configurar CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://credipago.vercel.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  "Access-Control-Max-Age": "86400"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Validar token del admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { data: user, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user?.user) {
      return new Response(JSON.stringify({ error: "Error de autenticación del administrador" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Obtener datos del body
    const body = await req.json();
    const { nombre, telefono, email, password, rol } = body;

    if (!email || !password || !nombre) {
      return new Response(JSON.stringify({ error: "Faltan datos obligatorios" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Insertar en la tabla usuarios (incluyendo password plano)
    let insertError = null;

    if (rol === "admin") {
      // Insertar en tabla admin
      const { error: errorAdmin } = await supabaseAdmin.from("admin").insert({
        nombre,
        email,
        auth_id: authData.user.id
      });

      // Insertar también en usuarios
      const { error: usuarioError } = await supabaseAdmin.from("usuarios").insert({
        nombre,
        telefono: telefono || "",
        email,
        rol: "admin",
        auth_id: authData.user.id,
        admin_id: user.user.id,
        password // ✅ guardado tal cual
      });

      insertError = errorAdmin || usuarioError;
    } else {
      // Usuario normal
      const { error } = await supabaseAdmin.from("usuarios").insert({
        nombre,
        telefono,
        email,
        rol,
        auth_id: authData.user.id,
        admin_id: user.user.id,
        password // ✅ guardado tal cual
      });
      insertError = error;
    }

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Usuario creado en Auth pero falló al insertar en la tabla usuarios." }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ mensaje: "Usuario creado correctamente." }),
      { status: 200, headers: corsHeaders }
    );

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
