"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronDown,
  Compass,
} from "lucide-react";
import { getStoredLocation, saveStoredLocation, type SelectedLocationData } from "./location-modal";

export type LocationState =
  | "LOCATION_PENDING"
  | "LOCATION_GRANTED"
  | "LOCATION_DENIED"
  | "LOCATION_UNAVAILABLE"
  | "LOCATION_LOW_ACCURACY"
  | "LOCATION_STALE"
  | "LOCATION_CONFIRMED";

interface SmartLocationBarProps {
  onOpenModal: () => void;
}

const LOCATION_STATE_KEY = "vegito.smart_location_state";
const LOCATION_TIMESTAMP_KEY = "vegito.smart_location_timestamp";
const LOCATION_ACCURACY_KEY = "vegito.smart_location_accuracy";

export function SmartLocationBar({ onOpenModal }: SmartLocationBarProps) {
  const [locState, setLocState] = useState<LocationState>("LOCATION_PENDING");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationText, setLocationText] = useState("Solapur Central Mandi · 413001");
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Initial load from storage
    const stored = getStoredLocation();
    if (stored?.address) {
      setLocationText(stored.address);
    }

    const savedState = (localStorage.getItem(LOCATION_STATE_KEY) as LocationState) || null;
    const savedAccuracy = localStorage.getItem(LOCATION_ACCURACY_KEY);
    const savedTimestamp = localStorage.getItem(LOCATION_TIMESTAMP_KEY);

    if (savedAccuracy) {
      setAccuracy(parseFloat(savedAccuracy));
    }

    // Check staleness (if older than 24 hours, set to LOCATION_STALE)
    if (savedTimestamp) {
      const ageHours = (Date.now() - parseInt(savedTimestamp, 10)) / (1000 * 60 * 60);
      if (ageHours > 24 && savedState === "LOCATION_CONFIRMED") {
        setLocState("LOCATION_STALE");
        return;
      }
    }

    if (savedState) {
      setLocState(savedState);
    } else {
      // First visit: check permissions
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: "geolocation" as PermissionName })
          .then((res) => {
            if (res.state === "granted") {
              setLocState("LOCATION_GRANTED");
            } else if (res.state === "denied") {
              setLocState("LOCATION_DENIED");
            } else {
              setLocState("LOCATION_PENDING");
            }
          })
          .catch(() => setLocState("LOCATION_PENDING"));
      }
    }
  }, []);

  const handleRequestLiveGps = () => {
    if (!navigator.geolocation) {
      setLocState("LOCATION_UNAVAILABLE");
      onOpenModal();
      return;
    }

    setIsRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsRequesting(false);
        const acc = Math.round(pos.coords.accuracy);
        setAccuracy(acc);
        localStorage.setItem(LOCATION_ACCURACY_KEY, String(acc));
        localStorage.setItem(LOCATION_TIMESTAMP_KEY, String(Date.now()));

        if (acc > 100) {
          setLocState("LOCATION_LOW_ACCURACY");
          localStorage.setItem(LOCATION_STATE_KEY, "LOCATION_LOW_ACCURACY");
        } else {
          setLocState("LOCATION_CONFIRMED");
          localStorage.setItem(LOCATION_STATE_KEY, "LOCATION_CONFIRMED");
        }

        // Save coordinates
        const cur = getStoredLocation();
        saveStoredLocation({
          ...(cur ?? {}),
          address: cur?.address || `Current Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });

        window.dispatchEvent(
          new CustomEvent("vegito:location_changed", {
            detail: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: acc,
            },
          })
        );
      },
      (err) => {
        setIsRequesting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocState("LOCATION_DENIED");
          localStorage.setItem(LOCATION_STATE_KEY, "LOCATION_DENIED");
        } else {
          setLocState("LOCATION_UNAVAILABLE");
          localStorage.setItem(LOCATION_STATE_KEY, "LOCATION_UNAVAILABLE");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirmLocation = () => {
    setLocState("LOCATION_CONFIRMED");
    localStorage.setItem(LOCATION_STATE_KEY, "LOCATION_CONFIRMED");
    localStorage.setItem(LOCATION_TIMESTAMP_KEY, String(Date.now()));
  };

  return (
    <div className="mx-4 my-3 rounded-2xl border border-stone-200/90 bg-white/95 p-3 shadow-xs dark:border-stone-800 dark:bg-stone-900/95">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Location State Icon & Text */}
        <button
          onClick={onOpenModal}
          className="flex items-center gap-2.5 text-left group transition"
          type="button"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <MapPin className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Delivering to
              </span>
              <ChevronDown className="h-3 w-3 text-stone-400 group-hover:text-stone-600 transition-colors" />

              {/* Status Indicator Chip */}
              {locState === "LOCATION_CONFIRMED" && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {accuracy ? `±${accuracy}m` : "Confirmed"}
                </span>
              )}
              {locState === "LOCATION_LOW_ACCURACY" && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Accuracy: {accuracy}m
                </span>
              )}
              {locState === "LOCATION_STALE" && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  <Clock className="h-2.5 w-2.5" />
                  Needs confirmation
                </span>
              )}
            </div>

            <p className="truncate text-xs font-bold text-stone-900 dark:text-stone-100 max-w-[200px] sm:max-w-md">
              {locationText}
            </p>
          </div>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {locState === "LOCATION_PENDING" && (
            <>
              <button
                onClick={handleRequestLiveGps}
                disabled={isRequesting}
                type="button"
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
              >
                <Compass className={`h-3.5 w-3.5 ${isRequesting ? "animate-spin" : ""}`} />
                <span>{isRequesting ? "Detecting..." : "Allow Location"}</span>
              </button>
              <button
                onClick={onOpenModal}
                type="button"
                className="rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Enter Manually
              </button>
            </>
          )}

          {locState === "LOCATION_LOW_ACCURACY" && (
            <button
              onClick={onOpenModal}
              type="button"
              className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700 active:scale-95"
            >
              <MapPin className="h-3 w-3" />
              <span>Improve Location</span>
            </button>
          )}

          {locState === "LOCATION_STALE" && (
            <button
              onClick={handleConfirmLocation}
              type="button"
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 active:scale-95"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Confirm Location</span>
            </button>
          )}

          {locState === "LOCATION_CONFIRMED" && (
            <button
              onClick={onOpenModal}
              type="button"
              className="rounded-xl border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              Change
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
