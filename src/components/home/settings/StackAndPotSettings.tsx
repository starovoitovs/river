import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import { SliderControl } from '../../common/SliderControl';
import type { GameState } from '../../../types';

interface StackAndPotSettingsProps {
  gameState: Pick<GameState, 'heroStack' | 'villainStack' | 'potSize'>;
  handleGameStateChange: <K extends keyof Pick<GameState, 'heroStack' | 'villainStack' | 'potSize'>>(
    key: K,
    value: GameState[K]
  ) => void;
  expanded: string | false;
  handleAccordionChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const StackAndPotSettings: React.FC<StackAndPotSettingsProps> = ({
  gameState,
  handleGameStateChange,
  expanded,
  handleAccordionChange,
}) => {
  const navigate = useNavigate();

  return (
    <Accordion
      expanded={expanded === 'stack-and-pot'}
      onChange={handleAccordionChange('stack-and-pot')}
      elevation={0}
      sx={{ '&.Mui-expanded::before': { opacity: '1 !important' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Stack and Pot
          </Typography>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              navigate('/help#stack-and-pot-settings');
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
          label="Hero Stack Size"
          value={gameState.heroStack}
          onChange={(value) => handleGameStateChange('heroStack', value)}
          min={50}
          max={200}
          step={5}
          valueFormat={(value) => `${value} BB`}
        />
        <SliderControl
          label="Villain Stack Size"
          value={gameState.villainStack}
          onChange={(value) => handleGameStateChange('villainStack', value)}
          min={50}
          max={200}
          step={5}
          valueFormat={(value) => `${value} BB`}
        />
        <SliderControl
          label="Initial Pot"
          value={gameState.potSize}
          onChange={(value) => handleGameStateChange('potSize', value)}
          min={5}
          max={200}
          step={5}
          valueFormat={(value) => `${value} BB`}
        />
      </AccordionDetails>
    </Accordion>
  );
};