import { useEffect, useEffectEvent, useState } from "react";
import type { RunWorld } from "./useRunWorld";
import type { useRunMapContent } from "./useRunMapContent";
import { DUNGEON_MIN_X, MAP_COLUMNS, REGION_HEIGHT, getDungeonRegionIndex, regionStartY } from "../game/mapRules";
import { mapPreparationFrame } from "./mapPreparationFrame";

/** Debug content is prepared in small batches while the map is hidden by the loading screen. */
export function useDebugMapContent({ enabled, world, materializeMapContent }: {
  enabled: boolean;
  world: RunWorld;
  materializeMapContent: ReturnType<typeof useRunMapContent>["materializeMapContent"];
}) {
  const { mapPosition, mapSeed, mapEnemyWorld, setMapEnemyWorld } = world;
  const region = getDungeonRegionIndex(mapPosition);
  const key = `${mapSeed}:${region}`;
  const [preparedKey, setPreparedKey] = useState<string | null>(null);
  const [progress, setProgress] = useState({ key: "", completed: 0, total: MAP_COLUMNS * REGION_HEIGHT });
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const currentWorld = useEffectEvent(() => mapEnemyWorld);
  const prepareChunk = useEffectEvent(materializeMapContent);
  const loading = enabled && region !== null && preparedKey !== key;
  useEffect(() => {
    if (!loading || region === null) return;
    let cancelled = false;
    const run = async () => {
      const total = MAP_COLUMNS * REGION_HEIGHT;
      let nextWorld = currentWorld();
      for (let offset = 0; offset < total; offset += 512) {
        await mapPreparationFrame();
        if (cancelled) return;
        const length = Math.min(512, total - offset);
        const positions = Array.from({ length }, (_, index) => ({
          x: DUNGEON_MIN_X + (index + offset) % MAP_COLUMNS,
          y: regionStartY(region) + Math.floor((index + offset) / MAP_COLUMNS),
        }));
        nextWorld = prepareChunk(positions, mapSeed, nextWorld, []);
        setProgress({ key, completed: offset + length, total });
      }
      if (cancelled) return;
      setMapEnemyWorld(nextWorld);
      setPreparedKey(key);
    };
    void run().catch(reason => {
      if (!cancelled) setError({ key, message: reason instanceof Error ? reason.message : String(reason) });
    });
    return () => { cancelled = true; };
  }, [loading, key, region, mapSeed, setMapEnemyWorld]);
  return { loading, progress: progress.key === key ? progress.completed / progress.total : 0,
    error: error?.key === key ? error.message : null };
}
