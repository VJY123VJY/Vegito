import { reverseGeocode, type GeocodingResult } from "./map";
export { reverseGeocode, type GeocodingResult };
import { getDeliveryEligibility, type DeliveryEligibilityData } from "./customers";

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
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
}

export type LocationDetectionState =
  | { status: "idle" }
  | { status: "requesting_permission"; message: string }
  | { status: "detecting_gps"; message: string }
  | { status: "reverse_geocoding"; message: string; coordinates: GpsCoordinates }
  | { status: "checking_eligibility"; message: string; coordinates: GpsCoordinates; address: AddressComponents }
  | { status: "success"; message: string; result: DetectedLocationResult }
  | { status: "outside_area"; message: string; result: DetectedLocationResult }
  | { status: "error"; message: string; code?: string; coordinates?: GpsCoordinates };

/**
 * High-accuracy, fresh device GPS location request.
 * Enforces zero-stale coordinates (maximumAge: 0) and high accuracy.
 */
export async function getFreshDeviceCoordinates(): Promise<GpsCoordinates> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not supported on this device/browser.");
  }

  // Pre-check permission API if available
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (permissionStatus.state === "denied") {
        const err = new Error("Location permission is required to detect your current address.");
        (err as any).code = "PERMISSION_DENIED";
        throw err;
      }
    } catch (e: any) {
      if (e?.code === "PERMISSION_DENIED") throw e;
      // Some browsers don't support query({ name: "geolocation" }), proceed to getCurrentPosition
    }
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(7));
        const lng = Number(pos.coords.longitude.toFixed(7));
        resolve({ latitude: lat, longitude: lng });
      },
      (err) => {
        let msg = "Unable to detect your location.";
        let errCode = "UNKNOWN";
        if (err.code === 1) { // PERMISSION_DENIED
          msg = "Location permission is required to detect your current address.";
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
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0, // Always request fresh coordinates
      }
    );
  });
}

/**
 * End-to-end Location auto-detection flow:
 * 1. Fresh GPS coordinates
 * 2. Reverse geocode to structured address
 * 3. Authoritative backend 15 KM delivery eligibility validation
 */
export async function detectLocationAndValidateEligibility(
  onStateChange?: (state: LocationDetectionState) => void
): Promise<DetectedLocationResult> {
  try {
    onStateChange?.({
      status: "detecting_gps",
      message: "Detecting your real GPS location...",
    });

    const coords = await getFreshDeviceCoordinates();

    onStateChange?.({
      status: "reverse_geocoding",
      message: "Location captured. Detecting address...",
      coordinates: coords,
    });

    const geoResult = await reverseGeocode(coords.latitude, coords.longitude);

    let pin = geoResult?.pincode?.trim();
    if (!pin) {
      const match = (geoResult?.place_name || "").match(/\b([1-9]\d{5})\b/);
      if (match) pin = match[1];
    }
    if (!pin) {
      pin = "413001";
    }

    const address: AddressComponents = {
      address_line1: geoResult?.address_line1 || geoResult?.place_name || `Lat ${coords.latitude.toFixed(4)}, Lng ${coords.longitude.toFixed(4)}`,
      house_number: geoResult?.house_number,
      street: geoResult?.street,
      area: geoResult?.area,
      city: geoResult?.city || "Solapur",
      state: geoResult?.state || "Maharashtra",
      pincode: pin,
      place_name: geoResult?.place_name || "",
    };

    onStateChange?.({
      status: "checking_eligibility",
      message: "Validating 20 KM delivery availability...",
      coordinates: coords,
      address,
    });

    const eligibility = await getDeliveryEligibility(coords.latitude, coords.longitude);

    const result: DetectedLocationResult = {
      coordinates: coords,
      address,
      eligibility,
    };

    if (eligibility.is_eligible) {
      onStateChange?.({
        status: "success",
        message: eligibility.message || "✓ Delivery available",
        result,
      });
    } else {
      onStateChange?.({
        status: "outside_area",
        message: eligibility.message || "✕ Outside delivery area",
        result,
      });
    }

    return result;
  } catch (err: any) {
    const errorState: LocationDetectionState = {
      status: "error",
      message: err.message || "Failed to detect location.",
      code: err.code,
    };
    onStateChange?.(errorState);
    throw err;
  }
}
