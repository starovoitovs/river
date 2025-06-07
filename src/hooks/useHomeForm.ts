import { useState } from 'react';
import type { GameState } from '../types';

export type ErrorsState = {
  heroRanges: string;
  villainRanges: string;
  equities: string;
  heroFixedStrategy?: string;
  villainFixedStrategy?: string;
};

const initialGameState: GameState = {
  utility: 'linear',
  maxActions: 2,
  heroStack: 100,
  villainStack: 100,
  potSize: 4,
  heroBet: 0.25,
  heroRaise: 1.0,
  hero3bet: 1.0,
  villainBet: 1.0,
  villainRaise: 1.0,
  heroRanges: '1, 4',
  villainRanges: '1',
  equities: '100\n0',
  iterations: 10000,
  learningRate: 0.005,
  convergenceThreshold: 0.001,
  heroFixedStrategyInput: '',
  villainFixedStrategyInput: ''
};

const initialErrorsState: ErrorsState = {
  heroRanges: "",
  villainRanges: "",
  equities: "",
  heroFixedStrategy: "",
  villainFixedStrategy: ""
};

export const useHomeForm = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [errors, setErrors] = useState<ErrorsState>(initialErrorsState);
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleGameStateChange = <K extends keyof GameState>(key: K, value: GameState[K]) => {
    setGameState(prev => ({ ...prev, [key]: value }));
  };

  const handleErrorChange = <K extends keyof ErrorsState>(key: K, value: ErrorsState[K]) => {
    setErrors(prev => ({ ...prev, [key]: value }));
  };
  
  const resetError = (key: keyof ErrorsState) => {
    setErrors(prev => ({ ...prev, [key]: "" }));
  };

  const setFullGameState = (newState: GameState) => {
    // Potentially add validation or merging logic here if needed
    setGameState(newState);
    // Reset errors when a new state is imported
    setErrors(initialErrorsState);
    // Optionally, close all accordions or set a default one
    setExpanded(false);
  };

  return {
    gameState,
    setGameState, // Exposing setGameState directly for now, can be refined
    errors,
    setErrors, // Exposing setErrors directly for now
    expanded,
    handleAccordionChange,
    handleGameStateChange,
    handleErrorChange,
    resetError,
    setFullGameState, // Added this function
    initialGameState // Exporting for potential reset or comparison
  };
};