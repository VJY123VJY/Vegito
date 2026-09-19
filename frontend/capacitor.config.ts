import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.vegito.app",
  appName: "Vegito",
  webDir: "out",
  server: {
    androidScheme: "http",
  },
};

export default config;
