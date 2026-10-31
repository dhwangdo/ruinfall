import type { ReactNode } from "react";
import type { Card } from "../game/cards";
import { DEFENSE_LABEL } from "../game/defenseRules";

function starIcons(amount: number) {
  return <span className="effect-star">{"★".repeat(Math.max(0, amount))}</span>;
}

export function cardEffectDescription(card: Card, damageNumber: ReactNode, defenseNumber: ReactNode): ReactNode {
  switch (card.effect) {
    case "battleCry": return <span><strong className="effect-keyword">증폭</strong>을 1 얻습니다.</span>;
    case "shatter": return <><span>피해를 {damageNumber} 줍니다.</span><span><strong className="effect-keyword">취약</strong>을 2 부여합니다.</span></>;
    case "kneeStrike": return <><span>피해를 {damageNumber} 줍니다.</span><span><strong className="effect-keyword">약화</strong>를 1 부여합니다.</span></>;
    case "resistanceWard": return <span><strong className="effect-keyword">저항</strong>을 2 얻습니다.</span>;
    case "battlePreparation": return <span>다음 턴 시작 시 <strong className="effect-keyword">증폭</strong>과 <strong className="effect-keyword">에너지</strong>를 각각 2 얻습니다.</span>;
    case "scaleArmor": return <><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span><strong className="effect-keyword">약화</strong>를 2 부여합니다.</span></>;
    case "fourSeasons": return <><span><strong className="effect-keyword">버리기 3</strong>.</span><span><strong className="effect-keyword">증폭</strong>과 <strong className="effect-keyword">저항</strong>을 각각 2 얻습니다.</span><span>모든 적에게 <strong className="effect-keyword">취약</strong>과 <strong className="effect-keyword">약화</strong>를 각각 2 부여합니다.</span></>;
    case "unyielding": return <span><strong className="effect-keyword">저항</strong>을 5 얻습니다.</span>;
    case "demolish": return <><span>피해를 {damageNumber} 줍니다.</span><span><strong className="effect-keyword">취약</strong>과 <strong className="effect-keyword">약화</strong>를 각각 3 부여합니다.</span></>;
    case "strike":
      return <>{card.discardCost !== undefined && <span><strong className="effect-keyword">버리기 {card.discardCost}</strong>.</span>}<span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>{card.draw > 0 && <span>카드를 {card.draw}장 뽑습니다.</span>}</>;
    case "pommel":
      return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span>첫 번째 파일에서 카드를 1장 뽑습니다.</span></>;
    case "defend":
      return <>{card.discardCost !== undefined && <span><strong className="effect-keyword">버리기 {card.discardCost}</strong>.</span>}<span><span className={`effect-type ${card.damageType}`}>{DEFENSE_LABEL[card.damageType]}</span>를 {defenseNumber} 얻습니다.</span></>;
    case "deflect":
      return <><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span>카드를 1장 뽑습니다.</span></>;
    case "battlePlan":
      return <>{card.value > 0 && <span>{starIcons(card.value)}을 얻습니다.</span>}{card.draw > 0 && <span>카드를 {card.draw}장 뽑습니다.</span>}</>;
    case "prepare":
      return <span>카드를 1장 뽑고 1장 버립니다.</span>;
    case "focus":
      return <span><strong className="effect-keyword">에너지</strong>를 1 얻습니다. 카드를 1장 버립니다.</span>;
    case "pruning":
      return <span><strong className="effect-keyword">버리기 2</strong>. <strong className="effect-keyword">에너지</strong>를 2 얻습니다.</span>;
    case "adrenaline":
      return <span><strong className="effect-keyword">체력</strong>을 2 잃습니다. <strong className="effect-keyword">에너지</strong>를 {card.value} 얻습니다. 카드를 {card.draw}장 뽑습니다.</span>;
    case "sweep":
      return <span>모든 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>;
    case "drawEachPile":
      return <span>모든 파일에서 카드를 1장씩 뽑습니다.</span>;
    case "wish":
      return <span>무작위 희귀 카드를 가져옵니다. 그 카드에 <strong className="effect-keyword">토큰</strong> 속성을 부여합니다.</span>;
    case "strategyBook":
      return <><span><strong className="effect-keyword">힘</strong>과 <strong className="effect-keyword">강인함</strong>을 4 얻습니다.</span><span>이 효과는 손패에 있는 동안에도 적용됩니다.</span></>;
    case "evolutionTheory":
      return <span>턴 시작 시 <strong className="effect-keyword">힘</strong>과 <strong className="effect-keyword">강인함</strong>을 1 얻습니다.</span>;
    case "dash":
      return <span>무작위 파일에서 카드를 1장씩 {card.forged ? 3 : "2[3]"}번 뽑습니다.</span>;
    case "quickStep":
      return <span>카드를 {card.draw}장 뽑습니다.</span>;
    case "rulerCompass":
      return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span><span className="effect-star">★</span>을 얻습니다.</span>{card.draw > 0 && <span>카드를 {card.draw}장 뽑습니다.</span>}</>;
    case "suppression":
      return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span>막히지 않은 피해만큼 <span className="effect-type physical">방어</span>를 얻습니다.</span></>;
    case "transcend":
      return <span>이번 턴 피해에 <strong className="effect-keyword">면역</strong>이 됩니다. <strong className="effect-keyword">힘</strong>을 5 얻습니다.</span>;
    case "rapidFire":
      return <span>다음에 사용하는 공격 카드가 2번 발동합니다.</span>;
    case "iceShield":
      return <span><span className="effect-type magic">마법 방어</span>를 {defenseNumber} 얻습니다.</span>;
    case "magicStrike":
      return <span>체력이 가장 낮은 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>;
    case "shockwave":
      return <span>모든 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>;
    case "ventilate":
      return <><span><strong className="effect-keyword">에너지</strong>를 {card.value} 얻습니다.</span><span>카드를 {card.draw}장 뽑습니다.</span></>;
    case "plateArmor":
      return <span><strong className="effect-keyword">에너지</strong>를 {card.forged ? 3 : "1[3]"} 얻습니다.</span>;
    case "plateArmorDefense":
      return <><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span><strong className="effect-keyword">저항</strong>을 {card.forged ? 2 : "1[2]"} 얻습니다.</span></>;
    case "warmUp":
      return <span><strong className="effect-keyword">힘</strong>을 1 얻습니다. 이번 턴 <strong className="effect-keyword">힘</strong>을 {card.value} 추가로 얻습니다.</span>;
    case "fourHit":
      return <span><span className="effect-type damage">피해</span>를 {damageNumber}씩 5번 줍니다.</span>;
    case "silverSword":
      return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span><span className="effect-type magic">마법 방어</span>를 {defenseNumber} 얻습니다.</span></>;
    case "doubleHit":
      return <span><span className="effect-type damage">피해</span>를 {damageNumber}씩 {card.forged ? 2 : "1[2]"}번 줍니다.</span>;
    case "starlight":
      return <span>{starIcons(card.value)}을 얻습니다.</span>;
    case "augment":
      return <span><strong className="effect-keyword">힘</strong>과 <strong className="effect-keyword">강인함</strong>을 {card.value} 얻습니다.</span>;
    case "fileDraw":
      return <span>{card.forged ? "모든 파일에서 카드를 1장씩 뽑습니다." : "파일 하나를 선택해 위에서부터 카드를 3장 뽑습니다."}</span>;
    case "starGuard":
      return <><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span><span className="effect-star">★</span>을 얻습니다.</span></>;
    case "starArk":
      return <><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span><span className="effect-type magic">마법 방어</span>를 {defenseNumber} 얻습니다.</span><span><span className="effect-star">★</span>을 얻습니다.</span></>;
    case "obsidianDagger":
      return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span>[밑패를 <strong className="effect-keyword">소멸</strong>시키고 피해량을 이 카드에 추가합니다.]</span></>;
    case "astronomyResearch":
      return <span><span className="effect-star">★★</span>을 지불하고 원하는 파일의 맨 위 카드를 가져올 수 있습니다. (한 턴에 한 번)</span>;
    case "necromancyResearch":
      return <span><span className="effect-star">★★★</span>을 지불하고 버린 카드 더미에서 원하는 카드 1장을 가져올 수 있습니다. (한 턴에 한 번)</span>;
    case "metallurgyResearch":
      return <span>카드를 <strong className="effect-keyword">재련</strong>할 때마다 <strong className="effect-keyword">재련</strong>된 카드를 가져옵니다.</span>;
    case "economicsResearch":
      return <span>에너지가 -3이 될 때까지 카드를 사용할 수 있습니다. 이 효과는 중첩됩니다.</span>;
    case "opticsResearch":
      return <span>매 플레이어 턴 시작 시 <strong className="effect-keyword">광채</strong>를 1장 가져옵니다.</span>;
    case "osirisSun":
      return <span>턴 시작 시 <span className="effect-star">★</span>를 얻습니다.</span>;
    case "radiance":
      return <span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다. 이번 턴 동안 <strong className="effect-keyword">광채</strong>의 피해량이 4 증가합니다.</span>;
    case "lightCluster":
      return <span><strong className="effect-keyword">광채</strong>를 1장 가져옵니다.</span>;
    case "largePrism":
      return <span><strong className="effect-keyword">광채</strong>를 3장 가져옵니다.</span>;
    case "nebula":
      return <><span><strong className="effect-keyword">광채</strong>를 1장 가져옵니다.</span><span><span className="effect-star">★★</span>를 얻습니다.</span></>;
    case "lightTravelTime":
      return <span>다다음 턴 시작 시 <strong className="effect-keyword">광채</strong>를 {card.value}장 가져옵니다.</span>;
    case "wolfTalisman":
      return <span>전투 덱에 있는 동안 <strong className="effect-keyword">힘</strong>을 {card.value} 얻습니다.</span>;
    case "turtleTalisman":
      return <span>전투 덱에 있는 동안 <strong className="effect-keyword">강인함</strong>을 {card.value} 얻습니다.</span>;
    case "lawResearch":
      return <span>내 <strong className="effect-keyword">룰</strong> 카드의 비용이 1 감소합니다.</span>;
    case "mirrorImage":
      return <span>내 <span className="effect-type physical">방어</span>와 <span className="effect-type magic">마법 방어</span> 수치를 서로 바꿉니다.</span>;
    case "odinSpear":
      return <><span>모든 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span>다른 카드를 <strong className="effect-keyword">재련</strong>할 때마다 비용이 1 감소합니다.</span></>;
    case "massDeal":
      return <><span>빈 파일을 하나 만듭니다.</span><span>카드를 섞을 때마다 각 파일의 카드 수가 최대한 같도록 놓습니다.</span></>;
    case "sturdyStance":
      return <span>턴 종료 시 <strong className="effect-type physical effect-type-bold">방어</strong>와 <strong className="effect-type magic effect-type-bold">마법 방어</strong>를 절반 보존합니다. <strong className="effect-type physical effect-type-bold">방어</strong>를 10 얻습니다.</span>;
    case "charge":
      return <span><strong className="effect-keyword">에너지</strong>를 {card.value} 얻습니다.</span>;
    case "weaponSharpen":
      return <span><strong className="effect-keyword">힘</strong>을 {card.value} 얻습니다.</span>;
    case "armorSharpen":
      return <span><strong className="effect-keyword">강인함</strong>을 {card.value} 얻습니다.</span>;
    case "boomerang":
      return card.name === "정리 타격"
        ? <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span>파일 하나의 맨 위 카드를 버립니다.</span></>
        : <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span>파일 하나의 맨 위 카드를 맨 밑으로 보냅니다.</span></>;
    case "meteor":
      return <span><span className="effect-star">★</span>를 모두 소모하고, 소모한 <span className="effect-star">★</span>마다 무작위 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>;
    case "counter":
      return <span>이번 턴 막은 피해를 반사합니다.</span>;
    case "exchange":
      return <span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다. [밑패와 비용을 교환합니다.]</span>;
    case "flood":
      return <span>피라미드(4-3-2-1). <strong className="effect-keyword">에너지</strong>를 2 얻습니다. 카드를 2장 뽑습니다. <span className="effect-star">★★</span>을 얻습니다.</span>;
    case "endStart":
      return <span>모든 파일이 비어 있어야 사용할 수 있습니다. <strong className="effect-keyword">에너지</strong>를 {card.value} 얻습니다.</span>;
    case "superStrategist":
      return <span><span className="effect-star">★★★★★</span>을 얻습니다.</span>;
    case "slime":
      return <span>턴 종료 시 손패에 있다면 <span className="effect-type physical">물리 피해</span>를 12 받습니다.</span>;
    case "fermentedSlime":
      return <span><strong className="effect-keyword">에너지</strong>를 1 얻습니다.</span>;
    case "relic":
      return <span>도깨비의 <strong className="effect-keyword">힘</strong>을 4 잃게 합니다.</span>;
    case "soil":
      return null;
    case "rock":
      return null;
    case "supernova":
      return <span><span className="effect-star">★★★</span>를 잃습니다. <strong className="effect-keyword">에너지</strong>를 3 얻습니다.</span>;
    case "combatManual":
      return <span>손패에 있는 동안 <strong className="effect-keyword">힘</strong>과 <strong className="effect-keyword">강인함</strong>을 2 얻습니다.</span>;
    case "grimoire":
      return <span>손패에 있는 동안 카드를 낼 때마다 <strong className="effect-type magic effect-type-bold">마법 피해</strong>를 1 받고 <span className="effect-star">★</span>를 얻습니다.</span>;
    case "horologium":
      return <span>추가 턴을 얻습니다.</span>;
    case "ophiuchus":
      return <span>체력을 5 회복합니다.</span>;
    case "aries":
      return <span><strong className="effect-keyword">에너지</strong>를 5 얻습니다. <span className="effect-star">★★★★★</span>을 얻습니다.</span>;
    case "hydra":
      return <span>무작위 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다. 9번 반복합니다.</span>;
    case "orion":
      return <span><strong className="effect-keyword">힘</strong>을 10 얻습니다.</span>;
    case "cassiopeia":
      return null;
    case "ironWave":
      return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span></>;
    case "waterWave":
      return <><span><span className="effect-type magic">마법 방어</span>를 {defenseNumber} 얻습니다.</span><span>카드를 {card.draw}장 뽑습니다.</span></>;
    case "ironRampage":
      return <><span>모든 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span></>;
  }
}
