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
  address_line1?: string;
  house_number?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
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
            city: cityContext?.text,
            pincode: pincodeContext?.text,
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
          undefined,
        pincode: item.address?.postcode || undefined,
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
      // Note: Mapbox requires no limit parameter when multiple or no types are specified
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`;

      const res = await fetch(endpoint);

      if (res.ok) {
        const data = await res.json();
        const features = data.features || [];

        if (features.length > 0) {
          const primary = features[0];

          const addressFeature = features.find((f: any) => f.place_type?.includes("address"));
          const poiFeature = features.find((f: any) => f.place_type?.includes("poi"));
          const neighborhoodFeature = features.find((f: any) => f.place_type?.includes("neighborhood"));
          const localityFeature = features.find((f: any) => f.place_type?.includes("locality"));
          const postcodeFeature = features.find((f: any) => f.place_type?.includes("postcode"));
          const placeFeature = features.find((f: any) => f.place_type?.includes("place"));
          const regionFeature = features.find((f: any) => f.place_type?.includes("region"));

          // Context search across all features
          let contextPostcode: string | undefined;
          let contextPlace: string | undefined;
          let contextRegion: string | undefined;
          let contextLocality: string | undefined;

          for (const feat of features) {
            for (const ctx of feat.context || []) {
              if (!contextPostcode && ctx.id?.startsWith("postcode")) contextPostcode = ctx.text;
              if (!contextPlace && ctx.id?.startsWith("place")) contextPlace = ctx.text;
              if (!contextRegion && ctx.id?.startsWith("region")) contextRegion = ctx.text;
              if (!contextLocality && (ctx.id?.startsWith("neighborhood") || ctx.id?.startsWith("locality") || ctx.id?.startsWith("district"))) {
                contextLocality = ctx.text;
              }
            }
          }

          const houseNum = addressFeature?.address || primary.address || undefined;
          const streetName = addressFeature?.text || (primary.place_type?.includes("address") ? primary.text : undefined);
          const poiName = poiFeature?.text || (primary.place_type?.includes("poi") ? primary.text : undefined);
          const areaName = neighborhoodFeature?.text || localityFeature?.text || contextLocality || undefined;
          const cityName = placeFeature?.text || contextPlace || "";
          const stateName = regionFeature?.text || contextRegion || "Maharashtra";

          // Postal code extraction: postcode feature -> context -> regex from place_name
          let pin = postcodeFeature?.text || contextPostcode;
          if (!pin) {
            const match = (primary.place_name || "").match(/\b([1-9]\d{5})\b/);
            if (match) pin = match[1];
          }

          // Build a clean, readable address line
          const lineParts = [houseNum, poiName, streetName, areaName].filter(Boolean);
          const uniqueParts = Array.from(new Set(lineParts));
          let addressLine1 = uniqueParts.join(", ");
          if (!addressLine1) {
            const rawParts = (primary.place_name || "").split(",").map((s: string) => s.trim());
            addressLine1 = rawParts.slice(0, 2).filter(Boolean).join(", ");
          }
          if (!addressLine1) {
            addressLine1 = primary.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          }

          return {
            place_name: primary.place_name || addressLine1,
            address_line1: addressLine1,
            house_number: houseNum,
            street: streetName,
            area: areaName,
            city: cityName,
            state: stateName,
            pincode: pin,
            longitude: lng,
            latitude: lat,
          };
        }
      }
    } catch (err) {
      console.warn("Mapbox reverse geocode error:", err);
    }
  }

  // Fallback: Nominatim (OpenStreetMap)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const houseNum = addr.house_number || addr.house_name || addr.building || undefined;
      const streetName = addr.road || addr.street || addr.pedestrian || addr.suburb || undefined;
      const areaName = addr.neighbourhood || addr.suburb || addr.residential || addr.subdistrict || addr.quarter || undefined;
      const cityName = addr.city || addr.town || addr.village || addr.municipality || addr.subdistrict || addr.county || addr.city_district || addr.state_district || "";
      const stateName = addr.state || "Maharashtra";
      let pin = addr.postcode || undefined;
      if (!pin) {
        const match = (data.display_name || "").match(/\b([1-9]\d{5})\b/);
        if (match) pin = match[1];
      }

      const lineParts = [houseNum, streetName, areaName].filter(Boolean);
      const uniqueParts = Array.from(new Set(lineParts));
      let addressLine1 = uniqueParts.join(", ");
      if (!addressLine1) {
        const rawParts = (data.display_name || "").split(",").map((s: string) => s.trim());
        addressLine1 = rawParts.slice(0, 2).filter(Boolean).join(", ");
      }
      if (!addressLine1) {
        addressLine1 = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }

      return {
        place_name:
          data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        address_line1: addressLine1,
        house_number: houseNum,
        street: streetName,
        area: areaName,
        city: cityName,
        state: stateName,
        pincode: pin,
        latitude: lat,
        longitude: lng,
      };
    }
  } catch (err) {
    console.warn("Nominatim reverse geocoding error:", err);
  }

  return null;
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