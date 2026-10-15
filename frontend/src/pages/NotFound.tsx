import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import GuestLayout from "@/components/layout/GuestLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import UserLayout from "@/components/layout/UserLayout";
import TeamLayout from "@/components/layout/TeamLayout";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    /* console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    ); */
  }, [location.pathname]);

  const previousPath = sessionStorage.getItem("previousPath") || "/";
  const previousUserType = previousPath.split("/")[1]; // "user", "admin", etc.

  // Choose the appropriate layout based on previous user type
  const Layout =
    previousUserType === "admin"
      ? AdminLayout
      : previousUserType === "user"
      ? UserLayout
      : previousUserType === "team"
      ? TeamLayout
      : GuestLayout;

  const redirectPath = ["user", "admin", "team"].includes(previousUserType)
    ? `/${previousUserType}/dashboard`
    : "/";

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <p className="text-xl text-gray-600 mb-2">Oops! Page not found</p>

          <p className="text-gray-500 mb-4">You tried to visit: <code>{location.pathname}</code></p>

          <button
            onClick={() => navigate(redirectPath)}
            className="text-blue-500 hover:text-blue-700 underline"
          >
            Go back to your dashboard
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
