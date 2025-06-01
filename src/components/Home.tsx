import { useEffect, useState } from 'react'; // Added useEffect and useState for windowInnerWidth
import { Box, Drawer, Toolbar, Button } from '@mui/material';

// Hooks
import { useHomeForm } from '../hooks/useHomeForm';
import { useGameCalculation } from '../hooks/useGameCalculation';

// UI and Logic Utilities
import { generateStrategyLabels, formatMatrixForDisplay, copyStrategyToClipboard } from './home/uiLogicUtils';
import { getHeroActions, getVillainActions } from '../types'; // Corrected import path

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
import { ConditionalEVMatrixDisplay } from './home/results/ConditionalEVMatrixDisplay'; // Added import

// Common Plot Layout (can be further refined or moved to a constants/config file)
const commonPlotLayout = {
  font: {
    size: 10
  },
  margin: { t: 0, b: 0, l: 0, r: 0 } // Default, can be overridden by specific plots
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
    matrixData, // Renamed from matrix to matrixData
    solution,
    conditionalEVMatrix, // Added new state from hook
    handleCalculate,
    // setMatrixData,
    // setSolution,
    // setConditionalEVMatrix // Not typically set directly from Home
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
  
  const reversedMatrixData = formatMatrixForDisplay(matrixData.heroMatrix, matrixData.villainMatrix);

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
            heroRangeProbs={matrixData.heroRangeProbs} // Pass new prop
            villainRangeProbs={matrixData.villainRangeProbs} // Pass new prop
            equityMatrix={matrixData.equityMatrix} // Pass new prop
          />
        )}

        {solution && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb:3 }}> {/* Adjusted grid */}
            <StrategyPlotDisplay
              playerType="Hero"
              strategyProbs={solution.row_strategy}
              labels={heroLabels}
              onCopyStrategy={handleCopyHeroStrategy}
              commonPlotLayout={commonPlotLayout}
              windowInnerWidth={windowInnerWidth}
              playerRangesString={gameState.heroRanges}
              playerActions={getHeroActions(gameState.maxActions)}
            />
            <StrategyPlotDisplay
              playerType="Villain"
              strategyProbs={solution.col_strategy}
              labels={villainLabels}
              onCopyStrategy={handleCopyVillainStrategy}
              commonPlotLayout={commonPlotLayout}
              windowInnerWidth={windowInnerWidth}
              playerRangesString={gameState.villainRanges}
              playerActions={getVillainActions(gameState.maxActions)}
            />
            {/* Add ConditionalEVMatrixDisplay here */}
            <ConditionalEVMatrixDisplay matrixOutput={conditionalEVMatrix} />
          </Box>
        )}
        
        {solution && matrixData.heroMatrix.length > 0 && ( // Ensure matrixData has data
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