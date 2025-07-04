import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Definición de las cabeceras CORS
const corsHeaders = {
  // ¡MUY IMPORTANTE! CÁMBIALO para producción al dominio real de tu frontend (ej. "https://app.credipago.com")
  "Access-Control-Allow-Origin": "http://localhost:5173", 
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  console.log("Request received", { method: req.method, url: req.url });

  // --- Manejo de la solicitud OPTIONS (preflight CORS) ---
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS (CORS preflight) request.");
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // --- Validación del método HTTP ---
  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return new Response("Método no permitido", {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  try {
    const body = await req.json();
    console.log("Request body:", body);

    // Ahora esperamos 'email' como campo obligatorio para ambos roles,
    // ya que será el método de login para todos.
    const { nombre, email, telefono, password, rol } = body;

    // --- Validaciones de entrada ---
    // Email ahora es obligatorio.
    if (!nombre || !email || !password || !rol) {
      console.log("Datos faltantes:", { nombre, email, password, rol });
      return new Response(
        JSON.stringify({ error: "Faltan datos requeridos (nombre, email, password, rol)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    // Añadir una validación básica de formato de email
    if (typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
        console.log("Email inválido:", email);
        return new Response(
            JSON.stringify({ error: "El formato del email es inválido." }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }


    if (!["admin", "cobrador"].includes(rol)) {
      console.log("Rol inválido:", rol);
      return new Response(
        JSON.stringify({ error: "Rol inválido, debe ser 'admin' o 'cobrador'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Obtención y validación de variables de entorno ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Supabase URL loaded:", supabaseUrl ? "OK" : "MISSING");
    console.log("Service Role Key loaded:", serviceRoleKey ? "OK" : "MISSING");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Critical error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are not set.");
      throw new Error(
        "Error de configuración: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidas como secretos."
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // --- Obtener el ID del administrador que realiza la solicitud ---
    const authHeader = req.headers.get('Authorization');
    const accessToken = authHeader?.split(' ')[1]; // 'Bearer <token>'

    let adminAuthId: string | null = null;
    if (!accessToken) {
      console.warn("No Authorization header found. Cannot link created user to an admin.");
      return new Response(
        JSON.stringify({ error: "Acceso no autorizado. Se requiere un token de administrador para crear usuarios." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user: adminUser }, error: adminAuthError } = await supabase.auth.getUser(accessToken);
    if (adminAuthError || !adminUser || adminUser.role !== 'authenticated') { 
      // Puedes refinar la verificación del rol del admin aquí si usas una política de roles más estricta en auth.users metadata.
      console.error("Error authenticating admin user:", adminAuthError?.message || 'Admin user not found or not authenticated.');
      return new Response(
        JSON.stringify({ error: `Error de autenticación del administrador: ${adminAuthError?.message || 'Usuario no encontrado o no autorizado.'}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    adminAuthId = adminUser.id;
    console.log("Admin user ID from token:", adminAuthId);


    // --- Configurar la confirmación de email según el rol ---
    let emailConfirmRequired = true; // Por defecto: se requiere confirmación (para admin)

    if (rol === "cobrador") {
      emailConfirmRequired = false; // Deshabilitar confirmación para cobradores
      console.log(`Email confirmation disabled for cobrador (${nombre}).`);
    } else { // rol === "admin"
      emailConfirmRequired = true; // La confirmación sigue siendo requerida para admins
      console.log(`Email confirmation enabled for admin (${nombre}).`);
    }


    // --- Crear usuario en Supabase Auth usando la clave de rol de servicio ---
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email: email, // Usamos el email proporcionado directamente
      password,
      email_confirm: emailConfirmRequired, // Dinámico según el rol
      user_metadata: { 
        nombre_display: nombre, // Nombre para mostrar
        telefono: telefono,
        rol: rol, // Rol del usuario
      },
    });

    if (signUpError) {
      console.error("Error creating user in Auth:", signUpError.message);
      return new Response(
        JSON.stringify({ error: "Error creando usuario en autenticación: " + signUpError.message }),
        {
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    console.log("User created in Auth successfully:", userData.user.id);

    // --- Insertar en tablas de perfil según el rol ---
    if (rol === "admin") {
      const { error: insertAdminError } = await supabase
        .from("admin")
        .insert([
          {
            nombre,
            email: email, // Usar el email proporcionado
            auth_id: userData.user.id, // Enlaza el usuario de Auth con el perfil de admin
          },
        ]);
      if (insertAdminError) {
        console.error("Error inserting into 'admin' table:", insertAdminError.message);
        // ¡IMPORTANTE!: Si la inserción en la tabla falla, elimina el usuario recién creado en Auth
        await supabase.auth.admin.deleteUser(userData.user.id);
        return new Response(
          JSON.stringify({ error: "Error insertando en tabla admin: " + insertAdminError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      console.log("User profile inserted into 'admin' table.");
    } else { // rol === "cobrador"
      const { error: insertUserError } = await supabase
        .from("usuarios")
        .insert([
          {
            nombre, // Nombre para mostrar
            email,
            telefono,
            rol: "cobrador", // Rol específico para la tabla 'usuarios'
            auth_id: userData.user.id, // Enlaza el usuario de Auth con el perfil de cobrador
            admin_id: adminAuthId, // ¡Amarrar al cobrador con el ID del admin que lo creó!
            // Ya NO se necesita 'supabase_email' aquí, porque el email es el que se ingresa.
          },
        ]);
      if (insertUserError) {
        console.error("Error inserting into 'usuarios' table:", insertUserError.message);
        // ¡IMPORTANTÍSIMO!: Si la inserción en la tabla falla, elimina el usuario recién creado en Auth
        await supabase.auth.admin.deleteUser(userData.user.id);
        return new Response(
          JSON.stringify({ error: "Error insertando en tabla usuarios: " + insertUserError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      console.log("User profile inserted into 'usuarios' table.");
    }

    console.log("User created successfully with ID:", userData.user.id);

    return new Response(JSON.stringify({ success: true, userId: userData.user.id }), {
      status: 201, // 201 Created
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Unhandled error in function:", error.message);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor: " + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});