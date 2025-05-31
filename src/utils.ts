// Re-export types that might be used by consumers of this module
export type { GameState } from './types';
export { getHeroActions, getVillainActions } from './types'; // Still exported as Home.tsx might use them via utils

// Re-export main functions from the new modules
export { calculateMatrix } from './utils/matrixCalculator';
export { solveGame, type ParsedFixedStrategyItem } from './utils/gameSolver';
export { 
  calculateUtility,
  getActionPayoffs, // Exporting as it's a significant piece of logic
  calculateIndividualPayoffs // Exporting for the same reason
} from './utils/calculationHelpers';

// generateStrategies is currently used internally by matrixCalculator.
// If it needs to be a public utility, it can be exported from './utils/strategyUtils' here.
// export { generateStrategies } from './utils/strategyUtils';
