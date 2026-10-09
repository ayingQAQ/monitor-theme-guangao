export type CardAppearance = {
  tone: number;
  pattern: number;
  sticker: number;
  tilt: number;
  label: number;
};
export function createCardAppearance(random = Math.random): CardAppearance {
  const pick = () => Math.floor(random() * 6);
  return {
    tone: pick(),
    pattern: pick(),
    sticker: pick(),
    tilt: pick(),
    label: pick(),
  };
}
// Per-page allocation: filtering/remounting a card reuses its appearance;
// a fresh page load creates a new wall. No visitor preferences are changed.
const appearances = new Map<number, CardAppearance>();
export function appearanceFor(nodeId: number): CardAppearance {
  let appearance = appearances.get(nodeId);
  if (!appearance) {
    appearance = createCardAppearance();
    appearances.set(nodeId, appearance);
  }
  return appearance;
}
