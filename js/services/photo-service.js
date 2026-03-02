/* ==========================================================================
   AraLog – Photo Service
   Komprimierung, Thumbnails, minimale EXIF-Extraktion
   ========================================================================== */

import db from '../db.js';

// ═══════════════════════════════════════════════════════════════════
// Konfiguration
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 0.85,
  mimeType: 'image/jpeg',
  thumbSize: 200,
  thumbQuality: 0.7,
};

// Track object URLs for cleanup
const _objectUrls = new Set();

// ═══════════════════════════════════════════════════════════════════
// Hauptfunktion: Foto verarbeiten und speichern
// ═══════════════════════════════════════════════════════════════════

/**
 * Verarbeitet eine Bilddatei: komprimiert, erstellt Thumbnail, liest EXIF.
 * @param {File} file
 * @param {Object} options
 * @param {number} options.observationId
 * @param {string} options.type - 'Spinne'|'Kokon'|'Netz'|'Habitat'|'Detail'
 * @returns {Promise<{id: number, thumbnail: Blob}>}
 */
export async function processAndSavePhoto(file, { observationId, type = 'Spinne' }) {
  // 1. EXIF auslesen (vor Komprimierung, da Canvas EXIF entfernt)
  const exif = await extractBasicExif(file);

  // 2. Bild laden
  const img = await loadImage(file);

  // 3. Komprimieren (max 2000px)
  const blob = await compressImage(img, CONFIG.maxWidth, CONFIG.maxHeight, CONFIG.quality);

  // 4. Thumbnail erstellen (200px)
  const thumbnail = await createThumbnail(img, CONFIG.thumbSize, CONFIG.thumbQuality);

  // 5. In DB speichern
  const photoRecord = {
    observationId,
    blob,
    thumbnail,
    type,
    filename: file.name || 'photo.jpg',
    mimeType: CONFIG.mimeType,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    exifDate: exif.date || null,
    exifLat: exif.lat || null,
    exifLng: exif.lng || null,
    createdAt: new Date().toISOString(),
  };

  const id = await db.photos.add(photoRecord);

  // 6. photoIds in Observation aktualisieren
  const obs = await db.observations.get(observationId);
  if (obs) {
    const photoIds = obs.photoIds || [];
    if (!photoIds.includes(id)) {
      photoIds.push(id);
      await db.observations.update(observationId, { photoIds });
    }
  }

  return { id, thumbnail };
}

/**
 * Löscht ein Foto aus DB und aktualisiert die Observation.
 */
export async function deletePhoto(photoId, observationId) {
  await db.photos.delete(photoId);

  if (observationId) {
    const obs = await db.observations.get(observationId);
    if (obs?.photoIds) {
      const photoIds = obs.photoIds.filter(id => id !== photoId);
      await db.observations.update(observationId, { photoIds });
    }
  }
}

/**
 * Lädt alle Fotos einer Beobachtung.
 */
export async function getPhotosForObservation(observationId) {
  return db.photos.where('observationId').equals(observationId).toArray();
}

// ═══════════════════════════════════════════════════════════════════
// Bildverarbeitung
// ═══════════════════════════════════════════════════════════════════

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));

    if (source instanceof Blob) {
      const url = URL.createObjectURL(source);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')); };
      img.src = url;
    } else {
      img.src = source;
    }
  });
}

function compressImage(img, maxW, maxH, quality) {
  return new Promise((resolve) => {
    let { width, height } = getScaledDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      maxW, maxH
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // imageSmoothingQuality für bessere Downscaling-Qualität
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(resolve, CONFIG.mimeType, quality);
  });
}

function createThumbnail(img, size, quality) {
  return new Promise((resolve) => {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // Quadratischer Crop aus der Mitte
    const cropSize = Math.min(w, h);
    const sx = (w - cropSize) / 2;
    const sy = (h - cropSize) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);

    canvas.toBlob(resolve, CONFIG.mimeType, quality);
  });
}

