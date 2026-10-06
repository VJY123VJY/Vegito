import { reverseGeocode, type GeocodingResult } from "./map";
export { reverseGeocode, type GeocodingResult };
import { getDeliveryEligibility, type DeliveryEligibilityData } from "./customers";

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface AddressComponents {
  address_line1: string;
  house_number?: string;
  street?: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  place_name: string;
}

export interface DetectedLocationResult {
  coordinates: GpsCoordinates;
  address: AddressComponents;
  eligibility: DeliveryEligibilityData;
  accuracy: number;
  timestamp: number;
  reverseGeocodeSuccess: boolean;
}

export type LocationDetectionState =
  | { status: "idle" }
  | { status: "requesting_permission"; message: string }
  | { status: "detecting_gps"; message: string }
  | { status: "gps_captured"; message: string; coordinates: GpsCoordinates; accuracy: number; timestamp: number }
  | { status: "reverse_geocoding"; message: string; coordinates: GpsCoordinates; accuracy: number }
  | { status: "checking_eligibility"; message: string; coordinates: GpsCoordinates; address: AddressComponents; accuracy: number }
  | { status: "success"; message: string; result: DetectedLocationResult }
  | { status: "outside_area"; message: string; result: DetectedLocationResult }
  | { status: "low_accuracy"; message: string; coordinates?: GpsCoordinates; accuracy?: number }
  | { status: "error"; message: string; code?: string; coordinates?: GpsCoordinates };

/**
 * High-accuracy, fresh device GPS location request.
 * Enforces zero-stale coordinates (maximumAge: 0) and high accuracy.
 * Attempts to obtain the most accurate fix using getCurrentPosition / watchPosition.
 */
export async function getFreshDeviceCoordinates(options?: {
  maxAccuracyMeters?: number;
  timeoutMs?: number;
}): Promise<GpsCoordinates & { accuracy: number; timestamp: number }> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    const err = new Error("Geolocation is not supported on this device/browser.");
    (err as any).code = "NOT_SUPPORTED";
    throw err;
  }

  // Pre-check permission API if available
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (permissionStatus.state === "denied") {
        const err = new Error("Location permission is required to detect your current location. Please allow location access.");
        (err as any).code = "PERMISSION_DENIED";
        throw err;
      }
    } catch (e: any) {
      if (e?.code === "PERMISSION_DENIED") throw e;
    }
  }

  const timeoutMs = options?.timeoutMs ?? 20000;
  const maxAccuracyMeters = options?.maxAccuracyMeters ?? 3000;

  return new Promise((resolve, reject) => {
    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;
    let settled = false;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const finish = (pos: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      cleanup();

      const lat = Number(pos.coords.latitude.toFixed(7));
      const lng = Number(pos.coords.longitude.toFixed(7));
      const accuracy = Math.round(pos.coords.accuracy);
      const timestamp = pos.timestamp || Date.now();

      // Safe debug diagnostics (NO OTP, NO JWT, NO password, NO auth tokens)
      console.log("[CURRENT LOCATION DEBUG]", {
        latitude: lat,
        longitude: lng,
        accuracy: `±${accuracy}m`,
        timestamp: new Date(timestamp).toISOString(),
      });

      // Verify accuracy against coarse network/IP bounds
      if (accuracy > maxAccuracyMeters) {
        const err = new Error(
          `Your location accuracy is low (±${accuracy}m). Please enable device GPS/location services and try again.`
        );
        (err as any).code = "LOW_ACCURACY";
        (err as any).coordinates = { latitude: lat, longitude: lng, accuracy, timestamp };
        reject(err);
        return;
      }

      resolve({
        latitude: lat,
        longitude: lng,
        accuracy,
        timestamp,
      });
    };

    const fail = (err: GeolocationPositionError) => {
      if (settled) return;
      settled = true;
      cleanup();

      let msg = "Unable to detect your location.";
      let errCode = "UNKNOWN";
      if (err.code === 1) { // PERMISSION_DENIED
        msg = "Location permission is required to detect your current location.";
        errCode = "PERMISSION_DENIED";
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        msg = "Turn on location services (GPS) to detect your current location.";
        errCode = "POSITION_UNAVAILABLE";
      } else if (err.code === 3) { // TIMEOUT
        msg = "Location request timed out. Please try again or enter address manually.";
        errCode = "TIMEOUT";
      }
      const error = new Error(msg);
      (error as any).code = errCode;
      reject(error);
    };

    // Primary request
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        bestPosition = pos;
        // If accuracy is already high (<= 150 meters), finish immediately
        if (pos.coords.accuracy <= 150) {
          finish(pos);
          return;
        }

        // Otherwise briefly watch for higher-precision satellite lock
        try {
          watchId = navigator.geolocation.watchPosition(
            (wPos) => {
              if (!bestPosition || wPos.coords.accuracy < bestPosition.coords.accuracy) {
                bestPosition = wPos;
              }
              if (wPos.coords.accuracy <= 80) {
                finish(wPos);
              }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 0 }
          );

          setTimeout(() => {
            if (!settled && bestPosition) {
              finish(bestPosition);
            }
          }, 3500);
        } catch {
          finish(pos);
        }
      },
      (err) => fail(err),
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0, // Always request fresh device GPS coordinates
      }
    );
  });
}

