"use client";

import { useLayoutEffect, useRef } from "react";
import { useGameSettings } from "../hooks/useGameSettings";

const SHORTCUTS = [
  ["Ctrl + F / ⌘ + F", "지도 검색 · 덱 금고·아이템·특수 장소 찾기"],
  ["W A S D / 방향키", "지도 이동"],
  ["숫자패드 1~9", "8방향 이동 · 5는 한 턴 쉬기"],
  ["O", "자동 여행 시작 · 중단"],
  ["G", "바닥 물품 한 번에 줍기"],
  ["E / >", "현재 장소 이용"],
  ["I / Tab", "인벤토리 열기 · 닫기"],
  ["+ / −", "지도 확대 · 축소"],
  ["0", "지도 배율 초기화"],
  ["E", "전투에서 턴 종료"],
  ["Esc", "창 닫기 · 자동 여행 중단"],
  ["R 길게 누르기", "새 탐험 시작 · 1초 동안 누르기"],
  ["F8", "탐험 진행 저장"],
] as const;

export function GameSettingsModal({ onClose, onBattleCheckChange }: {
  onClose: () => void;
  onBattleCheckChange: (enabled: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { battleDeckCheckEnabled, animationTooltipsEnabled, setAnimationTooltipsEnabled } = useGameSettings();
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return <dialog ref={dialogRef} className="game-settings-dialog" aria-labelledby="game-settings-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => event.stopPropagation()}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="game-settings-panel">
      <header>
        <h2 id="game-settings-title">설정</h2>
        <button type="button" onClick={onClose} aria-label="설정 닫기">닫기</button>
      </header>
      <div className="game-settings-body">
        <label className="game-settings-toggle">
          <span><strong>잠깐!</strong><small>전투에 들어가기 전 사용할 덱을 확인합니다.</small></span>
          <input type="checkbox" checked={battleDeckCheckEnabled} onChange={event => onBattleCheckChange(event.target.checked)} />
        </label>
        <label className="game-settings-toggle">
          <span><strong>애니메이션 툴팁</strong><small>카드 위에 3초 머무르면 재련·별 사용 예시를 보여줍니다.</small></span>
          <input type="checkbox" checked={animationTooltipsEnabled} onChange={event => setAnimationTooltipsEnabled(event.target.checked)} />
        </label>
        <section className="game-settings-shortcuts" aria-labelledby="game-shortcuts-title">
          <h3 id="game-shortcuts-title">단축키 안내</h3>
          <dl>{SHORTCUTS.map(([key, description]) => <div key={`${key}-${description}`}>
            <dt><kbd>{key}</kbd></dt><dd>{description}</dd>
          </div>)}</dl>
        </section>
      </div>
    </section>
  </dialog>;
}
