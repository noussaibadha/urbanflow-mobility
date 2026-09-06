// Poids utilisés par scoreCandidates() pour classer les itinéraires et
// choisir lequel est "Recommandé". Appris avec train_route_model.py
// (régression linéaire sur des trajets simulés), pas choisis à la main.
// R² sur les données de test : rapide 0.9459, éco 0.9503, économique 0.9497.
export const ROUTE_MODEL_WEIGHTS = {
  fast: { duration: 0.7036, co2: 0.1991, cost: 0.0972 },
  eco: { duration: 0.1522, co2: 0.7447, cost: 0.1031 },
  cheap: { duration: 0.15, co2: 0.1482, cost: 0.7018 },
}

// Pas de vraies données de coût par mode, donc ordre fixe : les modes
// gratuits sont les mieux notés, la voiture la moins bien (seule à avoir un
// vrai coût essence/parking).
const COST_NORM_BY_MODE = {
  walk: 1,
  bike: 0.67,
  public_transport: 0.33,
  car: 0,
}

// candidates : liste des trajets possibles (mode, durée, CO2...). Renvoie les
// mêmes objets avec un score en plus, calculé en normalisant durée/CO2 entre
// 0 et 1 pour ce groupe de trajets.
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
