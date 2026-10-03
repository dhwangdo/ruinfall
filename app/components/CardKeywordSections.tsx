import type { CardKeywordInfo } from "../game/cardEffects";
import { createRadianceCard } from "../game/cards";
import { CardFace } from "./CardFace";

export function CardKeywordSections({ keywords }: { keywords: CardKeywordInfo[] }) {
  return <>
    {keywords.map((keyword) => (
      <section
        className={keyword.preview ? "card-keyword-preview-section" : undefined}
        key={keyword.name}
      >
        {keyword.preview === "radiance" ? (
          <div className="card-keyword-card-preview card-face strike physical">
            <CardFace card={createRadianceCard(-1)} />
          </div>
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
