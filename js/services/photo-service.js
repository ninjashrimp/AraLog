/* ==========================================================================
   AraLog – Photo Service
   Komprimierung, Thumbnails, minimale EXIF-Extraktion
   Mit Timeout und Fehlerbehandlung für robuste Verarbeitung
   ========================================================================== */

import db from '../db.js';

const CONFIG = {
  maxWidth: 3200,
  maxHeight: 3200,
  quality: 0.85,
  mimeType: 'image/jpeg',
  thumbSize: 200,
  thumbQuality: 0.7,
  timeout: 30000, // 30s max pro Verarbeitungsschritt
};

const _objectUrls = new Set();

// ═══════════════════════════════════════════════════════════════════
// Hauptfunktion
// ═══════════════════════════════════════════════════════════════════

export async function processAndSavePhoto(file, { observationId, type = 'Spinne' }) {
  const exif = await extractBasicExif(file);

  const img = await withTimeout(loadImage(file), CONFIG.timeout, 'Bild laden');
  const blob = await withTimeout(compressImage(img, CONFIG.maxWidth, CONFIG.maxHeight, CONFIG.quality), CONFIG.timeout, 'Komprimierung');

  if (!blob) throw new Error('Bildkomprimierung fehlgeschlagen (kein Blob erzeugt)');

  const thumbnail = await withTimeout(createThumbnail(img, CONFIG.thumbSize, CONFIG.thumbQuality), CONFIG.timeout, 'Thumbnail');

  const photoRecord = {
    observationId,
    blob,
    thumbnail: thumbnail || null,
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

  let id;
  try {
    id = await db.photos.add(photoRecord);
  } catch (err) {
    throw new Error(`DB-Speichern fehlgeschlagen: ${err.message}`);
  }

  try {
    const obs = await db.observations.get(observationId);
    if (obs) {
      const photoIds = obs.photoIds || [];
      if (!photoIds.includes(id)) {
        photoIds.push(id);
        await db.observations.update(observationId, { photoIds });
      }
    }
  } catch (err) {
    console.warn('[Photo] photoIds update failed:', err);
  }

  return { id, thumbnail, exif };
}

export async function deletePhoto(photoId, observationId) {
  await db.photos.delete(photoId);
  if (observationId) {
    try {
      const obs = await db.observations.get(observationId);
      if (obs?.photoIds) {
        const photoIds = obs.photoIds.filter(id => id !== photoId);
        await db.observations.update(observationId, { photoIds });
      }
    } catch (err) { console.warn('[Photo] cleanup photoIds:', err); }
  }
}

export async function getPhotosForObservation(observationId) {
  return db.photos.where('observationId').equals(observationId).toArray();
}

// ═══════════════════════════════════════════════════════════════════
// Timeout Wrapper
// ═══════════════════════════════════════════════════════════════════

function withTimeout(promise, ms, label = '') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

// ═══════════════════════════════════════════════════════════════════
// Bildverarbeitung
// ═══════════════════════════════════════════════════════════════════

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (source instanceof Blob) {
      const url = URL.createObjectURL(source);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')); };
      img.src = url;
    } else {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
      img.src = source;
    }
  });
}

function compressImage(img, maxW, maxH, quality) {
  return new Promise((resolve, reject) => {
    try {
      const { width, height } = getScaledDimensions(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        maxW, maxH
      );

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas-Kontext nicht verfügbar')); return; }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('canvas.toBlob lieferte null – möglicherweise Speicherproblem'));
        },
        CONFIG.mimeType,
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}

function createThumbnail(img, size, quality) {
  return new Promise((resolve, reject) => {
    try {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const cropSize = Math.min(w, h);
      const sx = (w - cropSize) / 2;
      const sy = (h - cropSize) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);

      canvas.toBlob(
        (blob) => resolve(blob), // null ist OK für Thumbnail
        CONFIG.mimeType,
        quality
      );
    } catch (err) {
      console.warn('[Thumbnail]', err);
      resolve(null); // Thumbnail-Fehler ist nicht kritisch
    }
  });
}

function getScaledDimensions(w, h, maxW, maxH) {
  if (w <= maxW && h <= maxH) return { width: w, height: h };
  const ratio = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

// ═══════════════════════════════════════════════════════════════════
// Object URL Management
// ═══════════════════════════════════════════════════════════════════

export function createPhotoUrl(blob) {
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  _objectUrls.add(url);
  return url;
}

export function revokeAllPhotoUrls() {
  _objectUrls.forEach(url => URL.revokeObjectURL(url));
  _objectUrls.clear();
}

// ═══════════════════════════════════════════════════════════════════
// EXIF-Extraktion (unchanged)
// ═══════════════════════════════════════════════════════════════════

export async function extractBasicExif(file) {
  const result = { date: null, lat: null, lng: null };
  try {
    const slice = file.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xFFD8) return result;
    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) {
        const length = view.getUint16(offset + 2);
        return parseExifData(view, offset + 4, length - 2, result);
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      offset += 2 + view.getUint16(offset + 2);
    }
  } catch (e) { console.warn('[EXIF]', e.message); }
  return result;
}

