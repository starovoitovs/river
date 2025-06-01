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

  const { matrix, heroRangeCategoryLabels, villainRangeCategoryLabels, verificationValue } = matrixOutput;

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        Conditional EV Matrix
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
              <TableCell sx={{ fontWeight: 'bold', zIndex: 1001, backgroundColor: 'background.paper' }}></TableCell>
              {villainRangeCategoryLabels.map((label, vIndex) => (
                <TableCell key={`v-header-${vIndex}`} align="center" sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {heroRangeCategoryLabels.map((heroLabel, hIndex) => (
              <TableRow key={`hero-row-${hIndex}`}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  {heroLabel}
                </TableCell>
                {villainRangeCategoryLabels.map((_, vIndex) => {
                  const cellData = matrix[hIndex]?.[vIndex];
                  return (
                    <TableCell key={`cell-${hIndex}-${vIndex}`} align="center">
                      {cellData ? (
                        <Tooltip title={`P(Joint): ${(cellData.pJoint * 100).toFixed(2)}%, Cond. EV: ${cellData.evConditional.toFixed(3)}`}>
                          <Box>
                            <Typography variant="caption" display="block">
                              P: {(cellData.pJoint * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ fontWeight: 'medium' }}>
                              EV: {cellData.evConditional.toFixed(2)}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {verificationValue !== undefined && (
         <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
           Sum of (P_joint * EV_cond): {verificationValue.toFixed(4)} (should match overall Hero EV)
         </Typography>
      )}
    </Box>
  );
};