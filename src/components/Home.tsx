import { useState, useEffect } from 'react';
import { Slider, Typography, Box, Drawer, Select, MenuItem, Divider, Toolbar, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Plot from 'react-plotly.js';
import { calculateMatrix, solveGame } from '../utils';
import type { GameState } from '../types';
import { index, columns } from '../types';

const DRAWER_WIDTH = 280;

export default function Home() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>({
    useLogUtility: 'linear',
    heroStack: 100,
    villainStack: 100,
    potSize: 20,
    heroBet: 0.5,
    heroRaise: 1.0,
    hero3bet: 1.0,
    villainBet: 1.0,
    villainRaise: 1.0,
    pwinInitial: 0.5,
    pwinAfterVillainBet: 0.5,
    pwinAfterVillainRaise: 0.5
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
  } | null>(null);

  useEffect(() => {
    const newMatrix = calculateMatrix(gameState);
    setMatrix(newMatrix);
    setSolution(solveGame(newMatrix));
  }, [gameState]);

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
    key: keyof Omit<GameState, 'useLogUtility'>,
    min: number,
    max: number,
    step: number = 0.1,
    valueFormat: (value: number) => string = (value) => value.toFixed(2)
  ) => (
    <Box sx={{ width: '100%', px: 2 }}>
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

  const formatMatrixForDisplay = (heroMatrix: number[][], villainMatrix: number[][]) => {
    return heroMatrix.slice().reverse().map((row, i) =>
      row.map((heroVal, j) => ({
        hero: heroVal,
        villain: villainMatrix[heroMatrix.length - 1 - i][j]
      }))
    );
  };

  const reversedMatrix = formatMatrixForDisplay(matrix.heroMatrix, matrix.villainMatrix);

  const createAnnotations = () => {
    return reversedMatrix.map((row, i) =>
      row.map((vals, j) => ({
        x: j,
        y: i,
        xref: 'x' as const,
        yref: 'y' as const,
        text: `(${vals.hero.toFixed(1)}, ${vals.villain.toFixed(1)})`,
        showarrow: false,
        font: {
          color: 'white',
          size: 8
        }
      }))
    ).flat();
  };

  const commonPlotLayout = {
    font: {
      size: 10
    },
    margin: { t: 30, r: 30, b: 80, l: 120 }
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
          },
        }}
      >
        <Toolbar variant="dense"/> {/* Add spacing for fixed AppBar */}
        <Box sx={{ overflowX: 'hidden', height: '100%' }}>
          <Box sx={{ px: 2, mb: 1, mt: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ mr: 0, fontWeight: 500 }}>Payoff</Typography>
            <IconButton
              onClick={() => navigate('/help#1-payoff-type')}
              size="small"
              sx={{ mr: 2 }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
            <Select
              size="small"
              value={gameState.useLogUtility}
              onChange={(e) => setGameState(prev => ({ ...prev, useLogUtility: e.target.value }))}
              sx={{ minWidth: 120, mr: 1, fontSize: '0.875rem' }}
            >
              <MenuItem value="linear">Linear</MenuItem>
              <MenuItem value="logarithmic">Logarithmic</MenuItem>
            </Select>
          </Box>

          <Divider sx={{ mt: 0, mb: 1 }} />

          <Box sx={{ px: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{fontWeight: 500}}>Stack and Pot</Typography>
            <IconButton
              onClick={() => navigate('/help#2-stack-and-pot-settings')}
              size="small"
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
          {createSlider('Hero Stack Size', 'heroStack', 50, 200, 5,
            value => `${value} BB`)}
          {createSlider('Villain Stack Size', 'villainStack', 50, 200, 5,
            value => `${value} BB`)}
          {createSlider('Initial Pot', 'potSize', 5, 200, 5,
            value => `${value} BB`)}

          <Divider sx={{ mt: 0, mb: 1 }} />

          <Box sx={{ px: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{fontWeight: 500}}>Hero Equity</Typography>
            <IconButton
              onClick={() => navigate('/help#3-hero-equity')}
              size="small"
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
          {createSlider('Initial Equity', 'pwinInitial', 0, 1, 0.01,
            value => `${(value * 100).toFixed(0)}%`)}
          {createSlider('Equity After Villain Bet', 'pwinAfterVillainBet', 0, 1, 0.01,
            value => `${(value * 100).toFixed(0)}%`)}
          {createSlider('Equity After Villain Raise', 'pwinAfterVillainRaise', 0, 1, 0.01,
            value => `${(value * 100).toFixed(0)}%`)}
            
          <Divider sx={{ mt: 0, mb: 1 }} />

          <Box sx={{ px: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{fontWeight: 500}}>Bet sizing</Typography>
            <IconButton
              onClick={() => navigate('/help#4-bet-sizing')}
              size="small"
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
          {createSlider('Hero Bet (pot %)', 'heroBet', 0.1, 2, 0.1,
            value => `${(value * 100).toFixed(0)}% (${amounts.heroBet} BB)`)}
          {createSlider('Hero Raise (pot %)', 'heroRaise', 0.1, 2, 0.1,
            value => `${(value * 100).toFixed(0)}% (${amounts.heroRaise} BB)`)}
          {createSlider('Hero 3-Bet (pot %)', 'hero3bet', 0.1, 2, 0.1,
            value => `${(value * 100).toFixed(0)}% (${amounts.hero3bet} BB)`)}
          {createSlider('Villain Bet (pot %)', 'villainBet', 0.1, 2, 0.1,
            value => `${(value * 100).toFixed(0)}% (${amounts.villainBet} BB)`)}
          {createSlider('Villain Raise (pot %)', 'villainRaise', 0.1, 2, 0.1,
            value => `${(value * 100).toFixed(0)}% (${amounts.villainRaise} BB)`)}
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 2 }}>

        <Box sx={{ mb: 3 }}>
          {solution && (
            <Typography variant="body1" sx={{fontWeight: 500}} gutterBottom>
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
                x: columns,
                y: [...index].reverse(),
                type: 'heatmap',
                colorscale: 'RdBu',
                hoverongaps: false,
                showscale: true
              }
            ]}
            layout={{
              ...commonPlotLayout,
              width: window.innerWidth - DRAWER_WIDTH - 80,
              height: 360,
              xaxis: { tickangle: 45 },
              yaxis: { autorange: true },
              annotations: createAnnotations()
            }}
          />
        </Box>

        {solution && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
            <Box>
              <Typography variant="body1" sx={{fontWeight: 500}} gutterBottom>Hero Strategy
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
                    x: index,
                    y: solution.row_strategy,
                    type: 'bar',
                    text: solution.row_strategy.map(v => v.toFixed(3)),
                    textposition: 'auto',
                    textfont: { size: 9 },
                    marker: { color: '#070aac' }  // RdBu blue color
                  }
                ]}
                layout={{
                  ...commonPlotLayout,
                  width: (window.innerWidth - DRAWER_WIDTH - 100) / 2,
                  height: 260,
                  xaxis: { tickangle: 45 }
                }}
              />
            </Box>

            <Box>
              <Typography variant="body1" sx={{fontWeight: 500}} gutterBottom>
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
                    x: columns,
                    y: solution.col_strategy,
                    type: 'bar',
                    text: solution.col_strategy.map(v => v.toFixed(3)),
                    textposition: 'auto',
                    textfont: { size: 9 },
                    marker: { color: '#070aac' }  // RdBu blue color
                  }
                ]}
                layout={{
                  ...commonPlotLayout,
                  width: (window.innerWidth - DRAWER_WIDTH - 100) / 2,
                  height: 260,
                  xaxis: { tickangle: 45 }
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}