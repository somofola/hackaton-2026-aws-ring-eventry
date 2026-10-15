export interface Coords {
  latitude: number;
  longitude: number;
}

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

/**
 * Request the user's current location via the browser geolocation API.
 * Returns null if permission is denied or unavailable.
 */
export async function getUserLocation(): Promise<Coords | null> {
  try {
    if (!navigator.geolocation) return null;
    return await new Promise<Coords | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
      );
    });
  } catch {
    return null;
  }
}
