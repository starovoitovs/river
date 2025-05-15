import { useState, useEffect } from 'react';
import { Slider, Typography, Box, Drawer } from '@mui/material';
import Plot from 'react-plotly.js';
import { calculateMatrix, solveGame } from './utils';
import type { GameState } from './types';
import { index, columns } from './types';

const DRAWER_WIDTH = 400;

function App() {
  const [gameState, setGameState] = useState<GameState>({
    pot: 500,
    heroBet: 250,
    heroRaise: 500,
    hero3bet: 500,
    villainBet: 500,
    villainRaise: 500,
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

  const createSlider = (
    label: string,
    key: keyof GameState,
    min: number,
    max: number,
    step: number = 0.1
  ) => (
    <Box sx={{ width: '100%', my: 1, px: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
        <Typography>{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {gameState[key].toFixed(2)}
        </Typography>
      </Box>
      <Slider
        value={gameState[key]}
        onChange={(_, value) =>
          setGameState(prev => ({ ...prev, [key]: value as number }))
        }
        min={min}
        max={max}
        step={step}
        valueLabelDisplay="auto"
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
          size: 10
        }
      }))
    ).flat();
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
          {createSlider('Pot Size', 'pot', 100, 1000, 100)}

          <Typography variant="h6" sx={{ px: 2, mb: 2 }}>Hero Actions</Typography>
          {createSlider('Hero Bet', 'heroBet', 50, 1000, 50)}
          {createSlider('Hero Raise', 'heroRaise', 50, 1000, 50)}
          {createSlider('Hero 3-Bet', 'hero3bet', 50, 1000, 50)}

          <Typography variant="h6" sx={{ px: 2, mb: 2, mt: 2 }}>Villain Actions</Typography>
          {createSlider('Villain Bet', 'villainBet', 50, 1000, 50)}
          {createSlider('Villain Raise', 'villainRaise', 50, 1000, 50)}

          <Typography variant="h6" sx={{ px: 2, mb: 2, mt: 2 }}>Equity</Typography>
          {createSlider('Initial Hero Equity', 'pwinInitial', 0, 1, 0.05)}
          {createSlider('Hero Equity After Villain Bet', 'pwinAfterVillainBet', 0, 1, 0.05)}
          {createSlider('Hero Equity After Villain Raise', 'pwinAfterVillainRaise', 0, 1, 0.05)}
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, px: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
          River Analysis (you are heads-up out of position in the river)
        </Typography>

        {solution && (
          <Typography variant="h6" gutterBottom>
            Game Value: {solution.utility.toFixed(2)}
          </Typography>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ m: 0 }}>Game Matrix</Typography>
          <Typography sx={{ m: 0 }}>Expected hero win (after subtracting half-pot to make constant-sum game to zero-sum).</Typography>
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
              width: window.innerWidth - DRAWER_WIDTH - 100,
              height: 300,
              margin: { t: 50, r: 50, b: 100, l: 150 },
              xaxis: { tickangle: 45 },
              yaxis: { autorange: true },
              annotations: createAnnotations()
            }}
          />
        </Box>

        {solution && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, mb: 4 }}>
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
                  }
                ]}
                layout={{
                  width: (window.innerWidth - DRAWER_WIDTH - 140) / 2,
                  height: 250,
                  margin: { t: 30, r: 30, b: 100, l: 50 },
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
                  }
                ]}
                layout={{
                  width: (window.innerWidth - DRAWER_WIDTH - 140) / 2,
                  height: 250,
                  margin: { t: 30, r: 30, b: 100, l: 50 },
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
