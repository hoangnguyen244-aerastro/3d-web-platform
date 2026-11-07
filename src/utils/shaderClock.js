// Advance each material's shader clock independently so changing speed does not jump the phase.
// Clamp long frame gaps after a background tab resumes; 0 pauses the animation.
export function advanceShaderTime(previous, delta, speed) {
  const safeTime = Number.isFinite(previous) ? previous : 0;
  const safeDelta = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 0.1)) : 0;
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, Math.min(speed, 5)) : 1;
  return safeTime + safeDelta * safeSpeed;
}
