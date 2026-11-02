import type { MouseEvent as ReactMouseEvent } from "react";
import type { Card } from "../game/cards";
import type { GameState } from "../game/battleState";
import type { DamagePopup } from "../game/battleUiTypes";
import { DECK_EDITION_INFO, DECK_EDITION_SCORES, type DeckEdition } from "../game/rewards";
import { BattleStatusBadge } from "./BattleStatusBadge";
import { BATTLE_STATUS_DESCRIPTION as STATUS } from "./battleStatusDescriptions";
import { statusLabel } from "../game/statuses";

type BattlePlayerPanelProps = {
  game: GameState;
  playerName: string;
  maxPlayerHp: number;
  combatManualBonus: number;
  ignoreNegativeResistance?: boolean;
  damagePopup?: DamagePopup;
  onMoveDeckCardPreview: (event: ReactMouseEvent<HTMLElement>, card: Card) => void;
  onClearCardPreview: () => void;
  onStartResearchDraw: (research: "astronomy" | "necromancy") => void;
  onShowDeckCardPreview: (card: Card, anchorRight: number, anchorTop: number) => void;
  onShowDeckEditionTooltip: (event: ReactMouseEvent<HTMLElement>, edition: DeckEdition) => void;
  onClearDeckEditionTooltip: () => void;
};

export function BattlePlayerPanel({
  game,
  playerName,
  maxPlayerHp,
  combatManualBonus,
  ignoreNegativeResistance = false,
  damagePopup,
  onMoveDeckCardPreview,
  onClearCardPreview,
  onStartResearchDraw,
  onShowDeckCardPreview,
  onShowDeckEditionTooltip,
  onClearDeckEditionTooltip,
}: BattlePlayerPanelProps) {
  return (
    <div className="player-panel">
      <div className="player-avatar" aria-hidden="true">@</div>
      {(game.playerPhysicalBlock > 0 || game.playerMagicBlock > 0) && (
        <div className="defense-shields player-defense-shields" aria-label="현재 방어도">
          {game.playerPhysicalBlock > 0 && (
            <div className="defense-shield physical" aria-label={`방어 ${game.playerPhysicalBlock}`}>
              <strong>{game.playerPhysicalBlock}</strong>
            </div>
          )}
          {game.playerMagicBlock > 0 && (
            <div className="defense-shield magic" aria-label={`마법 방어 ${game.playerMagicBlock}`}>
              <strong>{game.playerMagicBlock}</strong>
            </div>
          )}
        </div>
      )}
      <div className="player-details">
        <strong>{playerName}</strong>
        <div className="player-health-popup-anchor">
          <div className="healthbar player-health">
            <i style={{ width: `${(game.playerHp / maxPlayerHp) * 100}%` }} />
            <span>{game.playerHp} / {maxPlayerHp}</span>
          </div>
          {damagePopup && (
            <div className={`combat-popup player-combat-popup is-${damagePopup.kind ?? "damage"} ${damagePopup.text === "막음" ? "is-blocked" : ""}`} key={damagePopup.key}>
              {damagePopup.text}
            </div>
          )}
        </div>
        <div className="combat-buffs" aria-label="현재 강화 효과">
          {game.strength + combatManualBonus > 0 && <BattleStatusBadge description={STATUS.strength}>힘 {game.strength + combatManualBonus}</BattleStatusBadge>}
          {game.agility + combatManualBonus > 0 && <BattleStatusBadge description={STATUS.agility}>강인함 {game.agility + combatManualBonus}</BattleStatusBadge>}
          {game.defenseMultiplier > 1 && <BattleStatusBadge description={STATUS.defenseMultiplier}>방어 ×{game.defenseMultiplier}</BattleStatusBadge>}
          {game.damageTakenMultiplier > 1 && <BattleStatusBadge kind="debuff" description={STATUS.damageTakenMultiplier}>받는 피해 ×{game.damageTakenMultiplier}</BattleStatusBadge>}
          {game.invulnerable && <BattleStatusBadge description={STATUS.invulnerable}>피해 면역</BattleStatusBadge>}
          {game.doubleNextAttack && <BattleStatusBadge description={STATUS.doubleNextAttack}>다음 공격 2회</BattleStatusBadge>}
          {(game.pendingBattlePreparation ?? 0) > 0 && <BattleStatusBadge description={`다음 플레이어 턴 시작 시 증폭과 에너지를 각각 ${game.pendingBattlePreparation} 얻습니다. 추가 턴도 포함합니다.`}>싸움 준비 {game.pendingBattlePreparation}</BattleStatusBadge>}
          {game.pendingRadiance.map(({ turns, count }, index) => (
            <BattleStatusBadge key={`light-travel-time-${index}`} description={`${turns}턴 뒤 턴 시작 시 광채 ${count}장을 손패에 생성합니다.`}>
              광행시간 {turns}턴 · 광채 {count}장
            </BattleStatusBadge>
          ))}
          {(game.playerResistance ?? 0) !== 0 && <BattleStatusBadge kind={game.playerResistance < 0 ? "debuff" : "buff"} description={STATUS.resistance(game.playerResistance, ignoreNegativeResistance)}>{statusLabel("resistance", game.playerResistance)}</BattleStatusBadge>}
          {(game.playerAmplification ?? 0) !== 0 && <BattleStatusBadge kind={game.playerAmplification < 0 ? "debuff" : "buff"} description={STATUS.amplification(game.playerAmplification)}>{statusLabel("amplification", game.playerAmplification)}</BattleStatusBadge>}
          {game.activeRuleCards.map((ruleCard) => (
            <span
              className="is-buff rule-buff"
              key={ruleCard.id}
              role="button"
              tabIndex={0}
              aria-label={`룰 : ${ruleCard.name} 카드 설명 보기`}
              onMouseEnter={(event) => onMoveDeckCardPreview(event, ruleCard)}
              onMouseMove={(event) => onMoveDeckCardPreview(event, ruleCard)}
              onMouseLeave={onClearCardPreview}
              onClick={() => {
                if (ruleCard.effect === "astronomyResearch") onStartResearchDraw("astronomy");
                if (ruleCard.effect === "necromancyResearch") onStartResearchDraw("necromancy");
              }}
              onFocus={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                onShowDeckCardPreview(ruleCard, bounds.right, bounds.top);
              }}
              onBlur={onClearCardPreview}
            >
              룰 : {ruleCard.name}{ruleCard.forged ? "+" : ""}
            </span>
          ))}
          {[...game.deckEditions]
            .filter((edition) => DECK_EDITION_INFO[edition] !== undefined)
            .sort((left, right) => DECK_EDITION_SCORES[right] - DECK_EDITION_SCORES[left])
            .map((edition) => (
              <span
                className="is-buff deck-edition-buff"
                key={`deck-edition-${edition}`}
                onMouseEnter={(event) => onShowDeckEditionTooltip(event, edition)}
                onMouseMove={(event) => onShowDeckEditionTooltip(event, edition)}
                onMouseLeave={onClearDeckEditionTooltip}
              >
                에디션 : [{DECK_EDITION_INFO[edition].name}]
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
