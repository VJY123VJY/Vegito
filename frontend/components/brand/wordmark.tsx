"use client";

import React from "react";
import { VegitoLogo, type VegitoLogoProps } from "./vegito-logo";

export interface WordmarkProps extends VegitoLogoProps {}

/**
 * Wordmark — The unified Vegito Delivery Rider Logo
 * Backwards compatible drop-in replacement across customer, dashboard, and public headers.
 */
export function Wordmark(props: WordmarkProps) {
  return <VegitoLogo variant="full" animated={true} size={props.size ?? 40} {...props} />;
}

export default Wordmark;
