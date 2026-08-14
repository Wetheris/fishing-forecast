"use client";

import type {
  PhotoStampSettings,
  SessionConditionSnapshot,
} from "@/types/sessions";

export type PhotoStampContext = {
  caughtAt: string;
  species?: string;
  locationName?: string;
  latitude: number;
  longitude: number;
  lureBait?: string;
  conditions: SessionConditionSnapshot;
};

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

export async function normalizeCatchPhoto(
  file: File,
): Promise<File> {
  const decoded = await decodeImage(file);

  try {
    const maxWidth = 2560;
    const scale = Math.min(
      1,
      maxWidth / decoded.width,
    );
    const width = Math.max(
      1,
      Math.round(decoded.width * scale),
    );
    const height = Math.max(
      1,
      Math.round(decoded.height * scale),
    );

    const canvas =
      document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "Unable to prepare this photo.",
      );
    }

    ctx.drawImage(
      decoded.source,
      0,
      0,
      width,
      height,
    );

    const blob = await canvasToBlob(
      canvas,
      "image/jpeg",
      0.92,
    );

    return new File(
      [blob],
      normalizedFilename(file.name),
      {
        type: "image/jpeg",
        lastModified:
          file.lastModified || Date.now(),
      },
    );
  } finally {
    decoded.close();
  }
}

export async function createStampedCatchPhoto({
  file,
  context,
  settings,
}: {
  file: File;
  context: PhotoStampContext;
  settings: PhotoStampSettings;
}): Promise<Blob> {
  const decoded = await decodeImage(file);

  try {
    const maxWidth = 2048;
    const scale = Math.min(
      1,
      maxWidth / decoded.width,
    );
    const width = Math.max(
      1,
      Math.round(decoded.width * scale),
    );
    const imageHeight = Math.max(
      1,
      Math.round(decoded.height * scale),
    );

    const lines = buildStampLines(
      context,
      settings,
    );
    const fontSize = Math.max(
      28,
      Math.round(width * 0.026),
    );
    const lineHeight = Math.round(
      fontSize * 1.35,
    );
    const horizontalPadding =
      Math.round(width * 0.035);
    const verticalPadding =
      Math.round(fontSize * 0.9);
    const panelHeight =
      lines.length === 0
        ? 0
        : Math.max(
            lineHeight +
              verticalPadding * 2,
            lines.length * lineHeight +
              verticalPadding * 2,
          );

    const canvas =
      document.createElement("canvas");
    canvas.width = width;
    canvas.height =
      imageHeight + panelHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "Unable to create the photo stamp.",
      );
    }

    ctx.drawImage(
      decoded.source,
      0,
      0,
      width,
      imageHeight,
    );

    if (panelHeight > 0) {
      ctx.fillStyle =
        "rgba(10, 20, 24, 0.96)";
      ctx.fillRect(
        0,
        imageHeight,
        width,
        panelHeight,
      );

      ctx.fillStyle = "#ffffff";
      ctx.font =
        `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textBaseline = "top";

      let y =
        imageHeight + verticalPadding;

      for (const line of lines) {
        drawWrappedLine({
          ctx,
          text: line,
          x: horizontalPadding,
          y,
          maxWidth:
            width -
            horizontalPadding * 2,
          lineHeight,
        });

        y += lineHeight;
      }
    }

    return canvasToBlob(
      canvas,
      "image/jpeg",
      0.92,
    );
  } finally {
    decoded.close();
  }
}

export async function shareOrDownloadPhoto(
  blob: Blob,
  filename: string,
): Promise<void> {
  const file = new File(
    [blob],
    filename,
    {
      type: "image/jpeg",
    },
  );

  if (
    navigator.share &&
    navigator.canShare?.({
      files: [file],
    })
  ) {
    await navigator.share({
      files: [file],
      title: "Fishing catch",
    });
    return;
  }

  const url =
    URL.createObjectURL(blob);
  const link =
    document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000,
  );
}

async function decodeImage(
  file: Blob,
): Promise<DecodedImage> {
  if (
    typeof createImageBitmap ===
    "function"
  ) {
    try {
      const bitmap =
        await createImageBitmap(file);

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall back to the browser's regular image decoder.
    }
  }

  const url =
    URL.createObjectURL(file);

  try {
    const image =
      await loadHtmlImage(url);

    return {
      source: image,
      width:
        image.naturalWidth ||
        image.width,
      height:
        image.naturalHeight ||
        image.height,
      close: () => {
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(url);

    throw new Error(
      error instanceof Error
        ? `This phone's photo format could not be decoded: ${error.message}`
        : "This phone's photo format could not be decoded.",
    );
  }
}

