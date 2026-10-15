import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Preloader from "@/components/ui/preloader";
import { Textarea } from "@/components/ui/textarea";
import api from "@/services/api";
import { isEventPast } from "@/utils/datetime";
import { Event, TicketCategory } from "@/types";
import {
  Calendar, MapPin, Clock, ArrowLeft, CreditCard, Shield, CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { isNativePlatform, purchaseAndVerify, storeProductId } from "@/services/iapService";

const IS_NATIVE = isNativePlatform();

// ── Stripe payment modal (mirrors BillingCheckout) ──────────────────────────

function StripePaymentModal({
  clientSecret,
  onSuccess,
  onClose,
}: {
  clientSecret: string;
  onSuccess: (pi: any) => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayAmount, setDisplayAmount] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null);

  useEffect(() => {
    if (!clientSecret || !stripe) return;
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (paymentIntent) {
        setDisplayAmount((paymentIntent.amount / 100).toFixed(2));
        setDisplayCurrency(paymentIntent.currency.toUpperCase());
      }
    });
  }, [clientSecret, stripe]);

  const handlePayment = async () => {
    if (!stripe || !elements) return;
    setIsProcessing(true);
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement)! },
    });
    if (error) {
      alert(error.message);
      setIsProcessing(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-[400px]">
        <div className="flex justify-center mb-4">
          <img src="https://stripe.com/img/v3/home/twitter.png" alt="Stripe" className="h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-center">Enter Payment Details</h2>
        <p className="text-sm text-gray-500 text-center mb-4">Securely powered by Stripe</p>
        <div className="border rounded-lg p-3 mb-4 shadow-sm">
          <CardElement className="p-2 text-sm" options={{ disabled: isProcessing }} />
        </div>
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className={`${
            isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-[#635BFF] hover:bg-[#5144d8]"
          } transition-colors text-white px-4 py-2 rounded-lg w-full font-medium flex items-center justify-center`}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Processing...
            </>
          ) : (
            `Pay ${displayCurrency ?? ""} ${displayAmount ?? ""}`
          )}
        </button>
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="text-sm text-gray-500 mt-3 w-full hover:text-gray-700 disabled:opacity-50"
        >
          Cancel
        </button>
        <div className="flex items-center justify-center mt-4 text-xs text-gray-400">
          🔒 Secured with 256-bit SSL encryption
        </div>
      </div>
    </div>
  );
}

// ── Main checkout component ──────────────────────────────────────────────────

