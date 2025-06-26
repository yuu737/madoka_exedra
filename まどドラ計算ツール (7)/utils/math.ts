
// Numerical method for finding roots (e.g., for reverse calculation)
export const bisection = (
  func: (x: number) => number,
  min: number,
  max: number,
  tolerance: number = 1e-6, // Default tolerance
  maxIterations: number = 100
): number | null => {
  let low = min;
  let high = max;
  let fLow = func(low);
  let fHigh = func(high);

  // Check if min or max are already roots within tolerance
  if (Math.abs(fLow) < tolerance) return low;
  if (Math.abs(fHigh) < tolerance) return high;

  // If signs are the same and neither is a root, bisection won't work
  if (fLow * fHigh > 0) {
    console.warn(
      "Bisection: func(min) and func(max) must have opposite signs or one must be a root.",
      { minVal: low, maxVal: high, fMinVal: fLow, fMaxVal: fHigh }
    );
    return null;
  }

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const fMid = func(mid);

    if (Math.abs(fMid) < tolerance || (high - low) / 2 < tolerance) {
      return mid; // Solution found or interval small enough
    }

    // Adjust interval
    if (fLow * fMid < 0) { // Root is in [low, mid]
      high = mid;
      // fHigh = fMid; // Not strictly necessary to re-assign fHigh here
    } else { // Root is in [mid, high]
      low = mid;
      fLow = fMid; // Update fLow as our new 'low' value is 'mid'
    }
  }

  console.warn("Bisection: Failed to converge after max iterations.");
  return null; // Failed to converge
};
