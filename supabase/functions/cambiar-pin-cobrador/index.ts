import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://credipago.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin");
  const allowedOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : "https://credipago.vercel.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
};

const jsonResponse = (
  body: Record<string, string>,
  status: number,
  headers: Record<string, string>,
) => new Response(JSON.stringify(body), { status, headers });

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido." }, 405, corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!accessToken) {
      return jsonResponse({ error: "Se requiere iniciar sesión como administrador." }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Falta la configuración segura de Supabase en la función.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authenticatedUser, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authenticatedUser.user) {
      return jsonResponse({ error: "La sesión no es válida. Inicia sesión nuevamente." }, 401, corsHeaders);
    }

    const { data: adminRecord, error: adminError } = await supabaseAdmin
      .from("admin")
      .select("auth_id")
      .eq("auth_id", authenticatedUser.user.id)
      .maybeSingle();

    if (adminError) {
      console.error("Error verificando el administrador:", adminError.message);
      return jsonResponse({ error: "No se pudo verificar el permiso de administrador." }, 500, corsHeaders);
    }

    if (!adminRecord) {
      return jsonResponse({ error: "Solo un administrador puede cambiar el PIN." }, 403, corsHeaders);
    }

    const body = await req.json();
    const cobradorId = body?.cobradorId;
    const nuevoPin = body?.nuevoPin;

    if (
      (typeof cobradorId !== "number" && typeof cobradorId !== "string") ||
      String(cobradorId).trim() === "" ||
      typeof nuevoPin !== "string" ||
      !/^[a-zA-Z0-9]{4}$/.test(nuevoPin)
    ) {
      return jsonResponse({ error: "Indica un cobrador válido y un PIN de exactamente 4 letras o números." }, 400, corsHeaders);
    }

    const { data: cobrador, error: cobradorError } = await supabaseAdmin
      .from("usuarios")
      .select("auth_id")
      .eq("id", cobradorId)
      .eq("admin_id", authenticatedUser.user.id)
      .eq("rol", "cobrador")
      .maybeSingle();

    if (cobradorError) {
      console.error("Error buscando el cobrador:", cobradorError.message);
      return jsonResponse({ error: "No se pudo verificar el cobrador seleccionado." }, 500, corsHeaders);
    }

    if (!cobrador?.auth_id) {
      return jsonResponse({ error: "El cobrador no pertenece a este administrador o no tiene una cuenta vinculada." }, 404, corsHeaders);
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      cobrador.auth_id,
      { password: nuevoPin },
    );

    if (updateError) {
      console.error("Error actualizando el PIN en Auth:", updateError.message);
      return jsonResponse({ error: updateError.message }, 400, corsHeaders);
    }

    return jsonResponse({ mensaje: "PIN actualizado correctamente." }, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado al cambiar el PIN.";
    console.error("Error al cambiar el PIN del cobrador:", message);
    return jsonResponse({ error: message }, 500, corsHeaders);
  }
});
