"use client";

import React from "react";
import { MapboxTrackingMap } from "./mapbox-tracking-map";

/**
 * Reusable MapboxMap wrapper component.
 * Supports:
 *  - shopPosition: { lat, lng }
 *  - customerPosition: { lat, lng }
 *  - deliveryPosition: { lat, lng }
 *  - route
 *  - responsive sizing
 */
export default function MapboxMap(props) {
  return <MapboxTrackingMap {...props} />;
}

export { MapboxTrackingMap };
