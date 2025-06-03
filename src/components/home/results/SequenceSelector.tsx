import React from 'react';
import { Box, Typography, ButtonBase, Paper } from '@mui/material';
import type {
  SelectedActionSequence,
  ActionStep,
  PokerAction,
} from '../../../utils/strategySequenceHelper';

// Props for SequenceSelector
interface SequenceSelectorProps {
  selectedSequence: SelectedActionSequence;
  fullActionHistory: Array<{
    player: 'Hero' | 'Villain';
    chosenAction: PokerAction;
    allAvailableActions: PokerAction[];
    originalSequenceStep: ActionStep; 
  }>;
  availableActions: PokerAction[];
  playerToAct: 'Hero' | 'Villain';
  maxStreetActions: number;
  currentPotStateIsBettingClosed: boolean;
  overallSequenceProbability: number; // Added this prop
  
  handleStartClick: () => void;
  handleHistoryActionClick: (stepIndex: number, actionClicked: PokerAction) => void;
  handleNextActionSelect: (action: PokerAction) => void;
}

// Helper function (moved from RangeExplorerDisplay)
const actionDisplayName = (action: PokerAction): string => {
  const names: Record<PokerAction, string> = {
    ch: 'CHECK',
    be: 'BET',
    fo: 'FOLD',
    ca: 'CALL',
    ra: 'RAISE',
  };
  return names[action];
};

// Style objects (moved from RangeExplorerDisplay)
const actionBoxSx = {
  borderRight: 1,
  borderColor: 'grey.200',
  height: '105px',
  p: 0.5,
  minWidth: '100px',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 0,
};

const actionTextSx = (isChosen: boolean) => ({
  cursor: 'pointer',
  py: 0.25,
  px: 0.5,
  width: '100%',
  borderRadius: '4px',
  backgroundColor: isChosen ? 'rgba(7, 10, 172, 0.1)' : 'transparent',
  color: isChosen ? '#070aac' : 'text.primary',
  fontWeight: isChosen ? 'bold' : 'normal',
  '&:hover': {
    backgroundColor: isChosen ? 'rgba(7, 10, 172, 0.15)' : 'action.hover',
  },
  textAlign: 'left',
});

export const SequenceSelector: React.FC<SequenceSelectorProps> = ({
  selectedSequence,
  fullActionHistory,
  availableActions,
  playerToAct,
  maxStreetActions,
  currentPotStateIsBettingClosed,
  overallSequenceProbability, // Added this prop
  handleStartClick,
  handleHistoryActionClick,
  handleNextActionSelect,
}) => {
  return (
    <Box> {/* Wrap Paper and Typography in a Box for layout */}
      <Paper elevation={0} sx={{ display: 'flex', flexDirection: 'row', gap: 0, overflowX: 'auto', alignItems: 'flex-start', border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 /* Add margin bottom */ }}>
        {/* Start Box */}
        <Box
            sx={{
              ...actionBoxSx,
              alignItems: 'flex-start',
              cursor: 'pointer',
              minWidth: '60px',
          }}
          onClick={handleStartClick}
      >
          <Typography
              variant="subtitle2"
              sx={{
                  fontWeight: selectedSequence.length === 0 ? 'bold' : 'normal',
                  width: '100%', 
                  textAlign: 'center' 
              }}
          >
              START
          </Typography>
      </Box>

      {/* History Boxes */}
      {fullActionHistory.map((historyStep, index) => (
        <Box key={`history-${index}`} sx={actionBoxSx}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0, width: '100%', textAlign: 'left', px: 0.5 }}>
            {historyStep.player}
          </Typography>
          {historyStep.allAvailableActions.map(action => (
            <ButtonBase
              key={action}
              onClick={() => handleHistoryActionClick(index, action)}
              sx={{width: '100%'}}
            >
              <Typography variant="body2" sx={actionTextSx(action === historyStep.chosenAction)}>
                {actionDisplayName(action)}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      ))}

      {/* Next Actions Box */}
      {availableActions.length > 0 && selectedSequence.length < maxStreetActions && !currentPotStateIsBettingClosed && (
        <Box sx={{...actionBoxSx }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0, width: '100%', textAlign: 'left', px: 0.5 }}>
            {playerToAct}
          </Typography>
          {availableActions.map(action => (
             <ButtonBase
              key={action}
              onClick={() => handleNextActionSelect(action)}
              sx={{width: '100%'}}
            >
              <Typography variant="body2" sx={actionTextSx(false)}> {/* Not chosen yet */}
                {actionDisplayName(action)}
              </Typography>
            </ButtonBase>
          ))}
        </Box>
      )}
      </Paper>
      <Typography variant="caption" display="block" sx={{ textAlign: 'left', mb: 1.5 }}>
          Unconditional Action Sequence Probability: {overallSequenceProbability.toFixed(4)}
          {overallSequenceProbability === 0 && selectedSequence.length > 0 && " (Impossible Sequence)"}
      </Typography>
    </Box>
  );
};