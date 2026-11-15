type CoinStack = { x: number; base: number; coins: number };
type LooseCoin = { x: number; y: number; angle: number };
type GoldPileShape = { stacks: CoinStack[]; loose: LooseCoin[]; offsetY?: number };

const PILE_SHAPES: GoldPileShape[] = [
  {
    stacks: [{ x: 14, base: 26, coins: 2 }],
    loose: [{ x: 25, y: 29, angle: -18 }, { x: 32, y: 25, angle: 25 }],
    offsetY: -5,
  },
  {
    stacks: [{ x: 12, base: 31, coins: 3 }, { x: 26, base: 28, coins: 5 }],
    loose: [{ x: 33, y: 34, angle: -12 }, { x: 18, y: 36, angle: 12 }],
    offsetY: -1,
  },
  {
    stacks: [{ x: 8, base: 32, coins: 4 }, { x: 21, base: 32, coins: 7 }, { x: 34, base: 34, coins: 4 }],
    loose: [{ x: 20, y: 38, angle: -8 }, { x: 30, y: 39, angle: 8 }],
  },
  {
    stacks: [{ x: 9, base: 34, coins: 6 }, { x: 22, base: 32, coins: 8 },
      { x: 35, base: 35, coins: 5 }, { x: 20, base: 39, coins: 3 }],
    loose: [{ x: 31, y: 40, angle: -10 }],
  },
  {
    stacks: [{ x: 7, base: 34, coins: 7 }, { x: 18, base: 32, coins: 8 },
      { x: 31, base: 33, coins: 8 }, { x: 37, base: 38, coins: 5 }, { x: 21, base: 40, coins: 4 }],
    loose: [{ x: 9, y: 40, angle: -12 }],
  },
];

const OUTLINE = "#090807";
const COIN_RADIUS_X = 6;
const COIN_RADIUS_Y = 2.6;
const COIN_PITCH = 3.8;

/** Five silhouettes distinguish scattered coins, short stacks, and a crowded pile. */
export function GoldPileVisual({ amount }: { amount: number }) {
  const tier = amount <= 4 ? 0 : amount <= 8 ? 1 : amount <= 13 ? 2 : amount <= 19 ? 3 : 4;
  const shape = PILE_SHAPES[tier];
  return <svg className="floor-gold-art" viewBox="0 0 44 44" focusable="false" aria-hidden="true">
    <g transform={`translate(0 ${shape.offsetY ?? 0})`} strokeLinejoin="round">
      {shape.stacks.map(({ x, base, coins }, index) => {
        const top = base - (coins - 1) * COIN_PITCH;
        const left = x - COIN_RADIUS_X;
        const right = x + COIN_RADIUS_X;
        return <g key={index}>
          <path d={`M${left} ${top}H${right}V${base}C${right} ${base + 3.5} ${left} ${base + 3.5} ${left} ${base}Z`}
            fill={index % 2 === 0 ? "#edb416" : "#d99a09"} stroke={OUTLINE} strokeWidth="1.05" />
          {Array.from({ length: coins - 1 }, (_, layer) => {
            const y = top + (layer + 1) * COIN_PITCH;
            return <path key={layer} d={`M${left + .5} ${y}Q${x} ${y + 3.1} ${right - .5} ${y}`}
              fill="none" stroke="#98600a" strokeWidth=".85" />;
          })}
          <path d={`M${left + 1.8} ${top + 3.3}V${base - .5}`} stroke="#ffe364" strokeWidth=".8" />
          <ellipse cx={x} cy={top} rx={COIN_RADIUS_X} ry={COIN_RADIUS_Y}
            fill="#ffda3e" stroke={OUTLINE} strokeWidth="1.05" />
          <ellipse cx={x} cy={top} rx="3.8" ry="1.35" fill="none" stroke="#ce9511" strokeWidth=".65" />
          <path d={`M${x - 3.4} ${top - .5}q2 -1.2 4.5 -.3`} stroke="#fff5ab" strokeWidth="1.1" strokeLinecap="round" fill="none" />
        </g>;
      })}
      {shape.loose.map(({ x, y, angle }, index) => <g key={index} transform={`translate(${x} ${y}) rotate(${angle})`}>
        <ellipse cy="1.2" rx="5.6" ry="2.8" fill="#cb8b08" stroke={OUTLINE} strokeWidth="1.05" />
        <ellipse rx="5.6" ry="2.8" fill="#ffda3e" stroke={OUTLINE} strokeWidth="1.05" />
        <ellipse rx="3.4" ry="1.4" fill="none" stroke="#cb9410" strokeWidth=".7" />
        <path d="M-3.5 -.6q2-1.2 4.5-.3" stroke="#fff5ab" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      </g>)}
    </g>
  </svg>;
}
