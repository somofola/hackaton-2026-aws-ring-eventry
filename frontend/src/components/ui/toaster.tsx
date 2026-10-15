import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Bell } from "lucide-react"

const DEFAULT_DURATION = 2500

const variantTheme = {
  success: {
    Icon: CheckCircle2,
    iconBg: "bg-green-100 text-green-600 ring-green-200",
    bar: "bg-gradient-to-r from-green-500 to-green-600",
  },
  destructive: {
    Icon: AlertCircle,
    iconBg: "bg-red-100 text-red-600 ring-red-200",
    bar: "bg-gradient-to-r from-red-500 to-red-600",
  },
  info: {
    Icon: Info,
    iconBg: "bg-blue-100 text-blue-600 ring-blue-200",
    bar: "bg-gradient-to-r from-blue-500 to-blue-600",
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: "bg-amber-100 text-amber-600 ring-amber-200",
    bar: "bg-gradient-to-r from-amber-500 to-amber-600",
  },
  default: {
    Icon: Bell,
    iconBg: "bg-gray-100 text-gray-600 ring-gray-200",
    bar: "bg-gradient-to-r from-gray-400 to-gray-500",
  },
} as const

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider duration={DEFAULT_DURATION}>
      {toasts.map(function ({ id, title, description, action, variant, duration, ...props }) {
        const v = (variant as keyof typeof variantTheme) ?? "default"
        const theme = variantTheme[v] ?? variantTheme.default
        const { Icon } = theme
        const effectiveDuration = duration ?? DEFAULT_DURATION
        return (
          <Toast
            key={id}
            variant={variant}
            duration={effectiveDuration}
            onClick={() => dismiss(id)}
            className="cursor-pointer"
            {...props}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 ${theme.iconBg} animate-in zoom-in-50 duration-300`}
              >
                <Icon className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="grid gap-1 flex-1 min-w-0 pt-0.5">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="whitespace-pre-line break-words">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/[0.06] overflow-hidden">
              <div
                className={`h-full ${theme.bar} origin-left animate-toast-progress shadow-[0_0_8px_currentColor]`}
                style={{ animationDuration: `${effectiveDuration}ms` }}
              />
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
