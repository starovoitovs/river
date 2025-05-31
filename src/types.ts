export interface GameState {
  useLogUtility: 'linear' | 'logarithmic';
  maxActions: number;         // Maximum number of actions (2, 3, or 4)
  heroStack: number;          // Hero stack size in BB
  villainStack: number;       // Villain stack size in BB
  potSize: number;           // Initial pot size in big blinds
  heroBet: number;           // Bet sizes as fractions of current pot
  heroRaise: number;
  hero3bet: number;
  villainBet: number;
  villainRaise: number;
  heroRanges: string;        // Comma-separated probabilities for hero's ranges
  villainRanges: string;     // Comma-separated probabilities for villain's ranges
  equities: string;          // Comma-separated equities for each range combination
  iterations: number;        // Number of solver iterations
  learningRate: number;      // Learning rate for solver
  convergenceThreshold: number; // Convergence threshold for solver
  heroFixedStrategyInput?: string; // Optional fixed hero strategy input
  villainFixedStrategyInput?: string; // Optional fixed villain strategy input
}

export const getHeroActions = (maxActions: number): string[] => {
  switch (maxActions) {
    case 2:
      return ['check', 'bet'];
    case 3:
      return ['check-fold', 'check-call', 'bet-fold', 'bet-call'];
    case 4:
      return ['check-fold', 'check-call', 'check-raise', 'bet-fold', 'bet-call', 'bet-3bet'];
    default:
      return [];
  }
};

export const getVillainActions = (maxActions: number): string[] => {
  switch (maxActions) {
    case 2:
      return [
        'check/fold',
        'check/call'
      ];
    case 3:
      return [
        'check/fold', 'check/call', 'check/raise',
        'bet/fold', 'bet/call', 'bet/raise'
      ];
    case 4:
      return [
        'check/fold', 'check/call', 'check/raise-fold', 'check/raise-call',
        'bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call',
        'bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call',
      ];
    default:
      return [];
  }
};

// Everything needed is in getHeroActions and getVillainActions