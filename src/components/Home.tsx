import { useEffect, useState, useMemo } from 'react';
import { Box, Drawer, Toolbar, Button, Modal, TextField, Typography, Stack } from '@mui/material';
import type { SelectedActionSequence, ActionStep, PokerAction } from '../utils/strategySequenceHelper';
import { dump, load } from 'js-yaml';
import type { GameState } from '../types';
import { generateStrategies } from '../utils/strategyUtils';
import { calculateConditionalEVMatrix as calculateConditionalEVMatrixUtil } from '../utils/conditionalEVCalculator';
import type { ConditionalEVMatrixInput } from '../utils/conditionalEVCalculator';

// Hooks
import { useHomeForm } from '../hooks/useHomeForm';
import { useGameCalculation } from '../hooks/useGameCalculation';

// UI and Logic Utilities
import { generateStrategyLabels, formatMatrixForDisplay, copyStrategyToClipboard } from './home/uiLogicUtils';
import { getHeroActions, getVillainActions } from '../types';

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
import { ConditionalEVMatrixDisplay } from './home/results/ConditionalEVMatrixDisplay';
import { SequenceSelector } from './home/results/SequenceSelector';
import GameTreeDisplay from './home/results/GameTreeDisplay';
import RangeConditioningButtons from './home/results/RangeConditioningButtons';
import {
  analyzeSequence,
  getAvailablePokerActions,
  calculateConditionalRangeProbs,
  parseHeroStrategy,
  parseVillainStrategy,
} from '../utils/strategySequenceHelper';
import type { ParsedPlayerStrategy, ConditionalRangeProbsResult } from '../utils/strategySequenceHelper';

const commonPlotLayout = {
  font: { size: 10 },
  margin: { t: 0, b: 0, l: 0, r: 0 }
};

const areArraysEqual = (arr1: number[] | undefined, arr2: number[] | undefined): boolean => {
  if (arr1 === arr2) return true;
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
};

