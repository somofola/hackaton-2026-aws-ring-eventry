import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import ScrollToTop from "./components/ScrollToTop";
import PrivateRoute from "@/components/auth/PrivateRoute";
import { useTrackPreviousPath } from "@/hooks/useTrackPreviousPath";
import CapacitorBackButtonHandler from "@/components/CapacitorBackButtonHandler";
import GoogleCallbackHandler from "@/components/auth/GoogleCallBackHandler";
import MicrosoftCallbackHandler from "@/components/auth/MicrosoftCallBackHandler";
import LinkedinCallbackHandler from "@/components/auth/LinkedinCallBackHandler";
import PasswordConfirmModal from "@/components/auth/PasswordConfirmModal";

// Splash Screen
import Splash from "./pages/Splash";

// Public Landing
import Landing from "./pages/public/Landing";
import PublicEventDetail from "./pages/public/PublicEventDetail";

// Guest Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import HandoffReceiver from "./pages/auth/HandoffReceiver";
import ConfirmSecondaryEmail from "./pages/auth/ConfirmSecondaryEmail";
import ConfirmEmailChange from "./pages/auth/ConfirmEmailChange";
import ConfirmAccountDeletion from "./pages/auth/ConfirmAccountDeletion";
import AcceptTeamInvite from "./pages/auth/AcceptTeamInvite";
import PasswordReset from "./pages/auth/PasswordReset";
import PasswordRecovery from "./pages/auth/PasswordRecovery";

// User Dashboard Pages
import UserDashboard from "./pages/user/Dashboard";
import ForceChangePassword from "./pages/user/ForceChangePassword";
import Settings from "./pages/user/Settings";
import Events from "./pages/user/Events";
import EventDetail from "./pages/user/EventDetail";
import EventCheckout from "./pages/user/EventCheckout";
import EventConfirmation from "./pages/user/EventConfirmation";
import EventHistory from "./pages/user/EventHistory";
import Notifications from "./pages/user/Notifications";
import UserMenuPage from "./pages/user/MenuPage";
import AdminMenuPage from "./pages/admin/MenuPage";
import TeamMenuPage from "./pages/team/MenuPage";

// Team Pages
import TeamDashboard from "./pages/team/TeamDashboard";
import TeamEvents from "./pages/team/TeamEvents";
import TeamEventDetail from "./pages/team/TeamEventDetail";
import TeamCheckInLanding from "./pages/team/TeamCheckInLanding";
import TeamCheckIn from "./pages/team/TeamCheckIn";
import TeamSettings from "./pages/team/TeamSettings";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import UserDetail from "./pages/admin/UserDetail";
import CreateUser from "./pages/admin/CreateUser";
import EditUser from "./pages/admin/EditUser";
import ContentManagement from "./pages/admin/ContentManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminRingDevices from "./pages/admin/RingDevices";
import PaymentManagement from "./pages/admin/PaymentManagement";
import PaymentDetail from "./pages/admin/PaymentDetail";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

// Admin Event Authoring (merged in from the former role:corporate route tree —
// see Phase 6b notes. These are now admin's only event-authoring surface.)
import EventManagement from "./pages/admin/EventManagement";
import CreateEvent from "./pages/admin/CreateEvent";
import EditEvent from "./pages/admin/EditEvent";
import ViewEvent from "./pages/admin/ViewEvent";
import ManageEvent from "./pages/admin/ManageEvent";
import EventPayments from "./pages/admin/EventPayments";
import EventCheckIn from "./pages/admin/EventCheckIn";
import EventAnalytics from "./pages/admin/EventAnalytics";
import EventAttendees from "./pages/admin/EventAttendees";
import NotFound from "./pages/NotFound";

// Import the new payment gateway component
import DemoPaymentGateway from "./components/payments/DemoPaymentGateway";

const queryClient = new QueryClient();
const RootRoute = () => (Capacitor.isNativePlatform() ? <Splash /> : <Landing />);
// ✅ Custom component that runs the hook inside <BrowserRouter>
const TrackPreviousPath = () => {
  useTrackPreviousPath();
  return null;
};

const AppRouter = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <TrackPreviousPath /> {/* ✅ Hook is now safely called inside the router context */}
      <CapacitorBackButtonHandler  />
        <ScrollToTop />
        <PasswordConfirmModal />
        <Routes>
          {/* Splash Screen */}
          <Route path="/splash" element={<Splash />} />

          {/* Guest Routes */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/events/:slug" element={<PublicEventDetail />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/password-reset" element={<PasswordReset />} />
          <Route path="/password-recovery" element={<PasswordRecovery />} />
          <Route path="/auth/handoff" element={<HandoffReceiver />} />
          <Route path="/confirm-secondary-email" element={<ConfirmSecondaryEmail />} />
          <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
          <Route path="/delete-account/confirm" element={<ConfirmAccountDeletion />} />
          <Route path="/team-invite/accept" element={<AcceptTeamInvite />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackHandler />} />
          <Route path="/auth/microsoft/callback" element={<MicrosoftCallbackHandler />} />
          <Route path="/auth/linkedin/callback" element={<LinkedinCallbackHandler />} />

          {/* User Dashboard Routes */}
          <Route path="/user" element={<PrivateRoute user_type="user" />}>
            <Route path="change-password" element={<ForceChangePassword />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:slug" element={<EventDetail />} />
            <Route path="events/:slug/checkout" element={<EventCheckout />} />
            <Route path="events/:slug/payment" element={<DemoPaymentGateway />} />
            <Route path="events/:slug/confirmation" element={<EventConfirmation />} />
            <Route path="events/history" element={<EventHistory />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="menu" element={<UserMenuPage />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<PrivateRoute user_type="admin" />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="users/create" element={<CreateUser />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="users/:id/edit" element={<EditUser />} />
            <Route path="ring-devices" element={<AdminRingDevices />} />
            {/* Event authoring — merged in from the former role:corporate
                route tree (Phase 6b). Admin is now the sole event-authoring
                + Ring-device-management surface. */}
            <Route path="events" element={<EventManagement />} />
            <Route path="events/create" element={<CreateEvent />} />
            <Route path="events/:uuid/edit" element={<EditEvent />} />
            <Route path="events/:uuid" element={<ViewEvent />} />
            <Route path="events/:uuid/manage" element={<ManageEvent />} />
            <Route path="events/:uuid/payments" element={<EventPayments />} />
            <Route path="events/:uuid/checkin" element={<EventCheckIn />} />
            <Route path="events/:uuid/analytics" element={<EventAnalytics />} />
            <Route path="events/:uuid/attendees" element={<EventAttendees />} />
            <Route path="payments" element={<PaymentManagement />} />
            <Route path="payments/:id" element={<PaymentDetail />} />
            <Route path="content" element={<ContentManagement />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="profile" element={<Navigate to="/admin/settings" replace />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="menu" element={<AdminMenuPage />} />
          </Route>

          {/* Team Routes */}
          <Route path="/team" element={<PrivateRoute user_type="team" />}>
            <Route path="dashboard" element={<TeamDashboard />} />
            <Route path="events" element={<TeamEvents />} />
            <Route path="events/:slug" element={<TeamEventDetail />} />
            <Route path="checkin" element={<TeamCheckInLanding />} />
            <Route path="checkin/:slug" element={<TeamCheckIn />} />
            <Route path="settings" element={<TeamSettings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="menu" element={<TeamMenuPage />} />
          </Route>
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default AppRouter;
