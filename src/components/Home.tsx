import { useEffect, useState, useMemo } from 'react';
import { Box, Drawer, Toolbar, Button } from '@mui/material';
import type { SelectedActionSequence, ActionStep, PokerAction } from '../utils/strategySequenceHelper'; // Added ActionStep, PokerAction

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
import { RangeExplorerDisplay } from './home/results/RangeExplorerDisplay';
import { SequenceSelector } from './home/results/SequenceSelector'; // Added import
import {
  analyzeSequence,
  getAvailablePokerActions,
} from '../utils/strategySequenceHelper'; // Added imports for sequence logic

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
  const [selectedActionSequence, setSelectedActionSequence] = useState<SelectedActionSequence>([]);

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

  // --- Start of Sequence Selector Logic (moved from RangeExplorerDisplay) ---

  // State for full action history (needed by SequenceSelector)
  const [fullActionHistory, setFullActionHistory] = useState<
    Array<{
      player: 'Hero' | 'Villain';
      chosenAction: PokerAction;
      allAvailableActions: PokerAction[];
      originalSequenceStep: ActionStep;
    }>
  >([]);

  const playerToAct = useMemo((): 'Hero' | 'Villain' => {
    return selectedActionSequence.length % 2 === 0 ? 'Hero' : 'Villain';
  }, [selectedActionSequence]);

  const currentPotState = useMemo(() => {
    return analyzeSequence(selectedActionSequence);
  }, [selectedActionSequence]);

  const availableActions = useMemo(() => {
    if (currentPotState.isBettingClosed || selectedActionSequence.length >= gameState.maxActions) {
      return [];
    }
    return getAvailablePokerActions(selectedActionSequence, playerToAct, gameState.maxActions, 3); // Assuming max 3 raises
  }, [selectedActionSequence, playerToAct, gameState.maxActions, currentPotState.isBettingClosed]);

  // Effect to update fullActionHistory when selectedActionSequence changes
  useEffect(() => {
    const newFullHistory: typeof fullActionHistory = [];
    let tempSequenceForHistory: SelectedActionSequence = [];
    for (let i = 0; i < selectedActionSequence.length; i++) {
      const currentStepInLoop = selectedActionSequence[i];
      const playerForThisStep = tempSequenceForHistory.length % 2 === 0 ? 'Hero' : 'Villain';
      const potStateBeforeThisStep = analyzeSequence(tempSequenceForHistory);
      const allAvailActionsAtThisStep = potStateBeforeThisStep.isBettingClosed || tempSequenceForHistory.length >= gameState.maxActions
                                      ? []
                                      : getAvailablePokerActions(tempSequenceForHistory, playerForThisStep, gameState.maxActions, 3);
      
      newFullHistory.push({
        player: playerForThisStep,
        chosenAction: currentStepInLoop.action,
        allAvailableActions: allAvailActionsAtThisStep,
        originalSequenceStep: currentStepInLoop,
      });
      tempSequenceForHistory.push(currentStepInLoop);
    }
    setFullActionHistory(newFullHistory);
  }, [selectedActionSequence, gameState.maxActions]);


  const handleStartClick = () => {
    setSelectedActionSequence([]);
  };

  const handleHistoryActionClick = (stepIndex: number, actionClicked: PokerAction) => {
    const playerForClickedStep = stepIndex % 2 === 0 ? 'Hero' : 'Villain';
    const newSequence = selectedActionSequence.slice(0, stepIndex);
    newSequence.push({ player: playerForClickedStep, action: actionClicked });
    setSelectedActionSequence(newSequence);
  };

  const handleNextActionSelect = (action: PokerAction) => {
    const newStep: ActionStep = { player: playerToAct, action };
    setSelectedActionSequence(prev => [...prev, newStep]);
  };
  // --- End of Sequence Selector Logic ---
  
  const heroStrategyStrings = useMemo(() => {
    if (!solution) return [];
    // Ensure parseHeroStrategy is available or this logic is self-contained if it was only for RangeExplorerDisplay
    return solution.row_strategy.map((prob, index) => `${prob},"${heroLabels[index]}"`);
  }, [solution, heroLabels]);

  const villainStrategyStrings = useMemo(() => {
    if (!solution) return [];
    return solution.col_strategy.map((prob, index) => `${prob},"${villainLabels[index]}"`);
  }, [solution, villainLabels]);

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
          <Box sx={{m1: 2}}>
            <SequenceSelector
              selectedSequence={selectedActionSequence}
              fullActionHistory={fullActionHistory}
              availableActions={availableActions}
              playerToAct={playerToAct}
              maxStreetActions={gameState.maxActions}
              currentPotStateIsBettingClosed={currentPotState.isBettingClosed}
              handleStartClick={handleStartClick}
              handleHistoryActionClick={handleHistoryActionClick}
              handleNextActionSelect={handleNextActionSelect}
            />
          </Box>
        )}

        {solution && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
              <RangeExplorerDisplay
                maxStreetActions={gameState.maxActions}
                initialHeroPriors={matrixData.heroRangeProbs}
                initialVillainPriors={matrixData.villainRangeProbs}
                heroStrategies={heroStrategyStrings}
                villainStrategies={villainStrategyStrings}
                selectedSequence={selectedActionSequence} // Pass selectedSequence
                // onSequenceChange is no longer needed here as Home manages it
              />
              <StrategyPlotDisplay
                playerType="Hero"
                strategyProbs={solution.row_strategy}
                labels={heroLabels}
                onCopyStrategy={handleCopyHeroStrategy}
                commonPlotLayout={commonPlotLayout}
                windowInnerWidth={windowInnerWidth}
                playerRangesString={gameState.heroRanges}
                playerActions={getHeroActions(gameState.maxActions)}
                selectedActionSequence={selectedActionSequence} // New Prop
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
                selectedActionSequence={selectedActionSequence} // New Prop
              />
            </Box>
            <Box sx={{ mb: 2 }}> {/* Row 2 for ConditionalEVMatrixDisplay */}
              <ConditionalEVMatrixDisplay matrixOutput={conditionalEVMatrix} />
            </Box>
          </>
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