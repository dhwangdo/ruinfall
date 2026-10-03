import { BLESSING_INFO, type BlessingOfferId } from "../game/blessingRules";

type Props = {
  open: boolean;
  offers: BlessingOfferId[];
  playerHp: number;
  maxPlayerHp: number;
  rerollCost: number;
  onClose: () => void;
  onChoose: (blessing: BlessingOfferId) => void;
  onReroll: () => void;
};

export function BlessingModal({
  open,
  offers,
  playerHp,
  maxPlayerHp,
  rerollCost,
  onClose,
  onChoose,
  onReroll,
}: Props) {
  if (!open) return null;

  return (
    <div className="shop-overlay blessing-overlay" role="dialog" aria-modal="true" aria-labelledby="blessing-title">
      <section className="shop-panel blessing-panel">
        <header>
          <div><h2 id="blessing-title">축복</h2></div>
          <div className="shop-header-status">
            <strong>HP {playerHp} / {maxPlayerHp}</strong>
            <button type="button" onClick={onClose}>나가기</button>
          </div>
        </header>
        {offers.length > 0 ? (
          <div className="blessing-options">
            {offers.map((blessing, index) => (
              <button type="button" key={`${blessing}-${index}`} onClick={() => onChoose(blessing)}>
                <strong>{BLESSING_INFO[blessing].name}</strong>
                <span>{BLESSING_INFO[blessing].description}</span>
              </button>
            ))}
          </div>
        ) : <p className="blessing-empty">축복 후보가 없습니다.</p>}
        {offers.length > 0 && (
          <footer>
            <button type="button" className="blessing-reroll" onClick={onReroll} disabled={playerHp < rerollCost}>
              HP {rerollCost} 리롤
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
