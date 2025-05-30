import type { GameState } from './types';
import { getHeroActions, getVillainActions } from './types';
import { create, all } from 'mathjs';

const math = create(all);

function calculateUtility(amount: number, useLogUtility: 'linear' | 'logarithmic', stack: number): number {
  if (useLogUtility === 'logarithmic') {
    // Add stack to avoid log(0) and make small losses less punishing
    return Math.log(Math.max(amount + stack, 0.01));
  }
  return amount;
}

export function calculateMatrix(state: GameState) {
  const {
    useLogUtility,
    heroStack,
    villainStack,
    potSize,
    heroBet,
    heroRaise,
    hero3bet,
    villainBet,
    villainRaise,
    heroRanges,
    villainRanges,
    equities
  } = state;

  // Parse range probabilities and equities matrix
  // Convert percentages to probabilities
  const heroRangeProbs = heroRanges.split(',').map(s => Number(s) / 100);
  const villainRangeProbs = villainRanges.split(',').map(s => Number(s) / 100);
  // Convert percentage values to probabilities
  const equityMatrix = equities.split('\n')
    .map(row => row.split(',')
    .map(s => Number(s.trim()) / 100));

  // Calculate pot and bet sizes
  const initialPot = potSize;
  const heroBetAmount = initialPot * heroBet;
  const villainBetAmount = initialPot * villainBet;
  const potAfterVillainBet = initialPot + 2 * villainBetAmount;
  const heroRaiseAmount = villainBetAmount + (potAfterVillainBet * heroRaise);
  const potAfterHeroBet = initialPot + 2 * heroBetAmount;
  const villainRaiseAmount = heroBetAmount + (potAfterHeroBet * villainRaise);
  const potAfterVillainRaise = potAfterHeroBet + 2 * (villainRaiseAmount - heroBetAmount);
  const hero3betAmount = villainRaiseAmount + (potAfterVillainRaise * hero3bet);

  // Generate all possible strategy combinations
  const generateStrategies = (ranges: number, actions: string[]): [number, string][][] => {
    const result: [number, string][][] = [];
    
    // Calculate total number of combinations
    const totalCombinations = Math.pow(actions.length, ranges);
    
    // For each possible combination
    for (let i = 0; i < totalCombinations; i++) {
      const strategy: [number, string][] = [];
      let tempI = i;
      
      // Convert number to actions using division/modulo
      for (let range = 0; range < ranges; range++) {
        const actionIndex = tempI % actions.length;
        strategy.push([range, actions[actionIndex]]);
        tempI = Math.floor(tempI / actions.length);
      }
      
      result.push(strategy);
    }
    
    return result;
  };
  
  const heroActions = getHeroActions(state.maxActions);
  const villainActions = getVillainActions(state.maxActions);
  
  const heroStrategies = generateStrategies(heroRangeProbs.length, heroActions);
  const villainStrategies = generateStrategies(villainRangeProbs.length, villainActions);

  // Create payoff matrices
  const heroMatrix = Array(heroStrategies.length).fill(0)
    .map(() => Array(villainStrategies.length).fill(0));
  const villainMatrix = Array(heroStrategies.length).fill(0)
    .map(() => Array(villainStrategies.length).fill(0));

  const getActionPayoffs = (heroAction: string, villainAction: string, equity: number) => {

    if (state.maxActions === 2) {
      if (heroAction === 'check') {
        return {
          heroValue: equity * initialPot,
          villainValue: (1 - equity) * initialPot
        };
      } else if (heroAction === 'bet' && villainAction === 'check/fold') {
        return {
          heroValue: initialPot,
          villainValue: 0
        };
      } else if (heroAction === 'bet' && villainAction === 'check/call') {
        return {
          heroValue: equity * (initialPot + 2 * heroBetAmount) - heroBetAmount,
          villainValue: (1 - equity) * (initialPot + 2 * heroBetAmount) - heroBetAmount
        };
      } else{
        throw new Error('Unsupported action combination: ' + heroAction + ', ' + villainAction);
      }
    } else if (state.maxActions === 3) {
      if (heroAction.startsWith('check') && villainAction.startsWith('check')) {
        return {
          heroValue: equity * initialPot,
          villainValue: (1 - equity) * initialPot
        };
      } else if (heroAction == 'check-fold' && villainAction.startsWith('bet')) {
        return {
          heroValue: 0,
          villainValue: initialPot
        };
      } else if (heroAction == 'check-call' && villainAction.startsWith('bet')) {
        return {
          heroValue: equity * (initialPot + 2 * villainBetAmount) - villainBetAmount,
          villainValue: (1 - equity) * (initialPot + 2 * villainBetAmount) - villainBetAmount
        };
      } else if (heroAction.startsWith('bet') && villainAction.endsWith('/fold')) {
        return {
          heroValue: initialPot,
          villainValue: 0
        };
      } else if (heroAction.startsWith('bet') && villainAction.endsWith('/call')) {
        return {
          heroValue: equity * (initialPot + 2 * heroBetAmount) - heroBetAmount,
          villainValue: (1 - equity) * (initialPot + 2 * heroBetAmount) - heroBetAmount
        };
      } else if (heroAction == 'bet-fold' && villainAction.endsWith('raise')) {
        return {
          heroValue: -heroBetAmount,
          villainValue: initialPot + heroBetAmount
        };
      } else if (heroAction == 'bet-call' && villainAction.endsWith('raise')) {
        return {
          heroValue: equity * (initialPot + 2 * villainRaiseAmount) - villainRaiseAmount,
          villainValue: (1 - equity) * (initialPot + 2 * villainRaiseAmount) - villainRaiseAmount
        };
      } else{
        throw new Error('Unsupported action combination: ' + heroAction + ', ' + villainAction);
      }
    } else if (state.maxActions === 4) {
      if (heroAction.startsWith('check') && villainAction.startsWith('check')) {
        return {
          heroValue: equity * initialPot,
          villainValue: (1 - equity) * initialPot
        };
      }
      else if (heroAction == 'check-fold' && villainAction.startsWith('bet')) {
        return {
          heroValue: 0,
          villainValue: initialPot
        };
      } else if (heroAction == 'check-call' && villainAction.startsWith('bet')) {
        return {
          heroValue: equity * (initialPot + 2 * villainBetAmount) - villainBetAmount,
          villainValue: (1 - equity) * (initialPot + 2 * villainBetAmount) - villainBetAmount
        };
      } else if (heroAction == 'check-raise' && villainAction.startsWith('bet-fold')) {
        return {
          heroValue: initialPot + villainBetAmount,
          villainValue: -villainBetAmount
        };
      } else if (heroAction == 'check-raise' && villainAction.startsWith('bet-call')) {
        return {
          heroValue: equity * (initialPot + 2 * heroRaiseAmount) - heroRaiseAmount,
          villainValue: (1 - equity) * (initialPot + 2 * heroRaiseAmount) - heroRaiseAmount
        };
      } else if (heroAction.startsWith('bet') && villainAction.endsWith('/fold')) {
        return {
          heroValue: initialPot,
          villainValue: 0
        };
      } else if (heroAction.startsWith('bet') && villainAction.endsWith('/call')) {
        return {
          heroValue: equity * (initialPot + 2 * heroBetAmount) - heroBetAmount,
          villainValue: (1 - equity) * (initialPot + 2 * heroBetAmount) - heroBetAmount
        };
      } else if (heroAction == 'bet-fold' && villainAction.includes('/raise')) {
        return {
          heroValue: -heroBetAmount,
          villainValue: initialPot + heroBetAmount
        };
      } else if (heroAction == 'bet-call' && villainAction.includes('/raise')) {
        return {
          heroValue: equity * (initialPot + 2 * villainRaiseAmount) - villainRaiseAmount,
          villainValue: (1 - equity) * (initialPot + 2 * villainRaiseAmount) - villainRaiseAmount
        };
      } else if (heroAction == 'bet-3bet' && villainAction.endsWith('raise-fold')) {
        return {
          heroValue: initialPot + villainRaiseAmount,
          villainValue: -villainRaiseAmount
        };
      } else if (heroAction == 'bet-3bet' && villainAction.endsWith('raise-call')) {
        return {
          heroValue: equity * (initialPot + 2 * hero3betAmount) - hero3betAmount,
          villainValue: (1 - equity) * (initialPot + 2 * hero3betAmount) - hero3betAmount
        };
      } else{
        throw new Error('Unsupported action combination: ' + heroAction + ', ' + villainAction);
      }
    } else {
      throw new Error('Unsupported maxActions level: ' + state.maxActions);
    }

  }

  // Helper function to calculate payoffs
  const calculatePayoffs = (heroAmount: number, villainAmount: number) => {
    const heroUtility = calculateUtility(heroAmount, useLogUtility, heroStack);
    const villainUtility = calculateUtility(villainAmount, useLogUtility, villainStack);
    return { heroUtility, villainUtility };
  };

  // Calculate matrix entries
  heroStrategies.forEach((heroStrategy, i) => {
    villainStrategies.forEach((villainStrategy, j) => {
      let totalHeroValue = 0;
      let totalVillainValue = 0;

      // Calculate payoff for each range combination
      heroStrategy.forEach(([heroRange, heroAction]) => {
        villainStrategy.forEach(([villainRange, villainAction]) => {
          const equity = equityMatrix[heroRange][villainRange];
          const probability = heroRangeProbs[heroRange] * villainRangeProbs[villainRange];
          const { heroValue, villainValue } = getActionPayoffs(heroAction, villainAction, equity);

          totalHeroValue += heroValue * probability;
          totalVillainValue += villainValue * probability;
        });
      });

      const { heroUtility, villainUtility } = calculatePayoffs(totalHeroValue, totalVillainValue);
      heroMatrix[i][j] = heroUtility;
      villainMatrix[i][j] = villainUtility;

    });
  });

  return {
    heroMatrix,
    villainMatrix
  };
}

