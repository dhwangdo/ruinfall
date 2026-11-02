"use client";

import { CardVisual } from "./CardVisual";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { Card } from "../game/cards";
import type { CardMechanicExample } from "./cardMechanicExamples";
import { canForgeCardOnto, canPlaceBySolitaireRule } from "../game/cardEffects";
import { PILE_CARD_HEIGHT, PILE_STACK_OFFSET } from "./battlePileLayout";
import { BattleResources } from "./BattleResources";
import { animateForgeBurst } from "./forgeAnimation";

const EXAMPLE_CYCLE_MS = 5600;
const BOARD_WIDTH = 640, BOARD_HEIGHT = 640;

function DemoCard({ card, className = "", forgeCount = 0, style }: {
  card: Card; className?: string; forgeCount?: number; style?: CSSProperties;
}) {
  return <CardVisual
    card={card}
    faceProps={{ forgeCount }}
    className={className}
    style={style}
  />;
}

function DemoPile({ card, side, highlight = "", consumed = false, forgeCount = 0, ghost }: {
  card: Card; side: "left" | "middle" | "right"; highlight?: string;
  consumed?: boolean; forgeCount?: number; ghost?: Card;
}) {
  return <div className={`solitaire-pile mechanic-pile is-${side}`}
    style={{ "--pile-stack-height": `${PILE_CARD_HEIGHT + PILE_STACK_OFFSET * 2}px` } as CSSProperties}>
    {[0, 1].map(index => <CardVisual
      key={index}
      card={card}
      faceDown
      className="stacked-card mechanic-back"
      style={{ top: index * PILE_STACK_OFFSET, "--stack-index": index, "--stack-exposure": `${PILE_STACK_OFFSET}px` } as CSSProperties}
    />)}
    <DemoCard card={card} forgeCount={forgeCount}
      className={`stacked-card face-up mechanic-target ${highlight} ${consumed ? "is-consumed" : ""}`}
      style={{ top: PILE_STACK_OFFSET * 2, "--stack-index": 2 } as CSSProperties} />
    {ghost && <DemoCard card={ghost} className="stacked-card face-up pile-draggable-card is-dragging"
      style={{ top: PILE_STACK_OFFSET * 3, "--stack-index": 3 } as CSSProperties} />}
  </div>;
}

function AnimationBoard({ example }: { example: CardMechanicExample }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const movingRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);
  const star = example.kind === "star";
  const dragging = star ? [1, 2, 4, 5].includes(phase) : phase === 1 || phase === 2;
  const sourceIndex = star && phase >= 4 ? 0 : -1;
  const location = star ? phase >= 5 ? "right" : phase >= 2 ? "left" : "hand"
    : phase >= 2 ? "right" : "hand";
  const inPile = phase >= 3;
  const forged = !star && phase >= 3;
  const starsSpent = star ? phase >= 6 ? 2 : phase >= 3 ? 1 : 0 : forged ? 1 : 0;

  useLayoutEffect(() => {
    const card = movingRef.current?.querySelector<HTMLElement>(".card-face");
    if (!forged || !card) return;
    const animation = animateForgeBurst(card);
    return () => animation?.cancel();
  }, [forged]);

  useEffect(() => {
    let timers: number[] = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => setPhase(star ? 6 : 3), 0);
      return () => window.clearTimeout(timer);
    }
    const schedule = () => {
      const steps = star ? [12, 20, 34, 46, 57, 72] : [16, 30, 55];
      timers = steps.map((percent, index) => window.setTimeout(() => setPhase(index + 1), EXAMPLE_CYCLE_MS * percent / 100));
      timers.push(window.setTimeout(() => { setPhase(0); schedule(); }, EXAMPLE_CYCLE_MS));
    };
    schedule();
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [star]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      const scale = bounds.width / BOARD_WIDTH;
      if (!scale) return;
      const hand = stage.querySelector<HTMLElement>(".mechanic-hand-source")!;
      const handBounds = hand.getBoundingClientRect();
      stage.style.setProperty("--mechanic-hand-x", `${(handBounds.left - bounds.left) / scale}px`);
      stage.style.setProperty("--mechanic-hand-y", `${(handBounds.top - bounds.top) / scale}px`);
      stage.querySelectorAll<HTMLElement>(".mechanic-target").forEach((target, index) => {
        const box = target.getBoundingClientRect(), side = ["left", "middle", "right"][index];
        const extraOffset = example.consumesTarget && index === 2 ? 0 : PILE_STACK_OFFSET;
        stage.style.setProperty(`--mechanic-${side}-x`, `${(box.left - bounds.left) / scale}px`);
        stage.style.setProperty(`--mechanic-${side}-y`, `${(box.top - bounds.top) / scale + extraOffset}px`);
        stage.style.setProperty("--mechanic-pile-w", `${box.width / scale}px`);
        stage.style.setProperty("--mechanic-pile-h", `${box.height / scale}px`);
        stage.style.setProperty("--pile-card-w", `${box.width / scale}px`);
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage.querySelector(".piles")!);
    return () => observer.disconnect();
  }, [example.consumesTarget]);

  return <div ref={stageRef} className={`mechanic-stage battlefield is-${example.kind} ${dragging ? "dragging-solitaire" : ""}`} aria-hidden="true">
    <div className="pile-zone mechanic-piles"><div className="piles">
      {[example.left, example.middle, example.right].map((card, index) => {
        const valid = dragging && sourceIndex !== index && canPlaceBySolitaireRule(example.moving, card);
        const forge = valid && canForgeCardOnto(example.moving, card);
        const hovered = dragging && location === ["left", "middle", "right"][index];
        const highlight = valid ? `${forge ? "is-forge-drop-target" : "is-solitaire-drop-target"} ${hovered ? "is-hovered-solitaire-drop-target" : ""}` : "";
        return <DemoPile key={index} card={card} side={(["left", "middle", "right"] as const)[index]}
          highlight={highlight} consumed={forged && index === 2 && example.consumesTarget}
          forgeCount={index === 1 && example.observer && forged ? 1 : 0}
          ghost={star && index === 0 && (phase === 4 || phase === 5) ? example.moving : undefined} />;
      })}
    </div></div>
    <div className="mechanic-hand">
      <DemoCard card={example.left} className="mechanic-hand-left" />
      <DemoCard card={example.right} className="mechanic-hand-right" />
      <div className="mechanic-hand-source" />
    </div>
    <div className="center-drop-zone mechanic-resource-zone">
      <BattleResources energy={3} maximumEnergy={3} stars={2 - starsSpent} />
    </div>
    <div ref={movingRef} className={`mechanic-moving is-at-${location} ${inPile ? "solitaire-pile is-file-sized" : ""}`}>
      <DemoCard card={forged && example.result ? example.result : example.moving} className={inPile ? "stacked-card face-up" : ""} />
      <div className={`mechanic-drag-cursor ${dragging ? "is-visible" : ""}`}>
        <svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true">
          <path d="M3 2 L3 29 L10 23 L16 36 L22 33 L16 21 L26 21 Z" fill="#fff" stroke="#18231e" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  </div>;
}

