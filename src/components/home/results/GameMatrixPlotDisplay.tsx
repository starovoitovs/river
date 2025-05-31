import { Typography, Box, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Plot from 'react-plotly.js';
import { useNavigate } from 'react-router-dom';
import { ANNOTATION_THRESHOLD_EXPONENT, DRAWER_WIDTH } from '../homeConstants';

interface MatrixCell {
  hero: number;
  villain: number;
}

interface GameMatrixPlotDisplayProps {
  solution: { // Assuming solution is not null
    heroUtility: number;
    villainUtility: number;
    row_strategy: number[];
    col_strategy: number[];
  };
  reversedMatrix: MatrixCell[][]; // From formatMatrixForDisplay
  heroLabels: string[];
  villainLabels: string[];
  commonPlotLayout: any; // Define a more specific type
  windowInnerWidth: number;
}

export const GameMatrixPlotDisplay: React.FC<GameMatrixPlotDisplayProps> = ({
  solution,
  reversedMatrix,
  heroLabels,
  villainLabels,
  commonPlotLayout,
  windowInnerWidth
}) => {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 500 }} gutterBottom>
        Game Matrix
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
            z: reversedMatrix.map(row => row.map(vals => vals.hero)),
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
          font: { ...commonPlotLayout.font, size: 10 }, // Ensure font size is part of commonPlotLayout or overridden
          width: windowInnerWidth - DRAWER_WIDTH - 80,
          height: 600,
          xaxis: {
            tickangle: -90,
            automargin: true,
            tickfont: { size: 8 },
            tickvals: Array.from({ length: villainLabels.length }, (_, i) => i),
            ticktext: villainLabels.map((label, i) =>
              (solution.col_strategy[i] > 10 ** -ANNOTATION_THRESHOLD_EXPONENT ? '* ' : '') + label
            ),
            side: 'bottom'
          },
          yaxis: {
            tickangle: 0,
            automargin: true,
            tickfont: { size: 8 },
            tickvals: Array.from({ length: heroLabels.length }, (_, i) => i),
            ticktext: [...heroLabels].reverse().map((label, i) =>
              (solution.row_strategy[heroLabels.length - 1 - i] > 10 ** -ANNOTATION_THRESHOLD_EXPONENT ? '* ' : '') + label
            ),
          },
          margin: commonPlotLayout.margin, // Ensure margin is part of commonPlotLayout
        }}
        config={{ responsive: true }}
      />
    </Box>
  );
};