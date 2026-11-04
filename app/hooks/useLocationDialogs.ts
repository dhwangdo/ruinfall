import { useEffect, useState } from "react";
import type { Card } from "../game/cards";
import type { TreasureChestReward } from "../game/runTypes";
import type { DeckCase } from "../game/rewards";

export function useLocationDialogs() {
  const [treasureChestReward, setTreasureChestReward] = useState<TreasureChestReward | null>(null);

  const [extractionShrineOpen, setExtractionShrineOpen] = useState(false);

  const [transformShrineOpen, setTransformShrineOpen] = useState(false);


  const [deckVaultRoom, setDeckVaultRoom] = useState<string | null>(null);
  const [releasedVaultDeck, setReleasedVaultDeck] = useState<DeckCase | null>(null);
  useEffect(() => {
    if (!releasedVaultDeck) return;
    // Expire the notice even if the player enters battle while it is visible.
    const timer = window.setTimeout(() => setReleasedVaultDeck(null), 2_400);
    return () => window.clearTimeout(timer);
  }, [releasedVaultDeck]);
  const [portalKeyWarningRoom, setPortalKeyWarningRoom] = useState<string | null>(null);

  const [shopOpen, setShopOpen] = useState(false);

  const [blessingOpen, setBlessingOpen] = useState(false);

  const [activeShopRoom, setActiveShopRoom] = useState<string | null>(null);

  const [openedCardPack, setOpenedCardPack] = useState<Card[] | null>(null);

  const [shopMessage, setShopMessage] = useState("필요한 물건을 골라보세요.");
  return {
    deckVaultRoom, setDeckVaultRoom, portalKeyWarningRoom, setPortalKeyWarningRoom,
    releasedVaultDeck, setReleasedVaultDeck,
    treasureChestReward,
    setTreasureChestReward,
    extractionShrineOpen,
    setExtractionShrineOpen,
    transformShrineOpen,
    setTransformShrineOpen,
    shopOpen,
    setShopOpen,
    blessingOpen,
    setBlessingOpen,
    activeShopRoom,
    setActiveShopRoom,
    openedCardPack,
    setOpenedCardPack,
    shopMessage,
    setShopMessage,
  };
}
export type LocationDialogs = ReturnType<typeof useLocationDialogs>;
