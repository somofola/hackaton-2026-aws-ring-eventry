
import { User, PricingPlan, BillingHistoryItem, PaymentMethod } from "@/types";
// Mock data for users
export const mockUsers : User[] = [
  {
    id: '1',
    email: 'user@example.com',
    password: 'password123',
    first_name: 'Demo',
    last_name: 'User',
    user_type: 'user',
    is_verified: true,
  },
  {
    id: '2',
    email: 'admin@example.com',
    password: 'password123',
    first_name: 'Admin',
    last_name: 'User',
    user_type: 'admin',
    is_verified: true,
  },
  {
    id: '4',
    email: 'team@example.com',
    password: 'password123',
    first_name: 'Team',
    last_name: 'User',
    user_type: 'team',
    is_verified: true,
  },
];

// Mock data for users
/* export const mockUsers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "user" as const,
    company: "Tech Corp",
    createdAt: "2024-01-15",
    isActive: true
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@company.com",
    role: "admin" as const,
    company: "Enterprise Inc",
    createdAt: "2024-02-20",
    isActive: true
  }
]; */

export const mockPricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: [
      "1 Digital Business Card",
      "Basic QR Code Generation",
      "Card Sharing via Link",
      "Basic Analytics",
      "Email Support"
    ],
    isPopular: false
  },
  {
    id: "pro",
    name: "Pro",
    price: 9.99,
    features: [
      "5 Digital Business Cards",
      "Advanced QR Code Generation",
      "Custom Card Designs",
      "Advanced Analytics",
      "Lead Capture Forms",
      "Priority Email Support",
      "Export Contacts"
    ],
    isPopular: true
  },
  {
    id: "business",
    name: "Business",
    price: 29.99,
    features: [
      "25 Digital Business Cards",
      "Team Management",
      "Company Branding",
      "Bulk QR Code Generation",
      "Advanced Analytics Dashboard",
      "CRM Integration",
      "Phone Support",
      "Custom Domains"
    ],
    isPopular: false
  }
];

export const mockBillingHistory: BillingHistoryItem[] = [
  {
    id: 1,
    invoiceNumber: "INV-2024-001",
    date: "2024-01-15",
    amount: 29.99,
    currency: "USD",
    status: "Paid",
    description: "Business Plan - Monthly Subscription",
    downloadUrl: "/invoices/INV-2024-001.pdf"
  },
  {
    id: 2,
    invoiceNumber: "INV-2023-012",
    date: "2023-12-15", 
    amount: 29.99,
    currency: "USD",
    status: "Paid",
    description: "Business Plan - Monthly Subscription",
    downloadUrl: "/invoices/INV-2023-012.pdf"
  },
  {
    id: 3,
    invoiceNumber: "INV-2023-011",
    date: "2023-11-15",
    amount: 29.99,
    currency: "USD", 
    status: "Paid",
    description: "Business Plan - Monthly Subscription",
    downloadUrl: "/invoices/INV-2023-011.pdf"
  }
];

export const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 1,
    type: "card",
    brand: "visa",
    last4: "4242",
    expiryMonth: 12,
    expiryYear: 2025,
    isDefault: true
  },
  {
    id: 2, 
    type: "card",
    brand: "mastercard",
    last4: "8888",
    expiryMonth: 8,
    expiryYear: 2026,
    isDefault: false
  }
];

// Mock data for events
export const mockEvents = [
  {
    id: "1",
    slug: "tech-conference-2024",
    title: "Tech Conference 2024",
    description: "Join us for the biggest technology conference of the year.",
    date: "2024-06-15",
    time: "09:00 AM",
    location: "San Francisco Convention Center",
    maxAttendees: 500,
    currentAttendees: 247,
    price: 199.00,
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
    organizerId: "1",
    organizerName: "John Doe",
    status: "published" as const,
    tags: ["technology", "networking", "innovation"],
    speakers: [],
    sessions: [],
    exhibitors: [],
    teamMembers: [],
    ticketCategories: [],
    floorPlans: [],
    category: "Technology",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-20"
  },
  {
    id: "2",
    slug: "design-workshop-2024",
    title: "Design Workshop 2024", 
    description: "A hands-on workshop focused on modern design principles.",
    date: "2024-07-20",
    time: "10:00 AM",
    location: "Design Studio Downtown",
    maxAttendees: 50,
    currentAttendees: 23,
    price: 99.00,
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64",
    organizerId: "2",
    organizerName: "Jane Smith",
    status: "published" as const,
    tags: ["design", "workshop", "creativity"],
    speakers: [],
    sessions: [],
    exhibitors: [],
    teamMembers: [],
    ticketCategories: [],
    floorPlans: [],
    category: "Design",
    createdAt: "2024-02-20",
    updatedAt: "2024-02-25"
  }
];