export function CardMechanicExamplePopover({ examples, anchorRef, anchorX, anchorY }: {
  examples: CardMechanicExample[];
  anchorRef: RefObject<HTMLElement | null>;
  anchorX: number;
  anchorY: number;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const example = examples[index % examples.length];
  useEffect(() => {
    if (examples.length < 2) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % examples.length), EXAMPLE_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [examples.length]);

  useLayoutEffect(() => {
    const panel = panelRef.current, anchor = anchorRef.current;
    if (!panel || !anchor) return;
    const position = () => {
      const margin = 12, gap = 12, frame = 28;
      const scale = Math.min(1, (window.innerWidth - margin * 2 - frame) / BOARD_WIDTH,
        (window.innerHeight - margin * 2 - frame) / BOARD_HEIGHT);
      panel.style.width = BOARD_WIDTH * scale + frame + "px";
      panel.style.height = BOARD_HEIGHT * scale + frame + "px";
      panel.style.setProperty("--mechanic-scale", String(scale));
      panel.style.setProperty("--mechanic-cycle", EXAMPLE_CYCLE_MS + "ms");
      const bounds = anchor.getBoundingClientRect(), { width, height } = panel.getBoundingClientRect();
      const right = bounds.right + gap, left = bounds.left - width - gap;
      const beside = right + width <= window.innerWidth - margin || left >= margin;
      const x = right + width <= window.innerWidth - margin ? right : left >= margin ? left : bounds.left;
      const y = beside ? bounds.top : bounds.bottom + gap + height <= window.innerHeight - margin
        ? bounds.bottom + gap : bounds.top - height - gap;
      panel.style.left = Math.max(margin, Math.min(x, window.innerWidth - width - margin)) + "px";
      panel.style.top = Math.max(margin, Math.min(y, window.innerHeight - height - margin)) + "px";
      panel.style.visibility = "visible";
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorRef, anchorX, anchorY]);

  return <aside ref={panelRef} className="card-mechanic-popover" role="tooltip"
    aria-label={example.kind === "forge" ? "재련 드래그 애니메이션" : "별을 사용한 손패에서 파일, 파일에서 파일 이동 애니메이션"}
    style={{ visibility: "hidden" }}>
    <AnimationBoard example={example} key={`${example.id}-${example.moving.effect}`} />
  </aside>;
}
