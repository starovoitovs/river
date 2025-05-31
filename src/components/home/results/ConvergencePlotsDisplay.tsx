import { Typography, Box } from '@mui/material';
import Plot from 'react-plotly.js';

interface ConvergenceHistoryPoint {
  heroUtility: number;
  villainUtility: number;
  heroExploitability: number;
  villainExploitability: number;
  // iteration: number; // Not directly used in plot data mapping here, but part of the structure
}

interface ConvergencePlotsDisplayProps {
  convergenceHistory: ConvergenceHistoryPoint[];
  commonPlotLayout: any; // Define a more specific type
}

export const ConvergencePlotsDisplay: React.FC<ConvergencePlotsDisplayProps> = ({
  convergenceHistory,
  commonPlotLayout,
}) => {
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Convergence Analysis Plots
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 500 }} gutterBottom>
            Player Values Over Time
          </Typography>
          <Plot
            data={[
              {
                y: convergenceHistory.map(h => h.heroUtility),
                type: 'scatter',
                mode: 'lines',
                name: 'Hero Value',
                line: { color: '#1976d2' }
              },
              {
                y: convergenceHistory.map(h => h.villainUtility),
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
              height: 400, // Or make dynamic
              margin: { t: 30, r: 60, b: 50, l: 60 }, // Default, can be part of commonPlotLayout
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
                y: convergenceHistory.map(h => h.heroExploitability),
                type: 'scatter',
                mode: 'lines',
                name: 'Hero Exploitability',
                line: { color: '#1976d2' }
              },
              {
                y: convergenceHistory.map(h => h.villainExploitability),
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
              height: 400, // Or make dynamic
              margin: { t: 30, r: 60, b: 50, l: 60 }, // Default, can be part of commonPlotLayout
              showlegend: true
            }}
            config={{ responsive: true }}
          />
        </Box>
      </Box>
    </Box>
  );
};