function parseExifData(view, start, length, result) {
  if (getString(view, start, 4) !== 'Exif') return result;
  const tiffStart = start + 6;
  const littleEndian = view.getUint16(tiffStart) === 0x4949;
  const ifd0Start = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
  let exifIfdOffset = null, gpsIfdOffset = null;
  const ifd0Count = view.getUint16(ifd0Start, littleEndian);
  for (let i = 0; i < ifd0Count; i++) {
    const e = ifd0Start + 2 + i * 12;
    if (e + 12 > view.byteLength) break;
    const tag = view.getUint16(e, littleEndian);
    if (tag === 0x8769) exifIfdOffset = tiffStart + view.getUint32(e + 8, littleEndian);
    else if (tag === 0x8825) gpsIfdOffset = tiffStart + view.getUint32(e + 8, littleEndian);
  }
  if (exifIfdOffset && exifIfdOffset < view.byteLength - 2) {
    const count = view.getUint16(exifIfdOffset, littleEndian);
    for (let i = 0; i < count; i++) {
      const e = exifIfdOffset + 2 + i * 12;
      if (e + 12 > view.byteLength) break;
      const tag = view.getUint16(e, littleEndian);
      if (tag === 0x9003 || tag === 0x9004) {
        const strLen = view.getUint32(e + 4, littleEndian);
        const strOff = tiffStart + view.getUint32(e + 8, littleEndian);
        if (strOff + strLen <= view.byteLength) {
          result.date = getString(view, strOff, Math.min(strLen, 19)).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T');
        }
        break;
      }
    }
  }
  if (gpsIfdOffset && gpsIfdOffset < view.byteLength - 2) {
    const count = view.getUint16(gpsIfdOffset, littleEndian);
    let latRef = '', lngRef = '', latVals = null, lngVals = null;
    for (let i = 0; i < count; i++) {
      const e = gpsIfdOffset + 2 + i * 12;
      if (e + 12 > view.byteLength) break;
      const tag = view.getUint16(e, littleEndian);
      if (tag === 1) latRef = String.fromCharCode(view.getUint8(e + 8));
      else if (tag === 3) lngRef = String.fromCharCode(view.getUint8(e + 8));
      else if (tag === 2) latVals = readGpsRationals(view, tiffStart + view.getUint32(e + 8, littleEndian), littleEndian);
      else if (tag === 4) lngVals = readGpsRationals(view, tiffStart + view.getUint32(e + 8, littleEndian), littleEndian);
    }
    if (latVals) result.lat = (latVals[0] + latVals[1] / 60 + latVals[2] / 3600) * (latRef === 'S' ? -1 : 1);
    if (lngVals) result.lng = (lngVals[0] + lngVals[1] / 60 + lngVals[2] / 3600) * (lngRef === 'W' ? -1 : 1);
  }
  return result;
}

function readGpsRationals(view, offset, littleEndian) {
  if (offset + 24 > view.byteLength) return null;
  return [0, 1, 2].map(i => {
    const num = view.getUint32(offset + i * 8, littleEndian);
    const den = view.getUint32(offset + i * 8 + 4, littleEndian);
    return den ? num / den : 0;
  });
}

function getString(view, offset, length) {
  let str = '';
  for (let i = 0; i < length; i++) { const c = view.getUint8(offset + i); if (c === 0) break; str += String.fromCharCode(c); }
  return str;
}
