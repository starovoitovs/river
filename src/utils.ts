import type { GameState, Index, Column } from './types';
import { index, columns } from './types';
import { create, all } from 'mathjs';

const math = create(all);

function calculateUtility(amount: number, useLogUtility: boolean, stack: number): number {
  if (useLogUtility) {
    // Add stack to avoid log(0) and make small losses less punishing
    return Math.log(Math.max(amount + stack, 0.01));
  }
  return amount;
}

export function calculateMatrix(state: GameState) {
  const {
    useLogUtility,
    stack,
    potPercent,
    heroBet,
    heroRaise,
    hero3bet,
    villainBet,
    villainRaise,
    pwinInitial,
    pwinAfterVillainBet,
    pwinAfterVillainRaise
  } = state;

  // Calculate initial pot in BB
  const initialPot = stack * potPercent / 100;

  // Helper function to calculate sequential bet sizes
  const calculateBetSequence = (pot: number, ...fractions: number[]) => {
    let currentPot = pot;
    let totalBet = 0;

    return fractions.map(fraction => {
      const betSize = currentPot * fraction;
      totalBet += betSize;
      currentPot += 2 * betSize; // Add bet and call to pot
      return totalBet;
    });
  };

  const matrix = Array(index.length).fill(0).map(() => Array(columns.length).fill(0));

  // Helper function to calculate payoffs ensuring zero-sum property
  const calculatePayoff = (heroAmount: number, villainAmount: number) => {
    const heroUtility = calculateUtility(heroAmount, useLogUtility, stack);
    const villainUtility = calculateUtility(villainAmount, useLogUtility, stack);
    return heroUtility - villainUtility;
  };

  // Helper function to set matrix values
  const setValues = (rows: Index[], cols: Column[], heroValue: number, villainValue: number) => {
    rows.forEach(row => {
      cols.forEach(col => {
        const rowIndex = index.indexOf(row);
        const colIndex = columns.indexOf(col);
        if (rowIndex !== -1 && colIndex !== -1) {
          matrix[rowIndex][colIndex] = calculatePayoff(heroValue, villainValue);
        }
      });
    });
  };

  // Calculate bet sequences
  const [heroBetAmount] = calculateBetSequence(initialPot, heroBet);
  const [villainBetAmount] = calculateBetSequence(initialPot, villainBet);
  const [heroRaiseAfterCall] = calculateBetSequence(initialPot + 2 * villainBetAmount, heroRaise);
  const [villainRaiseAmount] = calculateBetSequence(initialPot + 2 * heroBetAmount, villainRaise);
  const [hero3betAmount] = calculateBetSequence(
    initialPot + 2 * heroBetAmount + 2 * villainRaiseAmount,
    hero3bet
  );

  // Initial check situations
  setValues(
    ['check-fold', 'check-call', 'check-raise'],
    ['check/fold', 'check/call', 'check/raise-fold', 'check/raise-call'],
    pwinInitial * initialPot,
    (1 - pwinInitial) * initialPot
  );

  // Check against bet scenarios
  setValues(['check-fold'], ['bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call'],
    0, initialPot + villainBetAmount);
  setValues(['check-call'], ['bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call'],
    pwinAfterVillainBet * (initialPot + villainBetAmount) - (1 - pwinAfterVillainBet) * villainBetAmount,
    (1 - pwinAfterVillainBet) * (initialPot + villainBetAmount) - pwinAfterVillainBet * villainBetAmount);
  setValues(['check-raise'], ['bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call'],
    initialPot + villainBetAmount, 0);

  setValues(['check-fold'], ['bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call'],
    0, initialPot + villainBetAmount);
  setValues(['check-call'], ['bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call'],
    pwinAfterVillainBet * (initialPot + villainBetAmount) - (1 - pwinAfterVillainBet) * villainBetAmount,
    (1 - pwinAfterVillainBet) * (initialPot + villainBetAmount) - pwinAfterVillainBet * villainBetAmount);
  setValues(['check-raise'], ['bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call'],
    pwinAfterVillainBet * (initialPot + villainBetAmount + heroRaiseAfterCall) - (1 - pwinAfterVillainBet) * heroRaiseAfterCall,
    (1 - pwinAfterVillainBet) * (initialPot + villainBetAmount + heroRaiseAfterCall) - pwinAfterVillainBet * heroRaiseAfterCall);

  // Bet scenarios
  setValues(['bet-fold', 'bet-call', 'bet-3bet'], ['check/fold', 'bet-fold/fold', 'bet-call/fold'],
    initialPot, 0);
  setValues(['bet-fold', 'bet-call', 'bet-3bet'], ['check/call', 'bet-fold/call', 'bet-call/call'],
    pwinInitial * (initialPot + heroBetAmount) - (1 - pwinInitial) * heroBetAmount,
    (1 - pwinInitial) * (initialPot + heroBetAmount) - pwinInitial * heroBetAmount);

  setValues(['bet-fold'], ['check/raise-fold', 'bet-fold/raise-fold', 'bet-call/raise-fold'],
    -heroBetAmount, initialPot + heroBetAmount);
  setValues(['bet-call'], ['check/raise-fold', 'bet-fold/raise-fold', 'bet-call/raise-fold'],
    pwinAfterVillainRaise * (initialPot + heroBetAmount + villainRaiseAmount) - (1 - pwinAfterVillainRaise) * (heroBetAmount + villainRaiseAmount),
    (1 - pwinAfterVillainRaise) * (initialPot + heroBetAmount + villainRaiseAmount) - pwinAfterVillainRaise * (heroBetAmount + villainRaiseAmount));
  setValues(['bet-3bet'], ['check/raise-fold', 'bet-fold/raise-fold', 'bet-call/raise-fold'],
    initialPot + heroBetAmount + villainRaiseAmount, 0);

  setValues(['bet-fold'], ['check/raise-call', 'bet-fold/raise-call', 'bet-call/raise-call'],
    -heroBetAmount, initialPot + heroBetAmount);
  setValues(['bet-call'], ['check/raise-call', 'bet-fold/raise-call', 'bet-call/raise-call'],
    pwinAfterVillainRaise * (initialPot + heroBetAmount + villainRaiseAmount) - (1 - pwinAfterVillainRaise) * (heroBetAmount + villainRaiseAmount),
    (1 - pwinAfterVillainRaise) * (initialPot + heroBetAmount + villainRaiseAmount) - pwinAfterVillainRaise * (heroBetAmount + villainRaiseAmount));
  setValues(['bet-3bet'], ['check/raise-call', 'bet-fold/raise-call', 'bet-call/raise-call'],
    pwinAfterVillainRaise * (initialPot + heroBetAmount + villainRaiseAmount + hero3betAmount) - (1 - pwinAfterVillainRaise) * (heroBetAmount + villainRaiseAmount + hero3betAmount),
    (1 - pwinAfterVillainRaise) * (initialPot + heroBetAmount + villainRaiseAmount + hero3betAmount) - pwinAfterVillainRaise * (heroBetAmount + villainRaiseAmount + hero3betAmount));

  return matrix;
}

