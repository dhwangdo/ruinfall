import { useState } from "react";
import type { Card } from "../game/cards";
import type { TreasureChestReward } from "../game/runTypes";

export function useLocationDialogs() {
  const [treasureChestReward, setTreasureChestReward] = useState<TreasureChestReward | null>(null);

  const [shrineOpen, setShrineOpen] = useState(false);

  const [transformShrineOpen, setTransformShrineOpen] = useState(false);

  const [combinationShrineOpen, setCombinationShrineOpen] = useState(false);

  const [shopOpen, setShopOpen] = useState(false);

  const [blessingOpen, setBlessingOpen] = useState(false);

  const [activeShopRoom, setActiveShopRoom] = useState<string | null>(null);

  const [openedCardPack, setOpenedCardPack] = useState<Card[] | null>(null);

  const [shopMessage, setShopMessage] = useState("필요한 물건을 골라보세요.");
  return {
    treasureChestReward,
    setTreasureChestReward,
    shrineOpen,
    setShrineOpen,
    transformShrineOpen,
    setTransformShrineOpen,
    combinationShrineOpen,
    setCombinationShrineOpen,
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
