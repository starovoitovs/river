import type { GameState, Index, Column } from './types';
import { index, columns } from './types';
import { create, all } from 'mathjs';

const math = create(all);

export function calculateMatrix(state: GameState) {
  const {
    pot,
    heroBet,
    heroRaise,
    hero3bet,
    villainBet,
    villainRaise,
    pwinInitial,
    pwinAfterVillainBet,
    pwinAfterVillainRaise
  } = state;

  const matrix = Array(index.length).fill(0).map(() => Array(columns.length).fill(0));

  // Helper function to set matrix values
  const setValues = (rows: Index[], cols: Column[], value: number) => {
    rows.forEach(row => {
      cols.forEach(col => {
        const rowIndex = index.indexOf(row);
        const colIndex = columns.indexOf(col);
        if (rowIndex !== -1 && colIndex !== -1) {
          matrix[rowIndex][colIndex] = value;
        }
      });
    });
  };

  // Initial check situations
  setValues(
    ['check-fold', 'check-call', 'check-raise'],
    ['check/fold', 'check/call', 'check/raise-fold', 'check/raise-call'],
    pwinInitial * pot
  );

  // Check against bet scenarios
  setValues(['check-fold'], ['bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call'], 0);
  setValues(['check-call'], ['bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call'],
    pwinAfterVillainBet * (pot + villainBet) - (1 - pwinAfterVillainBet) * villainBet);
  setValues(['check-raise'], ['bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call'],
    pot + villainBet);

  setValues(['check-fold'], ['bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call'], 0);
  setValues(['check-call'], ['bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call'],
    pwinAfterVillainBet * (pot + villainBet) - (1 - pwinAfterVillainBet) * villainBet);
  setValues(['check-raise'], ['bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call'],
    pwinAfterVillainBet * (pot + villainBet + heroRaise) - (1 - pwinAfterVillainBet) * (villainBet + heroRaise));

  // Bet scenarios
  setValues(['bet-fold', 'bet-call', 'bet-3bet'], ['check/fold', 'bet-fold/fold', 'bet-call/fold'], pot);
  setValues(['bet-fold', 'bet-call', 'bet-3bet'], ['check/call', 'bet-fold/call', 'bet-call/call'],
    pwinInitial * (pot + heroBet) - (1 - pwinInitial) * heroBet);

  setValues(['bet-fold'], ['check/raise-fold', 'bet-fold/raise-fold', 'bet-call/raise-fold'], -heroBet);
  setValues(['bet-call'], ['check/raise-fold', 'bet-fold/raise-fold', 'bet-call/raise-fold'],
    pwinAfterVillainRaise * (pot + heroBet + villainRaise) - (1 - pwinAfterVillainRaise) * (heroBet + villainRaise));
  setValues(['bet-3bet'], ['check/raise-fold', 'bet-fold/raise-fold', 'bet-call/raise-fold'],
    pot + heroBet + villainRaise);

  setValues(['bet-fold'], ['check/raise-call', 'bet-fold/raise-call', 'bet-call/raise-call'], -heroBet);
  setValues(['bet-call'], ['check/raise-call', 'bet-fold/raise-call', 'bet-call/raise-call'],
    pwinAfterVillainRaise * (pot + heroBet + villainRaise) - (1 - pwinAfterVillainRaise) * (heroBet + villainRaise));
  setValues(['bet-3bet'], ['check/raise-call', 'bet-fold/raise-call', 'bet-call/raise-call'],
    pwinAfterVillainRaise * (pot + heroBet + villainRaise + hero3bet) - (1 - pwinAfterVillainRaise) * (heroBet + villainRaise + hero3bet));

  // Make it zero-sum by subtracting half the pot
  return matrix.map(row => row.map(value => value - pot / 2));
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