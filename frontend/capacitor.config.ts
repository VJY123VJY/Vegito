import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vegito.app",
  appName: "Vegito",
  webDir: "out",
  server: {
    // The packaged app has a secure origin. Development HTTP is limited to
    // explicitly allowed debug endpoints in Android network security config.
    androidScheme: "https",
  },
};

export default config;
