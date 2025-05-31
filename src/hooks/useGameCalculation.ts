import { useState } from 'react';
import { calculateMatrix, solveGame } from '../utils';
import type { GameState } from '../types';
import { generateStrategyLabels } from '../components/home/uiLogicUtils';
import { validateFixedStrategyInput, validateRanges, validateEquitiesMatrix } from '../components/home/validationUtils';
import type { ErrorsState } from './useHomeForm';

type MatrixState = {
  heroMatrix: number[][];
  villainMatrix: number[][];
};

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

const initialMatrixState: MatrixState = { heroMatrix: [], villainMatrix: [] };

export const useGameCalculation = () => {
  const [matrix, setMatrix] = useState<MatrixState>(initialMatrixState);
  const [solution, setSolution] = useState<SolutionState>(null);

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
      const calculatedMatrix = calculateMatrix(currentGameState);
      setMatrix(calculatedMatrix);
      
      setSolution(solveGame({
        ...calculatedMatrix,
        iterations: currentGameState.iterations,
        learningRate: currentGameState.learningRate,
        convergenceThreshold: currentGameState.convergenceThreshold,
        heroFixedStrategies: parsedHeroFixedStrategy,
        villainFixedStrategies: parsedVillainFixedStrategy,
      }));
    } else {
      // If validation fails, ensure solution is cleared
      setSolution(null);
      setMatrix(initialMatrixState);
    }
  };

  return {
    matrix,
    solution,
    handleCalculate,
    // Exposing setters if direct manipulation is needed, though handleCalculate is the primary way to update
    setMatrix, 
    setSolution
  };
};