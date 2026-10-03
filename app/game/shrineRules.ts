import type { Card } from "./cards";

export type ShrineCardConversionResult = {
  before: Card[];
  after: Card[];
  collapsed: boolean;
  destination?: "inventory" | "floor";
};
