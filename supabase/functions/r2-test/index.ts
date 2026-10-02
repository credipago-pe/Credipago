import {
  ListObjectsV2Command,
  S3Client,
} from "npm:@aws-sdk/client-s3@3.750.0";

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json(
      { success: false, message: "Usa el método POST." },
      { status: 405 },
    );
  }

  const secretNames = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ] as const;
  const missingSecrets = secretNames.filter((name) => !Deno.env.get(name));

  if (missingSecrets.length > 0) {
    return Response.json(
      {
        success: false,
        message: "Faltan secretos requeridos en Supabase.",
        missingSecrets,
      },
      { status: 500 },
    );
  }

  const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
  const bucketName = Deno.env.get("R2_BUCKET_NAME")!;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    const result = await client.send(
      new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 }),
    );

    return Response.json({
      success: true,
      message: "Conexión exitosa; el bucket responde.",
      bucket: bucketName,
      objectsFound: result.KeyCount ?? 0,
      hasMoreObjects: result.IsTruncated ?? false,
    });
  } catch (error) {
    const details = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };

    return Response.json(
      {
        success: false,
        message: "No se pudo comprobar el acceso al bucket R2.",
        errorCode: details.name ?? "UnknownError",
        httpStatus: details.$metadata?.httpStatusCode ?? null,
      },
      { status: 502 },
    );
  } finally {
    client.destroy();
  }
});