type Landmark = {
  name: string;
  lat: number;
  lng: number;
};

const LANDMARKS: Landmark[] = [
  { name: 'Kranti Chowk', lat: 19.8732, lng: 75.3262 },
  { name: 'Aurangpura', lat: 19.8824, lng: 75.3245 },
  { name: 'CIDCO N-6', lat: 19.8890, lng: 75.3620 },
  { name: 'Beed Bypass', lat: 19.8550, lng: 75.3500 },
  { name: 'Railway Station Road', lat: 19.8766, lng: 75.3434 },
  { name: 'Jalna Road Flyover', lat: 19.8730, lng: 75.3500 },
  { name: 'Mondha Market', lat: 19.8800, lng: 75.3380 },
  { name: 'Seven Hills Circle', lat: 19.8840, lng: 75.3400 },
  { name: 'Government Medical College (GMC)', lat: 19.9010, lng: 75.3205 },
];

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function looksLikeCoordinates(value: string): boolean {
  return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(value);
}

export function get_csn_landmark(lat: number, lng: number): string {
  let nearest: { name: string; distance: number } | null = null;

  for (const landmark of LANDMARKS) {
    const distance = distanceKm(lat, lng, landmark.lat, landmark.lng);
    if (!nearest || distance < nearest.distance) {
      nearest = { name: landmark.name, distance };
    }
  }

  return nearest?.name ?? 'Unknown Area';
}

export function resolveLandmark(lat: number, lng: number, fallback?: string): string {
  if (fallback && fallback.trim() && fallback !== 'Unknown' && !looksLikeCoordinates(fallback)) {
    return fallback;
  }
  return get_csn_landmark(lat, lng);
}
