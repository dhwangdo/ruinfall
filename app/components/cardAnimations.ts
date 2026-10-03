export function animateEnemyCardDelivery(target: HTMLElement, source: DOMRect, delay = 0) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const targetRect = target.getBoundingClientRect();
  const targetStyle = window.getComputedStyle(target);
  const cardWidth = Number.parseFloat(targetStyle.width) || targetRect.width;
  const cardHeight = Number.parseFloat(targetStyle.height) || targetRect.height;
  const targetLeft = targetRect.left + (targetRect.width - cardWidth) / 2;
  const targetTop = targetRect.top + (targetRect.height - cardHeight) / 2;
  const host = target.closest<HTMLElement>(".battlefield") ?? document.body;
  const ghost = target.cloneNode(true) as HTMLElement;
  const previousOpacity = target.style.opacity;
  ghost.classList.add("enemy-card-flight");
  Object.assign(ghost.style, {
    position: "fixed",
    zIndex: "100",
    top: `${targetTop}px`,
    left: `${targetLeft}px`,
    width: `${cardWidth}px`,
    height: `${cardHeight}px`,
    margin: "0",
    pointerEvents: "none",
  });
  ghost.removeAttribute("data-card-id");
  ghost.setAttribute("aria-hidden", "true");
  host.appendChild(ghost);
  target.style.opacity = "0";
  const deltaX = source.left + source.width / 2 - (targetLeft + cardWidth / 2);
  const deltaY = source.top + source.height / 2 - (targetTop + cardHeight / 2);
  const arcHeight = Math.min(130, Math.max(65, Math.abs(deltaY) * .18));
  const animation = ghost.animate(
    [
      {
        transform: `translate(${deltaX}px, ${deltaY}px) rotate(-10deg)`,
        opacity: .92,
        filter: "drop-shadow(0 2px 3px rgba(0,0,0,.2))",
      },
      {
        offset: .18,
        transform: `translate(${deltaX}px, ${deltaY}px) rotate(-10deg)`,
        opacity: .92,
        filter: "drop-shadow(0 2px 3px rgba(0,0,0,.2))",
      },
      {
        offset: .64,
        transform: `translate(${deltaX * .42}px, ${deltaY * .42 - arcHeight}px) rotate(7deg)`,
        opacity: 1,
        filter: "drop-shadow(0 16px 12px rgba(0,0,0,.38))",
      },
      {
        transform: "translate(0, 0) rotate(0deg)",
        opacity: 1,
        filter: "drop-shadow(0 3px 3px rgba(0,0,0,.18))",
      },
    ],
    {
      duration: 820,
      delay,
      easing: "cubic-bezier(.18,.72,.2,1)",
      fill: "backwards",
    },
  );
  const cleanup = () => {
    ghost.remove();
    target.style.opacity = previousOpacity;
  };
  animation.addEventListener("finish", cleanup, { once: true });
  animation.addEventListener("cancel", cleanup, { once: true });
  return animation;
}

export function animateCardToPlayer(sourceCard: HTMLElement, source: DOMRect, target: HTMLElement, delay = 0, duration = 820) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const sourceStyle = window.getComputedStyle(sourceCard);
  const cardWidth = Number.parseFloat(sourceStyle.width) || source.width;
  const cardHeight = Number.parseFloat(sourceStyle.height) || source.height;
  const sourceLeft = source.left + (source.width - cardWidth) / 2;
  const sourceTop = source.top + (source.height - cardHeight) / 2;
  const targetRect = target.getBoundingClientRect();
  const targetLeft = targetRect.left + (targetRect.width - cardWidth) / 2;
  const targetTop = targetRect.top + (targetRect.height - cardHeight) / 2;
  const host = target.closest<HTMLElement>(".battlefield") ?? document.body;
  const ghost = sourceCard.cloneNode(true) as HTMLElement;
  ghost.classList.add("enemy-card-flight");
  Object.assign(ghost.style, {
    position: "fixed",
    zIndex: "100",
    top: `${sourceTop}px`,
    left: `${sourceLeft}px`,
    width: `${cardWidth}px`,
    height: `${cardHeight}px`,
    margin: "0",
    pointerEvents: "none",
  });
  ghost.removeAttribute("data-card-id");
  ghost.setAttribute("aria-hidden", "true");
  host.appendChild(ghost);
  const deltaX = targetLeft - sourceLeft;
  const deltaY = targetTop - sourceTop;
  const animation = ghost.animate(
    [
      { transform: "translate(0, 0) rotate(-10deg)", opacity: .92 },
      { transform: `translate(${deltaX}px, ${deltaY}px) rotate(0deg)`, opacity: 1 },
    ],
    { duration, delay, easing: "cubic-bezier(.18,.72,.2,1)", fill: "backwards" },
  );
  const cleanup = () => ghost.remove();
  animation.addEventListener("finish", cleanup, { once: true });
  animation.addEventListener("cancel", cleanup, { once: true });
  return animation;
}

export function animatePlayedCardToCenter(sourceCard: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  const source = sourceCard.getBoundingClientRect();
  const sourceStyle = window.getComputedStyle(sourceCard);
  const cardWidth = Number.parseFloat(sourceStyle.width) || source.width;
  const cardHeight = Number.parseFloat(sourceStyle.height) || source.height;
  const sourceLeft = source.left + (source.width - cardWidth) / 2;
  const sourceTop = source.top + (source.height - cardHeight) / 2;
  const host = sourceCard.closest<HTMLElement>(".battlefield") ?? document.body;
  const hostRect = host.getBoundingClientRect();
  const targetLeft = hostRect.left + (hostRect.width - cardWidth) / 2;
  const targetTop = hostRect.top + (hostRect.height - cardHeight) / 2;
  const ghost = sourceCard.cloneNode(true) as HTMLElement;
  const previousOpacity = sourceCard.style.opacity;
  ghost.classList.add("played-card-flight");
  Object.assign(ghost.style, {
    position: "fixed",
    zIndex: "110",
    top: `${sourceTop}px`,
    left: `${sourceLeft}px`,
    width: `${cardWidth}px`,
    height: `${cardHeight}px`,
    margin: "0",
    pointerEvents: "none",
  });
  ghost.setAttribute("aria-hidden", "true");
  host.appendChild(ghost);
  sourceCard.style.opacity = "0";
  const animation = ghost.animate(
    [
      { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
      { transform: `translate(${targetLeft - sourceLeft}px, ${targetTop - sourceTop}px) rotate(-4deg) scale(.78)`, opacity: 0 },
    ],
    { duration: 170, easing: "cubic-bezier(.24,.78,.3,1)", fill: "forwards" },
  );
  const cleanup = () => {
    ghost.remove();
    sourceCard.style.opacity = previousOpacity;
  };
  animation.addEventListener("finish", cleanup, { once: true });
  animation.addEventListener("cancel", cleanup, { once: true });
  return 170;
}
