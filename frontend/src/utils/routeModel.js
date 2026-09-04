// Weights used by scoreCandidates() below to rank the planner's
// already-computed route alternatives and pick which one gets the
// "Recommandé" badge (see pickRecommendedMode in RoutePlanner.jsx).
//
// These are learned, not hand-picked: train_route_model.py (repo root)
// generates a synthetic dataset of (duration_norm, co2_norm, cost_norm) ->
// desirability examples per user profile, fits an ordinary least-squares
// linear regression on an 80/20 train/test split (pure Python, no
// numpy/sklearn — the 3x3 normal-equations system is solved by hand), then
// clips any negative coefficient to 0 and rescales the three weights to sum
// to 1. Re-running `python3 train_route_model.py` (fixed seed) reproduces
// these numbers exactly.
//
// R² measured on the held-out test set: fast 0.9459, eco 0.9503, cheap 0.9497.
export const ROUTE_MODEL_WEIGHTS = {
  fast: { duration: 0.7036, co2: 0.1991, cost: 0.0972 },
  eco: { duration: 0.1522, co2: 0.7447, cost: 0.1031 },
  cheap: { duration: 0.15, co2: 0.1482, cost: 0.7018 },
}

// cost_norm has no real per-mode cost data behind it (see lib/geo.js) — a
// fixed relative ordering stands in for it: free modes score highest, car
// lowest since it's the only one with real fuel/parking costs.
const COST_NORM_BY_MODE = {
  walk: 1,
  bike: 0.67,
  public_transport: 0.33,
  car: 0,
}

// candidates: [{ mode, duration (minutes), co2 (grams), ... }]. Returns the
// same objects with a `score` field added — duration/co2 are min-max
// normalized within this candidate set (1 = best, 0 = worst; all-equal
// ties go to 1 for everyone), cost_norm comes from the fixed table above.
export function scoreCandidates(candidates, priority) {
  const weights = ROUTE_MODEL_WEIGHTS[priority]
  if (!weights) return candidates.map((c) => ({ ...c, score: null }))

  const durations = candidates.map((c) => c.duration)
  const co2s = candidates.map((c) => c.co2)
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)
  const minCo2 = Math.min(...co2s)
  const maxCo2 = Math.max(...co2s)
  const durationRange = maxDuration - minDuration
  const co2Range = maxCo2 - minCo2

  return candidates.map((c) => {
    const durationNorm = durationRange === 0 ? 1 : (maxDuration - c.duration) / durationRange
    const co2Norm = co2Range === 0 ? 1 : (maxCo2 - c.co2) / co2Range
    const costNorm = COST_NORM_BY_MODE[c.mode] ?? 0
    const score = weights.duration * durationNorm + weights.co2 * co2Norm + weights.cost * costNorm
    return { ...c, score }
  })
}
