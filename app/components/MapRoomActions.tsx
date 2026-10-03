import type { Card } from "../game/cards";
import type { RoomType } from "../game/mapRules";

type MapRoomActionsProps = {
  roomType: RoomType;
  message: string;
  messageNonce: number;
  quickPickup: {
    firstCard: Pick<Card, "rarity"> | null;
    firstName: string;
    itemCount: number;
  } | null;
  onEnterShop: () => void;
  onOpenShrine: () => void;
  onUseRecoveryShrine: () => void;
  onUseVitalityShrine: () => void;
  onUseMindEyeShrine: () => void;
  onOpenTransformShrine: () => void;
  onOpenCombinationShrine: () => void;
  onOpenTreasureChest: () => void;
  onOpenBlessings: () => void;
  onUsePortal: () => void;
  onUseHeal: () => void;
  onQuickPickup: () => void;
};

export function MapRoomActions({
  roomType,
  message,
  messageNonce,
  quickPickup,
  onEnterShop,
  onOpenShrine,
  onUseRecoveryShrine,
  onUseVitalityShrine,
  onUseMindEyeShrine,
  onOpenTransformShrine,
  onOpenCombinationShrine,
  onOpenTreasureChest,
  onOpenBlessings,
  onUsePortal,
  onUseHeal,
  onQuickPickup,
}: MapRoomActionsProps) {
  return (
    <div className="room-action-notices">
      {message && <p key={messageNonce} className="map-message" role="status" aria-live="polite">{message}</p>}
      {roomType === "altar" && <p className="room-floor-notice altar-inscription">피를 바쳐라.</p>}
      {roomType === "shop" && (
        <button type="button" className="room-floor-notice room-action-notice is-shop simple-room-action-notice" onClick={onEnterShop}>
          <strong>상점 들어가기</strong>
        </button>
      )}
      {roomType === "shrine" && (
        <button type="button" className="room-floor-notice room-action-notice is-shrine simple-room-action-notice" onClick={onOpenShrine}>
          <strong>추출의 성소 이용하기</strong>
          <small>카드 최대 2장 추출 · 사용 후 붕괴</small>
        </button>
      )}
      {roomType === "recoveryShrine" && (
        <button type="button" className="room-floor-notice room-action-notice is-shrine simple-room-action-notice" onClick={onUseRecoveryShrine}>
          <strong>회복의 성소 이용하기</strong>
          <small>최대 체력의 30% 회복(버림) · 사용 후 붕괴</small>
        </button>
      )}
      {roomType === "vitalityShrine" && (
        <button type="button" className="room-floor-notice room-action-notice is-shrine simple-room-action-notice" onClick={onUseVitalityShrine}>
          <strong>건강의 성소 이용하기</strong>
          <small>최대 체력 +5 · 현재 체력 변화 없음 · 사용 후 붕괴</small>
        </button>
      )}
      {roomType === "mindEyeShrine" && (
        <button type="button" className="room-floor-notice room-action-notice is-shrine simple-room-action-notice" onClick={onUseMindEyeShrine}>
          <strong>심안의 성소 이용하기</strong>
          <small>20회 이동 동안 시야 거리 +2 · 사용 후 붕괴</small>
        </button>
      )}
      {roomType === "transformShrine" && (
        <button type="button" className="room-floor-notice room-action-notice is-shrine simple-room-action-notice" onClick={onOpenTransformShrine}>
          <strong>변환의 성소 이용하기</strong>
          <small>인벤토리 카드 2장 변환 · 사용 후 붕괴</small>
        </button>
      )}
      {roomType === "combinationShrine" && (
        <button type="button" className="room-floor-notice room-action-notice is-shrine simple-room-action-notice" onClick={onOpenCombinationShrine}>
          <strong>조합의 성소 이용하기</strong>
          <small>특별 카드 5장을 무작위 희귀 카드 1장으로 조합</small>
        </button>
      )}
      {roomType === "treasureChest" && (
        <button type="button" className="room-floor-notice room-action-notice is-shop simple-room-action-notice" onClick={onOpenTreasureChest}>
          <strong>보물 상자 열기</strong>
          <small>보상이 바닥에 떨어지고 큰 소리가 납니다</small>
        </button>
      )}
      {roomType === "blessing" && (
        <button type="button" className="room-floor-notice room-action-notice is-shop simple-room-action-notice" onClick={onOpenBlessings}>
          <strong>축복 받기</strong>
        </button>
      )}
      {(roomType === "portal" || roomType === "safePortal") && (
        <button type="button" className="room-floor-notice room-action-notice is-portal simple-room-action-notice" onClick={onUsePortal}>
          <strong>포탈 이용하기</strong>
        </button>
      )}
      {roomType === "heal" && (
        <button type="button" className="room-floor-notice room-action-notice simple-room-action-notice" onClick={onUseHeal}>
          <strong>회복하기</strong>
        </button>
      )}
      {quickPickup && (
        <button type="button" className="room-floor-notice quick-pickup-notice" onClick={onQuickPickup}>
          <strong>
            {quickPickup.firstCard
              ? <span className={`quick-pickup-card rarity-${quickPickup.firstCard.rarity}`}>{quickPickup.firstName}</span>
              : quickPickup.firstName}
            {quickPickup.itemCount === 1
              ? " 줍기"
              : ` 외 떨어진 물건 ${quickPickup.itemCount - 1}개 줍기`}
          </strong>
        </button>
      )}
    </div>
  );
}
