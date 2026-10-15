import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const isNative = Capacitor.isNativePlatform();

/** Renders the QR SVG inside containerId to a 512×512 PNG with logo overlay.
 *  Returns the raw base64 string (no data: prefix). */
const renderQRToBase64 = (containerId: string): Promise<string | null> =>
  new Promise((resolve) => {
    const container = document.getElementById(containerId);
    const svg = container?.querySelector("svg");
    if (!svg) return resolve(null);

    const canvasSize = 512;
    const logoSize = Math.round(canvasSize * 0.22);
    const logoPad = 6;
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const svgData = new XMLSerializer().serializeToString(svg);
    const qrImg = new Image();
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 0, 0, canvasSize, canvasSize);
      const logoImg = new Image();
      const finish = () =>
        resolve(canvas.toDataURL("image/png").split(",")[1]);
      logoImg.onload = () => {
        const lx = canvasSize - logoSize - logoPad;
        const ly = canvasSize - logoSize - logoPad;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(lx - 2, ly - 2, logoSize + 4, logoSize + 4);
        ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);
        finish();
      };
      logoImg.onerror = finish;
      logoImg.src = "/eventry-logo.png";
    };
    qrImg.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  });

/** Download a QR code.
 *  Native: saves PNG to the device Documents folder.
 *  Web: triggers a file download via anchor click. */
export const downloadQR = async (
  containerId: string,
  filename: string,
  toast: (opts: { title: string; description: string; variant?: "destructive" }) => void
) => {
  const base64 = await renderQRToBase64(containerId);
  if (!base64) {
    toast({ title: "Error", description: "Could not render QR code", variant: "destructive" });
    return;
  }

  if (isNative) {
    try {
      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      toast({ title: "Saved!", description: "QR code saved to your Documents folder" });
    } catch {
      toast({ title: "Error", description: "Could not save QR code to device", variant: "destructive" });
    }
  } else {
    const link = document.createElement("a");
    link.download = filename;
    link.href = `data:image/png;base64,${base64}`;
    link.click();
  }
};

/** Share a QR code.
 *  Native: saves PNG to cache then opens the system share sheet with the image.
 *  Web: uses navigator.share (URL only) or falls back to clipboard. */
export const shareQR = async (
  containerId: string,
  filename: string,
  title: string,
  shortUrl: string,
  toast: (opts: { title: string; description: string; variant?: "destructive" }) => void
) => {
  if (isNative) {
    const base64 = await renderQRToBase64(containerId);
    if (!base64) {
      toast({ title: "Error", description: "Could not render QR code", variant: "destructive" });
      return;
    }
    try {
      const file = await Filesystem.writeFile({
        path: `qr_share/${filename}`,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });
      await Share.share({
        title,
        text: `Short link: ${shortUrl}`,
        url: file.uri,
        dialogTitle: title,
      });
    } catch {
      toast({ title: "Error", description: "Could not share QR code", variant: "destructive" });
    }
  } else {
    if (navigator.share) {
      navigator.share({ title, text: `Short link: ${shortUrl}`, url: shortUrl });
    } else {
      await copyText(shortUrl);
      toast({ title: "Copied!", description: "Short URL copied to clipboard" });
    }
  }
};

/** Copy text to clipboard with a textarea fallback for native WebView environments. */
export const copyText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
};
