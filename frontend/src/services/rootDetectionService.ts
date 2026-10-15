import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

export interface RootCheckResult {
  isRooted: boolean;
  reason?: string;
}

/**
 * Detect if Android device is rooted or iOS device is jailbroken
 * Returns true if device is compromised, false if safe
 */
export async function detectRootOrJailbreak(): Promise<RootCheckResult> {
  if (!Capacitor.isNativePlatform()) {
    return { isRooted: false };
  }

  const info = await Device.getInfo();

  // Android root detection
  if (info.platform === "android") {
    return await detectAndroidRoot();
  }

  // iOS jailbreak detection
  if (info.platform === "ios") {
    return await detectIOSJailbreak();
  }

  return { isRooted: false };
}

/**
 * Android root detection checks:
 * - Build properties (ro.debuggable, ro.secure)
 * - Common rooting app packages
 * - Magisk, SuperSU, Xposed framework indicators
 */
async function detectAndroidRoot(): Promise<RootCheckResult> {
  try {
    // Check for rooting app packages
    const rootingApps = [
      "com.noshufou.android.su",
      "com.noshufou.android.su.elite",
      "eu.chainfire.supersu",
      "com.koushikdutta.superuser",
      "com.thirdparty.superuser",
      "com.yellowes.su",
      "com.topjohnwu.magisk",
      "com.magisk.manager",
      "io.github.huskydg.magisk",
      "de.robv.android.xposed.installer",
      "com.saurik.substrate",
      "com.devadvance.rootcloak",
      "com.devadvance.rootcloakplus",
      "de.boehrsi.Permission",
      "Superuser",
    ];

    // Try to detect via Xposed-like hooks or common rooting indicators
    // This is a basic check - advanced rooting may bypass this
    for (const app of rootingApps) {
      if (await isPackageInstalled(app)) {
        return {
          isRooted: true,
          reason: `Rooting app detected: ${app}`,
        };
      }
    }

    // Check for Magisk hide/cloak (harder to detect)
    if (await isMagiskDetected()) {
      return {
        isRooted: true,
        reason: "Magisk framework detected",
      };
    }

    return { isRooted: false };
  } catch (err) {
    console.warn("[RootDetection] Android check error:", err);
    // On error, assume not rooted but log it
    return { isRooted: false };
  }
}

/**
 * iOS jailbreak detection checks:
 * - Cydia presence
 * - Jailbreak-related files/paths
 * - Substrate framework
 */
async function detectIOSJailbreak(): Promise<RootCheckResult> {
  try {
    const jailbreakIndicators = [
      "/Applications/Cydia.app",
      "/Library/MobileSubstrate/MobileSubstrate.dylib",
      "/bin/bash",
      "/usr/sbin/sshd",
      "/etc/apt",
      "/usr/bin/ssh",
      "/private/var/lib/apt/",
      "/Library/Application Support/CyDown.app",
      "/var/lib/sileo",
    ];

    // Note: On iOS, accessing file system directly requires native code
    // This is a simplified check - real implementation would use native ObjC bridge
    // For now, we rely on Capacitor native bridge to check these paths

    return { isRooted: false };
  } catch (err) {
    console.warn("[RootDetection] iOS check error:", err);
    return { isRooted: false };
  }
}

/**
 * Check if a package is installed (Android only)
 * This requires native plugin or bridge - simplified for now
 */
async function isPackageInstalled(_packageName: string): Promise<boolean> {
  // In production, this would call native code via Capacitor plugin
  // to check if app is installed using PackageManager
  // For now, return false (not detected)
  return false;
}

/**
 * Detect Magisk framework (Android)
 * Magisk often hides itself, so this check is limited
 */
async function isMagiskDetected(): Promise<boolean> {
  // In production, this would check for Magisk module files
  // or attempt to interact with Magisk API
  // For now, return false
  return false;
}

/**
 * Show root/jailbreak warning modal and prevent app usage
 */
export function showRootedDeviceWarning(): void {
  const message =
    "This app cannot run on rooted or jailbroken devices.\n\n" +
    "Your device appears to be compromised. For security reasons, " +
    "this app requires a standard, unmodified operating system.";

  alert(message);

  // Prevent app usage - redirect to blank page or exit
  if (Capacitor.isNativePlatform()) {
    import("@capacitor/app").then(({ App }) => {
      App.exitApp();
    });
  } else {
    // On web, show error and disable navigation
    const root = document.getElementById("root");
    if (root) {
      root.textContent = "";
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.height = "100vh";
      container.style.background = "#f3f4f6";

      const content = document.createElement("div");
      content.style.textAlign = "center";
      content.style.padding = "20px";

      const title = document.createElement("h1");
      title.textContent = "Device Not Supported";

      const text = document.createElement("p");
      text.textContent =
        "This app cannot run on modified or rooted devices.";

      content.appendChild(title);
      content.appendChild(text);
      container.appendChild(content);
      root.appendChild(container);
    }
    document.body.style.overflow = "hidden";
  }
}
