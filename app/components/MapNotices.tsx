export function MapNotices({ message, messageNonce }: { message: string; messageNonce: number }) {
  return message ? <div className="room-action-notices">
    <p key={messageNonce} className="map-message" role="status" aria-live="polite">{message}</p>
  </div> : null;
}
