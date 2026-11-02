import { createElement, type ComponentPropsWithRef } from "react";

export type VisualSurfaceProps =
  | ({ as?: "div" } & ComponentPropsWithRef<"div">)
  | ({ as: "button" } & ComponentPropsWithRef<"button">)
  | ({ as: "article" } & ComponentPropsWithRef<"article">);

/** Keep the visual identical while allowing each screen to supply its own interaction. */
type RenderProps = { as?: "div" | "button" | "article" } & (
  ComponentPropsWithRef<"div"> | ComponentPropsWithRef<"button"> | ComponentPropsWithRef<"article">
);

export function VisualSurface({ as = "div", ...attributes }: RenderProps) {
  return createElement(as, attributes);
}
