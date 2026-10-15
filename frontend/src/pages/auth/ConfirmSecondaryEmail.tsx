import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "@/services/api";
import Preloader from "@/components/ui/preloader";

const ConfirmSecondaryEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing confirmation token.");
      return;
    }

    api
      .get("/auth/confirm-secondary-email", { params: { token } })
      .then(({ data }) => {
        setMessage(data.message || "Recovery email confirmed successfully.");
        setStatus("success");
      })
      .catch((err) => {
        setMessage(err?.response?.data?.message || "Invalid or expired confirmation link.");
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Preloader size={80} logoSize={60} message="Confirming your recovery email…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      {status === "success" ? (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Recovery email confirmed</h1>
          <p className="text-gray-500 mb-6">{message}</p>
          <Link to="/user/settings" className="text-primary underline text-sm">
            Back to settings
          </Link>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirmation failed</h1>
          <p className="text-gray-500 mb-6">{message}</p>
          <Link to="/user/settings" className="text-primary underline text-sm">
            Back to settings
          </Link>
        </>
      )}
    </div>
  );
};

export default ConfirmSecondaryEmail;
