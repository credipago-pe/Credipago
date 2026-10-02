import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { compressClientPhoto } from "./compressClientPhoto";
import "../Styles/ClienteFotos.css";

const photoSlots = [
  { type: "foto_cliente", label: "Foto del cliente" },
  { type: "documento_frente", label: "Documento - frente" },
  { type: "documento_reverso", label: "Documento - reverso" },
  { type: "foto_local", label: "Foto del local" },
];

function createEmptyPhotos() {
  return Object.fromEntries(photoSlots.map(({ type }) => [type, {
    file: null,
    localUrl: null,
    remoteUrl: null,
    status: "empty",
    error: "",
    originalBytes: 0,
    compressedBytes: 0,
  }]));
}

async function invokePhotoAction(body) {
  console.log("[cliente-fotos-r2] invoking action", body);

  try {
    const { data, error } = await supabase.functions.invoke("cliente-fotos-r2", { body });
    console.log("[cliente-fotos-r2] response", { data, error });

    if (error) throw new Error(error.message || "No se pudo comunicar con el servicio de fotos.");
    if (data?.error || !data?.success) {
      throw new Error(data?.error || "No se pudo completar la operación de fotos.");
    }
    return data;
  } catch (error) {
    console.error("[cliente-fotos-r2] invokePhotoAction failed", error);
    throw error;
  }
}

async function loadStoredPhotos(clientId) {
  const { data, error } = await supabase
    .from("cliente_fotos")
    .select("tipo")
    .eq("cliente_id", clientId);
  if (error) throw error;

  const storedPhotos = {};
  await Promise.all((data || []).map(async ({ tipo }) => {
    const result = await invokePhotoAction({ action: "sign-read", clientId, tipo });
    storedPhotos[tipo] = result.url;
  }));
  return storedPhotos;
}

