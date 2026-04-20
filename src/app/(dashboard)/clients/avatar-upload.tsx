"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";

/** Max edge length for stored avatars (pixels). */
const MAX_EDGE = 400;
/** Absolute file size ceiling before we read/resize (5 MB). */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Load a File into an <img> element and render it to a canvas at the
 * target size, returning the resulting JPEG data URL.
 */
function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Not a valid image."));
      img.onload = () => {
        const scale = Math.min(
          MAX_EDGE / img.naturalWidth,
          MAX_EDGE / img.naturalHeight,
          1,
        );
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type Props = {
  initialUrl?: string | null;
  /** Form field name the hidden input uses (defaults to "avatarUrl"). */
  name?: string;
  /** Used to generate initials for the fallback placeholder. */
  firstName?: string;
  lastName?: string | null;
};

function initialsOf(first?: string, last?: string | null): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return ((a + b).toUpperCase() || "?").slice(0, 2);
}

export function AvatarUpload({
  initialUrl,
  name = "avatarUrl",
  firstName,
  lastName,
}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is too large (max 5 MB).");
      return;
    }
    setBusy(true);
    try {
      const url = await resizeImageToDataUrl(file);
      setDataUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setDataUrl(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const initials = initialsOf(firstName, lastName);

  return (
    <div className="flex items-center gap-4">
      {/* Hidden input so the current value is submitted with the form */}
      <input type="hidden" name={name} value={dataUrl ?? ""} />

      {/* Preview */}
      <div className="relative">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="Client avatar"
            className="h-24 w-24 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold text-pb-navy ring-2 ring-white shadow-sm"
            style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
          >
            {initials}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
          >
            <Camera className="h-3.5 w-3.5" />
            {dataUrl ? "Change photo" : "Upload photo"}
          </button>
          {dataUrl && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-pb-red transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          Square JPG or PNG, up to 5 MB. Auto-resized on save.
        </p>
        {error && <p className="text-xs text-pb-red">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
