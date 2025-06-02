import { useEffect, useState, useMemo } from 'react';
import { Box, Drawer, Toolbar, Button, Modal, TextField, Typography, Stack } from '@mui/material';
import type { SelectedActionSequence, ActionStep, PokerAction } from '../utils/strategySequenceHelper'; // Added ActionStep, PokerAction
import { dump, load } from 'js-yaml';
import type { GameState } from '../types';

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
  calculateConditionalRangeProbs, // Added
  parseHeroStrategy,               // Added
  parseVillainStrategy,            // Added
} from '../utils/strategySequenceHelper'; // Added imports for sequence logic
import type { ParsedPlayerStrategy, ConditionalRangeProbsResult } from '../utils/strategySequenceHelper'; // Added

// Common Plot Layout (can be further refined or moved to a constants/config file)
const commonPlotLayout = {
  font: {
    size: 10
  },
  margin: { t: 0, b: 0, l: 0, r: 0 } // Default, can be overridden by specific plots
};

// Helper function to compare arrays of numbers
const areArraysEqual = (arr1: number[] | undefined, arr2: number[] | undefined): boolean => {
  if (arr1 === arr2) return true; // Same reference
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
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
    resetError,
    setFullGameState // Added for import functionality
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

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

  // --- Start of Probability Calculation Logic (moved from RangeExplorerDisplay) ---
  const [conditionalHeroProbs, setConditionalHeroProbs] = useState<number[]>([]);
  const [conditionalVillainProbs, setConditionalVillainProbs] = useState<number[]>([]);
  const [overallSequenceProbability, setOverallSequenceProbability] = useState<number>(1.0);

  const heroStrategyStringsForCalc = useMemo(() => {
    if (!solution) return [];
    return solution.row_strategy.map((prob, index) => `${prob},"${heroLabels[index]}"`);
  }, [solution, heroLabels]);

  const villainStrategyStringsForCalc = useMemo(() => {
    if (!solution) return [];
    return solution.col_strategy.map((prob, index) => `${prob},"${villainLabels[index]}"`);
  }, [solution, villainLabels]);

  const parsedHeroStrategiesForCalc: ParsedPlayerStrategy[] = useMemo(() => {
    if (!heroStrategyStringsForCalc.length) return [];
    try {
      return heroStrategyStringsForCalc.map(s => parseHeroStrategy(s));
    } catch (e) {
      console.error("Error parsing hero strategies in Home.tsx:", e);
      return [];
    }
  }, [heroStrategyStringsForCalc]);

  const parsedVillainStrategiesForCalc: ParsedPlayerStrategy[] = useMemo(() => {
    if (!villainStrategyStringsForCalc.length) return [];
    try {
      return villainStrategyStringsForCalc.map(s => parseVillainStrategy(s));
    } catch (e) {
      console.error("Error parsing villain strategies in Home.tsx:", e);
      return [];
    }
  }, [villainStrategyStringsForCalc]);

  useEffect(() => {
    let newHeroProbs: number[];
    let newVillainProbs: number[];
    let newOverallProb: number;

    const currentInitialHeroPriors = matrixData.heroRangeProbs;
    const currentInitialVillainPriors = matrixData.villainRangeProbs;

    if (parsedHeroStrategiesForCalc.length > 0 &&
        parsedVillainStrategiesForCalc.length > 0 &&
        currentInitialHeroPriors && currentInitialVillainPriors) {
      const results: ConditionalRangeProbsResult = calculateConditionalRangeProbs(
        selectedActionSequence,
        parsedHeroStrategiesForCalc,
        parsedVillainStrategiesForCalc,
        currentInitialHeroPriors,
        currentInitialVillainPriors,
        gameState.maxActions
      );
      newHeroProbs = results.heroProbs;
      newVillainProbs = results.villainProbs;
      newOverallProb = results.totalSequenceProb;
    } else if (selectedActionSequence.length === 0 && currentInitialHeroPriors && currentInitialVillainPriors) {
      newHeroProbs = currentInitialHeroPriors;
      newVillainProbs = currentInitialVillainPriors;
      newOverallProb = 1.0;
    } else {
      // Default if strategies or initial priors are not ready
      newHeroProbs = currentInitialHeroPriors || [];
      newVillainProbs = currentInitialVillainPriors || [];
      newOverallProb = 1.0;
    }

    if (!areArraysEqual(conditionalHeroProbs, newHeroProbs)) {
      setConditionalHeroProbs(newHeroProbs);
    }
    if (!areArraysEqual(conditionalVillainProbs, newVillainProbs)) {
      setConditionalVillainProbs(newVillainProbs);
    }
    if (overallSequenceProbability !== newOverallProb) {
      setOverallSequenceProbability(newOverallProb);
    }

  }, [
    selectedActionSequence,
    parsedHeroStrategiesForCalc,
    parsedVillainStrategiesForCalc,
    matrixData.heroRangeProbs, // Dependency: if this is a new ref, effect runs
    matrixData.villainRangeProbs, // Dependency: if this is a new ref, effect runs
    gameState.maxActions,
    // Current state values (conditionalHeroProbs, etc.) are NOT added to dependencies here
    // as this effect is responsible for setting them. The areArraysEqual check prevents unnecessary setStates.
  ]);
  // --- End of Probability Calculation Logic ---
  
  // These are still used by RangeExplorerDisplay for its own strategy parsing if needed,
  // and by StrategyPlotDisplay for labels.
  const heroStrategyStrings = useMemo(() => {
    if (!solution) return [];
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

  const handleExport = () => {
    try {
      const yamlString = dump(gameState);
      navigator.clipboard.writeText(yamlString);
    } catch (error) {
      console.error('Error exporting game state:', error);
      alert('Error exporting game state. See console for details.');
    }
  };

  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportText(''); // Clear text on close
  };

  const handleImportTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportText(event.target.value);
  };

  const handleImportSubmit = () => {
    try {
      const rawImportedData = load(importText);

      if (typeof rawImportedData !== 'object' || rawImportedData === null) {
        alert('Invalid game state format: Not an object.');
        return;
      }

      const importedState = rawImportedData as Partial<GameState>; // Cast as partial for checking

      const requiredNumericFields: (keyof GameState)[] = [
        'maxActions', 'heroStack', 'villainStack', 'potSize',
        'heroBet', 'heroRaise', 'hero3bet', 'villainBet', 'villainRaise',
        'iterations', 'learningRate', 'convergenceThreshold'
      ];
      const requiredStringFields: (keyof GameState)[] = [
        'useLogUtility', 'heroRanges', 'villainRanges', 'equities'
      ];

      for (const field of requiredNumericFields) {
        if (typeof importedState[field] !== 'number') {
          alert(`Invalid game state: Field '${field}' is missing or not a number.`);
          return;
        }
      }

      for (const field of requiredStringFields) {
        if (typeof importedState[field] !== 'string') {
          alert(`Invalid game state: Field '${field}' is missing or not a string.`);
          return;
        }
      }
      
      if (importedState.useLogUtility !== 'linear' && importedState.useLogUtility !== 'logarithmic') {
        alert(`Invalid game state: Field 'useLogUtility' must be 'linear' or 'logarithmic'.`);
        return;
      }

      // Optional fields: check type if present
      if (importedState.heroFixedStrategyInput !== undefined && typeof importedState.heroFixedStrategyInput !== 'string') {
        alert(`Invalid game state: Field 'heroFixedStrategyInput' must be a string if present.`);
        return;
      }
      if (importedState.villainFixedStrategyInput !== undefined && typeof importedState.villainFixedStrategyInput !== 'string') {
        alert(`Invalid game state: Field 'villainFixedStrategyInput' must be a string if present.`);
        return;
      }

      // If all checks pass, cast to full GameState and proceed
      const validatedGameState = importedState as GameState;

      setFullGameState(validatedGameState);
      handleCalculate(validatedGameState, setErrors);
      handleCloseImportModal();

    } catch (error) {
      console.error('Error importing game state:', error);
      let message = 'Error importing game state. Make sure it is valid YAML.';
      if (error instanceof Error) {
        message += ` Details: ${error.message}`;
      }
      alert(message);
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
          <Stack spacing={1} sx={{ mb: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleExport}
            >
              Copy Config
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleOpenImportModal}
            >
              Import Config
            </Button>
          </Stack>
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

      <Modal
        open={isImportModalOpen}
        onClose={handleCloseImportModal}
        aria-labelledby="import-game-state-modal-title"
        aria-describedby="import-game-state-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
        }}>
          <Typography id="import-game-state-modal-title" variant="h6" component="h2">
            Import Game State (YAML)
          </Typography>
          <TextField
            id="import-game-state-modal-description"
            multiline
            rows={15}
            fullWidth
            variant="outlined"
            value={importText}
            onChange={handleImportTextChange}
            placeholder="Paste your YAML game state here..."
            sx={{ mt: 2, mb: 2 }}
          />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={handleCloseImportModal}>Cancel</Button>
            <Button variant="contained" onClick={handleImportSubmit}>Import</Button>
          </Stack>
        </Box>
      </Modal>

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
                initialHeroPriors={matrixData.heroRangeProbs || []}
                initialVillainPriors={matrixData.villainRangeProbs || []}
                heroStrategies={heroStrategyStrings} // For internal parsing if still needed by RED
                villainStrategies={villainStrategyStrings} // For internal parsing if still needed by RED
                selectedSequence={selectedActionSequence}
                conditionalHeroProbs={conditionalHeroProbs} // New Prop
                conditionalVillainProbs={conditionalVillainProbs} // New Prop
                overallSequenceProbability={overallSequenceProbability} // New Prop
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
                selectedActionSequence={selectedActionSequence}
                overallSequenceProbability={overallSequenceProbability} // New Prop
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
                selectedActionSequence={selectedActionSequence}
                overallSequenceProbability={overallSequenceProbability} // New Prop
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