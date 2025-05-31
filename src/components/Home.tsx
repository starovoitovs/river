import { useEffect, useState } from 'react'; // Added useEffect and useState for windowInnerWidth
import { Box, Drawer, Toolbar, Button } from '@mui/material';

// Hooks
import { useHomeForm } from '../hooks/useHomeForm';
import { useGameCalculation } from '../hooks/useGameCalculation';

// UI and Logic Utilities
import { generateStrategyLabels, formatMatrixForDisplay, copyStrategyToClipboard } from './home/uiLogicUtils';

// Constants
import { DRAWER_WIDTH } from './home/homeConstants';

// Settings Components
import { StackAndPotSettings } from './home/settings/StackAndPotSettings';
import { RangeSettings } from './home/settings/RangeSettings';
import { ActionsAndBetsSettings } from './home/settings/ActionsAndBetsSettings';
import { FixedStrategiesSettings } from './home/settings/FixedStrategiesSettings';
import { SolverSettings } from './home/settings/SolverSettings';

// Results Components
import { ConvergenceIndicatorsDisplay } from './home/results/ConvergenceIndicatorsDisplay';
import { StrategyPlotDisplay } from './home/results/StrategyPlotDisplay';
import { GameMatrixPlotDisplay } from './home/results/GameMatrixPlotDisplay';
import { ConvergencePlotsDisplay } from './home/results/ConvergencePlotsDisplay';

// Common Plot Layout (can be further refined or moved to a constants/config file)
const commonPlotLayout = {
  font: {
    size: 10
  },
  margin: { t: 30, r: 60, b: 200, l: 120 } // Default, can be overridden by specific plots
};

export default function Home() {
  const {
    gameState,
    // setGameState, // Direct setGameState might not be needed if using handleGameStateChange
    errors,
    setErrors, // Used by useGameCalculation hook
    expanded,
    handleAccordionChange,
    handleGameStateChange,
    resetError
  } = useHomeForm();

  const {
    matrix,
    solution,
    handleCalculate,
    // setMatrix, // Not typically set directly from Home
    // setSolution // Not typically set directly from Home
  } = useGameCalculation();

  // State for window width for responsive plots
  const [windowInnerWidth, setWindowInnerWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowInnerWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const { heroLabels, villainLabels } = generateStrategyLabels(
    gameState.heroRanges,
    gameState.villainRanges,
    gameState.maxActions
  );
  
  const reversedMatrixData = formatMatrixForDisplay(matrix.heroMatrix, matrix.villainMatrix);

  const onCalculate = () => {
    handleCalculate(gameState, setErrors);
  };
  
  const handleCopyHeroStrategy = () => {
    if (solution) {
      copyStrategyToClipboard(solution.row_strategy, heroLabels);
    }
  };

  const handleCopyVillainStrategy = () => {
    if (solution) {
      copyStrategyToClipboard(solution.col_strategy, villainLabels);
    }
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
            paddingBottom: '80px', 
          },
        }}
      >
        <Toolbar variant="dense"/>
        <Box sx={{ overflowX: 'hidden', height: '100%' }}>
          <StackAndPotSettings
            gameState={gameState}
            handleGameStateChange={handleGameStateChange}
            expanded={expanded}
            handleAccordionChange={handleAccordionChange}
          />
          <RangeSettings
            gameState={gameState}
            errors={errors}
            handleGameStateChange={handleGameStateChange}
            resetError={resetError}
            expanded={expanded}
            handleAccordionChange={handleAccordionChange}
          />
          <ActionsAndBetsSettings
            gameState={gameState}
            handleGameStateChange={handleGameStateChange}
            expanded={expanded}
            handleAccordionChange={handleAccordionChange}
          />
          <FixedStrategiesSettings
            gameState={gameState}
            errors={errors}
            handleGameStateChange={handleGameStateChange}
            resetError={resetError}
            expanded={expanded}
            handleAccordionChange={handleAccordionChange}
          />
          <SolverSettings
            gameState={gameState}
            handleGameStateChange={handleGameStateChange}
            expanded={expanded}
            handleAccordionChange={handleAccordionChange}
          />
        </Box>

        <Box sx={{
          position: 'fixed',
          bottom: 0,
          width: `${DRAWER_WIDTH}px`,
          padding: 2,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderRight: 1,
          borderColor: 'divider'
        }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={onCalculate}
          >
            Calculate
          </Button>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
        {solution && (
          <ConvergenceIndicatorsDisplay
            solution={solution}
            gameStateIterations={gameState.iterations}
            convergenceThreshold={gameState.convergenceThreshold}
          />
        )}

        {solution && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3, mb:3 }}>
            <StrategyPlotDisplay
              playerType="Hero"
              strategyProbs={solution.row_strategy}
              labels={heroLabels}
              onCopyStrategy={handleCopyHeroStrategy}
              commonPlotLayout={commonPlotLayout}
              windowInnerWidth={windowInnerWidth}
            />
            <StrategyPlotDisplay
              playerType="Villain"
              strategyProbs={solution.col_strategy}
              labels={villainLabels}
              onCopyStrategy={handleCopyVillainStrategy}
              commonPlotLayout={commonPlotLayout}
              windowInnerWidth={windowInnerWidth}
            />
          </Box>
        )}
        
        {solution && matrix.heroMatrix.length > 0 && ( // Ensure matrix has data before rendering
            <GameMatrixPlotDisplay
                solution={solution}
                reversedMatrix={reversedMatrixData}
                heroLabels={heroLabels}
                villainLabels={villainLabels}
                commonPlotLayout={commonPlotLayout}
                windowInnerWidth={windowInnerWidth}
            />
        )}

        {solution && solution.convergenceHistory.length > 0 && (
          <ConvergencePlotsDisplay 
            convergenceHistory={solution.convergenceHistory}
            commonPlotLayout={commonPlotLayout}
          />
        )}
      </Box>
    </Box>
  );
}