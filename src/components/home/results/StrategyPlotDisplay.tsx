import { Typography, Box, IconButton, ToggleButton, ToggleButtonGroup, Paper } from '@mui/material'; // Added ToggleButton, ToggleButtonGroup
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Plot from 'react-plotly.js';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react'; // Added useState, useMemo
import { ANNOTATION_THRESHOLD_EXPONENT, DRAWER_WIDTH } from '../homeConstants';
import { abbreviateAction } from '../uiLogicUtils'; // Import the new helper
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
  selectedActionSequence?: SelectedActionSequence; // New optional prop
}

export const StrategyPlotDisplay: React.FC<StrategyPlotDisplayProps> = ({
  playerType,
  strategyProbs,
  labels,
  onCopyStrategy,
  commonPlotLayout,
  windowInnerWidth,
  playerRangesString,
  playerActions,
  selectedActionSequence // Destructure new prop
}) => {
  const navigate = useNavigate();
  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number | null>(null);

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

  const numRanges = useMemo(() => {
    return playerRangesString.split(',').filter(r => r.trim() !== '').length;
  }, [playerRangesString]);

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

    if (selectedRangeIndex !== null && numRanges > 0) {
      const marginalData = calculateMarginalStrategyForDisplay( // Corrected function name
        strategiesToConsider,
        selectedRangeIndex,
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
  }, [allParsedPlayerStrategies, selectedActionSequence, selectedRangeIndex, playerType, playerActions, numRanges, calculateMarginalStrategyForDisplay]); // Added calculateMarginalStrategyForDisplay to dependencies


  const handleRangeToggle = (
    _: React.MouseEvent<HTMLElement>,
    newRangeIndex: number | null,
  ) => {
    setSelectedRangeIndex(newRangeIndex);
  };

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
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
          sx={{ mt: 1, mb: 3, display: 'flex', flexWrap: 'wrap' }}
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
          width: (windowInnerWidth - DRAWER_WIDTH - 200) / 3, // Adjusted for typical usage
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
    </Paper>
  );
};