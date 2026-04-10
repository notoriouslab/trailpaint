/** Reverse geocode a [lat, lng] to a short place name via Nominatim */
export async function reverseGeocode(latlng: [number, number]): Promise<string> {
  try {
    const [lat, lng] = latlng;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`,
      { headers: { 'Accept-Language': 'zh-TW,en', 'User-Agent': 'TrailPaint/1.0 (https://github.com/notoriouslab/trailpaint)' } }
    );
    if (!res.ok) return '';
    const data = await res.json();
    // Build a short name from address parts
    const addr = data.address;
    if (!addr) return data.display_name?.split(',')[0] ?? '';
    // Prefer: village/town/city + district/county
    const parts = [
      addr.village || addr.town || addr.city || addr.hamlet || '',
      addr.county || addr.state || '',
    ].filter(Boolean);
    return parts.join(', ') || (data.display_name?.split(',')[0] ?? '');
  } catch {
    return '';
  }
}
