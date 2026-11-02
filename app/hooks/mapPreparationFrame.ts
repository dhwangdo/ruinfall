export const mapPreparationFrame = () => new Promise<void>(resolve => {
  window.requestAnimationFrame(() => window.setTimeout(resolve, 0));
});
