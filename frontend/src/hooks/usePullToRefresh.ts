import { useRef, useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

const THRESHOLD = 80;   // raw px to pull before triggering refresh
const RESISTANCE = 0.75; // visual travel = raw * resistance

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement>,
  onRefresh?: () => Promise<void> | void
) {
  const [pullDistance, setPullDistance] = useState(0); // visual px
  const [refreshing, setRefreshing] = useState(false);

  const startY      = useRef(0);
  const rawDelta    = useRef(0);
  const isPulling   = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  // Keep callback ref current without re-running the effect
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        startY.current  = e.touches[0].clientY;
        rawDelta.current = 0;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;

      const delta = e.touches[0].clientY - startY.current;

      if (delta > 0 && el.scrollTop === 0) {
        e.preventDefault(); // block native scroll-bounce while pulling
        rawDelta.current = delta;
        setPullDistance(Math.min(delta * RESISTANCE, THRESHOLD * RESISTANCE * 1.3));
      } else {
        isPulling.current = false;
        rawDelta.current  = 0;
        setPullDistance(0);
      }
    };

    const onTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      const triggered = rawDelta.current >= THRESHOLD;
      rawDelta.current = 0;
      setPullDistance(0);

      if (triggered) {
        setRefreshing(true);
        try {
          if (onRefreshRef.current) await onRefreshRef.current();
          else window.location.reload();
        } finally {
          setRefreshing(false);
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [containerRef]);

  return { pullDistance, refreshing };
}
