import { Typography, Box, IconButton, Paper } from '@mui/material'; // Removed ToggleButton, ToggleButtonGroup
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Plot from 'react-plotly.js';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react'; // Removed useState
import { ANNOTATION_THRESHOLD_EXPONENT, DRAWER_WIDTH } from '../homeConstants';
import { abbreviateAction } from '../uiLogicUtils';
import type { SelectedActionSequence, ParsedPlayerStrategy, ParsedHeroRangeStrategy, ParsedVillainRangeStrategy } from '../../../utils/strategySequenceHelper';
import { parseHeroStrategy, parseVillainStrategy } from '../../../utils/strategySequenceHelper';


interface StrategyPlotDisplayProps {
  playerType: 'Hero' | 'Villain';
  strategyProbs: number[]; // Overall strategy probabilities
  labels: string[]; // Labels for overall strategy (pure strategies)
  onCopyStrategy: () => void;
  commonPlotLayout: any;
  windowInnerWidth: number;
  playerRangesString: string; // e.g., "0.5,0.5"
  playerActions: string[]; // e.g., ["check", "bet"]
  selectedActionSequence?: SelectedActionSequence;
  overallSequenceProbability?: number;
  // Updated props for global range conditioning from Home.tsx
  // These will tell the plot if a specific hero or villain sub-range is selected globally.
  externalHeroConditioningIndex?: number | null;
  externalVillainConditioningIndex?: number | null;
}

