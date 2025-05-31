import { Slider, Typography, Box } from '@mui/material';

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  min: number;
  max: number;
  step?: number;
  valueFormat?: (value: number) => string;
  // If you need to pass specific keys of GameState for type safety:
  // gameKey: keyof Omit<GameState, 'useLogUtility' | 'heroRanges' | 'villainRanges' | 'equities' | 'heroFixedStrategyInput' | 'villainFixedStrategyInput'>;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  valueFormat = (val) => val.toFixed(2)
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {valueFormat(value)}
        </Typography>
      </Box>
      <Slider
        value={value}
        onChange={(_, newValue) => onChange(newValue as number)}
        min={min}
        max={max}
        step={step}
        valueLabelDisplay="auto"
        size="small"
      />
    </Box>
  );
};