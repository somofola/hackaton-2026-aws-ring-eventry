import { Capacitor } from "@capacitor/core";
import api from "./api";

// Real plugin to install: `cordova-plugin-purchase` (Fovea, works with Capacitor v3+)
//   npm i cordova-plugin-purchase
//   npx cap sync
// Exposes a global `CdvPurchase.store` once imported. Dynamic import keeps
// web builds working when plugin is absent.

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const nativePlatform = (): "ios" | "android" | null => {
  if (!Capacitor.isNativePlatform()) return null;
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : null;
};

export interface IapPurchaseRequest {
  productId: string;
  paymentType: "event_ticket_category" | "product_order";
  itemId: number | string;
  currency: string;
  billingCycle?: "monthly" | "yearly" | "oneoff";
  formData?: Record<string, any>;
}

export interface IapPurchaseResult {
  verified: boolean;
  reference?: string;
  data?: any;
}

interface NativeReceipt {
  receipt: string;
  productId: string;
  transactionId?: string;
}

// Loads cordova-plugin-purchase lazily and triggers a purchase. Returns the
// signed receipt + transaction info to forward to the backend.
async function runNativePurchase(
  productId: string,
  paymentType: IapPurchaseRequest["paymentType"],
): Promise<NativeReceipt> {
  // Side-effect import — plugin attaches to window.CdvPurchase.
  await import(/* @vite-ignore */ "cordova-plugin-purchase");
  const cdv = (window as any).CdvPurchase;
  if (!cdv?.store) throw new Error("IAP plugin not available");

  const platform = Capacitor.getPlatform() === "ios"
    ? cdv.Platform.APPLE_APPSTORE
    : cdv.Platform.GOOGLE_PLAY;

  const productType = cdv.ProductType.NON_CONSUMABLE;

  cdv.store.register([{ id: productId, type: productType, platform }]);
  await cdv.store.initialize([platform]);
  await cdv.store.update();

  const product = cdv.store.get(productId, platform);
  if (!product) throw new Error(`Product ${productId} not found in store`);
  const offer = product.getOffer();
  if (!offer) throw new Error(`No offer for ${productId}`);

  return await new Promise<NativeReceipt>((resolve, reject) => {
    cdv.store.when()
      .approved((tx: any) => {
        const receipt = tx.nativePurchase ? JSON.stringify(tx.nativePurchase) : (tx.transactionId ?? "");
        tx.verify();
        resolve({ receipt, productId, transactionId: tx.transactionId });
      })
      .finished(() => {})
      .unverified((err: any) => reject(new Error(err?.message ?? "Receipt unverified")));

    offer.order().catch((err: any) => reject(err));
  });
}

// Purchase via native store, then POST receipt to backend for verification + entitlement.
export async function purchaseAndVerify(req: IapPurchaseRequest): Promise<IapPurchaseResult> {
  const platform = nativePlatform();
  if (!platform) throw new Error("IAP only available on iOS/Android native");

  const purchase = await runNativePurchase(req.productId, req.paymentType);

  const endpoint = platform === "ios" ? "/payments/verify/apple" : "/payments/verify/google";
  const { data } = await api.post(endpoint, {
    receipt: purchase.receipt,
    productId: purchase.productId,
    transactionId: purchase.transactionId,
    paymentType: req.paymentType,
    itemId: req.itemId,
    currency: req.currency,
    billingCycle: req.billingCycle ?? "oneoff",
    formData: req.formData,
  });

  return {
    verified: data?.status === "success" || !!data?.message?.includes("verified"),
    reference: data?.reference,
    data,
  };
}

// Store SKU convention: `passidy.<paymentType>.<itemId>[.<cycle>]`
// Register matching IDs in App Store Connect + Play Console.
export function storeProductId(
  paymentType: IapPurchaseRequest["paymentType"],
  itemId: number | string,
  billingCycle?: string,
) {
  const cycle = billingCycle && billingCycle !== "oneoff" ? `.${billingCycle}` : "";
  return `passidy.${paymentType}.${itemId}${cycle}`;
}