function getScaledDimensions(w, h, maxW, maxH) {
  if (w <= maxW && h <= maxH) return { width: w, height: h };

  const ratio = Math.min(maxW / w, maxH / h);
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Object URL Management
// ═══════════════════════════════════════════════════════════════════

/**
 * Erstellt eine Object URL und trackt sie für späteres Cleanup.
 */
export function createPhotoUrl(blob) {
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  _objectUrls.add(url);
  return url;
}

/**
 * Gibt alle getrackten Object URLs frei.
 */
export function revokeAllPhotoUrls() {
  _objectUrls.forEach(url => URL.revokeObjectURL(url));
  _objectUrls.clear();
}

// ═══════════════════════════════════════════════════════════════════
// Minimale EXIF-Extraktion
// Liest nur: DateTimeOriginal, GPS-Koordinaten
// ═══════════════════════════════════════════════════════════════════

async function extractBasicExif(file) {
  const result = { date: null, lat: null, lng: null };

  try {
    // Nur die ersten 128KB lesen (EXIF sitzt am Anfang)
    const slice = file.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);

    // JPEG? Check SOI marker
    if (view.getUint16(0) !== 0xFFD8) return result;

    // Find APP1 (EXIF) marker
    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) {
        // APP1 found
        const length = view.getUint16(offset + 2);
        return parseExifData(view, offset + 4, length - 2, result);
      }

      if ((marker & 0xFF00) !== 0xFF00) break;

      const segLength = view.getUint16(offset + 2);
      offset += 2 + segLength;
    }
  } catch (e) {
    console.warn('[EXIF] Parse error:', e.message);
  }

  return result;
}

function parseExifData(view, start, length, result) {
  // Check "Exif\0\0"
  if (getString(view, start, 4) !== 'Exif') return result;

  const tiffStart = start + 6;
  const byteOrder = view.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949; // 'II' = Intel = little-endian

  const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
  const ifd0Start = tiffStart + ifdOffset;

  // Parse IFD0 to find ExifIFD pointer and GPS IFD pointer
  let exifIfdOffset = null;
  let gpsIfdOffset = null;

  const ifd0Count = view.getUint16(ifd0Start, littleEndian);
  for (let i = 0; i < ifd0Count; i++) {
    const entryOffset = ifd0Start + 2 + (i * 12);
    if (entryOffset + 12 > view.byteLength) break;
    const tag = view.getUint16(entryOffset, littleEndian);

    if (tag === 0x8769) { // ExifIFD
      exifIfdOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
    } else if (tag === 0x8825) { // GPS IFD
      gpsIfdOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
    }
  }

  // Parse ExifIFD for DateTimeOriginal
  if (exifIfdOffset && exifIfdOffset < view.byteLength - 2) {
    const count = view.getUint16(exifIfdOffset, littleEndian);
    for (let i = 0; i < count; i++) {
      const entryOffset = exifIfdOffset + 2 + (i * 12);
      if (entryOffset + 12 > view.byteLength) break;
      const tag = view.getUint16(entryOffset, littleEndian);

      if (tag === 0x9003 || tag === 0x9004) { // DateTimeOriginal or DateTimeDigitized
        const strLen = view.getUint32(entryOffset + 4, littleEndian);
        const strOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
        if (strOffset + strLen <= view.byteLength) {
          const dateStr = getString(view, strOffset, Math.min(strLen, 19));
          // "2024:03:15 14:30:00" → ISO
          result.date = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T');
        }
        break;
      }
    }
  }

  // Parse GPS IFD
  if (gpsIfdOffset && gpsIfdOffset < view.byteLength - 2) {
    const count = view.getUint16(gpsIfdOffset, littleEndian);
    let latRef = '', lngRef = '';
    let latVals = null, lngVals = null;

    for (let i = 0; i < count; i++) {
      const entryOffset = gpsIfdOffset + 2 + (i * 12);
      if (entryOffset + 12 > view.byteLength) break;
      const tag = view.getUint16(entryOffset, littleEndian);

      if (tag === 1) latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
      else if (tag === 3) lngRef = String.fromCharCode(view.getUint8(entryOffset + 8));
      else if (tag === 2) latVals = readGpsRationals(view, tiffStart + view.getUint32(entryOffset + 8, littleEndian), littleEndian);
      else if (tag === 4) lngVals = readGpsRationals(view, tiffStart + view.getUint32(entryOffset + 8, littleEndian), littleEndian);
    }

    if (latVals) {
      result.lat = (latVals[0] + latVals[1] / 60 + latVals[2] / 3600) * (latRef === 'S' ? -1 : 1);
    }
    if (lngVals) {
      result.lng = (lngVals[0] + lngVals[1] / 60 + lngVals[2] / 3600) * (lngRef === 'W' ? -1 : 1);
    }
  }

  return result;
}

function readGpsRationals(view, offset, littleEndian) {
  if (offset + 24 > view.byteLength) return null;
  const vals = [];
  for (let i = 0; i < 3; i++) {
    const num = view.getUint32(offset + i * 8, littleEndian);
    const den = view.getUint32(offset + i * 8 + 4, littleEndian);
    vals.push(den ? num / den : 0);
  }
  return vals;
}

function getString(view, offset, length) {
  let str = '';
  for (let i = 0; i < length; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    str += String.fromCharCode(c);
  }
  return str;
}
