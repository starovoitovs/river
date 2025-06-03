import React from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';

interface RangeConditioningButtonsProps {
  selectedHeroIndex: number | null;
  selectedVillainIndex: number | null;
  onSelectHeroIndex: (index: number | null) => void;
  onSelectVillainIndex: (index: number | null) => void;
  numHeroRanges: number;
  numVillainRanges: number;
}

const RangeConditioningButtons: React.FC<RangeConditioningButtonsProps> = ({
  selectedHeroIndex,
  selectedVillainIndex,
  onSelectHeroIndex,
  onSelectVillainIndex,
  numHeroRanges,
  numVillainRanges,
}) => {
  const handleHeroRangeToggle = (
    _: React.MouseEvent<HTMLElement>,
    newIndex: number | null,
  ) => {
    // If newIndex is null, it means the user clicked the currently selected button to toggle it off.
    // Otherwise, they selected a new index (or the same one, which ToggleButtonGroup handles).
    onSelectHeroIndex(newIndex);
  };

  const handleVillainRangeToggle = (
    _: React.MouseEvent<HTMLElement>,
    newIndex: number | null,
  ) => {
    onSelectVillainIndex(newIndex);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        
      {numHeroRanges > 0 && (
        <Box>
          <ToggleButtonGroup
            value={selectedHeroIndex}
            exclusive // Allows only one to be selected, or none if clicked again
            onChange={handleHeroRangeToggle}
            aria-label="Hero range conditioning"
            size="small"
            sx={{ display: 'flex', flexWrap: 'wrap' }}
          >
            {Array.from({ length: numHeroRanges }).map((_, index) => (
              <ToggleButton key={`h-${index}`} value={index} aria-label={`Hero range H${index + 1}`} sx={{ flexGrow: 1, minWidth: '45px' }}>
                H{index + 1}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {numVillainRanges > 0 && (
        <Box>
          <ToggleButtonGroup
            value={selectedVillainIndex}
            exclusive
            onChange={handleVillainRangeToggle}
            aria-label="Villain range conditioning"
            size="small"
            sx={{ display: 'flex', flexWrap: 'wrap' }}
          >
            {Array.from({ length: numVillainRanges }).map((_, index) => (
              <ToggleButton key={`v-${index}`} value={index} aria-label={`Villain range V${index + 1}`} sx={{ flexGrow: 1, minWidth: '45px' }}>
                V{index + 1}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}
       {(numHeroRanges === 0 && numVillainRanges === 0) && (
        <Typography variant="caption">No ranges defined to condition on.</Typography>
      )}
    </Box>
  );
};

export default RangeConditioningButtons;