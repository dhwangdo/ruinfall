import type { CSSProperties } from "react";

export function itemStackStyle(count: number): CSSProperties | undefined {
  const layers = Math.min(5, Math.max(0, count - 1));
  if (layers === 0) return undefined;
  const shadows = Array.from({ length: layers }, (_, index) => {
    const offset = (index + 1) * -7;
    return `${offset}px 0 0 -4px var(--editor-stack-fill, var(--card-paper)), ${offset}px 0 0 0 var(--editor-stack-border)`;
  });
  return { marginLeft: layers * 7, "--editor-stack-width": `${layers * 7}px`,
    "--editor-stack-shadow": shadows.join(", ") } as CSSProperties;
}