export function solveGame(matrices: { heroMatrix: number[][], villainMatrix: number[][] }) {
  const { heroMatrix, villainMatrix } = matrices;
  // Simple implementation of fictitious play for approximating Nash equilibrium
  const rows = heroMatrix.length;
  const cols = heroMatrix[0].length;
  
  // Initialize average strategies and current strategies
  let row_avg_strategy = Array(rows).fill(1/rows);
  let col_avg_strategy = Array(cols).fill(1/cols);
  let row_current = Array(rows).fill(1/rows);
  let col_current = Array(cols).fill(1/cols);
  
  const iterations = 1000;  // Increase iterations
  const learning_rate = 0.5;  // More aggressive learning rate
  
  for (let i = 0; i < iterations; i++) {
    // Calculate expected payoffs
    const row_payoffs = row_current.map((_, r) =>
      math.sum(heroMatrix[r].map((v, c) => v * col_avg_strategy[c]))
    );
    const col_payoffs = col_current.map((_, c) =>
      math.sum(villainMatrix.map((r, i) => r[c] * row_avg_strategy[i]))
    );

    // Find best responses
    const max_row_payoff = Math.max(...row_payoffs);
    const max_col_payoff = Math.max(...col_payoffs);
    
    // Update current strategies with exponential weights
    row_current = row_payoffs.map(p => Math.exp((p - max_row_payoff) / learning_rate));
    col_current = col_payoffs.map(p => Math.exp((p - max_col_payoff) / learning_rate));
    
    // Normalize current strategies
    const row_sum = math.sum(row_current);
    const col_sum = math.sum(col_current);
    row_current = row_current.map(v => v / row_sum);
    col_current = col_current.map(v => v / col_sum);
    
    // Update average strategies with decaying weight
    const weight = 2 / (i + 2);  // Decay weight for averaging
    row_avg_strategy = row_avg_strategy.map((v, idx) =>
      v * (1 - weight) + row_current[idx] * weight
    );
    col_avg_strategy = col_avg_strategy.map((v, idx) =>
      v * (1 - weight) + col_current[idx] * weight
    );
  }
  
  // Calculate utilities for both players
  const heroUtility = math.sum(heroMatrix.map((row, i) =>
    math.sum(row.map((v, j) => v * row_avg_strategy[i] * col_avg_strategy[j]))
  ));
  
  const villainUtility = math.sum(villainMatrix.map((row, i) =>
    math.sum(row.map((v, j) => v * row_avg_strategy[i] * col_avg_strategy[j]))
  ));
  
  return {
    row_strategy: row_avg_strategy,
    col_strategy: col_avg_strategy,
    heroUtility,
    villainUtility
  };
}
