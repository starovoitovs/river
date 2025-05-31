import { Typography, Box, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Plot from 'react-plotly.js';
import { useNavigate } from 'react-router-dom';
import { ANNOTATION_THRESHOLD_EXPONENT, DRAWER_WIDTH } from '../homeConstants'; // Assuming DRAWER_WIDTH is needed for layout calculations

interface StrategyPlotDisplayProps {
  playerType: 'Hero' | 'Villain';
  strategyProbs: number[];
  labels: string[];
  onCopyStrategy: () => void;
  commonPlotLayout: any; // Consider defining a more specific type for this
  windowInnerWidth: number; // Pass window.innerWidth as a prop for responsiveness
}

export const StrategyPlotDisplay: React.FC<StrategyPlotDisplayProps> = ({
  playerType,
  strategyProbs,
  labels,
  onCopyStrategy,
  commonPlotLayout,
  windowInnerWidth
}) => {
  const navigate = useNavigate();

  const filteredData = strategyProbs
    .map((prob, index) => ({ prob, label: labels[index] }))
    .filter(item => item.prob > 10 ** -ANNOTATION_THRESHOLD_EXPONENT)
    .sort((a, b) => a.prob - b.prob); // Sort for consistent bar order if needed, or by label

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 500 }} gutterBottom>
        {playerType} Strategy
        <IconButton
          onClick={() => navigate('/help#game-matrix-and-strategies')}
          size="small"
        >
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={onCopyStrategy}
          size="small"
          sx={{ ml: 0.5 }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Typography>
      
      <Plot
        data={[
          {
            x: filteredData.map(item => item.prob),
            y: filteredData.map(item => item.label),
            type: 'bar',
            orientation: 'h',
            text: filteredData.map(item => item.prob.toFixed(ANNOTATION_THRESHOLD_EXPONENT)),
            hoverlabel: { bgcolor: 'white' },
            hovertemplate: '%{x:.3f}<extra></extra>',
            showlegend: false,
            textposition: 'auto',
            textfont: { size: 9 },
            marker: { color: '#070aac' } // Consider making color a prop if different for hero/villain
          }
        ]}
        layout={{
          ...commonPlotLayout,
          width: (windowInnerWidth - DRAWER_WIDTH - 100) / 3, // Adjusted for typical usage
          height: 300, // Or make height dynamic/prop
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
          margin: { t: 0, r: 0, b: 0, l: 0 } // Default, can be part of commonPlotLayout
        }}
        config={{ responsive: true }} // Ensure responsive is enabled
      />
    </Box>
  );
};