import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import { SliderControl } from '../../common/SliderControl';
import type { GameState } from '../../../types';

interface SolverSettingsProps {
  gameState: Pick<GameState, 'iterations' | 'learningRate' | 'convergenceThreshold'>;
  handleGameStateChange: <
    K extends keyof Pick<GameState, 'iterations' | 'learningRate' | 'convergenceThreshold'>
  >(
    key: K,
    value: GameState[K]
  ) => void;
  expanded: string | false;
  handleAccordionChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const SolverSettings: React.FC<SolverSettingsProps> = ({
  gameState,
  handleGameStateChange,
  expanded,
  handleAccordionChange,
}) => {
  const navigate = useNavigate();

  return (
    <Accordion
      expanded={expanded === 'solver-settings'}
      onChange={handleAccordionChange('solver-settings')}
      elevation={0}
      sx={{ '&.Mui-expanded::before': { opacity: '1 !important' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Solver Settings
          </Typography>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              navigate('/help#solver-settings');
            }}
            size="small"
            sx={{ ml: 1 }}
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <SliderControl
          label="Number of Iterations"
          value={gameState.iterations}
          onChange={(value) => handleGameStateChange('iterations', value)}
          min={100}
          max={10000}
          step={100}
          valueFormat={(value) => `${value.toFixed(0)}`}
        />
        <SliderControl
          label="Learning Rate"
          value={gameState.learningRate}
          onChange={(value) => handleGameStateChange('learningRate', value)}
          min={0.001}
          max={0.1}
          step={0.001}
          valueFormat={(value) => value.toFixed(3)}
        />
        <SliderControl
          label="Convergence Threshold"
          value={gameState.convergenceThreshold}
          onChange={(value) => handleGameStateChange('convergenceThreshold', value)}
          min={0.001}
          max={0.1}
          step={0.001}
          valueFormat={(value) => value.toFixed(3)}
        />
      </AccordionDetails>
    </Accordion>
  );
};