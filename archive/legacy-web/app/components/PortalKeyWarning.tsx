import { useEffect, useRef, useState } from "react";

export function PortalKeyWarning({ onCancel, onConfirm }: {
  onCancel: () => void; onConfirm: (skipWarning: boolean) => void;
}) {
  const [skipWarning, setSkipWarning] = useState(false);
  const panelRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="shop-overlay portal-key-warning-overlay" role="dialog" aria-modal="true"
      aria-labelledby="portal-key-warning-text" onClick={onCancel}>
      <form className="portal-key-warning" ref={panelRef} onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => { event.preventDefault(); onConfirm(skipWarning); }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = panelRef.current?.querySelectorAll<HTMLElement>("input, button");
          if (!items?.length) return;
          const first = items[0], last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
        <p id="portal-key-warning-text">보유한 열쇠가 모두 사라집니다.</p>
        <label><input type="checkbox" checked={skipWarning}
          onChange={(event) => setSkipWarning(event.target.checked)} />이번 런 동안 경고하지 않음</label>
        <div className="portal-key-warning-actions">
          <button type="button" onClick={onCancel}>취소</button>
          <button type="submit">이동</button>
        </div>
      </form>
    </div>
  );
}
