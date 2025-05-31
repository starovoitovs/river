import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, IconButton, TextField } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import type { GameState } from '../../../types';
import type { ErrorsState } from '../../../hooks/useHomeForm';

interface RangeSettingsProps {
  gameState: Pick<GameState, 'heroRanges' | 'villainRanges' | 'equities'>;
  errors: Pick<ErrorsState, 'heroRanges' | 'villainRanges' | 'equities'>;
  handleGameStateChange: <K extends keyof Pick<GameState, 'heroRanges' | 'villainRanges' | 'equities'>>(
    key: K,
    value: GameState[K]
  ) => void;
  resetError: (key: keyof Pick<ErrorsState, 'heroRanges' | 'villainRanges' | 'equities'>) => void;
  expanded: string | false;
  handleAccordionChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const RangeSettings: React.FC<RangeSettingsProps> = ({
  gameState,
  errors,
  handleGameStateChange,
  resetError,
  expanded,
  handleAccordionChange,
}) => {
  const navigate = useNavigate();

  return (
    <Accordion
      expanded={expanded === 'range-settings'}
      onChange={handleAccordionChange('range-settings')}
      elevation={0}
      sx={{ '&.Mui-expanded::before': { opacity: '1 !important' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Range Settings
          </Typography>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              navigate('/help#range-settings');
            }}
            size="small"
            sx={{ ml: 1 }}
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <TextField
          label="Hero Range Frequencies"
          value={gameState.heroRanges}
          onChange={(e) => {
            handleGameStateChange('heroRanges', e.target.value);
            resetError('heroRanges');
          }}
          fullWidth
          margin="dense"
          size="small"
          error={!!errors.heroRanges}
        />
        <TextField
          label="Villain Range Frequencies"
          value={gameState.villainRanges}
          onChange={(e) => {
            handleGameStateChange('villainRanges', e.target.value);
            resetError('villainRanges');
          }}
          fullWidth
          margin="dense"
          size="small"
          error={!!errors.villainRanges}
        />
        <TextField
          label="Hero Equities"
          value={gameState.equities}
          onChange={(e) => {
            handleGameStateChange('equities', e.target.value);
            resetError('equities');
          }}
          fullWidth
          margin="dense"
          size="small"
          multiline
          rows={3}
          error={!!errors.equities}
          sx={{
            '& textarea': {
              resize: 'vertical',
              overflow: 'auto !important', // Added !important to ensure overflow behaves as expected
            },
          }}
        />
      </AccordionDetails>
    </Accordion>
  );
};