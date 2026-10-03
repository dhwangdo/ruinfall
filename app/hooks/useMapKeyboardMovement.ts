import { useCallback, useRef } from "react";

type Move = [number, number];

const KEYBOARD_MOVES: Record<string, Move> = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

const NUMPAD_MOVES: Record<string, Move> = {
  Numpad7: [-1, -1], Numpad8: [0, -1], Numpad9: [1, -1],
  Numpad4: [-1, 0], Numpad6: [1, 0],
  Numpad1: [-1, 1], Numpad2: [0, 1], Numpad3: [1, 1],
};

export function useMapKeyboardMovement(moveOnMap: (deltaX: number, deltaY: number) => void) {
  const movementKeysRef = useRef(new Set<string>());
  const movementTimerRef = useRef<number | null>(null);
  const numpadKeysRef = useRef(new Set<string>());
  const numpadTimerRef = useRef<number | null>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const keyboardMove = KEYBOARD_MOVES[event.code];
    if (keyboardMove) {
      event.preventDefault();
      movementKeysRef.current.add(event.code);
      if (movementTimerRef.current === null) {
        movementTimerRef.current = window.setTimeout(() => {
          movementTimerRef.current = null;
          const heldMove = [...movementKeysRef.current]
            .map((code) => KEYBOARD_MOVES[code])
            .reduce<[number, number]>(
              (total, move) => [total[0] + move[0], total[1] + move[1]],
              [0, 0],
            );
          const deltaX = Math.sign(heldMove[0]);
          const deltaY = Math.sign(heldMove[1]);
          if (deltaX !== 0 || deltaY !== 0) moveOnMap(deltaX, deltaY);
        }, 45);
      }
      return true;
    }

    const numpadMove = NUMPAD_MOVES[event.code];
    if (!numpadMove) return false;
    event.preventDefault();
    numpadKeysRef.current.add(event.code);
    if (numpadTimerRef.current === null) {
      numpadTimerRef.current = window.setTimeout(() => {
        numpadTimerRef.current = null;
        const pressedKeys = [...numpadKeysRef.current];
        // The numpad is for one explicit direction at a time: never chain
        // simultaneous presses into two map turns.
        if (pressedKeys.length !== 1) return;
        const pressedMove = NUMPAD_MOVES[pressedKeys[0]];
        if (pressedMove) moveOnMap(...pressedMove);
      }, 45);
    }
    return true;
  }, [moveOnMap]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    movementKeysRef.current.delete(event.code);
    numpadKeysRef.current.delete(event.code);
  }, []);

  const clearPendingMovement = useCallback(() => {
    if (movementTimerRef.current !== null) {
      window.clearTimeout(movementTimerRef.current);
      movementTimerRef.current = null;
    }
    if (numpadTimerRef.current !== null) {
      window.clearTimeout(numpadTimerRef.current);
      numpadTimerRef.current = null;
    }
    movementKeysRef.current.clear();
    numpadKeysRef.current.clear();
  }, []);

  return { handleKeyDown, handleKeyUp, clearPendingMovement };
}
