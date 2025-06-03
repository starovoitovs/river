import { useState, useEffect } from 'react';
import { calculateMatrix, solveGame } from '../utils';
import type { GameState, GameTreeNode } from '../types';
import { generateStrategyLabels } from '../components/home/uiLogicUtils';
import { validateFixedStrategyInput, validateRanges, validateEquitiesMatrix } from '../components/home/validationUtils';
import type { ErrorsState } from './useHomeForm';
import { type ConditionalEVMatrixOutput } from '../utils/conditionalEVCalculator';
import {
  type ParsedPlayerStrategy,
  parseHeroStrategy,
  parseVillainStrategy
  // ActionStep, PokerAction, getAvailablePokerActions will be used by gameTreeCalculator
} from '../utils/strategySequenceHelper';
import { calculateAndBuildGameTree } from '../utils/gameTreeCalculator';

export type MatrixCalculationResult = ReturnType<typeof calculateMatrix>; // More robust way to get the type

// This type should align with the return type of solveGame
export type SolutionResult = { // Renamed for clarity and export
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

export const useGameCalculation = (initialGameState: GameState) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [matrixData, setMatrixData] = useState<MatrixCalculationResult>(initialMatrixState);
  const [solution, setSolution] = useState<SolutionResult>(null);
  const [conditionalEVMatrix, setConditionalEVMatrix] = useState<ConditionalEVMatrixOutput | null>(null);

  // New state for parsed strategies
  const [allParsedHeroStrategies, setAllParsedHeroStrategies] = useState<ParsedPlayerStrategy[]>([]);
  const [allParsedVillainStrategies, setAllParsedVillainStrategies] = useState<ParsedPlayerStrategy[]>([]);

  // Updated state for independent Hero/Villain range conditioning
  const [selectedHeroRangeIndex, setSelectedHeroRangeIndex] = useState<number | null>(null);
  const [selectedVillainRangeIndex, setSelectedVillainRangeIndex] = useState<number | null>(null);

  // New state for game tree
  const [gameTreeData, setGameTreeData] = useState<GameTreeNode[] | undefined>(undefined);

  const handleCalculate = (
    currentGameState: GameState, // Will be set to internal gameState
    updateErrors: (newErrors: ErrorsState) => void
  ) => {
    setGameState(currentGameState); // Update internal game state

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

      if (newSolution && newSolution.row_strategy && newSolution.col_strategy) {
        try {
          const parsedHeroStrats = heroLabels.map((label, index) =>
            parseHeroStrategy(`${newSolution.row_strategy[index]},"${label}"`)
          );
          setAllParsedHeroStrategies(parsedHeroStrats);
        } catch (e) {
          console.error("Error parsing hero strategies:", e);
          setAllParsedHeroStrategies([]);
        }
        try {
          const parsedVillainStrats = villainLabels.map((label, index) =>
            parseVillainStrategy(`${newSolution.col_strategy[index]},"${label}"`)
          );
          setAllParsedVillainStrategies(parsedVillainStrats);
        } catch (e) {
          console.error("Error parsing villain strategies:", e);
          setAllParsedVillainStrategies([]);
        }
      } else {
        setAllParsedHeroStrategies([]);
        setAllParsedVillainStrategies([]);
        setConditionalEVMatrix(null); // Clear if no solution
      }
    } else {
      // If validation fails, ensure solution and derived states are cleared
      setSolution(null);
      setMatrixData(initialMatrixState);
      setConditionalEVMatrix(null);
      setAllParsedHeroStrategies([]);
      setAllParsedVillainStrategies([]);
      setGameTreeData(undefined);
    }
  };
  
  // Placeholder for game tree calculation useEffect
  useEffect(() => {
    if (
      solution &&
      allParsedHeroStrategies.length > 0 &&
      allParsedVillainStrategies.length > 0 &&
      matrixData.heroRangeProbs && matrixData.heroRangeProbs.length > 0 &&
      matrixData.villainRangeProbs && matrixData.villainRangeProbs.length > 0
    ) {
      const tree = calculateAndBuildGameTree(
        gameState,
        allParsedHeroStrategies,
        allParsedVillainStrategies,
        matrixData.heroRangeProbs,
        matrixData.villainRangeProbs,
        // Pass selectedHeroRangeIndex and selectedVillainRangeIndex directly
        // The calculateAndBuildGameTree function will know they are for Hero and Villain respectively
        selectedHeroRangeIndex !== null ? selectedHeroRangeIndex : undefined,
        selectedVillainRangeIndex !== null ? selectedVillainRangeIndex : undefined
      );
      setGameTreeData(tree);
    } else {
      setGameTreeData(undefined);
    }
  }, [
      solution,
      allParsedHeroStrategies,
      allParsedVillainStrategies,
      matrixData.heroRangeProbs,
      matrixData.villainRangeProbs,
      gameState,
      selectedHeroRangeIndex, // Updated dependency
      selectedVillainRangeIndex  // Updated dependency
    ]);

  return {
    gameState,
    matrixData,
    solution,
    conditionalEVMatrix,
    allParsedHeroStrategies,
    allParsedVillainStrategies,
    gameTreeData,
    // Expose new conditioning state and setters
    selectedHeroRangeIndex,
    selectedVillainRangeIndex,
    handleCalculate,
    setConditionalEVMatrix,
    setSelectedHeroRangeIndex,
    setSelectedVillainRangeIndex,
  };
};