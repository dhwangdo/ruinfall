import type { Dispatch, SetStateAction } from "react";
import { ConstellationPreview } from "./ConstellationPreview";
import { CONSTELLATION_PRESETS } from "../cardConstellations";

export type BattleThemeColors = {
  outer: string;
  board: string;
  card: string;
  cardText: string;
  cardBorder: string;
  cardBack: string;
  cost: string;
  costText: string;
  energy: string;
  energyEmpty: string;
  basicBand: string;
  specialBand: string;
  physical: string;
  magic: string;
};

export type StarOrbitStyle = "saturn" | "ring" | "ellipse" | "counter" | "double";
export type CardWatermarkStyle = "stars" | "diamonds";

export const DEFAULT_BATTLE_THEME_COLORS: BattleThemeColors = {
  outer: "#000000",
  board: "#365b46",
  card: "#17234f",
  cardText: "#f8f6ef",
  cardBorder: "#17234f",
  cardBack: "#17234f",
  cost: "#17234f",
  costText: "#ffd166",
  energy: "#126fbd",
  energyEmpty: "#34495e",
  basicBand: "#756A60",
  specialBand: "#3472a2",
  physical: "#ff9d4d",
  magic: "#67cfff",
};

const BATTLE_THEME_COLOR_FIELDS: Array<{ key: keyof BattleThemeColors; label: string }> = [
  { key: "outer", label: "판 바깥" },
  { key: "board", label: "전투판" },
  { key: "card", label: "카드 바탕" },
  { key: "cardText", label: "카드 글자" },
  { key: "cardBorder", label: "카드 테두리" },
  { key: "cardBack", label: "카드 뒷면" },
  { key: "cost", label: "코스트 칩" },
  { key: "costText", label: "코스트 글자" },
  { key: "energy", label: "에너지 채움" },
  { key: "energyEmpty", label: "에너지 빈칸" },
  { key: "basicBand", label: "일반 띠" },
  { key: "specialBand", label: "특별 띠" },
  { key: "physical", label: "방어 글자" },
  { key: "magic", label: "마법 방어 글자" },
];

const STAR_ORBIT_OPTIONS: Array<{ value: StarOrbitStyle; label: string }> = [
  { value: "saturn", label: "극좌표 궤도" },
  { value: "ring", label: "느린 원형" },
  { value: "ellipse", label: "완만한 타원" },
  { value: "counter", label: "느린 역회전" },
  { value: "double", label: "이중 궤도" },
];

const CARD_WATERMARK_OPTIONS: Array<{ value: CardWatermarkStyle; label: string }> = [
  { value: "stars", label: "별자리 · 별" },
  { value: "diamonds", label: "별자리 · 다이아" },
];

type Props = {
  visible: boolean;
  battleThemeColors: BattleThemeColors;
  setBattleThemeColors: Dispatch<SetStateAction<BattleThemeColors>>;
  battleThemeDrafts: BattleThemeColors;
  setBattleThemeDrafts: Dispatch<SetStateAction<BattleThemeColors>>;
  starOrbitStyle: StarOrbitStyle;
  setStarOrbitStyle: Dispatch<SetStateAction<StarOrbitStyle>>;
  starOrbitSpeed: number;
  setStarOrbitSpeed: Dispatch<SetStateAction<number>>;
  starPlaneSpeed: number;
  setStarPlaneSpeed: Dispatch<SetStateAction<number>>;
  cardWatermarkStyle: CardWatermarkStyle;
  setCardWatermarkStyle: Dispatch<SetStateAction<CardWatermarkStyle>>;
  cardWatermarkOpacity: number;
  setCardWatermarkOpacity: Dispatch<SetStateAction<number>>;
  cardWatermarkSize: number;
  setCardWatermarkSize: Dispatch<SetStateAction<number>>;
  cardWatermarkX: number;
  setCardWatermarkX: Dispatch<SetStateAction<number>>;
  cardWatermarkY: number;
  setCardWatermarkY: Dispatch<SetStateAction<number>>;
  constellationPreviewIndex: number | null;
  setConstellationPreviewIndex: Dispatch<SetStateAction<number | null>>;
};

