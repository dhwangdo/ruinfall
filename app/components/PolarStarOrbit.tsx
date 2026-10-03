import { useEffect, useRef } from "react";

const STAR_ORBIT_AMPLITUDE = 50;
const STAR_ORBIT_FREQUENCY = 5 + 1 / Math.E;
const STAR_ORBIT_BASE_SPEED = 132;
const STAR_ORBIT_GAP_SECONDS = 0.17;
const STAR_INDICATOR_RADIUS = 36;
const STAR_ORBIT_CENTER_SPEED_MULTIPLIER = 1.7;
const STAR_ORBIT_EDGE_SPEED_MULTIPLIER = 2 / 3;

type OrbitSample = { time: number; x: number; y: number; front: boolean };

export function PolarStarOrbit({ count, orbitSpeed, planeSpeed }: {
  count: number;
  orbitSpeed: number;
  planeSpeed: number;
}) {
  const starRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const center = 62;
    const targetSpeed = STAR_ORBIT_BASE_SPEED * orbitSpeed;
    const planeAngularSpeed = Math.PI * 2 / (15 / planeSpeed);
    const historyWindow = 20;
    const integrationStep = 1 / 240;

    const thetaRate = (theta: number) => {
      const radius = STAR_ORBIT_AMPLITUDE * Math.cos(STAR_ORBIT_FREQUENCY * theta);
      const radialDerivative = -STAR_ORBIT_AMPLITUDE
        * STAR_ORBIT_FREQUENCY
        * Math.sin(STAR_ORBIT_FREQUENCY * theta);
      const distanceRatio = Math.min(1, Math.abs(radius) / STAR_ORBIT_AMPLITUDE);
      // Keep stars slower around the outside and accelerate them near the center.
      const edgeSpeedCurve = 1 / (1 + Math.exp(-12 * (distanceRatio - .52)));
      const localTargetSpeed = targetSpeed * (
        STAR_ORBIT_EDGE_SPEED_MULTIPLIER
        + (STAR_ORBIT_CENTER_SPEED_MULTIPLIER - STAR_ORBIT_EDGE_SPEED_MULTIPLIER)
          * (1 - edgeSpeedCurve)
      );
      const denominator = radialDerivative ** 2 + radius ** 2;
      const root = Math.sqrt(Math.max(
        0,
        denominator * localTargetSpeed ** 2
          - radialDerivative ** 2 * radius ** 2 * planeAngularSpeed ** 2,
      ));
      return (-(radius ** 2) * planeAngularSpeed + root) / denominator;
    };

    const advanceTheta = (theta: number, delta: number) => {
      const k1 = thetaRate(theta);
      const k2 = thetaRate(theta + k1 * delta / 2);
      const k3 = thetaRate(theta + k2 * delta / 2);
      const k4 = thetaRate(theta + k3 * delta);
      return theta + delta * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
    };

    const isInsideIndicator = (theta: number) => (
      Math.abs(STAR_ORBIT_AMPLITUDE * Math.cos(STAR_ORBIT_FREQUENCY * theta))
        <= STAR_INDICATOR_RADIUS
    );

    const positionAt = (theta: number, time: number, front: boolean): OrbitSample => {
      const planeAngle = planeAngularSpeed * time;
      const radius = STAR_ORBIT_AMPLITUDE * Math.cos(STAR_ORBIT_FREQUENCY * theta);
      const displayAngle = theta + planeAngle;
      return {
        time,
        x: center + radius * Math.cos(displayAngle),
        y: center + radius * Math.sin(displayAngle),
        front,
      };
    };

    let theta = 0;
    let simulatedTime = -historyWindow;
    let insideIndicator = isInsideIndicator(theta);
    let boundaryCrossings = 0;
    let orbitFront = true;
    const advanceSimulation = (delta: number) => {
      theta = advanceTheta(theta, delta);
      const nextInsideIndicator = isInsideIndicator(theta);
      if (nextInsideIndicator !== insideIndicator) {
        boundaryCrossings += 1;
        insideIndicator = nextInsideIndicator;
        if (boundaryCrossings === 2) {
          orbitFront = !orbitFront;
          boundaryCrossings = 0;
        }
      }
    };
    const history: OrbitSample[] = [positionAt(theta, simulatedTime, orbitFront)];
    while (simulatedTime < 0) {
      const delta = Math.min(integrationStep, -simulatedTime);
      advanceSimulation(delta);
      simulatedTime += delta;
      history.push(positionAt(theta, simulatedTime, orbitFront));
    }

    const startedAt = performance.now();
    let frameId = 0;
    const sampleAt = (targetTime: number) => {
      let low = 0;
      let high = history.length - 1;
      while (low + 1 < high) {
        const middle = Math.floor((low + high) / 2);
        if (history[middle].time <= targetTime) low = middle;
        else high = middle;
      }
      const before = history[low];
      const after = history[Math.min(history.length - 1, high)];
      const range = after.time - before.time;
      const ratio = range > 0 ? Math.max(0, Math.min(1, (targetTime - before.time) / range)) : 0;
      return {
        x: before.x + (after.x - before.x) * ratio,
        y: before.y + (after.y - before.y) * ratio,
        front: ratio < .5 ? before.front : after.front,
      };
    };

    const animate = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      while (simulatedTime < elapsed) {
        const delta = Math.min(integrationStep, elapsed - simulatedTime);
        advanceSimulation(delta);
        simulatedTime += delta;
      }
      history.push(positionAt(theta, simulatedTime, orbitFront));
      while (history.length > 2 && history[1].time < elapsed - historyWindow) history.shift();

      starRefs.current.forEach((element, index) => {
        if (!element) return;
        const position = sampleAt(elapsed - index * STAR_ORBIT_GAP_SECONDS);
        element.style.left = `${position.x}px`;
        element.style.top = `${position.y}px`;
        element.style.zIndex = position.front ? "50" : "30";
      });
      frameId = window.requestAnimationFrame(animate);
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [orbitSpeed, planeSpeed]);

  return (
    <div className="star-orbit-layer polar-star-orbit-layer" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span
          className="orbit-star"
          key={index}
          ref={(element) => { starRefs.current[index] = element; }}
        ><span>★</span></span>
      ))}
    </div>
  );
}
