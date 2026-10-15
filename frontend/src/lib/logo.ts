import { Capacitor } from "@capacitor/core";

export const APP_LOGO: string = Capacitor.isNativePlatform()
  ? "/logo-mobile.png"
  : "/logo.jpg";

export const APP_LOGO_ABSOLUTE = (): string =>
  Capacitor.isNativePlatform()
    ? `${window.location.origin}/logo-mobile.png`
    : `${window.location.origin}/logo.jpg`;
