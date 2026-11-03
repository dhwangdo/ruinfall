import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { MAX_PLAYER_HP } from "../game/battleState";
import { createRandomPlayerName } from "../game/randomNames";
import type { BlessingId, BlessingOfferId } from "../game/blessingRules";
import type { PreparedRunRestore } from "../game/runSaveState";
import { normalizeBattleWins } from "../game/karmaRules";

/** Persistent player progress, blessings, and movement-limited effects. */
export function useRunPlayer() {
  const [playerName, setPlayerName] = useState(createRandomPlayerName);

  const [playerNameSetupOpen, setPlayerNameSetupOpen] = useState(true);

  const [runPlayerHp, setRunPlayerHp] = useState(MAX_PLAYER_HP);

  const runPlayerHpRef = useRef(MAX_PLAYER_HP);

  const [mindEyeMovesRemaining, setMindEyeMovesRemaining] = useState(0);

  const mindEyeMovesRemainingRef = useRef(0);

  const [godsLamentCharges, setGodsLamentCharges] = useState(3);

  const godsLamentChargesRef = useRef(3);

  const [regionBattleWins, setRenderedBattleWins] = useState(0);
  const regionBattleWinsRef = useRef(0);
  const setRegionBattleWins = useCallback<Dispatch<SetStateAction<number>>>(update => {
    const next = normalizeBattleWins(typeof update === "function" ? update(regionBattleWinsRef.current) : update);
    regionBattleWinsRef.current = next;
    setRenderedBattleWins(next);
  }, []);

  const [darkTicketTurnsRemaining, setDarkTicketTurnsRemaining] = useState(0);

  const darkTicketTurnsRemainingRef = useRef(0);

  const [vitalityShrineMaxHpBonus, setVitalityShrineMaxHpBonus] = useState(0);

  const [blessingOffers, setBlessingOffers] = useState<BlessingOfferId[]>([]);

  const [blessingSeenOfferIds, setBlessingSeenOfferIds] = useState<Set<BlessingId>>(() => new Set());

  const [blessings, setBlessings] = useState<BlessingId[]>([]);

  const [blessingRerollCost, setBlessingRerollCost] = useState(5);

  const [oneUpUsed, setOneUpUsed] = useState(false);

  const oneUpUsedRef = useRef(false);

  const saveState = useMemo(() => ({
    playerName, runPlayerHp, mindEyeMovesRemaining, godsLamentCharges, darkTicketTurnsRemaining,
    vitalityShrineMaxHpBonus, blessingOffers, blessingSeenOfferIds, blessings, blessingRerollCost,
    oneUpUsed, regionBattleWins,
  }), [
    playerName, runPlayerHp, mindEyeMovesRemaining, godsLamentCharges, darkTicketTurnsRemaining,
    vitalityShrineMaxHpBonus, blessingOffers, blessingSeenOfferIds, blessings, blessingRerollCost,
    oneUpUsed, regionBattleWins,
  ]);
  const restorePlayer = useCallback((state: PreparedRunRestore) => {
    setPlayerName(state.playerName);
    setRunPlayerHp(state.runPlayerHp);
    setMindEyeMovesRemaining(state.mindEyeMovesRemaining);
    setGodsLamentCharges(state.godsLamentCharges);
    setRegionBattleWins(state.regionBattleWins);
    setDarkTicketTurnsRemaining(state.darkTicketTurnsRemaining);
    setVitalityShrineMaxHpBonus(state.vitalityShrineMaxHpBonus);
    setBlessingOffers(state.blessingOffers);
    setBlessingSeenOfferIds(new Set(state.blessingSeenOfferIds));
    setBlessings(state.blessings);
    setBlessingRerollCost(state.blessingRerollCost);
    setOneUpUsed(state.oneUpUsed);
    setPlayerNameSetupOpen(false);
    runPlayerHpRef.current = state.runPlayerHp;
    mindEyeMovesRemainingRef.current = state.mindEyeMovesRemaining;
    godsLamentChargesRef.current = state.godsLamentCharges;
    darkTicketTurnsRemainingRef.current = state.darkTicketTurnsRemaining;
    oneUpUsedRef.current = state.oneUpUsed;
  }, [setRegionBattleWins]);
  return {
    playerName, setPlayerName, playerNameSetupOpen, setPlayerNameSetupOpen, runPlayerHp,
    setRunPlayerHp, runPlayerHpRef, mindEyeMovesRemaining, setMindEyeMovesRemaining,
    mindEyeMovesRemainingRef, godsLamentCharges, setGodsLamentCharges, godsLamentChargesRef,
    regionBattleWins, regionBattleWinsRef, setRegionBattleWins,
    darkTicketTurnsRemaining, setDarkTicketTurnsRemaining, darkTicketTurnsRemainingRef,
    vitalityShrineMaxHpBonus, setVitalityShrineMaxHpBonus, blessingOffers, setBlessingOffers,
    blessingSeenOfferIds, setBlessingSeenOfferIds, blessings, setBlessings, blessingRerollCost,
    setBlessingRerollCost, oneUpUsed, setOneUpUsed, oneUpUsedRef, saveState, restorePlayer,
  };
}
export type RunPlayer = ReturnType<typeof useRunPlayer>;
