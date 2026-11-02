import { CardVisual } from "./CardVisual";
import type { CardKeywordInfo } from "../game/cardEffects";
import { createRadianceCard } from "../game/cards";

export function CardKeywordSections({ keywords }: { keywords: CardKeywordInfo[] }) {
  return <>
    {keywords.map((keyword) => (
      <section
        className={keyword.preview ? "card-keyword-preview-section" : undefined}
        key={keyword.name}
      >
        {keyword.preview === "radiance" ? (
          <CardVisual
            card={createRadianceCard(-1)}
            className="card-keyword-card-preview strike physical"
          />
        ) : (
          <>
            <strong>{keyword.name}</strong>
            <p>{keyword.description}</p>
          </>
        )}
      </section>
    ))}
  </>;
}
