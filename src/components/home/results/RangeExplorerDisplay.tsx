import React, { useState, useEffect, useMemo } from 'react';
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
  parseHeroStrategy,
  parseVillainStrategy,
  calculateConditionalRangeProbs, // Added import
} from '../../../utils/strategySequenceHelper';
import type { ParsedPlayerStrategy, ConditionalRangeProbsResult } from '../../../utils/strategySequenceHelper'; // Keep this for type info, Added ConditionalRangeProbsResult

interface RangeExplorerDisplayProps {
  maxStreetActions: number; // From GameState.maxActions
  initialHeroPriors: number[]; // e.g. [0.5, 0.5] for H1, H2
  initialVillainPriors: number[]; // e.g. [0.6, 0.4] for V1, V2
  heroStrategies: string[]; // Array of raw hero strategy strings "prob,label"
  villainStrategies: string[]; // Array of raw villain strategy strings "prob,label"
  selectedSequence: SelectedActionSequence; // Added prop
  // onSequenceChange is removed
  // TODO: Add other necessary props like parsed strategies, player range names etc.
}

// actionDisplayName is removed, it's in SequenceSelector.tsx

export const RangeExplorerDisplay: React.FC<RangeExplorerDisplayProps> = ({
  maxStreetActions,
  initialHeroPriors,
  initialVillainPriors,
  heroStrategies, // Will be used later for probability calcs
  villainStrategies, // Will be used later for probability calcs
  selectedSequence, // Use selectedSequence from props
}) => {
  // Local selectedSequence state is removed
  
  // fullActionHistory state and related logic are removed

  const [conditionalHeroProbs, setConditionalHeroProbs] = useState<number[]>(initialHeroPriors);
  const [conditionalVillainProbs, setConditionalVillainProbs] = useState<number[]>(initialVillainPriors);
  const [currentSequenceProbability, setCurrentSequenceProbability] = useState<number>(1.0);


  const parsedHeroStrategies: ParsedPlayerStrategy[] = useMemo(() => {
    try {
      return heroStrategies.map(s => parseHeroStrategy(s));
    } catch (e) {
      console.error("Error parsing hero strategies:", e);
      return [];
    }
  }, [heroStrategies]);

  const parsedVillainStrategies: ParsedPlayerStrategy[] = useMemo(() => {
    try {
      return villainStrategies.map(s => parseVillainStrategy(s));
    } catch (e) {
      console.error("Error parsing villain strategies:", e);
      return [];
    }
  }, [villainStrategies]);

  // playerToAct, currentPotState, availableActions are removed, managed by Home.tsx

  useEffect(() => {
    // onSequenceChange(selectedSequence) is removed; Home.tsx manages selectedSequence

    if (parsedHeroStrategies.length > 0 && parsedVillainStrategies.length > 0) {
      const results: ConditionalRangeProbsResult = calculateConditionalRangeProbs(
        selectedSequence, // Use selectedSequence from props
        parsedHeroStrategies,
        parsedVillainStrategies,
        initialHeroPriors,
        initialVillainPriors,
        maxStreetActions
      );
      setConditionalHeroProbs(results.heroProbs);
      setConditionalVillainProbs(results.villainProbs);
      setCurrentSequenceProbability(results.totalSequenceProb);
    } else if (selectedSequence.length === 0) {
      // Reset to priors if strategies aren't parsed yet (e.g. on initial load before strategies are available)
      // or if sequence is explicitly empty
      setConditionalHeroProbs(initialHeroPriors);
      setConditionalVillainProbs(initialVillainPriors);
      setCurrentSequenceProbability(1.0);
    }
    // fullActionHistory update logic is removed.

  }, [selectedSequence, maxStreetActions, initialHeroPriors, initialVillainPriors, parsedHeroStrategies, parsedVillainStrategies]); // Removed onSequenceChange from dependencies

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
      <Typography variant="caption" display="block" sx={{mt: 1, textAlign: 'center'}}>
          Sequence Probability: {currentSequenceProbability.toFixed(4)}
          {currentSequenceProbability === 0 && selectedSequence.length > 0 && " (Impossible Sequence)"}
      </Typography>
    </Paper>
  );
};