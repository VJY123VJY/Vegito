/**
 * map.ts — Mapbox GL JS helper, Geocoding, and Directions API client.
 *
 * Provides forward/reverse geocoding and route calculation.
 * If NEXT_PUBLIC_MAPBOX_TOKEN is not configured,
 * provides reliable coordinate calculation and graceful fallbacks.
 */

export const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.VITE_MAPBOX_TOKEN ||
  (typeof window !== "undefined" &&
    (window as any).__ENV__?.VITE_MAPBOX_TOKEN) ||
  "";

// In-memory route cache to prevent redundant Mapbox Directions calls
const ROUTE_CACHE = new Map<string, { route: RouteGeometry; expires: number }>();

// Default center: Solapur, Maharashtra, India
export const DEFAULT_SOLAPUR_COORDS: [number, number] = [75.9064, 17.6805];

export interface GeocodingResult {
  place_name: string;
  city?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
}

export interface RouteGeometry {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Forward geocoding: search address string to get coordinates
 */
export async function searchAddressGeocode(
  query: string
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) return [];

  if (MAPBOX_TOKEN) {
    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${MAPBOX_TOKEN}&country=IN&proximity=${DEFAULT_SOLAPUR_COORDS[0]},${DEFAULT_SOLAPUR_COORDS[1]}&limit=5`;

      const res = await fetch(endpoint);

      if (res.ok) {
        const data = await res.json();

        return (data.features || []).map((f: any) => {
          const pincodeContext = (f.context || []).find((c: any) =>
            c.id.startsWith("postcode")
          );

          const cityContext = (f.context || []).find((c: any) =>
            c.id.startsWith("place")
          );

          return {
            place_name: f.place_name,
            city: cityContext ? cityContext.text : "Solapur",
            pincode: pincodeContext ? pincodeContext.text : "",
            longitude: f.center[0],
            latitude: f.center[1],
          };
        });
      }
    } catch (err) {
      console.warn("Mapbox geocoding error, falling back:", err);
    }
  }

  // Fallback: OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&addressdetails=1&limit=5&countrycodes=in`
    );

    if (res.ok) {
      const data = await res.json();

      return (data || []).map((item: any) => ({
        place_name: item.display_name,
        city:
          item.address?.city ||
          item.address?.town ||
          item.address?.state_district ||
          "Solapur",
        pincode: item.address?.postcode || "",
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));
    }
  } catch (err) {
    console.warn("Nominatim geocoding error:", err);
  }

  return [];
}

/**
 * Reverse geocoding: coordinates -> address string
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  if (MAPBOX_TOKEN) {
    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi,place&limit=1`;

      const res = await fetch(endpoint);

      if (res.ok) {
        const data = await res.json();

        if (data.features && data.features.length > 0) {
          const f = data.features[0];

          const pincodeContext = (f.context || []).find((c: any) =>
            c.id.startsWith("postcode")
          );

          const cityContext = (f.context || []).find((c: any) =>
            c.id.startsWith("place")
          );

          return {
            place_name: f.place_name,
            city: cityContext ? cityContext.text : "Solapur",
            pincode: pincodeContext ? pincodeContext.text : "413001",
            longitude: lng,
            latitude: lat,
          };
        }
      }
    } catch (err) {
      console.warn("Mapbox reverse geocode error:", err);
    }
  }

  // Fallback: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
    );

    if (res.ok) {
      const data = await res.json();

      return {
        place_name:
          data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        city:
          data.address?.city ||
          data.address?.town ||
          "Solapur",
        pincode: data.address?.postcode || "413001",
        latitude: lat,
        longitude: lng,
      };
    }
  } catch (err) {
    console.warn("Nominatim reverse geocoding error:", err);
  }

  return {
    place_name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    city: "Solapur",
    pincode: "413001",
    latitude: lat,
    longitude: lng,
  };
}

/**
 * Mapbox Directions API
 */
export async function getDirectionsRoute(
  start: [number, number],
  end: [number, number],
  profile: "driving" | "driving-traffic" = "driving"
): Promise<RouteGeometry> {
  const cacheKey = `${start[0].toFixed(4)},${start[1].toFixed(
    4
  )}->${end[0].toFixed(4)},${end[1].toFixed(4)}:${profile}`;

  const now = Date.now();

  const cached = ROUTE_CACHE.get(cacheKey);

  if (cached && cached.expires > now) {
    return cached.route;
  }

  if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes("example")) {
    try {
      const endpoint = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

      const res = await fetch(endpoint);

      if (res.ok) {
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];

          const result: RouteGeometry = {
            coordinates: route.geometry.coordinates,
            distanceMeters: route.distance,
            durationSeconds: route.duration,
          };

          ROUTE_CACHE.set(cacheKey, {
            route: result,
            expires: now + 60000,
          });

          return result;
        }
      }
    } catch (err) {
      console.warn("Mapbox directions error, falling back:", err);
    }
  }

  // Fallback: direct line interpolation
  const steps = 10;
  const coords: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;

    coords.push([
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ]);
  }

  const dLat = (end[1] - start[1]) * 111000;

  const dLng =
    (end[0] - start[0]) *
    111000 *
    Math.cos((start[1] * Math.PI) / 180);

  const approxDist = Math.max(
    500,
    Math.round(Math.sqrt(dLat * dLat + dLng * dLng))
  );

  const approxSecs = Math.max(
    180,
    Math.round((approxDist / 30000) * 3600)
  );

  const fallbackRoute: RouteGeometry = {
    coordinates: coords,
    distanceMeters: approxDist,
    durationSeconds: approxSecs,
  };

  ROUTE_CACHE.set(cacheKey, {
    route: fallbackRoute,
    expires: now + 30000,
  });

  return fallbackRoute;
}

/**
 * Returns standard Mapbox style or OSM raster fallback style
 */
export function getMapStyle(): string | any {
  if (MAPBOX_TOKEN) {
    return "mapbox://styles/mapbox/streets-v12";
  }

  return {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-tiles-layer",
        type: "raster",
        source: "osm-tiles",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}