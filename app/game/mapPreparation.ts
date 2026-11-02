import { getGeneratedDungeonRegion, REGION_COUNT } from "./mapRules.ts";

/** Warm immutable terrain before play, yielding so loading progress can paint. */
export async function prepareMapRegions(seed: number, yieldFrame: () => Promise<void>,
  onProgress: (completed: number, total: number) => void, cancelled: () => boolean = () => false) {
  onProgress(0, REGION_COUNT);
  for (let region = 0; region < REGION_COUNT; region++) {
    await yieldFrame();
    if (cancelled()) return false;
    getGeneratedDungeonRegion(seed, region);
    onProgress(region + 1, REGION_COUNT);
  }
  return true;
}