export default function Home() {
  const {
    gameState,
    errors,
    setErrors,
    expanded,
    handleAccordionChange,
    handleGameStateChange,
    resetError,
    setFullGameState
  } = useHomeForm();

  const {
    matrixData,
    solution,
    conditionalEVMatrix,
    handleCalculate,
    setConditionalEVMatrix,
    gameTreeData,
    selectedHeroRangeIndex,
    selectedVillainRangeIndex,
    setSelectedHeroRangeIndex,
    setSelectedVillainRangeIndex,
  } = useGameCalculation(gameState);

  const [windowInnerWidth, setWindowInnerWidth] = useState(window.innerWidth);
  const [selectedActionSequence, setSelectedActionSequence] = useState<SelectedActionSequence>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    const handleResize = () => setWindowInnerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { heroLabels, villainLabels } = useMemo(() => {
    return generateStrategyLabels(gameState.heroRanges, gameState.villainRanges, gameState.maxActions);
  }, [gameState.heroRanges, gameState.villainRanges, gameState.maxActions]);
  
  const reversedMatrixData = formatMatrixForDisplay(matrixData.heroMatrix, matrixData.villainMatrix);

  const onCalculate = () => {
    handleCalculate(gameState, setErrors);
  };

  const [fullActionHistory, setFullActionHistory] = useState<Array<{ player: 'Hero' | 'Villain'; chosenAction: PokerAction; allAvailableActions: PokerAction[]; originalSequenceStep: ActionStep; }>>([]);

  const playerToAct = useMemo((): 'Hero' | 'Villain' => (selectedActionSequence.length % 2 === 0 ? 'Hero' : 'Villain'), [selectedActionSequence]);
  const currentPotState = useMemo(() => analyzeSequence(selectedActionSequence), [selectedActionSequence]);
  const availableActions = useMemo(() => {
    if (currentPotState.isBettingClosed || selectedActionSequence.length >= gameState.maxActions) return [];
    return getAvailablePokerActions(selectedActionSequence, playerToAct, gameState.maxActions, 3);
  }, [selectedActionSequence, playerToAct, gameState.maxActions, currentPotState.isBettingClosed]);

  useEffect(() => {
    const newFullHistory: typeof fullActionHistory = [];
    let tempSequenceForHistory: SelectedActionSequence = [];
    for (let i = 0; i < selectedActionSequence.length; i++) {
      const currentStepInLoop = selectedActionSequence[i];
      const playerForThisStep = tempSequenceForHistory.length % 2 === 0 ? 'Hero' : 'Villain';
      const potStateBeforeThisStep = analyzeSequence(tempSequenceForHistory);
      const allAvailActionsAtThisStep = potStateBeforeThisStep.isBettingClosed || tempSequenceForHistory.length >= gameState.maxActions ? [] : getAvailablePokerActions(tempSequenceForHistory, playerForThisStep, gameState.maxActions, 3);
      newFullHistory.push({ player: playerForThisStep, chosenAction: currentStepInLoop.action, allAvailableActions: allAvailActionsAtThisStep, originalSequenceStep: currentStepInLoop });
      tempSequenceForHistory.push(currentStepInLoop);
    }
    setFullActionHistory(newFullHistory);
  }, [selectedActionSequence, gameState.maxActions]);

  const handleStartClick = () => setSelectedActionSequence([]);
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
    try { return heroStrategyStringsForCalc.map(s => parseHeroStrategy(s)); } 
    catch (e) { console.error("Error parsing hero strategies in Home.tsx:", e); return []; }
  }, [heroStrategyStringsForCalc]);

  const parsedVillainStrategiesForCalc: ParsedPlayerStrategy[] = useMemo(() => {
    if (!villainStrategyStringsForCalc.length) return [];
    try { return villainStrategyStringsForCalc.map(s => parseVillainStrategy(s)); }
    catch (e) { console.error("Error parsing villain strategies in Home.tsx:", e); return []; }
  }, [villainStrategyStringsForCalc]);

  useEffect(() => {
    let newHeroProbs: number[];
    let newVillainProbs: number[];
    let newOverallProb: number;
    const currentInitialHeroPriors = matrixData.heroRangeProbs;
    const currentInitialVillainPriors = matrixData.villainRangeProbs;

    if (parsedHeroStrategiesForCalc.length > 0 && parsedVillainStrategiesForCalc.length > 0 && currentInitialHeroPriors && currentInitialVillainPriors) {
      const results: ConditionalRangeProbsResult = calculateConditionalRangeProbs(selectedActionSequence, parsedHeroStrategiesForCalc, parsedVillainStrategiesForCalc, currentInitialHeroPriors, currentInitialVillainPriors, gameState.maxActions);
      newHeroProbs = results.heroProbs;
      newVillainProbs = results.villainProbs;
      newOverallProb = results.totalSequenceProb;
    } else if (selectedActionSequence.length === 0 && currentInitialHeroPriors && currentInitialVillainPriors) {
      newHeroProbs = currentInitialHeroPriors;
      newVillainProbs = currentInitialVillainPriors;
      newOverallProb = 1.0;
    } else {
      newHeroProbs = currentInitialHeroPriors || [];
      newVillainProbs = currentInitialVillainPriors || [];
      newOverallProb = 1.0;
    }
    if (!areArraysEqual(conditionalHeroProbs, newHeroProbs)) setConditionalHeroProbs(newHeroProbs);
    if (!areArraysEqual(conditionalVillainProbs, newVillainProbs)) setConditionalVillainProbs(newVillainProbs);
    if (overallSequenceProbability !== newOverallProb) setOverallSequenceProbability(newOverallProb);
  }, [selectedActionSequence, parsedHeroStrategiesForCalc, parsedVillainStrategiesForCalc, matrixData.heroRangeProbs, matrixData.villainRangeProbs, gameState.maxActions, conditionalHeroProbs, conditionalVillainProbs, overallSequenceProbability]);

  useEffect(() => {
    if (solution && matrixData.equityMatrix?.length > 0 && conditionalHeroProbs?.length > 0 && conditionalVillainProbs?.length > 0 && setConditionalEVMatrix) {
      const heroActionsList = getHeroActions(gameState.maxActions);
      const villainActionsList = getVillainActions(gameState.maxActions);
      const numHeroConditionedRanges = conditionalHeroProbs.length;
      const numVillainConditionedRanges = conditionalVillainProbs.length;
      const heroPureStrategies = generateStrategies(numHeroConditionedRanges, heroActionsList);
      const villainPureStrategies = generateStrategies(numVillainConditionedRanges, villainActionsList);
      const currentHeroRangeLabels = conditionalHeroProbs.map((_, i) => `H${i + 1}`);
      const currentVillainRangeLabels = conditionalVillainProbs.map((_, i) => `V${i + 1}`);
      const conditionalEVInput: ConditionalEVMatrixInput = {
        gameState: gameState,
        heroRangeProbs: conditionalHeroProbs,
        villainRangeProbs: conditionalVillainProbs,
        equityMatrix: matrixData.equityMatrix,
        rowStrategy: solution.row_strategy,
        colStrategy: solution.col_strategy,
        heroPureStrategies,
        villainPureStrategies,
        heroActions: heroActionsList,
        villainActions: villainActionsList,
        heroRangeLabels: currentHeroRangeLabels,
        villainRangeLabels: currentVillainRangeLabels,
      };
      const calculatedMatrix = calculateConditionalEVMatrixUtil(conditionalEVInput);
      // Add selectedActionSequence to the matrix output for the display component
      const newConditionalMatrixWithSequence = calculatedMatrix ? {
        ...calculatedMatrix,
        selectedActionSequence: selectedActionSequence // Add the sequence here
      } : null;
      setConditionalEVMatrix(newConditionalMatrixWithSequence);
    } else if (setConditionalEVMatrix) {
      setConditionalEVMatrix(null);
    }
  }, [solution, matrixData.equityMatrix, conditionalHeroProbs, conditionalVillainProbs, gameState, setConditionalEVMatrix, heroLabels, villainLabels]);

  const numHeroRangesForButtons = matrixData.heroRangeProbs?.length || 0;
  const numVillainRangesForButtons = matrixData.villainRangeProbs?.length || 0;

  const handleCopyHeroStrategy = () => { if (solution) copyStrategyToClipboard(solution.row_strategy, heroLabels); };
  const handleCopyVillainStrategy = () => { if (solution) copyStrategyToClipboard(solution.col_strategy, villainLabels); };
  const handleExport = () => { try { const yamlString = dump(gameState); navigator.clipboard.writeText(yamlString); } catch (error) { console.error('Error exporting game state:', error); alert('Error exporting game state. See console for details.'); } };
  const handleOpenImportModal = () => setIsImportModalOpen(true);
  const handleCloseImportModal = () => { setIsImportModalOpen(false); setImportText(''); };
  const handleImportTextChange = (event: React.ChangeEvent<HTMLInputElement>) => setImportText(event.target.value);
  const handleImportSubmit = () => {
    try {
      const rawImportedData = load(importText);
      if (typeof rawImportedData !== 'object' || rawImportedData === null) { alert('Invalid game state format: Not an object.'); return; }
      const importedState = rawImportedData as Partial<GameState>;
      const requiredNumericFields: (keyof GameState)[] = ['maxActions', 'heroStack', 'villainStack', 'potSize', 'heroBet', 'heroRaise', 'hero3bet', 'villainBet', 'villainRaise', 'iterations', 'learningRate', 'convergenceThreshold'];
      const requiredStringFields: (keyof GameState)[] = ['utility', 'heroRanges', 'villainRanges', 'equities'];
      for (const field of requiredNumericFields) if (typeof importedState[field] !== 'number') { alert(`Invalid game state: Field '${field}' is missing or not a number.`); return; }
      for (const field of requiredStringFields) if (typeof importedState[field] !== 'string') { alert(`Invalid game state: Field '${field}' is missing or not a string.`); return; }
      if (importedState.utility !== 'linear' && importedState.utility !== 'logarithmic') { alert(`Invalid game state: Field 'utility' must be 'linear' or 'logarithmic'.`); return; }
      if (importedState.heroFixedStrategyInput !== undefined && typeof importedState.heroFixedStrategyInput !== 'string') { alert(`Invalid game state: Field 'heroFixedStrategyInput' must be a string if present.`); return; }
      if (importedState.villainFixedStrategyInput !== undefined && typeof importedState.villainFixedStrategyInput !== 'string') { alert(`Invalid game state: Field 'villainFixedStrategyInput' must be a string if present.`); return; }
      const validatedGameState = importedState as GameState;
      setFullGameState(validatedGameState);
      handleCalculate(validatedGameState, setErrors);
      handleCloseImportModal();
    } catch (error) { console.error('Error importing game state:', error); let message = 'Error importing game state. Make sure it is valid YAML.'; if (error instanceof Error) { message += ` Details: ${error.message}`; } alert(message); }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', paddingBottom: '80px', }, }}>
        <Toolbar variant="dense"/>
        <Box sx={{ overflowX: 'hidden', height: '100%' }}>
          <StackAndPotSettings gameState={gameState} handleGameStateChange={handleGameStateChange} expanded={expanded} handleAccordionChange={handleAccordionChange} />
          <RangeSettings gameState={gameState} errors={errors} handleGameStateChange={handleGameStateChange} resetError={resetError} expanded={expanded} handleAccordionChange={handleAccordionChange} />
          <ActionsAndBetsSettings gameState={gameState} handleGameStateChange={handleGameStateChange} expanded={expanded} handleAccordionChange={handleAccordionChange} />
          <FixedStrategiesSettings gameState={gameState} errors={errors} handleGameStateChange={handleGameStateChange} resetError={resetError} expanded={expanded} handleAccordionChange={handleAccordionChange} />
          <SolverSettings gameState={gameState} handleGameStateChange={handleGameStateChange} expanded={expanded} handleAccordionChange={handleAccordionChange} />
        </Box>
        <Box sx={{ position: 'fixed', bottom: 0, width: `${DRAWER_WIDTH}px`, padding: 2, backgroundColor: 'background.paper', borderTop: 1, borderRight: 1, borderColor: 'divider' }}>
          <Stack spacing={1} sx={{ mb: 1 }}>
            <Button variant="outlined" fullWidth onClick={handleOpenImportModal}>Import Config</Button>
            <Button variant="outlined" fullWidth onClick={handleExport}>Copy Config</Button>
          </Stack>
          <Button variant="contained" fullWidth size="large" onClick={onCalculate}>Calculate</Button>
        </Box>
      </Drawer>

      <Modal open={isImportModalOpen} onClose={handleCloseImportModal} aria-labelledby="import-game-state-modal-title" aria-describedby="import-game-state-modal-description">
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4, }}>
          <Typography id="import-game-state-modal-title" variant="h6" component="h2">Import Game State (YAML)</Typography>
          <TextField id="import-game-state-modal-description" multiline rows={15} fullWidth variant="outlined" value={importText} onChange={handleImportTextChange} placeholder="Paste your YAML game state here..." sx={{ mt: 2, mb: 2 }} />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={handleCloseImportModal}>Cancel</Button>
            <Button variant="contained" onClick={handleImportSubmit}>Import</Button>
          </Stack>
        </Box>
      </Modal>

      <Box component="main" sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        
        {solution && (
          <ConvergenceIndicatorsDisplay
            solution={solution}
            gameStateIterations={gameState.iterations}
            convergenceThreshold={gameState.convergenceThreshold}
            heroRangeProbs={matrixData.heroRangeProbs}
            villainRangeProbs={matrixData.villainRangeProbs}
            equityMatrix={matrixData.equityMatrix}
          />
        )}
        
        {/* Row 1: Sequence Selector (75%) | RangeConditioningButtons (25%) */}
        {solution && (
          <>
            <Typography sx={{fontWeight: 500}}>
              Condition on action sequence/ranges
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 2, alignItems: 'start' }}>
              <SequenceSelector
                selectedSequence={selectedActionSequence}
                fullActionHistory={fullActionHistory}
                availableActions={availableActions}
                playerToAct={playerToAct}
                maxStreetActions={gameState.maxActions}
                currentPotStateIsBettingClosed={currentPotState.isBettingClosed}
                overallSequenceProbability={overallSequenceProbability}
                handleStartClick={handleStartClick}
                handleHistoryActionClick={handleHistoryActionClick}
                handleNextActionSelect={handleNextActionSelect}
              />
              <RangeConditioningButtons
                selectedHeroIndex={selectedHeroRangeIndex}
                selectedVillainIndex={selectedVillainRangeIndex}
                onSelectHeroIndex={setSelectedHeroRangeIndex}
                onSelectVillainIndex={setSelectedVillainRangeIndex}
                numHeroRanges={numHeroRangesForButtons}
                numVillainRanges={numVillainRangesForButtons}
              />
            </Box>
          </>
        )}

        {/* Row 2: Conditionals (1/3) | Game Tree (1/3) | Strategies (1/3) */}
        {solution && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, alignItems: 'start' }}>
            {/* Column 1: Conditionals */}
            <Box> 
              <ConditionalEVMatrixDisplay matrixOutput={conditionalEVMatrix} />
            </Box>

            {/* Column 2: Game Tree */}
            <GameTreeDisplay
              treeData={gameTreeData}
              title="Game Tree"
              externalHeroConditioningIndex={selectedHeroRangeIndex}
              externalVillainConditioningIndex={selectedVillainRangeIndex}
            />

          </Box>
        )}

        {/* Row 2: Conditionals (1/3) | Game Tree (1/3) | Strategies (1/3) */}
        {solution && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, alignItems: 'start' }}>

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
              overallSequenceProbability={overallSequenceProbability}
              externalHeroConditioningIndex={selectedHeroRangeIndex}
              externalVillainConditioningIndex={selectedVillainRangeIndex}
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
              overallSequenceProbability={overallSequenceProbability}
              externalHeroConditioningIndex={selectedHeroRangeIndex}
              externalVillainConditioningIndex={selectedVillainRangeIndex}
            />
            
          </Box>
        )}

        {solution && matrixData.heroMatrix.length > 0 && (
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