const EventCheckoutInner = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const [event, setEvent] = useState<Event | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketCategory | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    dietaryRequirements: "",
    specialRequests: "",
  });

  // Load Paystack SDK (web only)
  useEffect(() => {
    if (IS_NATIVE) return;
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // Fetch event + pre-fill profile + enrollment status
  useEffect(() => {
    if (!slug) return;
    Promise.all([
      api.get(`/events/slug/${slug}`),
      api.get("/user/profile").catch(() => ({ data: null })),
      api.get("/my-enrollments").catch(() => ({ data: [] })),
    ])
      .then(([evRes, profileRes, enrollRes]) => {
        const ev: Event = evRes.data;
        setEvent(ev);

        // Check if user already enrolled / paid for this event
        const enrollments: any[] = Array.isArray(enrollRes.data) ? enrollRes.data : [];
        const enrolled = enrollments.some(
          (e) => e.event?.uuid === ev.uuid && (e.status === "enrolled" || e.status === "attended")
        );
        setIsEnrolled(enrolled);

        // Pick ticket from navigation state, URL query param (?ticketId=), or first category
        const cats = ev.ticket_categories ?? [];
        const stateTicket = location.state?.ticket as TicketCategory | undefined;
        const queryTicketId = searchParams.get("ticketId");
        const matchId = stateTicket?.id ?? queryTicketId;
        if (matchId && cats.length) {
          setSelectedTicket(cats.find((t) => String(t.id) === String(matchId)) ?? cats[0] ?? null);
        } else {
          setSelectedTicket(cats[0] ?? null);
        }

        const profile = profileRes.data;
        if (profile) {
          const [firstName, ...rest] = (profile.name || "").trim().split(" ");
          setFormData((prev) => ({
            ...prev,
            firstName: firstName || "",
            lastName: rest.join(" "),
            email: profile.email || "",
            phone: profile.phone || "",
            company: profile.company || "",
          }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const ticketPrice = selectedTicket?.price ?? event?.price ?? 0;
  const currency = (event?.currency ?? "USD").toUpperCase();
  const isFree = ticketPrice === 0;
  const isNGN = currency === "NGN";

  // Event is closed if status is "completed" or current time is after end_date+end_time
  const isPast = event ? isEventPast(event) : false;

  const currencySymbol = (c: string) =>
    ({ NGN: "₦", USD: "$", EUR: "€", GBP: "£" }[c] ?? c + " ");

  const launchPaystackModal = ({
    email, amount, reference, onSuccess, onClose,
  }: {
    email: string; amount: number; reference: string;
    onSuccess: (r: any) => void; onClose?: () => void;
  }) => {
    const handler = (window as any).PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: formData.email || email,
      amount,
      currency: "NGN",
      ref: reference,
      callback: onSuccess,
      onClose,
    });
    handler.openIframe();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !selectedTicket) return;
    if (isEnrolled) {
      toast({ title: "Already registered", description: "You have already registered for this event.", variant: "destructive" });
      return;
    }
    if (isPast) {
      toast({ title: "Event has ended", description: "Registration is no longer available for past events.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const itemId = Number(selectedTicket.id);
    const payload = {
      paymentType: "event_ticket_category",
      itemId,
      formData,
      currency,
      billingCycle: "oneoff",
    };

    try {
      // ── Free ticket ──────────────────────────────────────────────────────────
      if (isFree) {
        const { data } = await api.post("/payments/initialize/paystack", payload);
        if (data?.external_registration) {
          sessionStorage.setItem(`extReg_${event.id}`, JSON.stringify(data.external_registration));
        }
        navigate(`/user/events/${slug}/confirmation`);
        return;
      }

      // ── Native iOS/Android: paid tickets go through native IAP ───────────────
      if (IS_NATIVE) {
        const result = await purchaseAndVerify({
          productId: storeProductId("event_ticket_category", itemId),
          paymentType: "event_ticket_category",
          itemId,
          currency,
          billingCycle: "oneoff",
          formData,
        });
        if (result.verified) {
          if (result.data?.external_registration) {
            sessionStorage.setItem(`extReg_${event.id}`, JSON.stringify(result.data.external_registration));
          }
          navigate(`/user/events/${slug}/confirmation`);
        } else {
          toast({ title: "Purchase could not be verified", variant: "destructive" });
        }
        return;
      }

      // ── NGN → Paystack ───────────────────────────────────────────────────────
      if (isNGN) {
        const { data } = await api.post("/payments/initialize/paystack", payload);
        const { email, amount, reference } = data;
        if (!reference) throw new Error("No reference generated");

        sessionStorage.setItem(`paymentRef_${event.id}`, reference);

        launchPaystackModal({
          email,
          amount: amount * 100, // convert to kobo
          reference,
          onSuccess: async () => {
            setSubmitting(true);
            try {
              const { data: vData } = await api.post("/payments/verify/paystack", { reference });
              if (vData.status === "success" || vData.message?.includes("verified")) {
                if (vData.external_registration) {
                  sessionStorage.setItem(`extReg_${event.id}`, JSON.stringify(vData.external_registration));
                }
                sessionStorage.removeItem(`paymentRef_${event.id}`);
                navigate(`/user/events/${slug}/confirmation`);
              }
            } catch {
              toast({ title: "Payment verification failed", variant: "destructive" });
            } finally {
              setSubmitting(false);
            }
          },
          onClose: () => toast({ title: "Payment canceled", variant: "destructive" }),
        });
      } else {
        // ── USD/EUR/GBP → Stripe ─────────────────────────────────────────────
        const { data } = await api.post("/payments/initialize/stripe", payload);
        if (!data.clientSecret) throw new Error("No Stripe clientSecret");
        setClientSecret(data.clientSecret);
        setShowStripeModal(true);
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast({ title: "Payment failed. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">
          <Preloader message="Loading checkout..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">Event not found</div>
      </DashboardLayout>
    );
  }

  if (isPast) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="outline" onClick={() => navigate(`/user/events/${slug}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Event
          </Button>
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Registration Closed</h2>
            <p className="text-gray-500 max-w-sm">
              This event has already ended. Registration is no longer available.
            </p>
            <Button variant="outline" onClick={() => navigate("/user/events")}>Browse Other Events</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const sym = currencySymbol(currency);
  const vatAmount = isNGN ? Math.round(ticketPrice * 0.075) : 0;
  const totalAmount = ticketPrice + vatAmount;

  return (
    <>
      {showStripeModal && clientSecret && (
        <StripePaymentModal
          clientSecret={clientSecret}
          onSuccess={async (pi) => {
            try {
              const { data } = await api.post("/payments/verify/stripe", { piId: pi.id });
              if (data.message?.includes("verified")) {
                if (data.external_registration) {
                  sessionStorage.setItem(`extReg_${event.id}`, JSON.stringify(data.external_registration));
                }
                navigate(`/user/events/${slug}/confirmation`);
              }
            } catch {
              toast({ title: "Payment verification failed", variant: "destructive" });
            }
          }}
          onClose={() => setShowStripeModal(false)}
        />
      )}

      <DashboardLayout>
        {!showStripeModal && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate(`/user/events/${slug}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Event
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gradient">Event Checkout</h1>
                <p className="text-gray-600 mt-1">Complete your registration for {event.title}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ── Registration form ── */}
              <div className="lg:col-span-2">
                <Card className="card-enhanced">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-6">Registration Information</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="company">Company / Organisation</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="dietary">Dietary Requirements</Label>
                        <Textarea
                          id="dietary"
                          value={formData.dietaryRequirements}
                          onChange={(e) => setFormData({ ...formData, dietaryRequirements: e.target.value })}
                          placeholder="Any dietary restrictions or allergies…"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="special">Special Requests</Label>
                        <Textarea
                          id="special"
                          value={formData.specialRequests}
                          onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                          placeholder="Any special accommodations needed…"
                          rows={2}
                        />
                      </div>

                      {(isEnrolled || isPast) && (
                        <div className={`rounded-lg px-4 py-3 text-sm font-medium text-center ${
                          isEnrolled ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-200"
                        }`}>
                          {isEnrolled ? "✓ You are already registered for this event" : "This event has already ended — registration is closed"}
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="w-full btn-primary"
                        size="lg"
                        disabled={submitting || isEnrolled || isPast}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        {submitting
                          ? "Processing…"
                          : isEnrolled
                            ? "Already Registered"
                            : isPast
                              ? "Registration Closed"
                              : isFree
                                ? "Complete Registration"
                                : IS_NATIVE
                                  ? `Pay with ${Capacitor.getPlatform() === "ios" ? "App Store" : "Play Store"} — ${sym}${isNGN ? totalAmount.toLocaleString() : ticketPrice}`
                                  : isNGN
                                    ? `Pay with Paystack — ${sym}${totalAmount.toLocaleString()}`
                                    : `Pay with Stripe — ${sym}${ticketPrice}`}
                      </Button>
                    </form>
                  </div>
                </Card>
              </div>

              {/* ── Order summary ── */}
              <div className="lg:col-span-1">
                <Card className="card-enhanced">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

                    <div className="space-y-4">
                      {/* Event info */}
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 shrink-0" />
                          {new Date(event.start_date).toLocaleDateString("en-US", {
                            weekday: "short", month: "short", day: "numeric", year: "numeric",
                          })}
                        </div>
                        {event.start_time && (
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 shrink-0" />
                            {event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}
                          </div>
                        )}
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4 shrink-0" />
                          {event.location}
                        </div>
                      </div>

                      {/* Ticket type */}
                      {selectedTicket && (
                        <div
                          className="rounded-lg p-3 border-2"
                          style={{ borderColor: selectedTicket.color }}
                        >
                          <div
                            className="h-0.5 rounded-full mb-2 -mt-1"
                            style={{ backgroundColor: selectedTicket.color }}
                          />
                          <p className="font-medium text-sm">{selectedTicket.name}</p>
                          {selectedTicket.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{selectedTicket.description}</p>
                          )}
                        </div>
                      )}

                      {/* Pricing breakdown */}
                      <div className="pt-3 border-t border-gray-100 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ticket price</span>
                          <span>{isFree ? "Free" : `${sym}${ticketPrice}`}</span>
                        </div>
                        {isNGN && !isFree && (
                          <div className="flex justify-between text-gray-500">
                            <span>VAT (7.5%)</span>
                            <span>₦{vatAmount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold pt-1.5 border-t border-gray-100">
                          <span>Total</span>
                          <span>{isFree ? "Free" : `${sym}${isNGN ? totalAmount.toLocaleString() : ticketPrice}`}</span>
                        </div>
                      </div>

                      {/* Gateway badge */}
                      {!isFree && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg">
                          <Shield className="h-3.5 w-3.5 shrink-0" />
                          {IS_NATIVE
                            ? `Secured via ${Capacitor.getPlatform() === "ios" ? "Apple App Store" : "Google Play"}`
                            : isNGN
                              ? "Secured via Paystack (NGN)"
                              : `Secured via Stripe (${currency})`}
                        </div>
                      )}

                      {/* Feature list */}
                      {[
                        "Event access confirmation",
                        "Digital badge & QR code",
                        "Email confirmation",
                      ].map((f) => (
                        <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  );
};

// Wrap with Stripe Elements
const EventCheckout = () => {
  const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  const [stripePromise] = useState(() =>
    STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null
  );

  return (
    <Elements stripe={stripePromise}>
      <EventCheckoutInner />
    </Elements>
  );
};

export default EventCheckout;
