import type { RoomType } from "./mapRules";

export const MAP_ROOM_LABELS: Record<RoomType, string> = {
  void: "먼 공간", rock: "단단한 바위", empty: "방", blessing: "축복",
  shop: "상점", bloodShop: "피의 상점", extractionShrine: "추출의 성소",
  recoveryShrine: "회복의 성소", vitalityShrine: "건강의 성소", mindEyeShrine: "심안의 성소",
  transformShrine: "변환의 성소", treasureChest: "보물 상자", deckVault: "덱 보관소",
  boss: "보스", portal: "안전 지역 포탈", heal: "완전 회복 노드",
  partialHeal: "30% 회복 노드", safePortal: "다음 지역 포탈",
  stickerAltar: "제단", tinkerer: "땜장이", cardTransmuter: "변환기",
};
