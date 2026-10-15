export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  user_type: "user" | "team" | "admin";
  is_verified: boolean;
}

export interface ExternalRegistration {
  url: string;
  embed_mode: "iframe" | "new_tab";
  can_iframe?: boolean;
  origin: string;
}

/* export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  isPopular: boolean;
} */

export type PlatformReviewStatus = "active" | "pending" | "rejected" | "inactive";

export interface SubscriptionPlan {
  id: number;
  plan_type: string;
  name: string;
  description?: string;
  price: {
    USD: { monthly: number; yearly: number };
    EUR: { monthly: number; yearly: number };
    GBP: { monthly: number; yearly: number };
    NGN: { monthly: number; yearly: number };
  };
  features: { name: string; included: boolean }[];
  current?: boolean;
  popular?: boolean;
  link?: string;
  cta?: string;
  status?: string;
  web_status?: PlatformReviewStatus;
  ios_status?: PlatformReviewStatus;
  android_status?: PlatformReviewStatus;
  ios_submitted_at?: string | null;
  ios_approved_at?: string | null;
  ios_rejected_at?: string | null;
  ios_rejection_reason?: string | null;
  android_submitted_at?: string | null;
  android_approved_at?: string | null;
  android_rejected_at?: string | null;
  android_rejection_reason?: string | null;
}

// Full subscriptionPlans type
export type SubscriptionPlans = Record<string, SubscriptionPlan[]>;

export interface PaymentMethod {
  id: number;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface BillingHistoryItem {
  id: number;
  payment_reference: string;
  date: string;
  amount: number;
  status: string;
  description: string;
  downloadUrl: string;
}

export interface Speaker {
  id: string;
  user_id?: string | number;
  name: string;
  title: string;
  company: string;
  bio: string;
  imageUrl?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
  };
}

export interface Session {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  speakerIds: string[];
  location: string;
  capacity?: number;
}

export interface Exhibitor {
  id: string;
  name: string;
  description: string;
  website?: string;
  logoUrl?: string;
  boothNumber?: string;
  contact: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface Sponsor {
  id: string;
  name: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'partner';
  logoUrl?: string;
  website?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
}

export interface EventReview {
  id: number;
  user_id: number;
  name: string;
  avatar?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  user_id?: string | number;
  name: string;
  role: string;
  email: string;
  phone?: string;
  imageUrl?: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string;
  price: number;
  maxQuantity: number;
  soldQuantity: number;
  color: string;
  floorPlanAreas?: string[]; // Array of floor plan area IDs
}

export interface FloorPlanArea {
  id: string;
  name: string;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface FloorPlan {
  id: string;
  name: string;
  imageUrl?: string;
  areas: FloorPlanArea[];
  width?: number;
  height?: number;
}

export interface Event {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  description: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location: string;
  event_type?: "virtual" | "physical" | "hybrid";
  virtual_link?: string;
  latitude?: number;
  longitude?: number;
  max_attendees: number;
  current_attendees: number;
  currency: string;
  image_url?: string;
  organizer_id?: string;
  organizer_name: string;
  corporate_id?: string;
  status: "draft" | "live" | "cancelled" | "completed";
  registration_deadline?: string;
  tags: string[];
  speakers?: Speaker[];
  sessions?: Session[];
  exhibitors?: Exhibitor[];
  sponsors?: Sponsor[];
  reviews?: EventReview[];
  team_members?: TeamMember[];
  ticket_categories?: TicketCategory[];
  floor_plans?: FloorPlan[];
  created_at?: string;
  updated_at?: string;
}

export interface EventEnrollment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  enrolledAt: string;
  status: "enrolled" | "attended" | "cancelled";
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  qrCode?: string;
}

export interface BillingHistoryItem {
  id: number;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  downloadUrl: string;
}

export interface PaymentMethod {
  id: number;
  type: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}
