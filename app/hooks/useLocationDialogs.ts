import { useState } from "react";
import type { Card } from "../game/cards";
import type { TreasureChestReward } from "../game/runTypes";

export function useLocationDialogs() {
  const [treasureChestReward, setTreasureChestReward] = useState<TreasureChestReward | null>(null);

  const [extractionShrineOpen, setExtractionShrineOpen] = useState(false);

  const [transformShrineOpen, setTransformShrineOpen] = useState(false);


  const [deckVaultRoom, setDeckVaultRoom] = useState<string | null>(null);
  const [portalKeyWarningRoom, setPortalKeyWarningRoom] = useState<string | null>(null);

  const [shopOpen, setShopOpen] = useState(false);

  const [blessingOpen, setBlessingOpen] = useState(false);

  const [activeShopRoom, setActiveShopRoom] = useState<string | null>(null);

  const [openedCardPack, setOpenedCardPack] = useState<Card[] | null>(null);

  const [shopMessage, setShopMessage] = useState("필요한 물건을 골라보세요.");
  return {
    deckVaultRoom, setDeckVaultRoom, portalKeyWarningRoom, setPortalKeyWarningRoom,
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
