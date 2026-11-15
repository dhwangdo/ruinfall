import type { Dispatch, RefObject, SetStateAction } from "react";
import type { GameState } from "../game/battleState";
import type { Phase } from "../game/battleUiTypes";
import type { CardPlayResolution } from "../game/cardPlayResolution";

type Presentation = {
  setGame: Dispatch<SetStateAction<GameState>>;
  setAnimatedEnemyHp: Dispatch<SetStateAction<Record<string, number>>>;
  setDyingEnemyIds: Dispatch<SetStateAction<Set<string>>>;
  setPhase: Dispatch<SetStateAction<Phase>>;
  later: (callback: () => void, delay: number) => number;
  showEnemyPopup: (enemyId: string, text: string) => void;
  grantBattleReward: (regionNumber: number) => void;
  battleRewardRegionRef: RefObject<number>;
};

/** Displays the already-calculated hit sequence. It never calculates combat damage. */
export function presentCardPlay(context: Presentation, previous: GameState, result: CardPlayResolution) {
  const { setGame, setAnimatedEnemyHp, setDyingEnemyIds, setPhase, later, showEnemyPopup,
    grantBattleReward, battleRewardRegionRef } = context;
  const { hitPopups, defeatedEnemyIds } = result;
  if (hitPopups.length > 0) {
    setAnimatedEnemyHp(current => {
      const next = { ...current };
      hitPopups.forEach(({ enemyId }) => {
        if (next[enemyId] !== undefined) return;
        const enemy = previous.enemies.find(item => item.id === enemyId);
        if (enemy) next[enemyId] = enemy.hp;
      });
      return next;
    });
  }
  hitPopups.forEach((popup, index) => {
    later(() => {
      showEnemyPopup(popup.enemyId, `-${popup.damage}`);
      setAnimatedEnemyHp(current => ({ ...current, [popup.enemyId]: popup.remainingHp }));
    }, index * 220);
  });
  const lastPopupByEnemy = new Map<string, number>();
  hitPopups.forEach((popup, index) => lastPopupByEnemy.set(popup.enemyId, index));
  lastPopupByEnemy.forEach((index, enemyId) => {
    later(() => setAnimatedEnemyHp(current => {
      const next = { ...current };
      delete next[enemyId];
      return next;
    }), index * 220 + 240);
  });
  if (defeatedEnemyIds.length > 0) {
    setDyingEnemyIds(current => new Set([...current, ...defeatedEnemyIds]));
    defeatedEnemyIds.forEach(enemyId => {
      const index = lastPopupByEnemy.get(enemyId) ?? 0;
      later(() => setDyingEnemyIds(current => {
        const next = new Set(current);
        next.delete(enemyId);
        return next;
      }), index * 220 + 500);
    });
  }
  if (result.victoryDelay !== null) {
    setPhase("resolving");
    later(() => {
      setGame(current => current.status !== "playing" ? current : {
        ...current, status: "won", message: "승리! 모든 적을 쓰러뜨렸습니다.",
      });
      setPhase("playing");
      grantBattleReward(battleRewardRegionRef.current);
    }, result.victoryDelay);
  }
}
