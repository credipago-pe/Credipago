import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3@3.750.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.750.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://credipago.vercel.app",
  "https://credipagoplus.base44.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.1.10:5173",
  "http://192.168.1.10:5174",
]);

const photoTypes = [
  "foto_cliente",
  "documento_frente",
  "documento_reverso",
  "foto_local",
] as const;
type PhotoType = (typeof photoTypes)[number];

const maxPhotoBytes = 15 * 1024 * 1024;
const signedUrlSeconds = 300;
const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonResponse(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(request.headers.get("origin")),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `Falta el secreto ${name}.`);
  return value;
}

function parseClientId(value: unknown): number {
  const clientId = Number(value);
  if (!Number.isSafeInteger(clientId) || clientId < 1) {
    throw new HttpError(400, "ID de cliente no válido.");
  }
  return clientId;
}

function parsePhotoType(value: unknown): PhotoType {
  if (typeof value !== "string" || !photoTypes.includes(value as PhotoType)) {
    throw new HttpError(400, "Tipo de fotografía no válido.");
  }
  return value as PhotoType;
}

function parseMimeType(value: unknown): "image/webp" | "image/jpeg" {
  if (value !== "image/webp" && value !== "image/jpeg") {
    throw new HttpError(400, "Solo se permiten imágenes WebP o JPEG.");
  }
  return value;
}

function parseSize(value: unknown): number {
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size < 1 || size > maxPhotoBytes) {
    throw new HttpError(400, "La imagen supera el tamaño permitido.");
  }
  return size;
}

function generateObjectUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse(request, { error: "Origen no permitido." }, 403);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Usa el método POST." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(request, { error: "Se requiere una sesión autenticada." }, 401);
  }

  let r2: S3Client | undefined;

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const anonKey = requiredEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const accountId = requiredEnv("R2_ACCOUNT_ID");
    const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
    const bucketName = requiredEnv("R2_BUCKET_NAME");

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const accessToken = authorization.slice("Bearer ".length).trim();
    const { data: authData, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !authData.user) {
      throw new HttpError(401, "La sesión no es válida o ha expirado.");
    }

    const userId = authData.user.id;
    const { data: profile, error: profileError } = await userClient
      .from("usuarios")
      .select("rol")
      .eq("auth_id", userId)
      .maybeSingle();
    if (profileError || !profile || !["admin", "cobrador"].includes(profile.rol)) {
      throw new HttpError(403, "El usuario no puede acceder a fotografías de clientes.");
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    async function authorizeClient(clientId: number): Promise<void> {
      const { data: customer, error: customerError } = await userClient
        .from("clientes")
        .select("id, usuario_id")
        .eq("id", clientId)
        .maybeSingle();

      if (customerError || !customer) {
        throw new HttpError(404, "Cliente no encontrado o sin acceso.");
      }

      if (profile.rol === "cobrador") {
        if (customer.usuario_id !== userId) {
          throw new HttpError(403, "No tienes acceso a este cliente.");
        }
        return;
      }

      if (!customer.usuario_id) {
        throw new HttpError(403, "El cliente no pertenece a un cobrador.");
      }

      const { data: collector, error: collectorError } = await userClient
        .from("usuarios")
        .select("auth_id")
        .eq("auth_id", customer.usuario_id)
        .eq("rol", "cobrador")
        .eq("admin_id", userId)
        .maybeSingle();

      if (collectorError || !collector) {
        throw new HttpError(403, "El cliente no pertenece a uno de tus cobradores.");
      }
    }

    r2 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });

    const body = await request.json().catch(() => {
      throw new HttpError(400, "El cuerpo debe ser JSON válido.");
    }) as Record<string, unknown>;

    if (body.action === "sign-upload") {
      const clientId = parseClientId(body.clientId);
      const tipo = parsePhotoType(body.tipo);
      const mimeType = parseMimeType(body.mimeType);
      const sizeBytes = parseSize(body.sizeBytes);
      await authorizeClient(clientId);

      const extension = mimeType === "image/webp" ? "webp" : "jpg";
      const objectUuid = generateObjectUuid();
      const key = `clientes/${clientId}/${tipo}/${objectUuid}.${extension}`;
      const uploadUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: mimeType,
          ContentLength: sizeBytes,
        }),
        { expiresIn: signedUrlSeconds },
      );

      return jsonResponse(request, {
        success: true,
        key,
        uploadUrl,
        expiresIn: signedUrlSeconds,
        headers: { "Content-Type": mimeType },
      });
    }

    if (body.action === "confirm-upload") {
      const clientId = parseClientId(body.clientId);
      const tipo = parsePhotoType(body.tipo);
      const key = body.key;
      await authorizeClient(clientId);

      if (typeof key !== "string") {
        throw new HttpError(400, "Clave de objeto no válida.");
      }
      const prefix = `clientes/${clientId}/${tipo}/`;
      const fileName = key.startsWith(prefix) ? key.slice(prefix.length) : "";
      const extensionMatch = /\.(webp|jpg)$/.exec(fileName);
      const objectId = extensionMatch
        ? fileName.slice(0, -extensionMatch[0].length)
        : "";
      if (!uuidV4Pattern.test(objectId)) {
        throw new HttpError(400, "Clave de objeto no válida.");
      }

      const head = await r2.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
      const mimeType = parseMimeType(head.ContentType);
      const sizeBytes = parseSize(head.ContentLength);
      const expectedExtension = mimeType === "image/webp" ? "webp" : "jpg";
      if (extensionMatch?.[1] !== expectedExtension) {
        throw new HttpError(400, "El formato no coincide con la clave del objeto.");
      }

      const { error: saveError } = await serviceClient
        .from("cliente_fotos")
        .upsert({
          cliente_id: clientId,
          tipo,
          r2_key: key,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          created_by: userId,
          created_at: new Date().toISOString(),
        }, { onConflict: "cliente_id,tipo" });
      if (saveError) {
        throw new HttpError(500, "No se pudo guardar la referencia de la fotografía.");
      }

      return jsonResponse(request, {
        success: true,
        photo: { clientId, tipo, key, mimeType, sizeBytes },
      });
    }

    if (body.action === "sign-read") {
      const clientId = parseClientId(body.clientId);
      const tipo = parsePhotoType(body.tipo);
      await authorizeClient(clientId);

      const { data: photo, error: photoError } = await serviceClient
        .from("cliente_fotos")
        .select("r2_key")
        .eq("cliente_id", clientId)
        .eq("tipo", tipo)
        .maybeSingle();
      if (photoError || !photo) {
        throw new HttpError(404, "Fotografía no encontrada.");
      }

      const url = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: bucketName, Key: photo.r2_key }),
        { expiresIn: signedUrlSeconds },
      );
      return jsonResponse(request, { success: true, url, expiresIn: signedUrlSeconds });
    }

    throw new HttpError(400, "Acción no válida.");
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(request, { error: error.message }, error.status);
    }

    const details = error as { name?: string };
    return jsonResponse(
      request,
      { error: "Error procesando la solicitud.", errorCode: details.name ?? "UnknownError" },
      502,
    );
  } finally {
    r2?.destroy();
  }
});