export function BattleThemeControls({
  visible,
  battleThemeColors,
  setBattleThemeColors,
  battleThemeDrafts,
  setBattleThemeDrafts,
  starOrbitStyle,
  setStarOrbitStyle,
  starOrbitSpeed,
  setStarOrbitSpeed,
  starPlaneSpeed,
  setStarPlaneSpeed,
  cardWatermarkStyle,
  setCardWatermarkStyle,
  cardWatermarkOpacity,
  setCardWatermarkOpacity,
  cardWatermarkSize,
  setCardWatermarkSize,
  cardWatermarkX,
  setCardWatermarkX,
  cardWatermarkY,
  setCardWatermarkY,
  constellationPreviewIndex,
  setConstellationPreviewIndex,
}: Props) {
  if (!visible) return null;

  return (
<details hidden className="debug-theme-panel">
            <summary>색상 조작</summary>
            <div className="debug-theme-controls">
              {BATTLE_THEME_COLOR_FIELDS.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type="color"
                    value={battleThemeColors[field.key]}
                    onChange={(event) => {
                      const value = event.target.value;
                      setBattleThemeColors((current) => ({ ...current, [field.key]: value }));
                      setBattleThemeDrafts((current) => ({ ...current, [field.key]: value }));
                    }}
                    aria-label={`${field.label} 색상 선택`}
                  />
                  <input
                    className="debug-theme-hex"
                    type="text"
                    inputMode="text"
                    value={battleThemeDrafts[field.key]}
                    maxLength={7}
                    spellCheck={false}
                    onChange={(event) => {
                      const value = event.target.value;
                      setBattleThemeDrafts((current) => ({ ...current, [field.key]: value }));
                      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                        setBattleThemeColors((current) => ({ ...current, [field.key]: value.toLowerCase() }));
                      }
                    }}
                    onBlur={() => setBattleThemeDrafts((current) => ({
                      ...current,
                      [field.key]: battleThemeColors[field.key],
                    }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    aria-label={`${field.label} 색상 코드`}
                  />
                </label>
              ))}
              <label className="debug-orbit-control">
                <span>별 공전</span>
                <select
                  value={starOrbitStyle}
                  onChange={(event) => setStarOrbitStyle(event.target.value as StarOrbitStyle)}
                >
                  {STAR_ORBIT_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="debug-orbit-range">
                <span>공전 속도</span>
                <input type="range" min="0.25" max="2.5" step="0.05" value={starOrbitSpeed} onChange={(event) => setStarOrbitSpeed(Number(event.target.value))} />
                <output>{starOrbitSpeed.toFixed(2)}×</output>
              </label>
              <label className="debug-orbit-range">
                <span>타원 회전 속도</span>
                <input type="range" min="0.25" max="4" step="0.05" value={starPlaneSpeed} onChange={(event) => setStarPlaneSpeed(Number(event.target.value))} />
                <output>{starPlaneSpeed.toFixed(2)}×</output>
              </label>
              <label className="debug-orbit-control debug-watermark-control">
                <span>워터마크 종류</span>
                <select
                  value={cardWatermarkStyle}
                  onChange={(event) => setCardWatermarkStyle(event.target.value as CardWatermarkStyle)}
                >
                  {CARD_WATERMARK_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="debug-orbit-range">
                <span>워터마크 투명도</span>
                <input type="range" min="0" max="0.65" step="0.01" value={cardWatermarkOpacity} onChange={(event) => setCardWatermarkOpacity(Number(event.target.value))} />
                <output>{Math.round(cardWatermarkOpacity * 100)}%</output>
              </label>
              <label className="debug-orbit-range">
                <span>워터마크 크기</span>
                <input type="range" min="45" max="145" step="1" value={cardWatermarkSize} onChange={(event) => setCardWatermarkSize(Number(event.target.value))} />
                <output>{cardWatermarkSize}%</output>
              </label>
              <label className="debug-orbit-range">
                <span>워터마크 가로</span>
                <input type="range" min="0" max="100" step="1" value={cardWatermarkX} onChange={(event) => setCardWatermarkX(Number(event.target.value))} />
                <output>{cardWatermarkX}%</output>
              </label>
              <label className="debug-orbit-range">
                <span>워터마크 세로</span>
                <input type="range" min="0" max="100" step="1" value={cardWatermarkY} onChange={(event) => setCardWatermarkY(Number(event.target.value))} />
                <output>{cardWatermarkY}%</output>
              </label>
              <fieldset className="debug-constellation-picker">
                <legend>별자리 후보 {constellationPreviewIndex === null ? "" : `#${constellationPreviewIndex + 1}`}</legend>
                <button
                  type="button"
                  className={constellationPreviewIndex === null ? "is-selected" : ""}
                  onClick={() => setConstellationPreviewIndex(null)}
                >원래 9종</button>
                <div>
                  {CONSTELLATION_PRESETS.map((preset, index) => (
                    <button
                      type="button"
                      className={constellationPreviewIndex === index ? "is-selected" : ""}
                      onClick={() => setConstellationPreviewIndex(index)}
                      title={`별자리 후보 ${index + 1}`}
                      aria-label={`별자리 후보 ${index + 1}`}
                      key={index}
                    >
                      <ConstellationPreview preset={preset} />
                      <span>{index + 1}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <button type="button" onClick={() => {
                setBattleThemeColors(DEFAULT_BATTLE_THEME_COLORS);
                setBattleThemeDrafts(DEFAULT_BATTLE_THEME_COLORS);
                setStarOrbitStyle("saturn");
                setStarOrbitSpeed(1.3);
                setStarPlaneSpeed(1);
                setCardWatermarkStyle("stars");
                setCardWatermarkOpacity(.45);
                setCardWatermarkSize(100);
                setCardWatermarkX(50);
                setCardWatermarkY(100);
                setConstellationPreviewIndex(null);
              }}>
                기본값으로 초기화
              </button>
            </div>
          </details>
  );
}
