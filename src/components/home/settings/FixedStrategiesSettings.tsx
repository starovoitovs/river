import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, IconButton, TextField } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import type { GameState } from '../../../types';
import type { ErrorsState } from '../../../hooks/useHomeForm';

interface FixedStrategiesSettingsProps {
  gameState: Pick<GameState, 'heroFixedStrategyInput' | 'villainFixedStrategyInput'>;
  errors: Pick<ErrorsState, 'heroFixedStrategy' | 'villainFixedStrategy'>;
  handleGameStateChange: <K extends keyof Pick<GameState, 'heroFixedStrategyInput' | 'villainFixedStrategyInput'>>(
    key: K,
    value: GameState[K]
  ) => void;
  resetError: (key: keyof Pick<ErrorsState, 'heroFixedStrategy' | 'villainFixedStrategy'>) => void;
  expanded: string | false;
  handleAccordionChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const FixedStrategiesSettings: React.FC<FixedStrategiesSettingsProps> = ({
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
      expanded={expanded === 'fixed-strategies'}
      onChange={handleAccordionChange('fixed-strategies')}
      elevation={0}
      sx={{ '&.Mui-expanded::before': { opacity: '1 !important' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Fixed Strategies
          </Typography>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              navigate('/help#fixed-strategies');
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
          label="Hero Fixed Strategy (optional)"
          value={gameState.heroFixedStrategyInput}
          onChange={(e) => {
            handleGameStateChange('heroFixedStrategyInput', e.target.value);
            resetError('heroFixedStrategy');
          }}
          fullWidth
          margin="dense"
          size="small"
          multiline
          rows={7}
          error={!!errors.heroFixedStrategy}
          placeholder={`2,"H1:be,H2:ch"\n1,"H1:ch,H2:be"`}
          InputLabelProps={{ shrink: true }}
          sx={{
            '& textarea': {
              resize: 'vertical',
              overflow: 'auto !important',
            },
          }}
        />
        <TextField
          label="Villain Fixed Strategy (optional)"
          value={gameState.villainFixedStrategyInput}
          onChange={(e) => {
            handleGameStateChange('villainFixedStrategyInput', e.target.value);
            resetError('villainFixedStrategy');
          }}
          fullWidth
          margin="dense"
          size="small"
          multiline
          rows={7}
          error={!!errors.villainFixedStrategy}
          placeholder={`3,"V1:be/ca,V2:ch/fo"\n1,"V1:ch/fo,V2:be/ca"`}
          InputLabelProps={{ shrink: true }}
          sx={{
            '& textarea': {
              resize: 'vertical',
              overflow: 'auto !important',
            },
          }}
        />
      </AccordionDetails>
    </Accordion>
  );
};