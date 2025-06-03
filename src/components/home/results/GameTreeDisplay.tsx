import React from 'react';
import type { GameTreeNode } from '../../../types';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';

interface GameTreeDisplayProps {
  treeData: GameTreeNode[] | undefined;
  title?: string;
  externalHeroConditioningIndex?: number | null;
  externalVillainConditioningIndex?: number | null;
}

const GameTreeNodeDisplay: React.FC<{ node: GameTreeNode, level: number }> = ({ node, level }) => {
  const FONT_SIZE = '0.8em'; 
  const LINE_HEIGHT = '1'; 
  const INDENT_SPACES_PER_LEVEL = 5; 
  const OVERALL_PROB_WIDTH_CH = 8; // Approx "100.0% "

  const indentString = '\u00A0'.repeat(level * INDENT_SPACES_PER_LEVEL);
  const nodePrefix = level > 0 ? '↳ ' : '';

  let overallProbTextContent = '';
  if (node.isTerminal && node.overallProbability !== undefined) {
    overallProbTextContent = `${(node.overallProbability * 100).toFixed(1)}%`;
  }

  return (
    <div style={{ fontFamily: 'monospace', lineHeight: LINE_HEIGHT }}> {/* fontSize will be on spans */}
      {/* Overall Probability or Placeholder Span */}
      <span style={{
          display: 'inline-block',
          width: `${OVERALL_PROB_WIDTH_CH}ch`,
          whiteSpace: 'pre',
          fontStyle: 'italic',
          color: '#555',
          textAlign: 'left',
          fontSize: FONT_SIZE, // Explicitly set font size
        }}
      >
        {overallProbTextContent.padEnd(OVERALL_PROB_WIDTH_CH -1, '\u00A0')}
      </span>

      {/* Indentation and Node Prefix */}
      <span style={{ whiteSpace: 'pre', fontSize: FONT_SIZE }}>{indentString}{nodePrefix}</span>
      
      {/* Conditional Probability */}
      <span style={{ fontWeight: 'bold', color: node.player === 'Hero' ? '#070aac' : '#c00707', fontSize: FONT_SIZE }}>
        {`${(node.conditionalProbability * 100).toFixed(1)}%`.padStart(6, ' ')}
      </span>

      {/* Action Name */}
      <span style={{ fontSize: FONT_SIZE }}> {node.actionName}</span>
      
      {node.children && node.children.length > 0 &&
          node.children.map((child, index) => (
            <GameTreeNodeDisplay key={index} node={child} level={level + 1} />
          ))
      }
    </div>
  );
};

const GameTreeDisplay: React.FC<GameTreeDisplayProps> = ({
  treeData,
  title = "Game Tree",
  externalHeroConditioningIndex,
  externalVillainConditioningIndex
}) => {
  const navigate = useNavigate();

  if (!treeData || treeData.length === 0) {
    return <div style={{ padding: '10px', fontStyle: 'italic', fontFamily: 'monospace', fontSize: '0.9em' }}>No game tree data available or applicable for current conditioning.</div>;
  }

  let conditionalMessage = "";
  const heroConditioned = externalHeroConditioningIndex !== null && externalHeroConditioningIndex !== undefined;
  const villainConditioned = externalVillainConditioningIndex !== null && externalVillainConditioningIndex !== undefined;

  if (heroConditioned && villainConditioned) {
    conditionalMessage = `Conditional on H${externalHeroConditioningIndex + 1} and V${externalVillainConditioningIndex + 1}`;
  } else if (heroConditioned) {
    conditionalMessage = `Conditional on H${externalHeroConditioningIndex + 1}`;
  } else if (villainConditioned) {
    conditionalMessage = `Conditional on V${externalVillainConditioningIndex + 1}`;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 0 }}>
        {title}
        <Tooltip title="Conditional EV and Joint Probability for each Hero range vs Villain range matchup. Click for more info.">
          <IconButton onClick={() => navigate('/help#conditional-ev-matrix')} size="small" sx={{ ml: 0.5 }}>
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Typography>
      {conditionalMessage && (
        <Typography variant="caption" component="small" display="block" gutterBottom sx={{ fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: conditionalMessage }} />
      )}
      <Box className="game-tree-display" style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }} sx={{ mt: 1 }}>
        {treeData.map((node, index) => (
          <GameTreeNodeDisplay key={index} node={node} level={0} />
        ))}
      </Box>
    </Box>
  );
};

export default GameTreeDisplay;