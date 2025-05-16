import { useState, useEffect } from 'react';
import { Slider, Typography, Box, Drawer, Checkbox, FormControlLabel, Divider } from '@mui/material';
import Plot from 'react-plotly.js';
import { calculateMatrix, solveGame } from './utils';
import type { GameState } from './types';
import { index, columns } from './types';

const DRAWER_WIDTH = 280;

function App() {
  const [gameState, setGameState] = useState<GameState>({
    useLogUtility: false,
    stack: 100,
    potPercent: 20,
    heroBet: 0.5,
    heroRaise: 1.0,
    hero3bet: 2.0,
    villainBet: 1.0,
    villainRaise: 2.0,
    pwinInitial: 0.5,
    pwinAfterVillainBet: 0.5,
    pwinAfterVillainRaise: 0.5
  });

  const [matrix, setMatrix] = useState<number[][]>([]);
  const [solution, setSolution] = useState<{
    row_strategy: number[];
    col_strategy: number[];
    utility: number;
  } | null>(null);

  useEffect(() => {
    const newMatrix = calculateMatrix(gameState);
    setMatrix(newMatrix);
    setSolution(solveGame(newMatrix));
  }, [gameState]);

  const calculateBetAmounts = () => {
    const initialPot = gameState.stack * gameState.potPercent / 100;
    
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography>{label}</Typography>
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

  const formatMatrixForDisplay = (matrix: number[][]) => {
    return matrix.slice().reverse().map(row =>
      [...row]
    );
  };

  const reversedMatrix = formatMatrixForDisplay(matrix);

  const createAnnotations = () => {
    return reversedMatrix.map((row, i) => 
      row.map((val, j) => ({
        x: j,
        y: i,
        xref: 'x' as const,
        yref: 'y' as const,
        text: val.toFixed(1),
        showarrow: false,
        font: {
          color: 'white',
          size: 9
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
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <Box sx={{ px: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={gameState.useLogUtility}
                  onChange={(e) => setGameState(prev => ({ ...prev, useLogUtility: e.target.checked }))}
                />
              }
              label="Use Log Utility"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" sx={{ px: 2, mb: 1 }}>Stack and Pot</Typography>
          {createSlider('Stack Size', 'stack', 50, 200, 10,
            value => `${value} BB`)}
          {createSlider('Initial Pot', 'potPercent', 5, 50, 5,
            value => `${value}% (${(gameState.stack * value / 100).toFixed(1)} BB)`)}

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" sx={{ px: 2, mb: 1 }}>Hero Equity</Typography>
          {createSlider('Initial Equity', 'pwinInitial', 0, 1, 0.05,
            value => `${(value * 100).toFixed(0)}%`)}
          {createSlider('Equity After Villain Bet', 'pwinAfterVillainBet', 0, 1, 0.05,
            value => `${(value * 100).toFixed(0)}%`)}
          {createSlider('Equity After Villain Raise', 'pwinAfterVillainRaise', 0, 1, 0.05,
            value => `${(value * 100).toFixed(0)}%`)}
            
          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" sx={{ px: 2, mb: 1 }}>Actions</Typography>
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
        <Typography variant="h4" gutterBottom>
          River Analysis
        </Typography>

        <Box sx={{ mb: 3 }}>
          {solution && (
            <Typography variant="h6" gutterBottom>
              Game Value: {solution.utility.toFixed(2)}
            </Typography>
          )}
          
          <Plot
            data={[
              {
                z: reversedMatrix,
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
              <Typography variant="h6" gutterBottom>Hero Strategy</Typography>
              <Plot
                data={[
                  {
                    x: index,
                    y: solution.row_strategy,
                    type: 'bar',
                    text: solution.row_strategy.map(v => v.toFixed(3)),
                    textposition: 'auto',
                    textfont: { size: 9 }
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
              <Typography variant="h6" gutterBottom>Villain Strategy</Typography>
              <Plot
                data={[
                  {
                    x: columns,
                    y: solution.col_strategy,
                    type: 'bar',
                    text: solution.col_strategy.map(v => v.toFixed(3)),
                    textposition: 'auto',
                    textfont: { size: 9 }
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

export default App;
