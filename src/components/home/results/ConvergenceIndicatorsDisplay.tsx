import { Typography, Box } from '@mui/material';
import type { GameState } from '../../../types'; // For gameState.iterations

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
}

export const ConvergenceIndicatorsDisplay: React.FC<ConvergenceIndicatorsDisplayProps> = ({
  solution,
  gameStateIterations,
  convergenceThreshold
}) => {
  const lastHistoryPoint = solution.convergenceHistory[solution.convergenceHistory.length - 1];
  const isConverged =
    lastHistoryPoint.heroExploitability < convergenceThreshold &&
    lastHistoryPoint.villainExploitability < convergenceThreshold;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Game value
          </Typography>
          <Typography variant="h6" component="div">
            (Hero: {solution.heroUtility.toFixed(2)}, Villain: {solution.villainUtility.toFixed(2)})
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
            Value Range (last 100 iterations)
          </Typography>
          <Typography variant="h6">
            {(Math.max(
              ...solution.convergenceHistory.slice(-100).map(h => Math.abs(h.heroUtility - h.villainUtility))
            ) || 0).toFixed(3)}
          </Typography>
        </Box>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {"Convergence Status (both exploitabilities < " + convergenceThreshold.toFixed(3) + ")"}
          </Typography>
          <Typography variant="h6" sx={{ color: isConverged ? 'success.main' : 'warning.main' }}>
            {isConverged
              ? `Converged (${solution.convergedAtIteration !== null ? solution.convergedAtIteration + 1 : gameStateIterations} iterations)`
              : 'Not Converged'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};