export const StrategyPlotDisplay: React.FC<StrategyPlotDisplayProps> = ({
  playerType,
  strategyProbs,
  labels,
  onCopyStrategy,
  commonPlotLayout,
  windowInnerWidth,
  playerActions,
  selectedActionSequence,
  overallSequenceProbability,
  externalHeroConditioningIndex,
  externalVillainConditioningIndex,
}) => {
  const navigate = useNavigate();
  // const [selectedRangeIndex, setSelectedRangeIndex] = useState<number | null>(null); // Removed

  const allParsedPlayerStrategies = useMemo((): ParsedPlayerStrategy[] => {
    const parseFn = playerType === 'Hero' ? parseHeroStrategy : parseVillainStrategy;
    try {
      return labels.map((label, index) => {
        const fullStrategyString = `${strategyProbs[index]},"${label}"`; // Construct full string "prob,label"
        return parseFn(fullStrategyString);
      });
    } catch (e) {
      console.error(`Error parsing ${playerType} strategies:`, e);
      return [];
    }
  }, [labels, strategyProbs, playerType]);

  // const numRanges = useMemo(() => { // numRanges might be derived from playerRangesString or passed directly
  //   return playerRangesString.split(',').filter(r => r.trim() !== '').length;
  // }, [playerRangesString]);

  // This function calculates marginal strategy for a *single given range index*
  // from a list of *already filtered and re-weighted* pure strategies.
  const calculateMarginalStrategyForDisplay = (
    filteredPureStrategies: ParsedPlayerStrategy[], // Input is now parsed and potentially filtered
    rangeIdx: number,
    playerChar: 'H' | 'V',
    actionsForPlayer: string[] // All possible actions for this player type (e.g. ["ch","be"] or ["ch-fo", "ch-ca"...])
  ): { marginalProbs: number[], marginalLabels: string[] } => {
    const marginalActionProbs = new Map<string, number>(); // Stores sum of probabilities for each action string (e.g. "ch-ca")
    let totalProbOfStrategiesInvolvingThisRange = 0;

    filteredPureStrategies.forEach((pureStrategy: ParsedPlayerStrategy) => {
      if (pureStrategy.probability === 0) return;

      const rangeSpecificStrategy = pureStrategy.ranges.find(
        (r: ParsedHeroRangeStrategy | ParsedVillainRangeStrategy) => r.rangeName === `${playerChar}${rangeIdx + 1}`
      );

      if (rangeSpecificStrategy) {
        let actionString: string;
        if (playerType === 'Hero') {
          actionString = (rangeSpecificStrategy as ParsedHeroRangeStrategy).actionSequence.join('-');
        } else { // Villain
          const villainRangePart = pureStrategy.rawLabel.split(',').find(p => p.startsWith(`${playerChar}${rangeIdx + 1}:`));
          if (villainRangePart) {
            actionString = villainRangePart.substring(villainRangePart.indexOf(':') + 1);
          } else {
            actionString = "error"; // Should not happen
          }
        }
        if (actionString !== "error") {
            marginalActionProbs.set(actionString, (marginalActionProbs.get(actionString) || 0) + pureStrategy.probability);
            totalProbOfStrategiesInvolvingThisRange += pureStrategy.probability;
        }
      }
    });
    
    if (totalProbOfStrategiesInvolvingThisRange === 0) {
      const abbreviatedActionsForPlayer = actionsForPlayer.map(act => abbreviateAction(act, playerType));
      return {
        marginalProbs: abbreviatedActionsForPlayer.map(() => 0),
        marginalLabels: abbreviatedActionsForPlayer.map(abbrevAct => `${playerChar}${rangeIdx + 1}:${abbrevAct}`)
      };
    }

    const finalMarginalProbs: number[] = [];
    const finalMarginalLabels: string[] = [];
    
    const uniqueActionsForRange = new Set<string>();
    filteredPureStrategies.forEach((ps: ParsedPlayerStrategy) => {
        const rs = ps.ranges.find((r: ParsedHeroRangeStrategy | ParsedVillainRangeStrategy) => r.rangeName === `${playerChar}${rangeIdx + 1}`);
        if (rs) {
            let actionStr: string;
            if (playerType === 'Hero') actionStr = (rs as ParsedHeroRangeStrategy).actionSequence.join('-');
            else {
                 const villainRangePart = ps.rawLabel.split(',').find(p => p.startsWith(`${playerChar}${rangeIdx + 1}:`));
                 actionStr = villainRangePart ? villainRangePart.substring(villainRangePart.indexOf(':') + 1) : "error";
            }
            if (actionStr !== "error") uniqueActionsForRange.add(actionStr);
        }
    });

    const sortedUniqueActions = Array.from(uniqueActionsForRange).sort();

    sortedUniqueActions.forEach(actionString => {
      const prob = marginalActionProbs.get(actionString) || 0;
      finalMarginalProbs.push(prob / totalProbOfStrategiesInvolvingThisRange); // Normalize
      finalMarginalLabels.push(`${playerChar}${rangeIdx + 1}:${actionString}`);
    });
    
    return { marginalProbs: finalMarginalProbs, marginalLabels: finalMarginalLabels };
  };


  const plotData = useMemo(() => {
    // If the overall sequence probability is 0 (or undefined), the plot should be empty.
    if (overallSequenceProbability !== undefined && overallSequenceProbability < 1e-9) { // Using a small epsilon for float comparison
      return [];
    }

    let strategiesToConsider: ParsedPlayerStrategy[] = [...allParsedPlayerStrategies];

    // 1. Filter by selectedActionSequence
    if (selectedActionSequence && selectedActionSequence.length > 0) {
      const playerSpecificActionsInSequence = selectedActionSequence.filter(step => step.player === playerType);

      if (playerSpecificActionsInSequence.length > 0) {
        strategiesToConsider = allParsedPlayerStrategies.filter((pureStrategy: ParsedPlayerStrategy) => {
          // A pure strategy is kept if AT LEAST ONE of its range strategies
          // for the current playerType is consistent with playerSpecificActionsInSequence.
          return pureStrategy.ranges.some((rangeStrat) => {
            let actionsOfRangeToMatch: string[]; // string[] because PokerAction is a string union

            if (playerType === 'Hero') {
              actionsOfRangeToMatch = (rangeStrat as ParsedHeroRangeStrategy).actionSequence;
              // Check consistency for Hero range
              if (playerSpecificActionsInSequence.length > actionsOfRangeToMatch.length) return false;
              for (let i = 0; i < playerSpecificActionsInSequence.length; i++) {
                if (actionsOfRangeToMatch[i] !== playerSpecificActionsInSequence[i].action) return false;
              }
              return true; // This Hero range is consistent
            } else { // PlayerType is Villain
              const villainRangeStrategy = rangeStrat as ParsedVillainRangeStrategy;
              const path1Actions = villainRangeStrategy.ifHeroChecks;
              const path2Actions = villainRangeStrategy.ifHeroBets;
              let path1Matches = true;
              let path2Matches = true;

              // Check consistency with ifHeroChecks path
              if (playerSpecificActionsInSequence.length > path1Actions.length) {
                path1Matches = false;
              } else {
                for (let i = 0; i < playerSpecificActionsInSequence.length; i++) {
                  if (path1Actions[i] !== playerSpecificActionsInSequence[i].action) {
                    path1Matches = false;
                    break;
                  }
                }
              }
              if (path1Matches) return true; // Consistent via ifHeroChecks path

              // Check consistency with ifHeroBets path
              if (playerSpecificActionsInSequence.length > path2Actions.length) {
                path2Matches = false;
              } else {
                for (let i = 0; i < playerSpecificActionsInSequence.length; i++) {
                  if (path2Actions[i] !== playerSpecificActionsInSequence[i].action) {
                    path2Matches = false;
                    break;
                  }
                }
              }
              if (path2Matches) return true; // Consistent via ifHeroBets path
              
              return false; // Neither path of this villain range matches
            }
          });
        });

        // Re-normalize probabilities of the kept strategies
        const totalProbFiltered = strategiesToConsider.reduce((sum: number, s: ParsedPlayerStrategy) => sum + s.probability, 0);
        if (totalProbFiltered > 0) {
          strategiesToConsider = strategiesToConsider.map((s: ParsedPlayerStrategy) => ({ ...s, probability: s.probability / totalProbFiltered }));
        } else {
          strategiesToConsider = [];
        }
      }
    }

    let currentProbs: number[];
    let currentLabels: string[];

    // Determine the active conditioning index for *this specific plot instance*
    let activeConditioningIndexForThisPlot: number | null = null;
    if (playerType === 'Hero' && externalHeroConditioningIndex !== null && externalHeroConditioningIndex !== undefined) {
      activeConditioningIndexForThisPlot = externalHeroConditioningIndex;
    } else if (playerType === 'Villain' && externalVillainConditioningIndex !== null && externalVillainConditioningIndex !== undefined) {
      activeConditioningIndexForThisPlot = externalVillainConditioningIndex;
    }

    if (activeConditioningIndexForThisPlot !== null) {
      const marginalData = calculateMarginalStrategyForDisplay(
        strategiesToConsider,
        activeConditioningIndexForThisPlot,
        playerType === 'Hero' ? 'H' : 'V',
        playerActions
      );
      currentProbs = marginalData.marginalProbs;
      currentLabels = marginalData.marginalLabels;
    } else {
      currentProbs = strategiesToConsider.map((s: ParsedPlayerStrategy) => s.probability);
      currentLabels = strategiesToConsider.map((s: ParsedPlayerStrategy) => s.rawLabel);
    }
    
    return currentProbs
      .map((prob, index) => ({ prob, label: currentLabels[index] }))
      .filter(item => item.prob > 10 ** -ANNOTATION_THRESHOLD_EXPONENT && item.label !== undefined)
      .sort((a, b) => a.prob - b.prob);
  }, [
    allParsedPlayerStrategies,
    selectedActionSequence,
    playerType,
    playerActions,
    calculateMarginalStrategyForDisplay,
    overallSequenceProbability,
    externalHeroConditioningIndex, // New dependency
    externalVillainConditioningIndex  // New dependency
  ]);

  const displayTitleRangeIndex: number | null =
    playerType === 'Hero' ?
      (externalHeroConditioningIndex !== null && externalHeroConditioningIndex !== undefined ? externalHeroConditioningIndex : null) :
    playerType === 'Villain' ?
      (externalVillainConditioningIndex !== null && externalVillainConditioningIndex !== undefined ? externalVillainConditioningIndex : null) :
    null;

  const conditions: string[] = [];
  if (displayTitleRangeIndex !== null) {
    conditions.push(`${playerType[0]}${displayTitleRangeIndex + 1}`);
  }
  if (selectedActionSequence && selectedActionSequence.length > 0) {
    const sequenceString = selectedActionSequence.map(step => step.action).join(' → ');
    conditions.push(`"${sequenceString}"`);
  }

  let subtitleText = "";
  if (conditions.length > 0) {
    subtitleText = `Conditional on ${conditions.join(' and ')}`;
  }
    
  return (
    <Paper elevation={0} sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box> {/* Title and Subtitle container */}
          <Typography variant="h6" sx={{ fontWeight: 500 }} gutterBottom={!subtitleText}>
            {playerType} Strategy
          </Typography>
          {subtitleText && (
            <Typography variant="caption" component="small" display="block" gutterBottom sx={{ fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: subtitleText }} />
          )}
        </Box>
        <Box>
          <IconButton
            onClick={onCopyStrategy}
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

      {/* Removed ToggleButtonGroup for range selection */}
      
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
          width: (windowInnerWidth - DRAWER_WIDTH - 200) / 2, // Adjusted for typical usage
          height: 160, // Or make height dynamic/prop
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
        }}
        config={{ responsive: true }} // Ensure responsive is enabled
      />
    </Paper>
  );
};