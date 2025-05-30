  import { useState } from 'react';
import { Slider, Typography, Box, Drawer, Select, MenuItem, Toolbar, IconButton, TextField, Button, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Plot from 'react-plotly.js';
import { calculateMatrix, solveGame } from '../utils';
import { getHeroActions, getVillainActions } from '../types';
import type { GameState } from '../types';

const DRAWER_WIDTH = 280;
const ANNOTATION_THRESHOLD = 0.001; // Threshold for probabilities in mixed strategies so that we display asterisk
const EXPLOITABILITY_THRESHOLD = 0.01;

export default function Home() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>({
    useLogUtility: 'linear',
    maxActions: 4,
    heroStack: 100,
    villainStack: 100,
    potSize: 20,
    heroBet: 1.0,
    heroRaise: 1.0,
    hero3bet: 1.0,
    villainBet: 1.0,
    villainRaise: 1.0,
    heroRanges: '45, 55',
    villainRanges: '55, 45',
    equities: '53, 100\n0, 53',
    iterations: 2500,
    learningRate: 0.01
  });

  const [matrix, setMatrix] = useState<{
    heroMatrix: number[][];
    villainMatrix: number[][];
  }>({ heroMatrix: [], villainMatrix: [] });
  
  const [solution, setSolution] = useState<{
    row_strategy: number[];
    col_strategy: number[];
    heroUtility: number;
    villainUtility: number;
    convergenceHistory: {
      heroUtility: number;
      villainUtility: number;
      heroExploitability: number;
      villainExploitability: number;
      iteration: number;
    }[];
    convergedAtIteration: number | null;
  } | null>(null);

  const [expanded, setExpanded] = useState<string | false>(false);

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const [errors, setErrors] = useState<{
    heroRanges: string;
    villainRanges: string;
    equities: string;
  }>({
    heroRanges: "",
    villainRanges: "",
    equities: ""
  });

  const validateRanges = (probStr: string): [boolean, string] => {
    try {
      const probs = probStr.split(',').map(s => Number(s.trim()));
      if (probs.some(isNaN) || probs.some(p => p < 0)) {
        return [false, "All values must be non-negative numbers"];
      }
      const sum = probs.reduce((a, b) => a + b, 0);
      const tolerance = 0.001;
      if (Math.abs(sum - 100.0) > tolerance) {
        return [false, `Values must sum to 100 (current sum: ${sum.toFixed(1)})`];
      }
      return [true, ""];
    } catch {
      return [false, "Invalid input format"];
    }
  };

  const validateEquitiesMatrix = (equitiesStr: string, heroRanges: string, villainRanges: string): [boolean, string] => {
    const heroCount = heroRanges.split(',').length;
    const villainCount = villainRanges.split(',').length;
    
    const rows = equitiesStr.trim().split('\n');
    if (rows.length !== heroCount) {
      return [false, `Matrix must have ${heroCount} rows`];
    }

    for (const row of rows) {
      const values = row.split(',').map(s => Number(s.trim()));
      if (values.length !== villainCount) {
        return [false, `Each row must have ${villainCount} values`];
      }
      if (values.some(isNaN)) {
        return [false, "All values must be numbers"];
      }
      if (values.some(v => v < 0 || v > 100)) {
        return [false, "Values must be between 0 and 100 (e.g., 70 means hero wins 70% of the time)"];
      }
    }

    return [true, ""];
  };

  const handleCalculate = () => {
    const newErrors = {
      heroRanges: validateRanges(gameState.heroRanges)[1],
      villainRanges: validateRanges(gameState.villainRanges)[1],
      equities: validateEquitiesMatrix(gameState.equities, gameState.heroRanges, gameState.villainRanges)[1]
    };

    setErrors(newErrors);

    // Only calculate if there are no errors
    const [heroValid] = validateRanges(gameState.heroRanges);
    const [villainValid] = validateRanges(gameState.villainRanges);

    if (heroValid && villainValid && !newErrors.equities) {
      const newMatrix = calculateMatrix(gameState);
      setMatrix(newMatrix);
      setSolution(solveGame({
        ...newMatrix,
        iterations: gameState.iterations,
        learningRate: gameState.learningRate,
        convergenceThreshold: EXPLOITABILITY_THRESHOLD
      }));
    }
  };

  const calculateBetAmounts = () => {
    const initialPot = gameState.potSize;
    
    // Hero bet - direct pot fraction
    const heroBetSize = initialPot * gameState.heroBet;
    
    // Villain bet - direct pot fraction
    const villainBetSize = initialPot * gameState.villainBet;
    
    // Hero raise after villain bet
    // First call villain's bet, then add raise based on new pot
    const potAfterVillainBet = initialPot + 2 * villainBetSize;
    const heroRaiseSize = villainBetSize + (potAfterVillainBet * gameState.heroRaise);
    
    // Villain raise after hero bet
    // First call hero's bet, then add raise based on new pot
    const potAfterHeroBet = initialPot + 2 * heroBetSize;
    const villainRaiseSize = heroBetSize + (potAfterHeroBet * gameState.villainRaise);
    
    // Hero 3bet - first call villain's raise, then add raise based on new pot
    const potAfterVillainRaise = potAfterHeroBet + 2 * (villainRaiseSize - heroBetSize);
    const hero3betSize = villainRaiseSize + (potAfterVillainRaise * gameState.hero3bet);

    return {
      heroBet: Math.round(heroBetSize),
      villainBet: Math.round(villainBetSize),
      heroRaise: Math.round(heroRaiseSize),
      villainRaise: Math.round(villainRaiseSize),
      hero3bet: Math.round(hero3betSize)
    };
  };

  const amounts = calculateBetAmounts();

  const createSlider = (
    label: string,
    key: keyof Omit<GameState, 'useLogUtility' | 'heroRanges' | 'villainRanges' | 'equities'>,
    min: number,
    max: number,
    step: number = 0.1,
    valueFormat: (value: number) => string = (value) => value.toFixed(2)
  ) => (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {valueFormat(gameState[key])}
        </Typography>
      </Box>
      <Slider
        value={gameState[key] as number}
        onChange={(_, value) =>
          setGameState(prev => ({ ...prev, [key]: value }))
        }
        min={min}
        max={max}
        step={step}
        valueLabelDisplay="auto"
        size="small"
      />
    </Box>
  );

  // Generate row and column labels
  const generateStrategyLabels = () => {
    const heroRanges = gameState.heroRanges.split(',').length;
    const villainRanges = gameState.villainRanges.split(',').length;
    
    const heroActions = getHeroActions(gameState.maxActions);
    const villainActions = getVillainActions(gameState.maxActions);
    
    // Generate hero labels (e.g., "H1:cf,H2:bc")
    const heroLabels: string[] = [];
    for (let i = 0; i < Math.pow(heroActions.length, heroRanges); i++) {
      let strategy = [];
      let temp = i;
      for (let r = 0; r < heroRanges; r++) {
        const action = heroActions[temp % heroActions.length];
        // Abbreviate actions
        const shortAction = action
          .split('-')
          .map((part: string) => part[0] + (part[1] || ''))
          .join('-');
        strategy.push(`H${r+1}:${shortAction}`);
        temp = Math.floor(temp / heroActions.length);
      }
      heroLabels.push(strategy.join(','));
    }

    // Generate villain labels with abbreviated actions
    const villainLabels: string[] = [];
    for (let i = 0; i < Math.pow(villainActions.length, villainRanges); i++) {
      let strategy = [];
      let temp = i;
      for (let r = 0; r < villainRanges; r++) {
        const fullAction = villainActions[temp % villainActions.length];
        // Split into base action and response
        const [baseAction, response] = fullAction.split('/');
        
        // Abbreviate base action
        const shortBaseAction = baseAction
          .replace('check-fold', 'ch-fo')
          .replace('check-call', 'ch-ca')
          .replace('check-raise', 'ch-3b')
          .replace('bet-fold', 'be-fo')
          .replace('bet-call', 'be-ca')
          .replace('bet-3bet', 'be-3b')
          .replace('raise-fold', 'ra-fo')
          .replace('raise-call', 'ra-ca')
          .replace('check', 'ch')
          .replace('bet', 'be')
          .replace('raise', 'ra')
          .replace('fold', 'fo')
          .replace('call', 'ca');

        // Abbreviate response
        const shortResponse = (response || '')
          .replace('check-fold', 'ch-fo')
          .replace('check-call', 'ch-ca')
          .replace('check-raise', 'ch-3b')
          .replace('bet-fold', 'be-fo')
          .replace('bet-call', 'be-ca')
          .replace('bet-3bet', 'be-3b')
          .replace('raise-fold', 'ra-fo')
          .replace('raise-call', 'ra-ca')
          .replace('check', 'ch')
          .replace('bet', 'be')
          .replace('raise', 'ra')
          .replace('fold', 'fo')
          .replace('call', 'ca');

        // Combine with slash
        const shortAction = shortBaseAction + (response ? '/' + shortResponse : '');
        strategy.push(`V${r+1}:${shortAction}`);
        temp = Math.floor(temp / villainActions.length);
      }
      villainLabels.push(strategy.join(','));
    }

    return { heroLabels, villainLabels };
  };

  const { heroLabels, villainLabels } = generateStrategyLabels();

  const formatMatrixForDisplay = (heroMatrix: number[][], villainMatrix: number[][]) => {
    return heroMatrix.slice().reverse().map((row, i) =>
      row.map((heroVal, j) => ({
        hero: heroVal,
        villain: villainMatrix[heroMatrix.length - 1 - i][j]
      }))
    );
  };

  const reversedMatrix = formatMatrixForDisplay(matrix.heroMatrix, matrix.villainMatrix);

  // Common layout settings for all plots
  const commonPlotLayout = {
    font: {
      size: 10
    },
    margin: { t: 30, r: 60, b: 200, l: 120 } // increased margins for all plots
  };
  
  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            paddingBottom: '80px', // Account for fixed AppBar height
          },
        }}
      >
        <Toolbar variant="dense"/> {/* Add spacing for fixed AppBar */}
        <Box sx={{ overflowX: 'hidden', height: '100%' }}>

          <Accordion expanded={expanded === 'stack-and-pot'} onChange={handleAccordionChange('stack-and-pot')} elevation={0} sx={{ '&.Mui-expanded::before': { opacity: '1 !important'}}}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{fontWeight: 500}}>Stack and Pot</Typography>
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
              {createSlider('Hero Stack Size', 'heroStack', 50, 200, 5,
                value => `${value} BB`)}
              {createSlider('Villain Stack Size', 'villainStack', 50, 200, 5,
                value => `${value} BB`)}
              {createSlider('Initial Pot', 'potSize', 5, 200, 5,
                value => `${value} BB`)}
            </AccordionDetails>
          </Accordion>

          <Accordion expanded={expanded === 'range-settings'} onChange={handleAccordionChange('range-settings')} elevation={0} sx={{ '&.Mui-expanded::before': { opacity: '1 !important'}}}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{fontWeight: 500}}>Range Settings</Typography>
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
                label="Hero Range Probabilities"
                value={gameState.heroRanges}
                onChange={(e) => {
                  setGameState(prev => ({ ...prev, heroRanges: e.target.value }));
                  setErrors(prev => ({ ...prev, heroRanges: "" }));
                }}
                fullWidth
                margin="dense"
                size="small"
                error={!!errors.heroRanges}
              />
              <TextField
                label="Villain Range Probabilities"
                value={gameState.villainRanges}
                onChange={(e) => {
                  setGameState(prev => ({ ...prev, villainRanges: e.target.value }));
                  setErrors(prev => ({ ...prev, villainRanges: "" }));
                }}
                fullWidth
                margin="dense"
                size="small"
                error={!!errors.villainRanges}
              />
              <TextField
                label="Hero Equities"
                value={gameState.equities}
                onChange={(e) => setGameState(prev => ({ ...prev, equities: e.target.value }))}
                fullWidth
                margin="dense"
                size="small"
                multiline
                rows={3}
                error={!!errors.equities}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion expanded={expanded === 'bet-sizing'} onChange={handleAccordionChange('bet-sizing')} elevation={0} sx={{ '&.Mui-expanded::before': { opacity: '1 !important'}}}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{fontWeight: 500}}>Actions and Bets</Typography>
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
              {createSlider('Max Actions', 'maxActions', 2, 4, 1,
                value => `${value} actions`)}
                
              {/* Always show hero bet */}
              <Typography variant="body1" sx={{ mb: 1, mt: 2, fontWeight: 500 }}>First action</Typography>
              {createSlider('Hero Bet (pot %)', 'heroBet', 0.1, 5, 0.1,
                value => `${(value * 100).toFixed(0)}% (${amounts.heroBet} BB)`)}

              {/* Show hero raise and villain bet/raise for maxActions >= 3 */}
              {gameState.maxActions >= 3 && (
                <>
                  <Typography variant="body1" sx={{ mb: 1, mt: 2, fontWeight: 500 }}>Second action</Typography>
                  {createSlider('Villain Bet (pot %)', 'villainBet', 0.1, 5, 0.1,
                    value => `${(value * 100).toFixed(0)}% (${amounts.villainBet} BB)`)}
                  {createSlider('Villain Raise (pot %)', 'villainRaise', 0.1, 5, 0.1,
                    value => `${(value * 100).toFixed(0)}% (${amounts.villainRaise} BB)`)}
                </>
              )}

              {/* Show hero 3-bet for maxActions = 4 */}
              {gameState.maxActions === 4 && (
                <>
                  <Typography variant="body1" sx={{ mb: 1, mt: 2, fontWeight: 500 }}>Third action</Typography>
                  {createSlider('Hero Raise (pot %)', 'heroRaise', 0.1, 5, 0.1,
                    value => `${(value * 100).toFixed(0)}% (${amounts.heroRaise} BB)`)}
                  {createSlider('Hero 3-Bet (pot %)', 'hero3bet', 0.1, 5, 0.1,
                    value => `${(value * 100).toFixed(0)}% (${amounts.hero3bet} BB)`)}
                </>
              )}

              <Box sx={{ mb: 1, mt: 3 }}>
                <Select
                  size="small"
                  value={gameState.useLogUtility}
                  onChange={(e) => setGameState(prev => ({ ...prev, useLogUtility: e.target.value }))}
                  sx={{ minWidth: 120, fontSize: '0.875rem', '& legend span': {opacity: 1, visibility: 'visible', marginTop: '-5px', display: 'block' } }}
                  fullWidth
                  displayEmpty
                  inputProps={{ 'aria-label': 'Payoff' }}
                  label="Payoff"
                >
                  <MenuItem value="linear">Linear</MenuItem>
                  <MenuItem value="logarithmic">Logarithmic</MenuItem>
                </Select>
              </Box>  </AccordionDetails>
          </Accordion>

          <Accordion expanded={expanded === 'solver-settings'} onChange={handleAccordionChange('solver-settings')} elevation={0} sx={{ '&.Mui-expanded::before': { opacity: '1 !important'}}}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{fontWeight: 500}}>Solver Settings</Typography>
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
              {createSlider('Number of Iterations', 'iterations', 100, 10000, 100,
                value => `${value.toFixed(0)}`)}
              {createSlider('Learning Rate', 'learningRate', 0.01, 0.1, 0.01,
                value => value.toFixed(2))}
            </AccordionDetails>
          </Accordion>

        </Box>

        {/* Fixed Calculate Button */}
        <Box sx={{
          position: 'fixed',
          bottom: 0,
          width: `${DRAWER_WIDTH}px`,
          padding: 2,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderRight: 1,
          borderColor: 'divider'
        }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleCalculate}
          >
            Calculate
          </Button>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 2 }}>

        {solution && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <Box>
              <Typography variant="h6" sx={{fontWeight: 500}} gutterBottom>Hero Strategy
              <IconButton
                onClick={() => navigate('/help#game-matrix-and-strategies')}
                size="small"
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
              </Typography>
              
              <Plot
              data={[
                {
                x: solution.row_strategy
                  .filter(v => v > ANNOTATION_THRESHOLD)
                  .sort((a, b) => a - b),
                y: heroLabels
                  .map((label, i) => ({ label, value: solution.row_strategy[i] }))
                  .filter(item => item.value > ANNOTATION_THRESHOLD)
                  .sort((a, b) => a.value - b.value)
                  .map(item => item.label),
                type: 'bar',
                orientation: 'h',
                text: solution.row_strategy
                  .filter(v => v > ANNOTATION_THRESHOLD)
                  .sort((a, b) => a - b)
                  .map(v => v.toFixed(3)),
                hoverlabel: { bgcolor: 'white' },
                hovertemplate: '%{x:.3f}<extra></extra>',
                showlegend: false,
                textposition: 'auto',
                textfont: { size: 9 },
                marker: { color: '#070aac' }
                }
              ]}
              layout={{
                ...commonPlotLayout,
                width: (window.innerWidth - DRAWER_WIDTH - 100) / 2,
                height: 300,
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
                margin: { t: 30, r: 60, b: 50, l: 200 }
              }}
              />
            </Box>
    
    
            <Box>
              <Typography variant="h6" sx={{fontWeight: 500}} gutterBottom>
              Villain Strategy
              <IconButton
                onClick={() => navigate('/help#game-matrix-and-strategies')}
                size="small"
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
              </Typography>
              <Plot
              data={[
                {
                x: solution.col_strategy
                  .filter(v => v > ANNOTATION_THRESHOLD)
                  .sort((a, b) => a - b),
                y: villainLabels
                  .map((label, i) => ({ label, value: solution.col_strategy[i] }))
                  .filter(item => item.value > ANNOTATION_THRESHOLD)
                  .sort((a, b) => a.value - b.value)
                  .map(item => item.label),
                type: 'bar',
                orientation: 'h',
                text: solution.col_strategy
                  .filter(v => v > ANNOTATION_THRESHOLD)
                  .sort((a, b) => a - b)
                  .map(v => v.toFixed(3)),
                hoverlabel: { bgcolor: 'white' },
                hovertemplate: '%{x:.3f}<extra></extra>',
                showlegend: false,
                textposition: 'auto',
                textfont: { size: 9 },
                marker: { color: '#070aac' }
                }
              ]}
              layout={{
                ...commonPlotLayout,
                width: (window.innerWidth - DRAWER_WIDTH - 100) / 2,
                height: 300,
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
                margin: { t: 30, r: 60, b: 50, l: 200 }
              }}
              />
            </Box>
          </Box>
        )}

        <Box>
          {solution && (
            <Typography variant="h6" sx={{ fontWeight: 500 }} gutterBottom>
              Game Matrix (Hero: {solution.heroUtility.toFixed(2)}, Villain: {solution.villainUtility.toFixed(2)})
              <IconButton
          onClick={() => navigate('/help#game-matrix-and-strategies')}
          size="small"
              >
          <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Typography>
          )}

          <Plot
            data={[
              {
                z: reversedMatrix.map(row => row.map(vals => vals.hero)), // Color based on hero values
                x: villainLabels,
                y: [...heroLabels].reverse(),
                type: 'heatmap' as const,
                colorscale: 'RdBu',
                hoverongaps: false,
                showscale: true,
                customdata: reversedMatrix.map(row => row.map(vals => vals.villain)),
                hovertemplate: `
                  Values (Hero, Villain): (%{z:.1f}, %{customdata:.1f})<br>
                  Strategy:<br>
                  Hero: %{y}<br>
                  Villain: %{x}
                  <extra></extra>
                `,
              }
            ]}
            layout={{
              ...commonPlotLayout,
              font: { ...commonPlotLayout.font, size: 10 },
              width: window.innerWidth - DRAWER_WIDTH - 80,
              height: 600, // increased height for more space
              xaxis: {
                tickangle: -90,
                automargin: true,
                tickfont: { size: 7 }, // Smaller font
                tickvals: Array.from({length: villainLabels.length}, (_, i) => i),
                ticktext: villainLabels.map((label, i) =>
                  (solution && solution!.col_strategy[i] > ANNOTATION_THRESHOLD ? '* ' : '') + label
                ),
                side: 'bottom'
              },
              yaxis: {
                tickangle: 0,
                automargin: true,
                tickfont: { size: 7 },
                tickvals: Array.from({length: heroLabels.length}, (_, i) => i),
                ticktext: [...heroLabels].reverse().map((label, i) =>
                  (solution && solution!.row_strategy[heroLabels.length - 1 - i] > ANNOTATION_THRESHOLD ? '* ' : '') + label
                ),
              },
              margin: commonPlotLayout.margin,
            }}
          />
        </Box>

        {/* Convergence Analysis Section */}
        {solution && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>Convergence Analysis</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }} gutterBottom>
                  Player Values Over Time
                </Typography>
                <Plot
                  data={[
                    {
                      y: solution.convergenceHistory.map(h => h.heroUtility),
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Hero Value',
                      line: { color: '#1976d2' }
                    },
                    {
                      y: solution.convergenceHistory.map(h => h.villainUtility),
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Villain Value',
                      line: { color: '#dc004e' }
                    }
                  ]}
                  layout={{
                    ...commonPlotLayout,
                    xaxis: { title: { text: 'Iteration' } },
                    yaxis: { title: { text: 'Player Value' } },
                    height: 400,
                    margin: { t: 30, r: 60, b: 50, l: 60 },
                    showlegend: true
                  }}
                  config={{ responsive: true }}
                />
              </Box>

              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }} gutterBottom>
                  Exploitability
                </Typography>
                <Plot
                  data={[
                    {
                      y: solution.convergenceHistory.map(h => h.heroExploitability),
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Hero Exploitability',
                      line: { color: '#1976d2' }
                    },
                    {
                      y: solution.convergenceHistory.map(h => h.villainExploitability),
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Villain Exploitability',
                      line: { color: '#dc004e' }
                    }
                  ]}
                  layout={{
                    ...commonPlotLayout,
                    xaxis: { title: { text: 'Iteration' } },
                    yaxis: { title: { text: 'Exploitability' } },
                    height: 400,
                    margin: { t: 30, r: 60, b: 50, l: 60 },
                    showlegend: true
                  }}
                  config={{ responsive: true }}
                />
              </Box>

              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }} gutterBottom>
                  Convergence Quality Indicators
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Final Exploitability
                    </Typography>
                    <Typography variant="h6">
                      {(Math.max(
                        solution.convergenceHistory[solution.convergenceHistory.length - 1].heroExploitability,
                        solution.convergenceHistory[solution.convergenceHistory.length - 1].villainExploitability
                      )).toFixed(3)}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Value Range (last 100 iterations)
                    </Typography>
                    <Typography variant="h6">
                      {(Math.max(
                        ...solution.convergenceHistory.slice(-100).map(h => Math.abs(h.heroUtility - h.villainUtility))
                      )).toFixed(3)}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Convergence Status (both exploitabilities &lt; {EXPLOITABILITY_THRESHOLD.toFixed(3)})
                    </Typography>  <Typography variant="h6" sx={{
                      color: solution.convergenceHistory[solution.convergenceHistory.length - 1].heroExploitability < EXPLOITABILITY_THRESHOLD &&
                             solution.convergenceHistory[solution.convergenceHistory.length - 1].villainExploitability < EXPLOITABILITY_THRESHOLD
                        ? 'success.main'
                        : 'warning.main'
                    }}>
                      {solution.convergenceHistory[solution.convergenceHistory.length - 1].heroExploitability < EXPLOITABILITY_THRESHOLD &&
                       solution.convergenceHistory[solution.convergenceHistory.length - 1].villainExploitability < EXPLOITABILITY_THRESHOLD
                        ? `Converged (${solution.convergedAtIteration !== null ? solution.convergedAtIteration + 1 : gameState.iterations} iterations)`
                        : 'Not Converged'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}