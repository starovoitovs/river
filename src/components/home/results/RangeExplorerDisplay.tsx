import { Box, Typography, Paper } from '@mui/material'; // Removed ButtonBase
import Plot from 'react-plotly.js';
import type {
  SelectedActionSequence,
  // ActionStep, // No longer needed here
  // PokerAction, // No longer needed here
} from '../../../utils/strategySequenceHelper';
import {
  // getAvailablePokerActions, // No longer needed here
  // analyzeSequence, // No longer needed here
  // parseHeroStrategy, // No longer needed here
  // parseVillainStrategy, // No longer needed here
  // calculateConditionalRangeProbs, // No longer needed here
} from '../../../utils/strategySequenceHelper';
// import type { ParsedPlayerStrategy, ConditionalRangeProbsResult } from '../../../utils/strategySequenceHelper'; // No longer needed here

interface RangeExplorerDisplayProps {
  maxStreetActions: number; // From GameState.maxActions
  initialHeroPriors: number[]; // e.g. [0.5, 0.5] for H1, H2
  initialVillainPriors: number[]; // e.g. [0.6, 0.4] for V1, V2
  heroStrategies: string[]; // Array of raw hero strategy strings "prob,label" - still needed if parsing is done here for some reason, or for labels
  villainStrategies: string[]; // Array of raw villain strategy strings "prob,label" - same as above
  selectedSequence: SelectedActionSequence;
  conditionalHeroProbs: number[]; // New Prop
  conditionalVillainProbs: number[]; // New Prop
  overallSequenceProbability: number; // New Prop
}

// actionDisplayName is removed, it's in SequenceSelector.tsx

export const RangeExplorerDisplay: React.FC<RangeExplorerDisplayProps> = ({
  // maxStreetActions, // This prop might not be directly used anymore if not calculating probs here
  initialHeroPriors, // Still used for x-axis labels if conditionalProbs are empty
  initialVillainPriors, // Still used for x-axis labels if conditionalProbs are empty
  // heroStrategies, // Not directly used if not parsing here
  // villainStrategies, // Not directly used if not parsing here
  conditionalHeroProbs, // Use from props
  conditionalVillainProbs, // Use from props
}) => {
  // Local state for conditionalProbs and currentSequenceProbability is removed.
  // useEffect for calculating these is removed.
  // parsedHeroStrategies and parsedVillainStrategies memos are removed.
  
  // Click handlers (handleNextActionSelect, handleStartClick, handleHistoryActionClick) are removed.
  // actionBoxSx and actionTextSx are removed.

  return (
    <Paper elevation={0} sx={{ py: 2 }}>
      <Typography variant="h6" gutterBottom>Range Explorer</Typography>
      {/* Sequence selection Box (Start, History, Next Actions) is removed from here */}
      
      {/* Probability Plots Section */}
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'row', gap: 2 }}>
        <Box sx={{ width: '50%' }}>
          <Typography variant="subtitle2" align="center">Hero Ranges</Typography>
          <Plot
            data={[
              {
                x: initialHeroPriors.map((_, i) => `H${i + 1}`),
                y: conditionalHeroProbs,
                type: 'bar',
                text: conditionalHeroProbs.map(p => p.toFixed(3)),
                textposition: 'auto',
                marker: { color: '#070aac' },
              },
            ]}
            layout={{
              height: 200,
              margin: { t: 20, b: 30, l: 30, r: 10 },
              xaxis: { tickfont: { size: 10 } },
              yaxis: { range: [0, 1], tickfont: { size: 10 }, title: { text: 'Probability', font: {size: 10 } } },
            }}
            style={{ width: '100%', height: '200px' }}
            config={{ displayModeBar: false }}
          />
        </Box>
        <Box sx={{ width: '50%' }}>
          <Typography variant="subtitle2" align="center">Villain Ranges</Typography>
          <Plot
            data={[
              {
                x: initialVillainPriors.map((_, i) => `V${i + 1}`),
                y: conditionalVillainProbs,
                type: 'bar',
                text: conditionalVillainProbs.map(p => p.toFixed(3)),
                textposition: 'auto',
                marker: { color: '#c00707' },
              },
            ]}
            layout={{
              height: 200,
              margin: { t: 20, b: 30, l: 30, r: 10 },
              xaxis: { tickfont: { size: 10 } },
              yaxis: { range: [0, 1], tickfont: { size: 10 }, title: { text: 'Probability', font: {size: 10 } } },
            }}
            style={{ width: '100%', height: '200px' }}
            config={{ displayModeBar: false }}
          />
        </Box>
      </Box>
      {/* Typography for overallSequenceProbability removed from here */}
    </Paper>
  );
};