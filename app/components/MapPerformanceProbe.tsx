import { Profiler, useEffect, type ReactNode } from "react";

const enabled = () => process.env.NODE_ENV === "development" && typeof window !== "undefined"
  && new URLSearchParams(window.location.search).has("profileMap");

export function MapPerformanceProbe({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!enabled() || typeof PerformanceObserver === "undefined") return;
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) console.debug("map-long-task", Math.round(entry.duration));
    });
    observer.observe({ type: "longtask", buffered: true });
    return () => observer.disconnect();
  }, []);
  return <Profiler id="map" onRender={(_id, phase, duration) => {
    if (enabled()) console.debug("map-render", phase, Math.round(duration));
  }}>{children}</Profiler>;
}
