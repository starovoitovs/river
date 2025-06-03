import { Typography, Box } from '@mui/material';
import type { GameState } from '../../../types'; // For gameState.iterations
import type { MatrixCalculationResult } from '../../../hooks/useGameCalculation'; // For matrix data types

interface ConvergenceIndicatorsDisplayProps {
  solution: { // Assuming solution is not null when this component is rendered
    convergenceHistory: {
      heroExploitability: number;
      villainExploitability: number;
      heroUtility: number;
      villainUtility: number;
    }[];
    convergedAtIteration: number | null;
    heroUtility: number;
    villainUtility: number;
  };
  gameStateIterations: GameState['iterations']; // Pass only the necessary part of gameState
  convergenceThreshold: GameState['convergenceThreshold'];
  heroRangeProbs: MatrixCalculationResult['heroRangeProbs']; // New prop
  villainRangeProbs: MatrixCalculationResult['villainRangeProbs']; // New prop
  equityMatrix: MatrixCalculationResult['equityMatrix']; // New prop
}

export const ConvergenceIndicatorsDisplay: React.FC<ConvergenceIndicatorsDisplayProps> = ({
  solution,
  gameStateIterations,
  convergenceThreshold,
  heroRangeProbs,
  villainRangeProbs,
  equityMatrix
}) => {
  const lastHistoryPoint = solution.convergenceHistory[solution.convergenceHistory.length - 1];
  const isConverged = solution.convergedAtIteration !== null;

  // Calculate Hero Equity (weighted sum of equities)
  let heroEquity = 0;
  if (heroRangeProbs.length > 0 && villainRangeProbs.length > 0 && equityMatrix.length > 0) {
    for (let hIdx = 0; hIdx < heroRangeProbs.length; hIdx++) {
      for (let vIdx = 0; vIdx < villainRangeProbs.length; vIdx++) {
        const jointProb = heroRangeProbs[hIdx] * villainRangeProbs[vIdx];
        const equity = equityMatrix[hIdx][vIdx];
        heroEquity += jointProb * equity;
      }
    }
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Game Value
          </Typography>
          <Typography variant="h6" component="div">
            Hero: {solution.heroUtility.toFixed(2)}, Villain: {solution.villainUtility.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Hero Equity
          </Typography>
          <Typography variant="h6">
            {(heroEquity * 100).toFixed(2)}% {/* Display as percentage */}
          </Typography>
        </Box>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Exploitability
          </Typography>
          <Typography variant="h6" component="div">
            Hero: {lastHistoryPoint.heroExploitability.toFixed(3)},
            Villain: {lastHistoryPoint.villainExploitability.toFixed(3)}
          </Typography>
        </Box>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {"Convergence Status (explt. < " + convergenceThreshold.toFixed(3) + ")"}
          </Typography>
          <Typography variant="h6" sx={{ color: isConverged ? 'success.main' : 'warning.main' }}>
            {isConverged
              ? `Converged (${solution.convergedAtIteration !== null ? solution.convergedAtIteration + 1 : gameStateIterations}it)`
              : 'Not Converged'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};