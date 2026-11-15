export function handCardAtPointer(clientX: number, clientY: number, excludedCardId: number | null = null) {
  const cards = document.querySelectorAll<HTMLButtonElement>(".hand .game-card:not(.is-outside-window)");
  for (let index = cards.length - 1; index >= 0; index -= 1) {
    const card = cards[index];
    const cardId = Number(card.dataset.cardId);
    if (cardId === excludedCardId || card.disabled) continue;
    const track = card.closest<HTMLElement>(".hand-track");
    if (!track) continue;

    // The resting fan, rather than the enlarged card, owns the hover area.
    const trackRect = track.getBoundingClientRect();
    const x = Number.parseFloat(card.style.getPropertyValue("--hand-x")) || 0;
    const y = Number.parseFloat(card.style.getPropertyValue("--hand-y")) || 0;
    const angle = (Number.parseFloat(card.style.getPropertyValue("--hand-angle")) || 0) * Math.PI / 180;
    const dx = clientX - (trackRect.left + card.offsetLeft + card.offsetWidth / 2 + x);
    const dy = clientY - (trackRect.top + card.offsetTop + card.offsetHeight + y);
    const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
    const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
    if (Math.abs(localX) <= card.offsetWidth / 2 && localY >= -card.offsetHeight && localY <= 0) {
      return cardId;
    }
  }
  return null;
}
