export const MAP_TICKET_CAMERA_HOLD_MS = 450;

export function ticketCameraDuration(distanceInCells: number) {
  return Math.min(4000, 700 + Math.max(0, distanceInCells) * 20);
}

type Pan = { x: number; y: number };

/** Frame-driven motion survives the map grid rebasing as it crosses the viewport. */
export function animateTicketCamera(from: Pan, to: Pan, onFrame: (pan: Pan) => void, onFinish: () => void, durationMs = 1000) {
  const started = performance.now();
  let frame: number | null = null;
  const advance = (now: number) => {
    const progress = Math.min(1, Math.max(0, (now - started) / Math.max(1, durationMs)));
    const eased = 1 - (1 - progress) ** 3;
    onFrame({ x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased });
    if (progress < 1) frame = window.requestAnimationFrame(advance);
    else { frame = null; onFinish(); }
  };
  frame = window.requestAnimationFrame(advance);
  return () => { if (frame !== null) window.cancelAnimationFrame(frame); frame = null; };
}
