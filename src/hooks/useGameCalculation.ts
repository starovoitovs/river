import { useState } from 'react';
import { calculateMatrix, solveGame } from '../utils';
import { generateStrategies } from '../utils/strategyUtils'; // Corrected import path
import type { GameState } from '../types';
import { getHeroActions, getVillainActions } from '../types'; // Added action getters
import { generateStrategyLabels } from '../components/home/uiLogicUtils';
import { validateFixedStrategyInput, validateRanges, validateEquitiesMatrix } from '../components/home/validationUtils';
import type { ErrorsState } from './useHomeForm';
import {
  calculateConditionalEVMatrix,
  type ConditionalEVMatrixOutput,
  // type ConditionalEVMatrixInput // Input type not strictly needed here for state
} from '../utils/conditionalEVCalculator';

export type MatrixCalculationResult = ReturnType<typeof calculateMatrix>; // More robust way to get the type

// This type should align with the return type of solveGame
type SolutionState = {
  row_strategy: number[];
  col_strategy: number[];
  heroUtility: number;
  villainUtility: number;
  convergenceHistory: {
    heroUtility: number;
    villainUtility: number;
    heroExploitability: number;
    villainExploitability: number;
    iteration: number;
  }[];
  convergedAtIteration: number | null;
} | null;

const initialMatrixState: MatrixCalculationResult = {
  heroMatrix: [],
  villainMatrix: [],
  heroRangeProbs: [],
  villainRangeProbs: [],
  equityMatrix: []
};

export const useGameCalculation = () => {
  const [matrixData, setMatrixData] = useState<MatrixCalculationResult>(initialMatrixState);
  const [solution, setSolution] = useState<SolutionState>(null);
  const [conditionalEVMatrix, setConditionalEVMatrix] = useState<ConditionalEVMatrixOutput | null>(null);

  const handleCalculate = (
    currentGameState: GameState,
    updateErrors: (newErrors: ErrorsState) => void
  ) => {
    const { heroLabels, villainLabels } = generateStrategyLabels(
      currentGameState.heroRanges,
      currentGameState.villainRanges,
      currentGameState.maxActions
    );

    const [heroFixedValid, heroFixedError, parsedHeroFixedStrategy] = validateFixedStrategyInput(
      currentGameState.heroFixedStrategyInput,
      heroLabels
    );
    const [villainFixedValid, villainFixedError, parsedVillainFixedStrategy] = validateFixedStrategyInput(
      currentGameState.villainFixedStrategyInput,
      villainLabels
    );

    const newErrors: ErrorsState = {
      heroRanges: validateRanges(currentGameState.heroRanges)[1],
      villainRanges: validateRanges(currentGameState.villainRanges)[1],
      equities: validateEquitiesMatrix(
        currentGameState.equities,
        currentGameState.heroRanges,
        currentGameState.villainRanges
      )[1],
      heroFixedStrategy: heroFixedError,
      villainFixedStrategy: villainFixedError,
    };

    updateErrors(newErrors);

    const [heroRangesValid] = validateRanges(currentGameState.heroRanges);
    const [villainRangesValid] = validateRanges(currentGameState.villainRanges);

    if (heroRangesValid && villainRangesValid && !newErrors.equities && heroFixedValid && villainFixedValid) {
      const calculatedMatrixResult = calculateMatrix(currentGameState);
      setMatrixData(calculatedMatrixResult);
      
      const newSolution = solveGame({
        heroMatrix: calculatedMatrixResult.heroMatrix,
        villainMatrix: calculatedMatrixResult.villainMatrix,
        iterations: currentGameState.iterations,
        learningRate: currentGameState.learningRate,
        convergenceThreshold: currentGameState.convergenceThreshold,
        heroFixedStrategies: parsedHeroFixedStrategy,
        villainFixedStrategies: parsedVillainFixedStrategy,
      });
      setSolution(newSolution);

      if (newSolution) {
        const heroActions = getHeroActions(currentGameState.maxActions);
        const villainActions = getVillainActions(currentGameState.maxActions);
        
        // Ensure heroRangeProbs is not empty before generating strategies
        const numHeroRanges = calculatedMatrixResult.heroRangeProbs.length;
        const numVillainRanges = calculatedMatrixResult.villainRangeProbs.length;

        if (numHeroRanges > 0 && numVillainRanges > 0) {
          const heroPureStrategies = generateStrategies(numHeroRanges, heroActions);
          const villainPureStrategies = generateStrategies(numVillainRanges, villainActions);

          // Create simple range labels for now
          const heroRangeLabels = calculatedMatrixResult.heroRangeProbs.map((_, i) => `H${i + 1}`);
          const villainRangeLabels = calculatedMatrixResult.villainRangeProbs.map((_, i) => `V${i + 1}`);

          const conditionalEVInput = {
            gameState: currentGameState,
            heroRangeProbs: calculatedMatrixResult.heroRangeProbs,
            villainRangeProbs: calculatedMatrixResult.villainRangeProbs,
            equityMatrix: calculatedMatrixResult.equityMatrix,
            rowStrategy: newSolution.row_strategy,
            colStrategy: newSolution.col_strategy,
            heroPureStrategies,
            villainPureStrategies,
            heroActions,
            villainActions,
            heroRangeLabels,
            villainRangeLabels,
          };
          setConditionalEVMatrix(calculateConditionalEVMatrix(conditionalEVInput));
        } else {
           setConditionalEVMatrix(null); // Cannot calculate if ranges are not defined
        }
      } else {
        setConditionalEVMatrix(null);
      }

    } else {
      // If validation fails, ensure solution is cleared
      setSolution(null);
      setMatrixData(initialMatrixState);
      setConditionalEVMatrix(null);
    }
  };

  return {
    matrixData, // Renamed from matrix to matrixData for clarity
    solution,
    conditionalEVMatrix, // Added new state
    handleCalculate,
    // Exposing setters if direct manipulation is needed, though handleCalculate is the primary way to update
    setMatrixData,
    setSolution,
    setConditionalEVMatrix
  };
};