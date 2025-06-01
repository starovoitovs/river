import { Typography, Box, IconButton, ToggleButton, ToggleButtonGroup } from '@mui/material'; // Added ToggleButton, ToggleButtonGroup
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Plot from 'react-plotly.js';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react'; // Added useState, useMemo
import { ANNOTATION_THRESHOLD_EXPONENT, DRAWER_WIDTH } from '../homeConstants';
import { abbreviateAction } from '../uiLogicUtils'; // Import the new helper

interface StrategyPlotDisplayProps {
  playerType: 'Hero' | 'Villain';
  strategyProbs: number[]; // Overall strategy probabilities
  labels: string[]; // Labels for overall strategy (pure strategies)
  onCopyStrategy: () => void;
  commonPlotLayout: any;
  windowInnerWidth: number;
  playerRangesString: string; // e.g., "0.5,0.5"
  playerActions: string[]; // e.g., ["check", "bet"]
}

export const StrategyPlotDisplay: React.FC<StrategyPlotDisplayProps> = ({
  playerType,
  strategyProbs,
  labels,
  onCopyStrategy,
  commonPlotLayout,
  windowInnerWidth,
  playerRangesString,
  playerActions
}) => {
  const navigate = useNavigate();
  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number | null>(null);

  const numRanges = useMemo(() => {
    return playerRangesString.split(',').filter(r => r.trim() !== '').length;
  }, [playerRangesString]);

  const calculateMarginalStrategy = (
    overallStrategyProbs: number[],
    pureStrategyLabels: string[],
    rangeIdx: number,
    playerChar: 'H' | 'V',
    actionsForPlayer: string[]
  ): { marginalProbs: number[], marginalLabels: string[] } => {
    const marginalActionProbs = new Map<string, number>();
    let totalProbForSelectedRangeActions = 0;

    pureStrategyLabels.forEach((label, i) => {
      const prob = overallStrategyProbs[i];
      if (prob === 0) return;

      const parts = label.split(',');
      const targetPart = parts.find(p => p.startsWith(`${playerChar}${rangeIdx + 1}:`));
      
      if (targetPart) {
        const action = targetPart.substring(targetPart.indexOf(':') + 1);
        marginalActionProbs.set(action, (marginalActionProbs.get(action) || 0) + prob);
        totalProbForSelectedRangeActions += prob;
      }
    });

    if (totalProbForSelectedRangeActions === 0) {
      // Fallback: if no strategies involve this range (should not happen if ranges are defined),
      // or if all probabilities are zero for strategies involving this range.
      // Show all possible actions for this range with 0 probability.
      return {
        marginalProbs: actionsForPlayer.map(() => 0),
        marginalLabels: actionsForPlayer.map(action => `${playerChar}${rangeIdx + 1}:${action}`)
      };
    }
    
    const finalMarginalProbs: number[] = [];
    const finalMarginalLabels: string[] = [];

    // Iterate through the original (full name) actions to maintain order and ensure all are represented
    actionsForPlayer.forEach(fullAction => {
      const shortAction = abbreviateAction(fullAction, playerType); // Abbreviate the full action name
      const prob = marginalActionProbs.get(shortAction) || 0; // Use abbreviated action to get probability
      
      finalMarginalProbs.push(prob / totalProbForSelectedRangeActions); // Normalize
      // For the label, we want to show the abbreviated action as that's what's in the pure strategy strings
      finalMarginalLabels.push(`${playerChar}${rangeIdx + 1}:${shortAction}`);
    });
    
    return { marginalProbs: finalMarginalProbs, marginalLabels: finalMarginalLabels };
  };


  const plotData = useMemo(() => {
    let currentProbs: number[];
    let currentLabels: string[];

    if (selectedRangeIndex !== null && numRanges > 0) {
      const marginalData = calculateMarginalStrategy(
        strategyProbs,
        labels,
        selectedRangeIndex,
        playerType === 'Hero' ? 'H' : 'V',
        playerActions
      );
      currentProbs = marginalData.marginalProbs;
      currentLabels = marginalData.marginalLabels;
    } else {
      currentProbs = strategyProbs;
      currentLabels = labels;
    }

    return currentProbs
      .map((prob, index) => ({ prob, label: currentLabels[index] }))
      .filter(item => item.prob > 10 ** -ANNOTATION_THRESHOLD_EXPONENT)
      .sort((a, b) => a.prob - b.prob); // Sort for consistent bar order
  }, [strategyProbs, labels, selectedRangeIndex, playerType, playerActions, numRanges]);

  const handleRangeToggle = (
    _: React.MouseEvent<HTMLElement>,
    newRangeIndex: number | null,
  ) => {
    setSelectedRangeIndex(newRangeIndex);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 500 }} gutterBottom>
          {playerType} Strategy {selectedRangeIndex !== null ? `(Range ${playerType[0]}${selectedRangeIndex + 1})` : '(Overall)'}
        </Typography>
        <Box>
          <IconButton
            onClick={onCopyStrategy} // TODO: This should copy the currently displayed strategy (overall or marginal)
            size="small"
            sx={{ ml: 0.5 }}
            title="Copy strategy to clipboard"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
          <IconButton
            onClick={() => navigate('/help#game-matrix-and-strategies')} // TODO: Update help link if needed
            size="small"
            title="Help"
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {numRanges > 0 && ( // Show toggle if there's at least one range
        <ToggleButtonGroup
          value={selectedRangeIndex}
          exclusive
          onChange={handleRangeToggle}
          aria-label={`${playerType} range selection`}
          size="small"
          sx={{ mb: 1, display: 'flex', flexWrap: 'wrap' }}
        >
          {Array.from({ length: numRanges }).map((_, index) => (
            <ToggleButton
              key={index}
              value={index}
              aria-label={`${playerType[0]}${index + 1}`}
              sx={{ flexGrow: 1, minWidth: '40px' }} // Ensure buttons can shrink but also have a min width
            >
              {`${playerType[0]}${index + 1}`}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
      
      <Plot
        data={[
          {
            x: plotData.map(item => item.prob),
            y: plotData.map(item => item.label),
            type: 'bar',
            orientation: 'h',
            text: plotData.map(item => item.prob.toFixed(ANNOTATION_THRESHOLD_EXPONENT)),
            hoverlabel: { bgcolor: 'white' },
            hovertemplate: '%{y}: %{x:.3f}<extra></extra>', // Show label in hover
            showlegend: false,
            textposition: 'auto',
            textfont: { size: 9 },
            marker: { color: playerType === 'Hero' ? '#070aac' : '#c00707' }
          }
        ]}
        layout={{
          ...commonPlotLayout,
          width: (windowInnerWidth - DRAWER_WIDTH - 100) / 3, // Adjusted for typical usage
          height: 300, // Or make height dynamic/prop
          xaxis: {
            automargin: true,
            tickfont: { size: 9 },
            side: 'bottom',
            fixedrange: true
          },
          yaxis: {
            automargin: true,
            tickfont: { size: 9 },
            side: 'left',
            fixedrange: true
          },
          margin: { t: 0, r: 0, b: 0, l: 0 } // Default, can be part of commonPlotLayout
        }}
        config={{ responsive: true }} // Ensure responsive is enabled
      />
    </Box>
  );
};