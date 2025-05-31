// Generate all possible strategy combinations
export const generateStrategies = (ranges: number, actions: string[]): [number, string][][] => {
  const result: [number, string][][] = [];

  // Calculate total number of combinations
  const totalCombinations = Math.pow(actions.length, ranges);

  // For each possible combination
  for (let i = 0; i < totalCombinations; i++) {
    const strategy: [number, string][] = [];
    let tempI = i;

    // Convert number to actions using division/modulo
    for (let range = 0; range < ranges; range++) {
      const actionIndex = tempI % actions.length;
      strategy.push([range, actions[actionIndex]]);
      tempI = Math.floor(tempI / actions.length);
    }

    result.push(strategy);
  }

  return result;
};