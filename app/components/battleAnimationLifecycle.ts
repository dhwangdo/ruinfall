/** Own animation groups until their state change commits; reset cancels stale completions. */
export function createBattleAnimationLifecycle() {
  const active = new Set<Animation>();
  let generation = 0;

  const trackAnimation = (animation: Animation | null) => {
    if (!animation) return;
    active.add(animation);
    const forget = () => { active.delete(animation); };
    animation.finished.then(forget, forget);
  };

  const afterAnimations = (animations: Array<Animation | null>, callback: () => void) => {
    const group = animations.filter((animation): animation is Animation => animation !== null);
    const startedIn = generation;
    group.forEach(animation => active.add(animation));
    Promise.allSettled(group.map(animation => animation.finished)).then(results => {
      try {
        if (startedIn === generation && results.every(result => result.status === "fulfilled")) callback();
      } finally {
        group.forEach(animation => {
          active.delete(animation);
          animation.cancel();
        });
      }
    });
  };

  const clearAnimations = () => {
    generation += 1;
    active.forEach(animation => animation.cancel());
    active.clear();
  };
  return { trackAnimation, afterAnimations, clearAnimations };
}
