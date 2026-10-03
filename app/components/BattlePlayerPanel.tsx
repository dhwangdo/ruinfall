import type { MouseEvent as ReactMouseEvent } from "react";
import type { Card } from "../game/cards";
import type { GameState } from "../game/battleState";
import { DECK_EDITION_INFO, DECK_EDITION_SCORES, type DeckEdition } from "../game/rewards";

type BattlePlayerPanelProps = {
  game: GameState;
  playerName: string;
  maxPlayerHp: number;
  combatManualBonus: number;
  damagePopup?: { key: string; text: string };
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
            <div className={`combat-popup player-combat-popup ${damagePopup.text === "막음" ? "is-blocked" : ""}`} key={damagePopup.key}>
              {damagePopup.text}
            </div>
          )}
        </div>
        <div className="combat-buffs" aria-label="현재 강화 효과">
          {game.strength + combatManualBonus > 0 && <span className="is-buff">힘 {game.strength + combatManualBonus}</span>}
          {game.agility + combatManualBonus > 0 && <span className="is-buff">강인함 {game.agility + combatManualBonus}</span>}
          {game.defenseMultiplier > 1 && <span className="is-buff">방어 ×{game.defenseMultiplier}</span>}
          {game.damageTakenMultiplier > 1 && <span className="is-debuff">받는 피해 ×{game.damageTakenMultiplier}</span>}
          {game.invulnerable && <span className="is-buff">피해 면역</span>}
          {game.doubleNextAttack && <span className="is-buff">다음 공격 2회</span>}
          {game.pendingRadiance.map((turns, index) => (
            <span className="is-buff" key={`light-travel-time-${index}`}>
              광행시간({turns})
            </span>
          ))}
          {game.playerPhysicalResistance > 0 && <span className="is-buff">물리 저항 {game.playerPhysicalResistance}</span>}
          {game.playerPhysicalVulnerability > 0 && <span className="is-debuff">물리 취약 {game.playerPhysicalVulnerability}</span>}
          {game.playerMagicResistance > 0 && <span className="is-buff">마법 저항 {game.playerMagicResistance}</span>}
          {game.playerMagicVulnerability > 0 && <span className="is-debuff">마법 취약 {game.playerMagicVulnerability}</span>}
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