function loadHtmlImage(
  url: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () =>
        resolve(image);
      image.onerror = () =>
        reject(
          new Error(
            "Unsupported camera image.",
          ),
        );
      image.src = url;
    },
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Unable to encode the photo.",
              ),
            );
            return;
          }

          resolve(blob);
        },
        type,
        quality,
      );
    },
  );
}

function normalizedFilename(
  filename: string,
): string {
  const base =
    filename
      .replace(/\.[^.]+$/, "")
      .trim() || "catch";

  return `${base}.jpg`;
}

function buildStampLines(
  context: PhotoStampContext,
  settings: PhotoStampSettings,
): string[] {
  const date = new Date(
    context.caughtAt,
  );
  const firstLine: string[] = [];
  const secondLine: string[] = [];
  const thirdLine: string[] = [];

  if (
    settings.showSpecies &&
    context.species?.trim()
  ) {
    firstLine.push(
      context.species.trim(),
    );
  }

  if (settings.showDate) {
    firstLine.push(
      new Intl.DateTimeFormat(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        },
      ).format(date),
    );
  }

  if (settings.showTime) {
    firstLine.push(
      new Intl.DateTimeFormat(
        "en-US",
        {
          hour: "numeric",
          minute: "2-digit",
        },
      ).format(date),
    );
  }

  if (
    settings.showLocationName &&
    context.locationName?.trim()
  ) {
    secondLine.push(
      context.locationName.trim(),
    );
  }

  if (settings.showCoordinates) {
    secondLine.push(
      `${context.latitude.toFixed(
        5,
      )}, ${context.longitude.toFixed(
        5,
      )}`,
    );
  }

  const conditions =
    context.conditions;

  if (
    settings.showTide &&
    conditions.tide
  ) {
    const height =
      conditions.tide.heightFt === null
        ? ""
        : ` ${conditions.tide.heightFt.toFixed(
            1,
          )} ft`;

    thirdLine.push(
      `${titleCase(
        conditions.tide.trend,
      )} tide${height}`,
    );
  }

  if (
    settings.showWaterTemperature &&
    conditions.marine
      ?.waterTemperatureF !== null &&
    conditions.marine
      ?.waterTemperatureF !== undefined
  ) {
    thirdLine.push(
      `Water ${conditions.marine.waterTemperatureF.toFixed(
        1,
      )}°F`,
    );
  }

  if (
    settings.showAirTemperature &&
    conditions.weather
  ) {
    thirdLine.push(
      `Air ${conditions.weather.temperatureF.toFixed(
        1,
      )}°F`,
    );
  }

  if (
    settings.showWind &&
    conditions.weather
  ) {
    thirdLine.push(
      `${conditions.weather.windDirection} ${conditions.weather.windMph.toFixed(
        1,
      )} mph`,
    );
  }

  if (
    settings.showMoon &&
    conditions.moon
  ) {
    thirdLine.push(
      `${conditions.moon.phaseName} ${conditions.moon.illuminationPercent.toFixed(
        0,
      )}%`,
    );
  }

  if (
    settings.showLureBait &&
    context.lureBait?.trim()
  ) {
    thirdLine.push(
      context.lureBait.trim(),
    );
  }

  return [
    firstLine.join(" · "),
    secondLine.join(" · "),
    thirdLine.join(" · "),
  ].filter(Boolean);
}

function drawWrappedLine({
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
}: {
  ctx: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
}) {
  if (
    ctx.measureText(text).width <=
    maxWidth
  ) {
    ctx.fillText(text, x, y);
    return;
  }

  let value = text;

  while (
    value.length > 3 &&
    ctx.measureText(
      `${value}…`,
    ).width > maxWidth
  ) {
    value = value.slice(0, -1);
  }

  ctx.fillText(
    `${value}…`,
    x,
    y,
  );
}

function titleCase(
  value: string,
): string {
  if (!value) {
    return value;
  }

  return (
    value[0].toUpperCase() +
    value.slice(1)
  );
}