/**
 * End-to-end Location auto-detection flow:
 * 1. Fresh GPS coordinates
 * 2. Reverse geocode to structured address
 * 3. Authoritative backend 20 KM delivery eligibility validation
 */
export async function detectLocationAndValidateEligibility(
  onStateChange?: (state: LocationDetectionState) => void
): Promise<DetectedLocationResult> {
  try {
    onStateChange?.({
      status: "detecting_gps",
      message: "Getting GPS from device...",
    });

    const coords = await getFreshDeviceCoordinates();

    onStateChange?.({
      status: "gps_captured",
      message: `Location captured (±${coords.accuracy}m).`,
      coordinates: coords,
      accuracy: coords.accuracy,
      timestamp: coords.timestamp,
    });

    onStateChange?.({
      status: "reverse_geocoding",
      message: "Detecting doorstep address...",
      coordinates: coords,
      accuracy: coords.accuracy,
    });

    let geoResult: GeocodingResult | null = null;
    let reverseGeocodeSuccess = false;
    try {
      geoResult = await reverseGeocode(coords.latitude, coords.longitude);
      if (geoResult?.address_line1 || geoResult?.place_name) {
        reverseGeocodeSuccess = true;
      }
    } catch (e) {
      console.warn("Reverse geocode attempt failed, using coordinate fallback:", e);
    }

    let pin = geoResult?.pincode?.trim() || "";
    if (!pin && geoResult?.place_name) {
      const match = geoResult.place_name.match(/\b([1-9]\d{5})\b/);
      if (match) pin = match[1];
    }

    const address: AddressComponents = {
      address_line1: geoResult?.address_line1 || "",
      house_number: geoResult?.house_number,
      street: geoResult?.street,
      area: geoResult?.area,
      city: geoResult?.city || "",
      state: geoResult?.state || "Maharashtra",
      pincode: pin,
      place_name: geoResult?.place_name || `GPS (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`,
    };

    onStateChange?.({
      status: "checking_eligibility",
      message: "Checking delivery availability from seller shop...",
      coordinates: coords,
      address,
      accuracy: coords.accuracy,
    });

    const eligibility = await getDeliveryEligibility(coords.latitude, coords.longitude);

    const result: DetectedLocationResult = {
      coordinates: coords,
      address,
      eligibility,
      accuracy: coords.accuracy,
      timestamp: coords.timestamp,
      reverseGeocodeSuccess,
    };

    if (eligibility.is_eligible) {
      onStateChange?.({
        status: "success",
        message: eligibility.message || `✓ Delivery available (${eligibility.distance_km} km from seller)`,
        result,
      });
    } else {
      onStateChange?.({
        status: "outside_area",
        message: eligibility.message || `✕ Outside 20 KM delivery area (${eligibility.distance_km} km from seller)`,
        result,
      });
    }

    return result;
  } catch (err: any) {
    if (err?.code === "LOW_ACCURACY") {
      const lowAccState: LocationDetectionState = {
        status: "low_accuracy",
        message: err.message || "Your location accuracy is low. Please enable GPS and try again.",
        coordinates: err.coordinates,
        accuracy: err.coordinates?.accuracy,
      };
      onStateChange?.(lowAccState);
      throw err;
    }

    const errorState: LocationDetectionState = {
      status: "error",
      message: err.message || "Failed to detect location.",
      code: err.code,
    };
    onStateChange?.(errorState);
    throw err;
  }
}
