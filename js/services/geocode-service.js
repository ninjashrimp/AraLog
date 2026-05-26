/* ==========================================================================
   AraLog – Reverse Geocoding Service
   Nominatim (OpenStreetMap) – kostenlos, kein API-Key
   Rate Limit: 1 req/sec, User-Agent erforderlich
   ========================================================================== */

let _lastRequest = 0;

/**
 * Reverse-Geocoding: Koordinaten → Ortsname
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>} Formatierter Ortsname oder null
 */
export async function reverseGeocode(lat, lng) {
  // Rate limiting: min 1.1s zwischen Requests
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - _lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  _lastRequest = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=17&addressdetails=1&accept-language=de`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'AraLog/1.0 (Arachnid field journal)' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.address) return null;

    return formatAddress(data.address);
  } catch (err) {
    console.warn('[Geocode] Error:', err.message);
    return null;
  }
}

/**
 * Formatiert die Nominatim-Adresse zu einem kurzen, sinnvollen Ortsnamen.
 * Priorisiert: Straße + Hausnummer, Stadtteil, Stadt
 */
function formatAddress(addr) {
  const parts = [];

  // Straße + Hausnummer
  const street = addr.road || addr.pedestrian || addr.footway || addr.path || '';
  if (street) {
    parts.push(addr.house_number ? `${street} ${addr.house_number}` : street);
  }

  // Stadtteil / Ortsteil
  const district = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '';
  if (district) parts.push(district);

  // Stadt
  const city = addr.city || addr.town || addr.village || addr.municipality || '';
  if (city && city !== district) parts.push(city);

  if (parts.length === 0) {
    // Fallback: display_name wäre zu lang, nehme was da ist
    return addr.county || addr.state || null;
  }

  return parts.join(', ');
}
