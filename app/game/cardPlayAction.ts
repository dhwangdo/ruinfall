import type { Dispatch, RefObject, SetStateAction } from "react";
import type { BlessingId } from "./blessingRules";
import type { GameState } from "./battleState";
import type { Card } from "./cards";
import type { Phase } from "./battleUiTypes";
import { resolveCardPlay } from "./cardPlayResolution.ts";
import { presentCardPlay } from "../components/battleCardPresentation.ts";

type ResolvePlayedCardContext = {
  setGame: Dispatch<SetStateAction<GameState>>;
  game: GameState;
  getGame?: () => GameState;
  phase: Phase;
  blessings: BlessingId[];
  setAnimatedEnemyHp: Dispatch<SetStateAction<Record<string, number>>>;
  later: (callback: () => void, delay: number) => number;
  showEnemyPopup: (enemyId: string, text: string, kind?: "damage" | "buff") => void;
  setDyingEnemyIds: Dispatch<SetStateAction<Set<string>>>;
  setPhase: Dispatch<SetStateAction<Phase>>;
  grantBattleReward: (regionNumber: number) => void;
  battleRewardRegionRef: RefObject<number>;
  maxPlayerHp: number;
  oneUpUsedRef: RefObject<boolean>;
  setOneUpUsed: Dispatch<SetStateAction<boolean>>;
  captureDrawOrigins: (cards: Card[]) => number;
  nextCardIdRef: RefObject<number>;
};

/** Commits one computed outcome and then delegates its visible effects to presentation. */
export function createResolvePlayedCard(context: ResolvePlayedCardContext) {
  return (card: Card, targetEnemyId?: string, discardCostPaid = false) => {
    const current = context.getGame?.() ?? context.game;
    const randomCount = Math.max(18, card.effect === "meteor" ? current.stars * 2 : current.starsSpent * 2) + 4;
    const result = resolveCardPlay(current, { card, targetEnemyId, discardCostPaid }, {
      phase: context.phase, blessings: context.blessings, maxPlayerHp: context.maxPlayerHp,
      nextCardId: context.nextCardIdRef.current, oneUpUsed: context.oneUpUsedRef.current,
      randomRolls: Array.from({ length: randomCount }, () => Math.random()),
    });
    if (!result.played) {
      if (result.state !== current) context.setGame(result.state);
      return;
    }
    context.nextCardIdRef.current = result.nextCardId;
    if (result.oneUpUsed !== context.oneUpUsedRef.current) {
      context.oneUpUsedRef.current = result.oneUpUsed;
      context.setOneUpUsed(result.oneUpUsed);
    }
    presentCardPlay(context, current, result);
    if (result.automaticDrawnCards.length > 0 && context.captureDrawOrigins(result.automaticDrawnCards) > 0) {
      context.setPhase("drawing");
    }
    context.setGame(result.state);
  };
}
