"use client";

import { useEffect, useState } from "react";

type GameVersionProps = { version: string; commitHash: string; commitDate: string };
const development = process.env.NODE_ENV === "development";
const koreanTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function GameVersion({ version, commitHash, commitDate }: GameVersionProps) {
  const [sourceUpdatedAt, setSourceUpdatedAt] = useState<string | null>(null);
  useEffect(() => {
    if (!development) return;
    const controller = new AbortController();
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/__ruinfall_dev_version", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted && typeof data.updatedAt === "string" && Number.isFinite(Date.parse(data.updatedAt))) {
          setSourceUpdatedAt(data.updatedAt);
        }
      } catch {
        // A development-server restart is temporary; the next refresh retries.
      }
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 2000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const date = development
    ? sourceUpdatedAt ? `${koreanTime.format(new Date(sourceUpdatedAt))} KST` : "갱신 확인 중…"
    : commitDate;
  const dateLabel = development ? "로컬 소스 수정 시각" : "커밋 시각";
  return <span className="game-version" aria-label={`게임 버전 ${version}, 커밋 ${commitHash}, ${dateLabel} ${date}`}>
    {version} · {commitHash} · {date}
  </span>;
}