function formatSize(bytes) {
  if (!bytes) return "";
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClienteFotos({
  clientId,
  legacyPhotoUrl = null,
  registrationMode = false,
  readOnly = false,
  onComplete,
  onSkip,
}) {
  const [photos, setPhotos] = useState(createEmptyPhotos);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [viewerType, setViewerType] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [uploadingAll, setUploadingAll] = useState(false);
  const [hasAttemptedUpload, setHasAttemptedUpload] = useState(false);
  const cameraInputs = useRef({});
  const pickerInputs = useRef({});
  const localObjectUrls = useRef(new Set());
  const touchStartX = useRef(null);

  useEffect(() => {
    let active = true;
    setLoadingPhotos(true);
    setLoadError("");

    loadStoredPhotos(clientId)
      .then((storedPhotos) => {
        if (!active) return;
        setPhotos((current) => Object.fromEntries(photoSlots.map(({ type }) => {
          const storedUrl = storedPhotos[type];
          return [type, storedUrl
            ? { ...current[type], remoteUrl: storedUrl, status: "saved", error: "" }
            : current[type]];
        })));
      })
      .catch((error) => {
        if (active) setLoadError(error.message || "No se pudieron cargar las fotografías.");
      })
      .finally(() => {
        if (active) setLoadingPhotos(false);
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  useEffect(() => () => {
    localObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    localObjectUrls.current.clear();
  }, []);

  useEffect(() => {
    if (!viewerType) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setViewerType(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerType]);

  const chooseFile = async (type, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotos((current) => ({
      ...current,
      [type]: { ...current[type], status: "compressing", error: "" },
    }));

    try {
      const compressed = await compressClientPhoto(file, {
        preserveText: type === "documento_frente" || type === "documento_reverso",
      });
      const localUrl = URL.createObjectURL(compressed.blob);
      localObjectUrls.current.add(localUrl);
      setPhotos((current) => ({
        ...current,
        [type]: {
          ...current[type],
          file: compressed,
          localUrl,
          status: "ready",
          error: "",
          originalBytes: compressed.originalBytes,
          compressedBytes: compressed.compressedBytes,
        },
      }));
    } catch (error) {
      setPhotos((current) => ({
        ...current,
        [type]: { ...current[type], status: "error", error: error.message },
      }));
    }
  };

  const uploadPhoto = async (type) => {
    const photo = photos[type];
    if (!photo.file) return false;

    setPhotos((current) => ({
      ...current,
      [type]: { ...current[type], status: "uploading", error: "" },
    }));

    try {
      console.log("[cliente-fotos-r2] uploadPhoto start", {
        type,
        clientId,
        mimeType: photo.file.mimeType,
        compressedBytes: photo.file.compressedBytes,
      });

      const { data: sessionData } = await supabase.auth.getSession();
      console.log("[cliente-fotos-r2] session data", sessionData);
      if (!sessionData.session) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");

      const signed = await invokePhotoAction({
        action: "sign-upload",
        clientId,
        tipo: type,
        mimeType: photo.file.mimeType,
        sizeBytes: photo.file.compressedBytes,
      });
      console.log("[cliente-fotos-r2] signed upload data", signed);

      const uploadResponse = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": photo.file.mimeType },
        body: photo.file.blob,
      });
      console.log("[cliente-fotos-r2] uploadResponse", {
        status: uploadResponse.status,
        ok: uploadResponse.ok,
      });
      if (!uploadResponse.ok) {
        throw new Error(`R2 rechazó la subida (${uploadResponse.status}).`);
      }

      await invokePhotoAction({
        action: "confirm-upload",
        clientId,
        tipo: type,
        key: signed.key,
      });
      const readLink = await invokePhotoAction({ action: "sign-read", clientId, tipo: type });

      if (type === "foto_cliente") {
        const { error: updateClientError } = await supabase
          .from("clientes")
          .update({ fotourl: readLink.url })
          .eq("id", clientId);

        if (updateClientError) {
          console.warn("No se pudo actualizar la foto principal del cliente:", updateClientError.message);
        }
      }

      if (photo.localUrl) {
        URL.revokeObjectURL(photo.localUrl);
        localObjectUrls.current.delete(photo.localUrl);
      }
      setPhotos((current) => ({
        ...current,
        [type]: {
          ...current[type],
          file: null,
          localUrl: null,
          remoteUrl: readLink.url,
          status: "saved",
          error: "",
        },
      }));
      return true;
    } catch (error) {
      setPhotos((current) => ({
        ...current,
        [type]: { ...current[type], status: "error", error: error.message },
      }));
      return false;
    }
  };

  const uploadSelectedPhotos = async (onlyFailed = false) => {
    const selectedTypes = photoSlots
      .filter(({ type }) => photos[type].file && (!onlyFailed || photos[type].status === "error"))
      .map(({ type }) => type);
    if (selectedTypes.length === 0) return;

    setHasAttemptedUpload(true);
    setUploadingAll(true);
    const results = await Promise.all(selectedTypes.map((type) => uploadPhoto(type)));
    setUploadingAll(false);

    const hasFailures = results.some((success) => !success);
    if (!hasFailures && photoSlots.every(({ type }) => photos[type].remoteUrl || selectedTypes.includes(type))) {
      onComplete?.();
    }
  };

  const refreshSignedUrl = async (type) => {
    try {
      const result = await invokePhotoAction({ action: "sign-read", clientId, tipo: type });
      setPhotos((current) => ({
        ...current,
        [type]: { ...current[type], remoteUrl: result.url },
      }));
    } catch {
      setLoadError("No se pudo renovar el acceso temporal a una fotografía.");
    }
  };

  const openViewer = async (type) => {
    setViewerType(type);
    setZoom(1);
    if (photos[type].remoteUrl && !photos[type].localUrl) await refreshSignedUrl(type);
  };

  const availableViewerTypes = photoSlots
    .filter(({ type }) => photos[type].localUrl || photos[type].remoteUrl || (type === "foto_cliente" && legacyPhotoUrl && !/\/default-(avatar|user)\.png(?:\?.*)?$/i.test(legacyPhotoUrl)))
    .map(({ type }) => type);

  const navigateViewer = (direction) => {
    if (!viewerType || availableViewerTypes.length < 2) return;
    const currentIndex = availableViewerTypes.indexOf(viewerType);
    const nextIndex = (currentIndex + direction + availableViewerTypes.length) % availableViewerTypes.length;
    void openViewer(availableViewerTypes[nextIndex]);
  };

  const hasLegacyPhoto = Boolean(
    legacyPhotoUrl && !/\/default-(avatar|user)\.png(?:\?.*)?$/i.test(legacyPhotoUrl),
  );
  const getDisplayUrl = (type) => photos[type].localUrl
    || photos[type].remoteUrl
    || (type === "foto_cliente" && hasLegacyPhoto ? legacyPhotoUrl : null);

  const allPhotosSaved = photoSlots.every(({ type }) => photos[type].status === "saved");
  const failedTypes = photoSlots.filter(({ type }) => photos[type].status === "error" && photos[type].file);
  const selectedCount = photoSlots.filter(({ type }) => photos[type].file).length;
  const viewerLabel = photoSlots.find(({ type }) => type === viewerType)?.label;

  return (
    <section className="cliente-photos" aria-label="Fotografías y documentos">
      {!registrationMode && <h3 className="cliente-photos__heading">Fotografías y documentos</h3>}
      {loadError && <p className="cliente-photos__notice" role="status">{loadError}</p>}
      {loadingPhotos && <p className="cliente-photos__loading">Cargando fotografías...</p>}

      <div className="cliente-photos__grid">
        {photoSlots.map(({ type, label }) => {
          const photo = photos[type];
          const displayUrl = getDisplayUrl(type);
          return (
            <article className="cliente-photo" key={type}>
              <div className="cliente-photo__title-row">
                <h4>{label}</h4>
                <span className={`cliente-photo__status cliente-photo__status--${photo.status}`}>
                  {photo.status === "saved" ? "Guardada" : displayUrl ? "Vista previa" : "Falta foto"}
                </span>
              </div>

              {displayUrl ? (
                <button
                  className="cliente-photo__preview"
                  type="button"
                  onClick={() => void openViewer(type)}
                  aria-label={`Ver ${label}`}
                >
                  <img
                    src={displayUrl}
                    alt={label}
                    onError={() => {
                      if (photo.remoteUrl && !photo.localUrl) void refreshSignedUrl(type);
                    }}
                  />
                </button>
              ) : (
                <div className="cliente-photo__empty" aria-label={`Falta ${label}`}>
                  <AlertCircle aria-hidden="true" />
                  <span>Falta la fotografía</span>
                </div>
              )}

              {!readOnly && (
                <>
                  <input
                    ref={(element) => { cameraInputs.current[type] = element; }}
                    accept="image/*"
                    capture="environment"
                    className="cliente-photos__hidden-input"
                    type="file"
                    onChange={(event) => void chooseFile(type, event)}
                  />
                  <input
                    ref={(element) => { pickerInputs.current[type] = element; }}
                    accept="image/*"
                    className="cliente-photos__hidden-input"
                    type="file"
                    onChange={(event) => void chooseFile(type, event)}
                  />

                  <div className="cliente-photo__actions">
                    <button type="button" onClick={() => cameraInputs.current[type]?.click()}>
                      <Camera aria-hidden="true" />
                      Tomar foto
                    </button>
                    <button type="button" onClick={() => pickerInputs.current[type]?.click()}>
                      <ImagePlus aria-hidden="true" />
                      Seleccionar
                    </button>
                    {!registrationMode && photo.file && (
                      <button
                        className="cliente-photo__save"
                        type="button"
                        disabled={photo.status === "uploading" || photo.status === "compressing"}
                        onClick={() => void uploadPhoto(type)}
                      >
                        {photo.status === "uploading" ? <LoaderCircle className="cliente-photos__spinner" /> : <Check />}
                        Guardar foto
                      </button>
                    )}
                  </div>
                </>
              )}

              {photo.status === "compressing" && <p className="cliente-photo__feedback">Preparando imagen...</p>}
              {photo.status === "uploading" && <p className="cliente-photo__feedback">Subiendo...</p>}
              {photo.error && <p className="cliente-photo__error" role="alert">{photo.error}</p>}
              {photo.file && (
                <p className="cliente-photo__sizes">
                  {formatSize(photo.originalBytes)} → {formatSize(photo.compressedBytes)}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {registrationMode && (
        <div className="cliente-photos__footer">
          <p>
            {allPhotosSaved
              ? "Las cuatro fotografías están guardadas."
              : "Las fotos son opcionales. Puedes subir solo algunas o continuar sin fotos."}
          </p>
          <button
            className="cliente-photos__confirm"
            type="button"
              disabled={selectedCount === 0 || uploadingAll || allPhotosSaved}
            onClick={() => void uploadSelectedPhotos()}
          >
              {uploadingAll ? <><LoaderCircle className="cliente-photos__spinner" /> Subiendo fotografías...</> : `Subir fotos seleccionadas (${selectedCount})`}
          </button>
          {failedTypes.length > 0 && (
            <button
              className="cliente-photos__retry"
              type="button"
              disabled={uploadingAll}
              onClick={() => void uploadSelectedPhotos(true)}
            >
              Reintentar solo las {failedTypes.length} pendiente(s)
            </button>
          )}
          {!allPhotosSaved && (
            <button
              className="cliente-photos__continue"
              type="button"
              disabled={uploadingAll}
              onClick={() => (onSkip || onComplete)?.()}
            >
              {hasAttemptedUpload || selectedCount > 0 ? "Continuar con fotos pendientes" : "Continuar sin fotos"}
            </button>
          )}
        </div>
      )}

      {viewerType && getDisplayUrl(viewerType) && (
        <div
          className="cliente-photo-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`Visor: ${viewerLabel}`}
          onClick={() => setViewerType(null)}
          onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const deltaX = event.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(deltaX) > 60) navigateViewer(deltaX < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          <div className="cliente-photo-viewer__toolbar" onClick={(event) => event.stopPropagation()}>
            <span>{viewerLabel}</span>
            <button type="button" title="Reducir zoom" onClick={() => setZoom((value) => Math.max(1, value - 0.25))}>
              <ZoomOut aria-hidden="true" />
            </button>
            <button type="button" title="Aumentar zoom" onClick={() => setZoom((value) => Math.min(3, value + 0.25))}>
              <ZoomIn aria-hidden="true" />
            </button>
            <button type="button" title="Cerrar visor" onClick={() => setViewerType(null)}>
              <X aria-hidden="true" />
            </button>
          </div>
          {availableViewerTypes.length > 1 && (
            <>
              <button
                className="cliente-photo-viewer__nav cliente-photo-viewer__nav--previous"
                type="button"
                aria-label="Fotografía anterior"
                onClick={(event) => { event.stopPropagation(); navigateViewer(-1); }}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                className="cliente-photo-viewer__nav cliente-photo-viewer__nav--next"
                type="button"
                aria-label="Fotografía siguiente"
                onClick={(event) => { event.stopPropagation(); navigateViewer(1); }}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </>
          )}
          <img
            className="cliente-photo-viewer__image"
            src={getDisplayUrl(viewerType)}
            alt={viewerLabel}
            style={{ transform: `scale(${zoom})` }}
            onClick={(event) => event.stopPropagation()}
            onError={() => {
              if (photos[viewerType].remoteUrl && !photos[viewerType].localUrl) {
                void refreshSignedUrl(viewerType);
              }
            }}
          />
        </div>
      )}
    </section>
  );
}