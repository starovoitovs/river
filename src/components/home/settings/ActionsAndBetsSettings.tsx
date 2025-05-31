import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, IconButton, Select, MenuItem } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import { SliderControl } from '../../common/SliderControl';
import { calculateBetAmounts } from '../uiLogicUtils';
import type { GameState } from '../../../types';

interface ActionsAndBetsSettingsProps {
  gameState: Pick<
    GameState,
    | 'maxActions'
    | 'heroBet'
    | 'villainBet'
    | 'villainRaise'
    | 'heroRaise'
    | 'hero3bet'
    | 'useLogUtility'
    | 'potSize' // Needed for calculateBetAmounts
  >;
  handleGameStateChange: <
    K extends keyof Pick<
      GameState,
      | 'maxActions'
      | 'heroBet'
      | 'villainBet'
      | 'villainRaise'
      | 'heroRaise'
      | 'hero3bet'
      | 'useLogUtility'
    >
  >(
    key: K,
    value: GameState[K]
  ) => void;
  expanded: string | false;
  handleAccordionChange: (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => void;
}

export const ActionsAndBetsSettings: React.FC<ActionsAndBetsSettingsProps> = ({
  gameState,
  handleGameStateChange,
  expanded,
  handleAccordionChange,
}) => {
  const navigate = useNavigate();
  const amounts = calculateBetAmounts(
    gameState.potSize,
    gameState.heroBet,
    gameState.villainBet,
    gameState.heroRaise,
    gameState.villainRaise,
    gameState.hero3bet
  );

  return (
    <Accordion
      expanded={expanded === 'bet-sizing'}
      onChange={handleAccordionChange('bet-sizing')}
      elevation={0}
      sx={{ '&.Mui-expanded::before': { opacity: '1 !important' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Actions and Bets
          </Typography>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              navigate('/help#actions-and-bets');
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
          label="Max Actions"
          value={gameState.maxActions}
          onChange={(value) => handleGameStateChange('maxActions', value)}
          min={2}
          max={4}
          step={1}
          valueFormat={(value) => `${value} actions`}
        />
        
        <Typography variant="body1" sx={{ mb: 1, mt: 2, fontWeight: 500 }}>
          First action
        </Typography>
        <SliderControl
          label="Hero Bet (pot %)"
          value={gameState.heroBet}
          onChange={(value) => handleGameStateChange('heroBet', value)}
          min={0.1}
          max={5}
          step={0.05}
          valueFormat={(value) => `${(value * 100).toFixed(0)}% (${amounts.heroBet} BB)`}
        />

        {gameState.maxActions >= 3 && (
          <>
            <Typography variant="body1" sx={{ mb: 1, mt: 2, fontWeight: 500 }}>
              Second action
            </Typography>
            <SliderControl
              label="Villain Bet (pot %)"
              value={gameState.villainBet}
              onChange={(value) => handleGameStateChange('villainBet', value)}
              min={0.1}
              max={5}
              step={0.05}
              valueFormat={(value) => `${(value * 100).toFixed(0)}% (${amounts.villainBet} BB)`}
            />
            <SliderControl
              label="Villain Raise (pot %)"
              value={gameState.villainRaise}
              onChange={(value) => handleGameStateChange('villainRaise', value)}
              min={0.1}
              max={5}
              step={0.05}
              valueFormat={(value) => `${(value * 100).toFixed(0)}% (${amounts.villainRaise} BB)`}
            />
          </>
        )}

        {gameState.maxActions === 4 && (
          <>
            <Typography variant="body1" sx={{ mb: 1, mt: 2, fontWeight: 500 }}>
              Third action
            </Typography>
            <SliderControl
              label="Hero Raise (pot %)"
              value={gameState.heroRaise}
              onChange={(value) => handleGameStateChange('heroRaise', value)}
              min={0.1}
              max={5}
              step={0.05}
              valueFormat={(value) => `${(value * 100).toFixed(0)}% (${amounts.heroRaise} BB)`}
            />
            <SliderControl
              label="Hero 3-Bet (pot %)"
              value={gameState.hero3bet}
              onChange={(value) => handleGameStateChange('hero3bet', value)}
              min={0.1}
              max={5}
              step={0.05}
              valueFormat={(value) => `${(value * 100).toFixed(0)}% (${amounts.hero3bet} BB)`}
            />
          </>
        )}

        <Box sx={{ mb: 1, mt: 3 }}>
          <Select
            size="small"
            label="Payoff"
            value={gameState.useLogUtility}
            onChange={(e) => handleGameStateChange('useLogUtility', e.target.value as GameState['useLogUtility'])}
            sx={{ minWidth: 120, fontSize: '0.875rem', '& legend span': { opacity: 1, visibility: 'visible', marginTop: '-5px', display: 'block' } }}
            fullWidth
            displayEmpty
            inputProps={{ 'aria-label': 'Payoff' }}
            // label="Payoff" // Label is usually handled by FormControl or InputLabel
          >
            <MenuItem value="linear">Linear</MenuItem>
            <MenuItem value="logarithmic">Logarithmic</MenuItem>
          </Select>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};