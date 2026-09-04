#!/usr/bin/env python3
"""Trains the linear regression weights used by
frontend/src/utils/routeModel.js to score route candidates for the
planner's "Recommandé" feature (see pickRecommendedMode in RoutePlanner.jsx).

No real user preference data exists for this yet, so this generates a
synthetic dataset per user profile (fast / eco / cheap) and fits an ordinary
least-squares linear regression to recover the weights from it. Pure Python
(no numpy/sklearn) — the 3x3 normal-equations system is solved by hand via
Gaussian elimination, so the linear algebra is fully visible.

Method
------
1. For each profile, draw candidates with independent uniform features
   (duration_norm, co2_norm, cost_norm) in [0, 1] — these mirror what
   scoreCandidates() computes from the planner's already-calculated modes.
2. Label each candidate with a "desirability" score generated from a fixed,
   hidden ground-truth weight vector for that profile plus Gaussian noise
   (stand-in for the messiness of real user choices). The regression below
   never sees these ground-truth weights directly — it only sees the noisy
   (features -> desirability) pairs and has to recover them.
3. Split 80/20 train/test, fit OLS on the training set, clip any negative
   coefficient to 0 and rescale the three weights to sum to 1 (so they read
   directly as a convex combination in scoreCandidates()), then measure R²
   on both splits.
4. Print the recovered weights and R² per profile — copy them into
   ROUTE_MODEL_WEIGHTS in routeModel.js.

Fixed random seed for reproducibility. Re-run with `python3 train_route_model.py`.
"""

import random

random.seed(42)

N_PER_PROFILE = 4000
NOISE_SIGMA = 0.05
TRAIN_FRACTION = 0.8

# Hidden ground-truth weights used only to LABEL the synthetic data — the
# regression has to recover an approximation of these from noisy outcomes.
TRUE_WEIGHTS = {
    "fast": (0.70, 0.20, 0.10),
    "eco": (0.15, 0.75, 0.10),
    "cheap": (0.15, 0.15, 0.70),
}


def gen_dataset(true_w, n):
    X, y = [], []
    for _ in range(n):
        d, c, cost = random.random(), random.random(), random.random()
        noise = random.gauss(0, NOISE_SIGMA)
        target = true_w[0] * d + true_w[1] * c + true_w[2] * cost + noise
        X.append((d, c, cost))
        y.append(target)
    return X, y


def solve_normal_equations(X, y):
    """OLS without intercept: solves (X^T X) w = X^T y for w via Gaussian
    elimination with partial pivoting. No intercept term because
    scoreCandidates() only ever compares scores *within* one set of
    candidates for the same trip — a constant offset never changes which
    candidate scores highest, so it isn't part of the model that matters."""
    XtX = [[0.0] * 3 for _ in range(3)]
    Xty = [0.0, 0.0, 0.0]
    for row, target in zip(X, y):
        for i in range(3):
            Xty[i] += row[i] * target
            for j in range(3):
                XtX[i][j] += row[i] * row[j]

    A = [XtX[i][:] + [Xty[i]] for i in range(3)]
    for col in range(3):
        pivot_row = max(range(col, 3), key=lambda r: abs(A[r][col]))
        A[col], A[pivot_row] = A[pivot_row], A[col]
        pivot = A[col][col]
        for j in range(col, 4):
            A[col][j] /= pivot
        for r in range(3):
            if r != col:
                factor = A[r][col]
                for j in range(col, 4):
                    A[r][j] -= factor * A[col][j]
    return [A[i][3] for i in range(3)]


def r_squared(X, y, w):
    y_mean = sum(y) / len(y)
    ss_tot = sum((t - y_mean) ** 2 for t in y)
    ss_res = sum((t - (w[0] * row[0] + w[1] * row[1] + w[2] * row[2])) ** 2 for row, t in zip(X, y))
    return 1 - ss_res / ss_tot


def train_profile(name, true_w):
    X, y = gen_dataset(true_w, N_PER_PROFILE)
    split = int(TRAIN_FRACTION * N_PER_PROFILE)
    X_train, y_train = X[:split], y[:split]
    X_test, y_test = X[split:], y[split:]

    w = solve_normal_equations(X_train, y_train)
    w = [max(0.0, c) for c in w]
    total = sum(w) or 1.0
    w = [c / total for c in w]

    r2_train = r_squared(X_train, y_train, w)
    r2_test = r_squared(X_test, y_test, w)

    print(
        f"{name:>6}: duration={w[0]:.4f} co2={w[1]:.4f} cost={w[2]:.4f}  "
        f"R2_train={r2_train:.4f} R2_test={r2_test:.4f}"
    )
    return w, r2_train, r2_test


if __name__ == "__main__":
    print(f"Training on {N_PER_PROFILE} synthetic candidates per profile "
          f"(seed=42, noise_sigma={NOISE_SIGMA})\n")
    for profile, true_w in TRUE_WEIGHTS.items():
        train_profile(profile, true_w)
