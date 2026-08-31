"use client";

import { useState } from "react";
import styles from "./page.module.css";

const DEFAULTS = {
  nameWeight: 600,
  nameSize: 8.5,
  effectWeight: 400,
  effectSize: 8.5,
};

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
};

function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <label className={styles.control}>
      <span>
        <strong>{label}</strong>
        <output>{value}{unit}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export default function CardFontLab() {
  const [nameWeight, setNameWeight] = useState(DEFAULTS.nameWeight);
  const [nameSize, setNameSize] = useState(DEFAULTS.nameSize);
  const [effectWeight, setEffectWeight] = useState(DEFAULTS.effectWeight);
  const [effectSize, setEffectSize] = useState(DEFAULTS.effectSize);

  const reset = () => {
    setNameWeight(DEFAULTS.nameWeight);
    setNameSize(DEFAULTS.nameSize);
    setEffectWeight(DEFAULTS.effectWeight);
    setEffectSize(DEFAULTS.effectSize);
  };

  return (
    <main className={styles.lab}>
      <section className={styles.preview} aria-label="전투 교본 카드 글꼴 미리보기">
        <div className={styles.card}>
          <span className={styles.cost}>0</span>
          <strong
            className={styles.name}
            style={{ fontSize: `${nameSize}pt`, fontWeight: nameWeight }}
          >
            전투 교본
          </strong>
          <span
            className={styles.effect}
            style={{ fontSize: `${effectSize}pt`, fontWeight: effectWeight }}
          >
            사용 불가.<br />손에 있는 동안 힘 +2,<br />강인함 +2
          </span>
        </div>
      </section>

      <section className={styles.panel} aria-label="글꼴 설정">
        <header>
          <div>
            <small>PRETENDARD FONT LAB</small>
            <h1>카드 글꼴 조정</h1>
          </div>
          <button type="button" onClick={reset}>초기화</button>
        </header>

        <div className={styles.group}>
          <h2>카드 이름</h2>
          <Slider label="굵기" value={nameWeight} min={100} max={900} step={100} unit="" onChange={setNameWeight} />
          <Slider label="크기" value={nameSize} min={6} max={14} step={0.25} unit="pt" onChange={setNameSize} />
        </div>

        <div className={styles.group}>
          <h2>효과 텍스트</h2>
          <Slider label="굵기" value={effectWeight} min={100} max={900} step={100} unit="" onChange={setEffectWeight} />
          <Slider label="크기" value={effectSize} min={6} max={14} step={0.25} unit="pt" onChange={setEffectSize} />
        </div>

        <p className={styles.summary}>
          이름 {nameWeight} / {nameSize}pt · 효과 {effectWeight} / {effectSize}pt
        </p>
      </section>
    </main>
  );
}
