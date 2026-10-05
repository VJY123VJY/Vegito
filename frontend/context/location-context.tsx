"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  getFreshDeviceCoordinates,
  reverseGeocode,
  type AddressComponents,
  type GpsCoordinates,
} from "@/lib/api/location-helper";
import { getDeliveryEligibility, type DeliveryEligibilityData } from "@/lib/api/customers";

export type LocationStatus =
  | "IDLE"
  | "REQUESTING_PERMISSION"
  | "DETECTING"
  | "LOCATION_READY"
  | "REVERSE_GEOCODING"
  | "ADDRESS_READY"
  | "CHECKING_DELIVERY"
  | "DELIVERY_AVAILABLE"
  | "OUTSIDE_DELIVERY_AREA"
  | "SELLER_LOCATION_MISSING"
  | "PERMISSION_DENIED"
  | "LOCATION_ERROR";

export interface LocationContextValue {
  status: LocationStatus;
  message: string;
  coordinates: GpsCoordinates | null;
  address: AddressComponents | null;
  eligibility: DeliveryEligibilityData | null;
  isLocating: boolean;
  permissionState: "granted" | "prompt" | "denied" | "unknown";
  showDeniedBanner: boolean;
  requestLocation: (forcePrompt?: boolean) => Promise<GpsCoordinates | null>;
  dismissDeniedBanner: () => void;
  resetLocation: () => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LocationStatus>("IDLE");
  const [message, setMessage] = useState<string>("Checking location...");
  const [coordinates, setCoordinates] = useState<GpsCoordinates | null>(null);
  const [address, setAddress] = useState<AddressComponents | null>(null);
  const [eligibility, setEligibility] = useState<DeliveryEligibilityData | null>(null);
  const [permissionState, setPermissionState] = useState<"granted" | "prompt" | "denied" | "unknown">("unknown");
  const [showDeniedBanner, setShowDeniedBanner] = useState<boolean>(false);
  const isDetectingRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  const performDetection = useCallback(async (): Promise<GpsCoordinates | null> => {
    if (isDetectingRef.current) return null;
    isDetectingRef.current = true;

    try {
      setStatus("DETECTING");
      setMessage("Detecting your real GPS location...");

      const coords = await getFreshDeviceCoordinates();
      setCoordinates(coords);
      setStatus("LOCATION_READY");
      setMessage("Location captured. Detecting address...");

      setStatus("REVERSE_GEOCODING");
      const geoResult = await reverseGeocode(coords.latitude, coords.longitude);
      const parsedAddress: AddressComponents = {
        address_line1:
          geoResult?.address_line1 ||
          geoResult?.place_name ||
          `Doorstep at ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        house_number: geoResult?.house_number,
        street: geoResult?.street,
        area: geoResult?.area,
        city: geoResult?.city || "Solapur",
        state: geoResult?.state || "Maharashtra",
        pincode: geoResult?.pincode || "413001",
        place_name: geoResult?.place_name || "",
      };
      setAddress(parsedAddress);
      setStatus("ADDRESS_READY");
      setMessage("Address detected. Validating 20 KM delivery availability...");

      setStatus("CHECKING_DELIVERY");
      try {
        const elig = await getDeliveryEligibility(coords.latitude, coords.longitude);
        setEligibility(elig);

        if (!elig.seller_lat && !elig.seller_lng && !elig.is_eligible) {
          setStatus("SELLER_LOCATION_MISSING");
          setMessage("Seller pickup location is not configured. Delivery availability is temporarily unavailable.");
        } else if (elig.is_eligible) {
          setStatus("DELIVERY_AVAILABLE");
          setMessage(elig.message || `✓ Delivery available (${elig.distance_km} km from seller)`);
        } else {
          setStatus("OUTSIDE_DELIVERY_AREA");
          setMessage(elig.message || `✕ Outside 20 KM delivery area (${elig.distance_km} km from seller)`);
        }
      } catch (e: any) {
        // If eligibility endpoint fails, keep address ready and report message
        setStatus("LOCATION_READY");
        setMessage("Address detected. Delivery eligibility will be re-validated at checkout.");
      }

      setPermissionState("granted");
      setShowDeniedBanner(false);
      return coords;
    } catch (err: any) {
      if (err?.code === "PERMISSION_DENIED" || err?.message?.toLowerCase()?.includes("permission")) {
        setPermissionState("denied");
        setStatus("PERMISSION_DENIED");
        setMessage("Location access is turned off. Enable location for automatic 20 KM delivery checking.");
        setShowDeniedBanner(true);
      } else {
        setStatus("LOCATION_ERROR");
        setMessage(err?.message || "Failed to detect device location.");
      }
      return null;
    } finally {
      isDetectingRef.current = false;
    }
  }, []);

  // Website Open -> Check permission and trigger initial detection
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (typeof window === "undefined" || !navigator.geolocation) {
      setPermissionState("unknown");
      setStatus("IDLE");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((permissionStatus) => {
          setPermissionState(permissionStatus.state);

          if (permissionStatus.state === "granted") {
            performDetection();
          } else if (permissionStatus.state === "prompt") {
            setStatus("REQUESTING_PERMISSION");
            setMessage("Please allow location access to verify delivery to your doorstep.");
            performDetection();
          } else if (permissionStatus.state === "denied") {
            setStatus("PERMISSION_DENIED");
            setMessage("Location access is turned off. You can enable location or enter your address manually.");
            setShowDeniedBanner(true);
          }

          permissionStatus.onchange = () => {
            setPermissionState(permissionStatus.state);
            if (permissionStatus.state === "granted") {
              performDetection();
            } else if (permissionStatus.state === "denied") {
              setStatus("PERMISSION_DENIED");
              setShowDeniedBanner(true);
            }
          };
        })
        .catch(() => {
          // Fallback if permissions query is unsupported
          performDetection();
        });
    } else {
      performDetection();
    }
  }, [performDetection]);

  const requestLocation = useCallback(
    async (forcePrompt = false): Promise<GpsCoordinates | null> => {
      setShowDeniedBanner(false);
      return performDetection();
    },
    [performDetection]
  );

  const dismissDeniedBanner = useCallback(() => {
    setShowDeniedBanner(false);
  }, []);

  const resetLocation = useCallback(() => {
    setCoordinates(null);
    setAddress(null);
    setEligibility(null);
    setStatus("IDLE");
    setMessage("");
  }, []);

  const isLocating =
    status === "REQUESTING_PERMISSION" ||
    status === "DETECTING" ||
    status === "REVERSE_GEOCODING" ||
    status === "CHECKING_DELIVERY";

  return (
    <LocationContext.Provider
      value={{
        status,
        message,
        coordinates,
        address,
        eligibility,
        isLocating,
        permissionState,
        showDeniedBanner,
        requestLocation,
        dismissDeniedBanner,
        resetLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
