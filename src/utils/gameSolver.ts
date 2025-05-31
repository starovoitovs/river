import { create, all } from 'mathjs';

const math = create(all);

export interface ParsedFixedStrategyItem {
  frequency: number;
  name: string; // Name of the strategy, for reference
  index: number; // Index in the strategy list (and thus matrix row/col)
}

export function solveGame(params: {
  heroMatrix: number[][],
  villainMatrix: number[][],
  iterations: number,
  learningRate: number,
  convergenceThreshold: number,
  heroFixedStrategies?: ParsedFixedStrategyItem[],
  villainFixedStrategies?: ParsedFixedStrategyItem[],
}): {
  row_strategy: number[],
  col_strategy: number[],
  heroUtility: number,
  villainUtility: number,
  convergenceHistory: {
    heroUtility: number,
    villainUtility: number,
    heroExploitability: number,
    villainExploitability: number,
    iteration: number
  }[],
  convergedAtIteration: number | null
} {
  const {
    heroMatrix,
    villainMatrix,
    iterations,
    learningRate,
    convergenceThreshold,
    heroFixedStrategies,
    villainFixedStrategies
  } = params;

  const rows = heroMatrix.length;
  const cols = heroMatrix[0].length;

  const isHeroFixed = heroFixedStrategies && heroFixedStrategies.length > 0;
  const isVillainFixed = villainFixedStrategies && villainFixedStrategies.length > 0;

  // Initialize average strategies and current strategies
  let row_avg_strategy = Array(rows).fill(0);
  let col_avg_strategy = Array(cols).fill(0);
  let row_current = Array(rows).fill(0);
  let col_current = Array(cols).fill(0);

  if (isHeroFixed) {
    const totalHeroFreq = heroFixedStrategies.reduce((sum, s) => sum + s.frequency, 0);
    heroFixedStrategies.forEach(s => {
      row_avg_strategy[s.index] = s.frequency / totalHeroFreq;
      row_current[s.index] = s.frequency / totalHeroFreq;
    });
  } else {
    row_avg_strategy = Array(rows).fill(1 / rows);
    row_current = Array(rows).fill(1 / rows);
  }

  if (isVillainFixed) {
    const totalVillainFreq = villainFixedStrategies.reduce((sum, s) => sum + s.frequency, 0);
    villainFixedStrategies.forEach(s => {
      col_avg_strategy[s.index] = s.frequency / totalVillainFreq;
      col_current[s.index] = s.frequency / totalVillainFreq;
    });
  } else {
    col_avg_strategy = Array(cols).fill(1 / cols);
    col_current = Array(cols).fill(1 / cols);
  }
  
  const learning_rate = learningRate;

  // Track convergence metrics during training
  const convergenceHistory: {
    heroUtility: number,
    villainUtility: number,
    heroExploitability: number,
    villainExploitability: number,
    iteration: number
  }[] = [];

  const effectiveConvergenceThreshold = convergenceThreshold; // Default 0.01
  let convergedAtIteration: number | null = null;

  // If both strategies are fixed, we don't iterate. We just calculate utilities.
  // The loop will run once to populate convergence history.
  const loopIterations = (isHeroFixed && isVillainFixed) ? 1 : iterations;

  for (let i = 0; i < loopIterations; i++) {
    let currentHeroUtility = 0;
    let currentVillainUtility = 0;
    let heroExploitability = 0;
    let villainExploitability = 0;

    // Calculate expected payoffs
    // For fixed strategies, payoffs are calculated against their fixed strategy,
    // but best response is still relevant for exploitability.
    let row_payoffs = Array(rows).fill(0).map((_, r) =>
      math.sum(heroMatrix[r].map((v, c) => v * col_avg_strategy[c]))
    );
    let col_payoffs = Array(cols).fill(0).map((_, c) =>
      math.sum(villainMatrix.map((row_val, r_idx) => row_val[c] * row_avg_strategy[r_idx]))
    );

    if (!isHeroFixed || !isVillainFixed) { // Perform updates only if at least one strategy is not fixed

      if (!isHeroFixed) {
        const max_row_payoff = Math.max(...row_payoffs);
        row_current = row_payoffs.map(p => Math.exp((p - max_row_payoff) / learning_rate));
        const row_sum = math.sum(row_current);
        row_current = row_current.map(v => v / row_sum);
        const weight = 2 / (i + 2);
        row_avg_strategy = row_avg_strategy.map((v, idx) =>
          v * (1 - weight) + row_current[idx] * weight
        );
      }

      if (!isVillainFixed) {
        const max_col_payoff = Math.max(...col_payoffs);
        col_current = col_payoffs.map(p => Math.exp((p - max_col_payoff) / learning_rate));
        const col_sum = math.sum(col_current);
        col_current = col_current.map(v => v / col_sum);
        const weight = 2 / (i + 2);
        col_avg_strategy = col_avg_strategy.map((v, idx) =>
          v * (1 - weight) + col_current[idx] * weight
        );
      }
      
      currentHeroUtility = math.sum(heroMatrix.map((row, r_idx) =>
        math.sum(row.map((v, c_idx) => v * row_avg_strategy[r_idx] * col_avg_strategy[c_idx]))
      ));
      currentVillainUtility = math.sum(villainMatrix.map((row, r_idx) =>
        math.sum(row.map((v, c_idx) => v * row_avg_strategy[r_idx] * col_avg_strategy[c_idx]))
      ));

      row_payoffs = Array(rows).fill(0).map((_, r) =>
        math.sum(heroMatrix[r].map((v, c) => v * col_avg_strategy[c]))
      );
      col_payoffs = Array(cols).fill(0).map((_, c) =>
        math.sum(villainMatrix.map((row_val, r_idx) => row_val[c] * row_avg_strategy[r_idx]))
      );
      
      // Calculate exploitability
      // If hero is fixed, their exploitability is how much villain could gain.
      // If villain is fixed, their exploitability is how much hero could gain.
      const bestHeroResponsePayoff = Math.max(...row_payoffs); // Max hero could get if villain plays col_avg_strategy
      const bestVillainResponsePayoff = Math.max(...col_payoffs); // Max villain could get if hero plays row_avg_strategy

      heroExploitability = bestHeroResponsePayoff - currentHeroUtility;
      villainExploitability = bestVillainResponsePayoff - currentVillainUtility;

    } else { // Both are fixed
      currentHeroUtility = math.sum(heroMatrix.map((row, r_idx) =>
        math.sum(row.map((v, c_idx) => v * row_avg_strategy[r_idx] * col_avg_strategy[c_idx]))
      ));
      currentVillainUtility = math.sum(villainMatrix.map((row, r_idx) =>
        math.sum(row.map((v, c_idx) => v * row_avg_strategy[r_idx] * col_avg_strategy[c_idx]))
      ));
      // Exploitability still makes sense as "what if one player could deviate"
       const row_payoffs_for_exploit = Array(rows).fill(0).map((_, r) =>
        math.sum(heroMatrix[r].map((v, c) => v * col_avg_strategy[c]))
      );
      const col_payoffs_for_exploit = Array(cols).fill(0).map((_, c) =>
        math.sum(villainMatrix.map((row_val, r_idx) => row_val[c] * row_avg_strategy[r_idx]))
      );
      heroExploitability = Math.max(...row_payoffs_for_exploit) - currentHeroUtility;
      villainExploitability = Math.max(...col_payoffs_for_exploit) - currentVillainUtility;
    }

    convergenceHistory.push({
      heroUtility: currentHeroUtility,
      villainUtility: currentVillainUtility,
      heroExploitability,
      villainExploitability,
      iteration: i
    });

    // Convergence Check
    if (!(isHeroFixed && isVillainFixed)) { // Only check convergence if not both are fixed
      let heroConverged = isHeroFixed ? true : heroExploitability < effectiveConvergenceThreshold;
      let villainConverged = isVillainFixed ? true : villainExploitability < effectiveConvergenceThreshold;

      if (isHeroFixed && !isVillainFixed) { // Only villain needs to converge
        if (villainConverged) {
          convergedAtIteration = i;
          break;
        }
      } else if (!isHeroFixed && isVillainFixed) { // Only hero needs to converge
        if (heroConverged) {
          convergedAtIteration = i;
          break;
        }
      } else if (!isHeroFixed && !isVillainFixed) { // Both need to converge
        if (heroConverged && villainConverged) {
          convergedAtIteration = i;
          break;
        }
      }
    } else if (i === 0) { // Both fixed, loop runs once
        convergedAtIteration = null; // Or 0, depending on interpretation. Null seems better.
    }
  }
  
  // Calculate utilities for both players
  const heroUtility = math.sum(heroMatrix.map((row, i) =>
    math.sum(row.map((v, j) => v * row_avg_strategy[i] * col_avg_strategy[j]))
  ));
  
  const villainUtility = math.sum(villainMatrix.map((row, i) =>
    math.sum(row.map((v, j) => v * row_avg_strategy[i] * col_avg_strategy[j]))
  ));
  
  return {
    row_strategy: row_avg_strategy,
    col_strategy: col_avg_strategy,
    heroUtility,
    villainUtility,
    convergenceHistory,
    convergedAtIteration
  };
}