export function solveGame(matrix: number[][]) {
  // Simple implementation of fictitious play for approximating Nash equilibrium
  const rows = matrix.length;
  const cols = matrix[0].length;
  
  let row_strategy = Array(rows).fill(1/rows);
  let col_strategy = Array(cols).fill(1/cols);
  
  const iterations = 1000;
  const learning_rate = 0.1;
  
  for (let i = 0; i < iterations; i++) {
    // Update row player strategy
    const row_payoffs = row_strategy.map((_, r) => 
      math.sum(matrix[r].map((v, c) => v * col_strategy[c]))
    );
    const best_row = row_payoffs.indexOf(Math.max(...row_payoffs));
    row_strategy = row_strategy.map((v, idx) => 
      idx === best_row ? v + learning_rate * (1 - v) : v * (1 - learning_rate)
    );
    
    // Update column player strategy
    const col_payoffs = col_strategy.map((_, c) => 
      -math.sum(matrix.map((r, i) => r[c] * row_strategy[i]))
    );
    const best_col = col_payoffs.indexOf(Math.max(...col_payoffs));
    col_strategy = col_strategy.map((v, idx) => 
      idx === best_col ? v + learning_rate * (1 - v) : v * (1 - learning_rate)
    );
    
    // Normalize strategies
    const row_sum = math.sum(row_strategy);
    const col_sum = math.sum(col_strategy);
    row_strategy = row_strategy.map(v => v / row_sum);
    col_strategy = col_strategy.map(v => v / col_sum);
  }
  
  // Calculate utility
  const utility = math.sum(matrix.map((row, i) => 
    math.sum(row.map((v, j) => v * row_strategy[i] * col_strategy[j]))
  ));
  
  return {
    row_strategy,
    col_strategy,
    utility
  };
}