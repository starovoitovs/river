import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';
import type { ConditionalEVMatrixOutput } from '../../../utils/conditionalEVCalculator';

interface ConditionalEVMatrixDisplayProps {
  matrixOutput: ConditionalEVMatrixOutput | null;
  // Add any other necessary props, e.g., for styling or help tooltips
}

export const ConditionalEVMatrixDisplay: React.FC<ConditionalEVMatrixDisplayProps> = ({ matrixOutput }) => {
  const navigate = useNavigate();

  if (!matrixOutput || !matrixOutput.matrix || matrixOutput.matrix.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Conditional EV Matrix
          <Tooltip title="Conditional EV and Joint Probability for each Hero range vs Villain range matchup.">
            <IconButton onClick={() => navigate('/help#conditional-ev-matrix')} size="small">
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Typography variant="body2">Not available.</Typography>
      </Box>
    );
  }

  const { matrix, heroRangeCategoryLabels, villainRangeCategoryLabels, heroVerificationValue, villainVerificationValue } = matrixOutput;

  // Calculate Hero Marginals
  const heroMarginalPs = heroRangeCategoryLabels.map((_, hIndex) =>
    villainRangeCategoryLabels.reduce((sum, __, vIndex) => sum + (matrix[hIndex]?.[vIndex]?.pJoint || 0), 0)
  );
  const heroMarginalHeroEVs = heroRangeCategoryLabels.map((_, hIndex) => {
    const pTotal = heroMarginalPs[hIndex];
    if (pTotal === 0) return 0;
    const weightedEVSum = villainRangeCategoryLabels.reduce(
      (sum, __, vIndex) => sum + (matrix[hIndex]?.[vIndex]?.pJoint || 0) * (matrix[hIndex]?.[vIndex]?.heroEvConditional || 0),
      0
    );
    return weightedEVSum / pTotal;
  });
  const heroMarginalVillainEVs = heroRangeCategoryLabels.map((_, hIndex) => {
    const pTotal = heroMarginalPs[hIndex];
    if (pTotal === 0) return 0;
    const weightedEVSum = villainRangeCategoryLabels.reduce(
      (sum, __, vIndex) => sum + (matrix[hIndex]?.[vIndex]?.pJoint || 0) * (matrix[hIndex]?.[vIndex]?.villainEvConditional || 0),
      0
    );
    return weightedEVSum / pTotal;
  });


  // Calculate Villain Marginals (from Hero's perspective)
  const villainMarginalPs = villainRangeCategoryLabels.map((_, vIndex) =>
    heroRangeCategoryLabels.reduce((sum, __, hIndex) => sum + (matrix[hIndex]?.[vIndex]?.pJoint || 0), 0)
  );
  const villainMarginalHeroEVs = villainRangeCategoryLabels.map((_, vIndex) => {
    const pTotal = villainMarginalPs[vIndex];
    if (pTotal === 0) return 0;
    const weightedEVSum = heroRangeCategoryLabels.reduce(
      (sum, __, hIndex) => sum + (matrix[hIndex]?.[vIndex]?.pJoint || 0) * (matrix[hIndex]?.[vIndex]?.heroEvConditional || 0),
      0
    );
    return weightedEVSum / pTotal;
  });
  const villainMarginalVillainEVs = villainRangeCategoryLabels.map((_, vIndex) => {
    const pTotal = villainMarginalPs[vIndex];
    if (pTotal === 0) return 0;
    const weightedEVSum = heroRangeCategoryLabels.reduce(
      (sum, __, hIndex) => sum + (matrix[hIndex]?.[vIndex]?.pJoint || 0) * (matrix[hIndex]?.[vIndex]?.villainEvConditional || 0),
      0
    );
    return weightedEVSum / pTotal;
  });

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        Conditionals
        <Tooltip title="Conditional EV and Joint Probability for each Hero range vs Villain range matchup. Click for more info.">
          <IconButton onClick={() => navigate('/help#conditional-ev-matrix')} size="small" sx={{ ml: 0.5 }}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>
      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, borderBottom: 0 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', zIndex: 1001, backgroundColor: 'background.paper', borderRight: 1, borderColor: 'divider' }}></TableCell>
              {villainRangeCategoryLabels.map((label, vIndex) => (
                <TableCell key={`v-header-${vIndex}`} align="center" sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  {label}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
                H Marginal
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {heroRangeCategoryLabels.map((heroLabel, hIndex) => (
              <TableRow key={`hero-row-${hIndex}`} sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 }}}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', borderRight: 1, borderColor: 'divider' }}>
                  {heroLabel}
                </TableCell>
                {villainRangeCategoryLabels.map((_, vIndex) => {
                  const cellData = matrix[hIndex]?.[vIndex];
                  return (
                    <TableCell key={`cell-${hIndex}-${vIndex}`} align="center">
                      {cellData ? (
                        <Tooltip title={`P(Joint): ${(cellData.pJoint * 100).toFixed(2)}%, Hero EV: ${cellData.heroEvConditional.toFixed(3)}, Villain EV: ${cellData.villainEvConditional.toFixed(3)}`}>
                          <Box>
                            <Typography variant="caption" display="block">
                              {(cellData.pJoint * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ fontWeight: 'medium' }}>
                              {cellData.heroEvConditional.toFixed(2)}/{cellData.villainEvConditional.toFixed(2)}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  );
                })}
                {/* Hero Marginal Cell */}
                <TableCell align="center" sx={{ borderLeft: 1, borderColor: 'divider'}}>
                  {heroMarginalPs[hIndex] !== undefined ? (
                    <Tooltip title={`P(Hero Range): ${(heroMarginalPs[hIndex] * 100).toFixed(2)}%, Hero EV: ${heroMarginalHeroEVs[hIndex].toFixed(3)}, Villain EV: ${heroMarginalVillainEVs[hIndex].toFixed(3)}`}>
                      <Box>
                        <Typography variant="caption" display="block">
                          {(heroMarginalPs[hIndex] * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                          {heroMarginalHeroEVs[hIndex].toFixed(2)}/{heroMarginalVillainEVs[hIndex].toFixed(2)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
            {/* Villain Marginal Row */}
            <TableRow sx={{ borderTop: 1, borderColor: 'divider' }}>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', borderRight: 1, borderColor: 'divider' }}>
                V Marginal
              </TableCell>
              {villainRangeCategoryLabels.map((_, vIndex) => (
                <TableCell key={`villain-marginal-cell-${vIndex}`} align="center">
                  {villainMarginalPs[vIndex] !== undefined ? (
                    <Tooltip title={`P(Villain Range): ${(villainMarginalPs[vIndex] * 100).toFixed(2)}%, Hero EV: ${villainMarginalHeroEVs[vIndex].toFixed(3)}, Villain EV: ${villainMarginalVillainEVs[vIndex].toFixed(3)}`}>
                      <Box>
                        <Typography variant="caption" display="block">
                          {(villainMarginalPs[vIndex] * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                          {villainMarginalHeroEVs[vIndex].toFixed(2)}/{villainMarginalVillainEVs[vIndex].toFixed(2)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ) : (
                    '-'
                  )}
                </TableCell>
              ))}
              {/* Bottom-right corner cell - can display overall EV or be empty */}
              <TableCell align="center" sx={{ borderLeft: 1, borderColor: 'divider', fontWeight: 'bold' }}>
                {(heroVerificationValue !== undefined && villainVerificationValue !== undefined) ? (
                  <Tooltip title={`Overall Hero EV: ${heroVerificationValue.toFixed(3)}, Overall Villain EV: ${villainVerificationValue.toFixed(3)}`}>
                    <Box>
                      <Typography variant="caption" display="block">Overall</Typography>
                      <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>
                        {heroVerificationValue.toFixed(2)}/{villainVerificationValue.toFixed(2)}
                      </Typography>
                    </Box>
                  </Tooltip>
                ) : '-'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {heroVerificationValue !== undefined && villainVerificationValue !== undefined && (
         <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
           Hero EV Sum: {heroVerificationValue.toFixed(4)}, Villain EV Sum: {villainVerificationValue.toFixed(4)} (should match overall EVs from solver)
         </Typography>
      )}
    </Box>
  );
};