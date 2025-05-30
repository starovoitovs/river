import type { GameState } from './types';
import { index, columns } from './types';
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
  const heroRangeProbs = heroRanges.split(',').map(Number);
  const villainRangeProbs = villainRanges.split(',').map(Number);
  const equityMatrix = equities.split('\n').map(row => row.split(',').map(Number));

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

  // Generate all possible range-action combinations
  const generateStrategies = (ranges: number, actions: string[]): [number, string][][] => {
    const result: [number, string][][] = [];
    const strategy = new Array(ranges).fill(0);
    
    const generate = (pos: number) => {
      if (pos === ranges) {
        result.push(strategy.map((actionIndex, rangeIndex) =>
          [rangeIndex, actions[actionIndex]] as [number, string]
        ));
        return;
      }
      for (let i = 0; i < actions.length; i++) {
        strategy[pos] = i;
        generate(pos + 1);
      }
    };
    
    generate(0);
    return result;
  };
  
  const heroStrategies = generateStrategies(heroRangeProbs.length, index);
  const villainStrategies = generateStrategies(villainRangeProbs.length, columns);

  // Create payoff matrices
  const heroMatrix = Array(heroStrategies.length).fill(0)
    .map(() => Array(villainStrategies.length).fill(0));
  const villainMatrix = Array(heroStrategies.length).fill(0)
    .map(() => Array(villainStrategies.length).fill(0));

  // Helper function to calculate payoffs based on actions
  const getActionPayoffs = (heroAction: string, villainAction: string, equity: number) => {
    let heroBets = 0;     // Total amount hero has bet
    let villainBets = 0;  // Total amount villain has bet
    let isShowdown = false;
    
    // Calculate all bets made in the sequence
    if (heroAction.startsWith('bet')) {
      heroBets += heroBetAmount;
      if (heroAction === 'bet-3bet' && villainAction.includes('raise')) {
        if (villainAction.includes('call')) {
          heroBets += hero3betAmount - heroBetAmount;  // Additional amount for 3bet
          villainBets += hero3betAmount;  // Villain calls full 3bet amount
        } else {
          villainBets += villainRaiseAmount;  // Villain only made raise
        }
      } else if (villainAction.includes('raise') && !heroAction.includes('3bet')) {
        villainBets += villainRaiseAmount;  // Villain raised
      } else if (villainAction.includes('call')) {
        villainBets += heroBetAmount;  // Villain called
      }
    } else if (heroAction.startsWith('check')) {
      if (!villainAction.startsWith('check')) {
        villainBets += villainBetAmount;  // Villain bet after check
        if (heroAction === 'check-raise') {
          if (villainAction.includes('call')) {
            heroBets += heroRaiseAmount;
            villainBets += heroRaiseAmount - villainBetAmount;  // Additional call amount
          }
        } else if (heroAction === 'check-call') {
          heroBets += villainBetAmount;  // Hero called villain's bet
        }
      }
    }

    // Calculate pot size
    const totalPot = initialPot + heroBets + villainBets;

    // Determine showdown or fold
    isShowdown = (
      (heroAction === 'check-call' && villainAction.startsWith('check')) ||  // Both checked
      (heroAction === 'check-call' && villainAction.includes('bet')) ||      // Bet-call
      (heroAction === 'check-raise' && villainAction.includes('call')) ||    // Raise-call
      (heroAction === 'bet-call' && villainAction.includes('call')) ||      // Bet-call
      (heroAction === 'bet-3bet' && villainAction.includes('raise-call'))    // 3bet-call
    );

    if (isShowdown) {
      // Split pot according to equity
      return {
        heroValue: equity * totalPot - heroBets,
        villainValue: (1 - equity) * totalPot - villainBets
      };
    } else {
      // Someone folded - assign pot to non-folding player
      if (heroAction.endsWith('fold') && (heroAction !== 'bet-fold' || !villainAction.endsWith('/fold')) ||
          (villainAction.includes('bet') && heroAction === 'check-call')) {
        // Hero folded
        return {
          heroValue: -heroBets,
          villainValue: totalPot - villainBets
        };
      } else {
        // Villain folded
        return {
          heroValue: totalPot - heroBets,
          villainValue: -villainBets
        };
      }
    }
  };

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