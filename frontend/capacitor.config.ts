import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.velo.app",
  appName: "Velo",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    // Camera/mic permissions are declared in android/app/src/main/AndroidManifest.xml
    // after `npx cap add android` — see README for the exact lines to add.
    allowMixedContent: false,
  },
};

export default config;
