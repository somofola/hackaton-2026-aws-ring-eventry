import React, { useState } from "react";
import { Button } from "@/components/ui/button";

type Provider = "google" | "microsoft" | "linkedin" | "apple"

interface SocialLoginButtonProps {
  provider: "google" | "microsoft" | "linkedin" | "apple"
  onClick: () => Promise<void> | void   // behaves like Button onClick
}

export  function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  )
}

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3L17.5 19c1.6-1.5 2.5-3.7 2.5-6 0-.5 0-.9-.1-1.3H12z"
      />
      <path fill="#34A853" d="M6.6 14.3l-.9.7L4 16.9C5.6 19.1 8.6 20.5 12 20.5c2.4 0 4.5-.8 6-2.2l-2.4-2c-1 .7-2.2 1.1-3.6 1.1-2.8 0-5.1-1.9-5.9-4.4z" />
      <path fill="#FBBC05" d="M4 7.1C3.3 8.5 3 10.2 3 12s.3 3.5 1 4.9l2.6-2c-.3-.7-.5-1.5-.5-2.4s.2-1.7.5-2.4L4 7.1z" />
      <path fill="#4285F4" d="M12 5.5c1.3 0 2.4.4 3.3 1.2l2.5-2.5C16.5 2.9 14.4 2 12 2 8.6 2 5.6 3.4 4 5.6l2.7 2.1c.8-2.5 3.1-4.2 5.3-4.2z" />
    </svg>
  )
}

export function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.462 2.24-1.213 3.05-.826.885-2.169 1.57-3.269 1.48-.14-1.09.42-2.24 1.19-3.02.83-.85 2.26-1.48 3.29-1.51zM20.6 17.19c-.5 1.15-.74 1.66-1.38 2.68-.9 1.42-2.16 3.19-3.73 3.2-1.39.02-1.75-.9-3.64-.89-1.89.01-2.29.9-3.68.89-1.57-.02-2.76-1.61-3.66-3.03C1.99 17.24 1.6 12.8 3.03 10.02c1.01-1.96 2.85-3.19 4.83-3.22 1.44-.03 2.79.97 3.66.97.87 0 2.51-1.2 4.23-1.02.72.03 2.74.29 4.04 2.19-.1.07-2.41 1.41-2.39 4.2.03 3.34 2.93 4.45 2.96 4.46-.02.07-.46 1.58-1.5 3.11z" />
    </svg>
  )
}

export function LinkedInIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.55v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85v5.5h-3.55V9h3.4v1.56h.05c.47-.88 1.63-1.8 3.35-1.8 3.58 0 4.24 2.36 4.24 5.42v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45zM22.23 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.97 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0z"
      />
    </svg>
  )
}

const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({ provider, onClick }) => {
  const [loading, setLoading] = useState(false)

   const icons: Record<SocialLoginButtonProps["provider"], JSX.Element> = {
    google: <GoogleIcon />,
    microsoft: <MicrosoftIcon />,
    linkedin: <LinkedInIcon />,
    apple: <AppleIcon />
  }

  const labels: Record<SocialLoginButtonProps["provider"], string> = {
    google: "Google",
    microsoft: "Microsoft",
    linkedin: "LinkedIn",
    apple: "Apple"
  }

  const handleClick = async () => {
    setLoading(true)
    try {
      await onClick()
    } catch (err) {
      console.error(`${provider} login failed`, err)
    } finally {
      //setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      type="button"
      variant="outline"
      disabled={loading}
      className="flex items-center gap-2 w-full"
    >
      {icons[provider]}
      {loading ? "Signing in..." : labels[provider]}
    </Button>
  )
}

export default SocialLoginButton;
