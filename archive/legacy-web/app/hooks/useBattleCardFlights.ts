import { useEffectEvent, useLayoutEffect, useRef } from "react";
import type { BattleSession } from "./useBattleSession";
import { animateDrawnCardToHand, animateEnemyCardDelivery } from "../components/cardAnimations";
import { animateForgeBurst, newlyForgedCardIds } from "../components/forgeAnimation";
import type { Card } from "../game/cards";

/** New hand slots are laid out first; ghosts land at those exact fan poses. */
export function useBattleCardFlights(battle: BattleSession) {
  const { screen, game, pendingOriginsRef, pendingEnemyTokenIdsRef, handCardRefs,
    pendingPileTokenSourcesRef, pendingParachuteSourcesRef, setPhase, afterAnimations, trackAnimation } = battle;
  const finishDraw = useEffectEvent(() => {
    if (!game.clearPlan) setPhase("playing");
  });
  const previousForge = useRef<{ count: number; cards: Card[] } | null>(null);

  useLayoutEffect(() => {
    const previous = previousForge.current;
    if (screen !== "battle") { previousForge.current = null; return; }
    const cards = [...game.initialDeck, ...game.piles.flat(), ...game.hand];
    previousForge.current = { count: game.forgeCount, cards };
    if (!previous || game.forgeCount <= previous.count) return;
    for (const id of newlyForgedCardIds(previous.cards, cards)) {
      const target = document.querySelector<HTMLElement>(`.battlefield [data-card-id="${id}"]`);
      if (target) trackAnimation(animateForgeBurst(target));
    }
  }, [screen, game.forgeCount, game.initialDeck, game.piles, game.hand, trackAnimation]);

  useLayoutEffect(() => {
    const origins = pendingOriginsRef.current;
    if (screen !== "battle" || origins.size === 0 || game.hand.length === 0) return;
    const animations: Array<Animation | null> = [];
    let visibleIndex = 0;
    for (const card of game.hand) {
      const source = origins.get(card.id), target = handCardRefs.current.get(card.id);
      if (!source || !target) continue;
      const animation = animateDrawnCardToHand(target, source, visibleIndex * 50,
        pendingEnemyTokenIdsRef.current.has(card.id));
      if (animation) visibleIndex += 1;
      animations.push(animation);
    }
    origins.clear();
    pendingEnemyTokenIdsRef.current.clear();
    // Drawn cards are already in the hand; cancelling only their visual flight
    // must not leave input locked. A battle reset still invalidates this callback.
    afterAnimations(animations, () => finishDraw(), { completeOnCancel: true });
  }, [screen, game.hand, handCardRefs, pendingEnemyTokenIdsRef, pendingOriginsRef, afterAnimations]);

  useLayoutEffect(() => {
    if (screen !== "battle" || pendingPileTokenSourcesRef.current.size === 0) return;
    pendingPileTokenSourcesRef.current.forEach((enemyId, cardId) => {
      const source = document.querySelector<HTMLElement>(`[data-enemy-id="${enemyId}"]`);
      const target = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
      if (source && target) trackAnimation(animateEnemyCardDelivery(target, source.getBoundingClientRect()));
      pendingPileTokenSourcesRef.current.delete(cardId);
    });
  }, [screen, game.piles, pendingPileTokenSourcesRef, trackAnimation]);

  useLayoutEffect(() => {
    const sources = pendingParachuteSourcesRef.current;
    if (screen !== "battle") { sources.clear(); return; }
    sources.forEach((source, cardId) => {
      const target = document.querySelector<HTMLElement>(`.battlefield .solitaire-pile [data-card-id="${cardId}"]`);
      if (!target) {
        const stillInPiles = game.piles.some(pile => pile.some(card => card.id === cardId));
        if (!stillInPiles) sources.delete(cardId);
        return;
      }
      trackAnimation(animateDrawnCardToHand(target, source));
      sources.delete(cardId);
    });
  }, [screen, game.piles, pendingParachuteSourcesRef, trackAnimation]);
}
