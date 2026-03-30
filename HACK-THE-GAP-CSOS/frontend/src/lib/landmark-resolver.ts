type Landmark = {
  name: 'Kranti Chowk' | 'Aurangpura' | 'CIDCO N-6' | 'Railway Station Road';
  lat: number;
  lng: number;
};

const LANDMARKS: Landmark[] = [
  { name: 'Kranti Chowk', lat: 19.8762, lng: 75.3433 },
  { name: 'Aurangpura', lat: 19.8888, lng: 75.3275 },
  { name: 'CIDCO N-6', lat: 19.882, lng: 75.321 },
  { name: 'Railway Station Road', lat: 19.8766, lng: 75.3434 },
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

export function get_csn_landmark(lat: number, lng: number): Landmark['name'] {
  let nearest: { name: Landmark['name']; distance: number } | null = null;

  for (const landmark of LANDMARKS) {
    const distance = distanceKm(lat, lng, landmark.lat, landmark.lng);
    if (!nearest || distance < nearest.distance) {
      nearest = { name: landmark.name, distance };
    }
  }

  return nearest?.name ?? 'Kranti Chowk';
}

export function resolveLandmark(lat: number, lng: number, fallback?: string): string {
  if (fallback && fallback.trim() && fallback !== 'Unknown' && !looksLikeCoordinates(fallback)) {
    return fallback;
  }
  return get_csn_landmark(lat, lng);
}
