export function calculateUtility(amount: number, useLogUtility: 'linear' | 'logarithmic', stack: number): number {
  if (useLogUtility === 'logarithmic') {
    // Add stack to avoid log(0) and make small losses less punishing
    return Math.log(Math.max(amount + stack, 0.01));
  }
  return amount;
}
import type { GameState } from '../types'; // Added import for GameState

export const getActionPayoffs = (
  heroAction: string,
  villainAction: string,
  equity: number,
  state: Pick<GameState, 'maxActions'>, // Use Pick for only necessary properties
  initialPot: number,
  heroBetAmount: number,
  villainBetAmount: number,
  heroRaiseAmount: number,
  villainRaiseAmount: number,
  hero3betAmount: number
) => {
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
};
export const calculateIndividualPayoffs = (
  heroAmount: number,
  villainAmount: number,
  useLogUtility: 'linear' | 'logarithmic',
  heroStack: number,
  villainStack: number
) => {
  const heroUtility = calculateUtility(heroAmount, useLogUtility, heroStack);
  const villainUtility = calculateUtility(villainAmount, useLogUtility, villainStack);
  return { heroUtility, villainUtility };
};