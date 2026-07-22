"use client";
/* eslint-disable @next/next/no-img-element -- local object URLs cannot use Next image optimization. */

import { ChangeEvent, useEffect, useState } from "react";
import styles from "./tools.module.css";

type Mode = "resize" | "convert";
type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

const outputFormats: { value: OutputFormat; label: string; extension: string }[] = [
  { value: "image/jpeg", label: "JPEG", extension: "jpg" },
  { value: "image/png", label: "PNG", extension: "png" },
  { value: "image/webp", label: "WebP", extension: "webp" },
];

export function ImageWorkspace({ mode }: { mode: Mode }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [sourceSize, setSourceSize] = useState("");
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(82);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.currentTarget.files?.[0];
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }

    const url = URL.createObjectURL(next);
    const image = new Image();
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not read image."));
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not read image."));

    if (!image.naturalWidth || !image.naturalHeight) {
      URL.revokeObjectURL(url);
      return;
    }

    setError("");
    setFile(next);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
    setWidth(image.naturalWidth);
    setHeight(image.naturalHeight);
    setSourceSize(`${image.naturalWidth} x ${image.naturalHeight}`);
  }

  function setProportionalWidth(nextWidth: number) {
    if (!width || !height) return setWidth(nextWidth);
    const ratio = height / width;
    setWidth(nextWidth);
    setHeight(Math.max(1, Math.round(nextWidth * ratio)));
  }

  async function exportImage() {
    if (!file || !width || !height) return;
    setBusy(true);
    setError("");

    try {
      const image = new Image();
      image.src = previewUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not process image."));
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable in this browser.");
      if (format === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, quality / 100));
      if (!blob) throw new Error("Could not export image.");

      const output = outputFormats.find((item) => item.value === format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${file.name.replace(/\.[^.]+$/, "")}.${output?.extension ?? "image"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not export image.");
    } finally {
      setBusy(false);
    }
  }

  const isResize = mode === "resize";
  return (
    <div className={styles.stack}>
      <label className={styles.fileDrop}>
        <span>{file ? file.name : "Choose image"}</span>
        <small>{file ? `${sourceSize} | ${(file.size / 1024 / 1024).toFixed(2)} MB` : "PNG, JPEG, WebP, GIF, or SVG"}</small>
        <input accept="image/*" className={styles.srOnly} onChange={selectFile} type="file" />
      </label>

      {previewUrl && <img alt="Selected image preview" className={styles.imagePreview} src={previewUrl} />}

      <div className={styles.grid}>
        {isResize && <>
          <div className={styles.field}>
            <label htmlFor="image-width">Width</label>
            <input className={styles.input} id="image-width" min="1" onChange={(event) => setProportionalWidth(Number(event.target.value))} type="number" value={width || ""} />
          </div>
          <div className={styles.field}>
            <label htmlFor="image-height">Height</label>
            <input className={styles.input} id="image-height" min="1" onChange={(event) => setHeight(Math.max(1, Number(event.target.value)))} type="number" value={height || ""} />
          </div>
        </>}
        <div className={styles.field}>
          <label htmlFor="image-format">Export format</label>
          <select className={styles.select} id="image-format" onChange={(event) => setFormat(event.target.value as OutputFormat)} value={format}>
            {outputFormats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="image-quality">Quality {quality}%</label>
          <input className={styles.range} id="image-quality" max="100" min="10" onChange={(event) => setQuality(Number(event.target.value))} type="range" value={quality} />
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.button} disabled={!file || busy} onClick={exportImage} type="button">{busy ? "Exporting..." : isResize ? "Resize and download" : "Convert and download"}</button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <p className={styles.hint}>Runs in browser. Image never uploads.</p>
    </div>
  );
}
