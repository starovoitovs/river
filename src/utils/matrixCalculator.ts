import type { GameState } from '../types';
import { getHeroActions, getVillainActions } from '../types';
import { getActionPayoffs, calculateIndividualPayoffs } from './calculationHelpers';
import { generateStrategies } from './strategyUtils';

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
  // Convert relative frequencies to probabilities
  const heroRangeValues = heroRanges.split(',').map(s => Number(s));
  const villainRangeValues = villainRanges.split(',').map(s => Number(s));
  
  // Normalize to probabilities
  const heroSum = heroRangeValues.reduce((a, b) => a + b, 0);
  const villainSum = villainRangeValues.reduce((a, b) => a + b, 0);
  const heroRangeProbs = heroRangeValues.map(v => v / heroSum);
  const villainRangeProbs = villainRangeValues.map(v => v / villainSum);

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
  
  const heroActions = getHeroActions(state.maxActions);
  const villainActions = getVillainActions(state.maxActions);
  
  const heroStrategies = generateStrategies(heroRangeProbs.length, heroActions);
  const villainStrategies = generateStrategies(villainRangeProbs.length, villainActions);

  // Create payoff matrices
  const heroMatrix = Array(heroStrategies.length).fill(0)
    .map(() => Array(villainStrategies.length).fill(0));
  const villainMatrix = Array(heroStrategies.length).fill(0)
    .map(() => Array(villainStrategies.length).fill(0));

  // Calculate matrix entries
  heroStrategies.forEach((heroStrategy, i) => {
    villainStrategies.forEach((villainStrategy, j) => {
      let totalHeroValue = 0;
      let totalVillainValue = 0;

      // Calculate payoff for each range combination
      heroStrategy.forEach(([heroRange, currentHeroAction]) => {
        villainStrategy.forEach(([villainRange, currentVillainAction]) => {
          const equity = equityMatrix[heroRange][villainRange];
          const probability = heroRangeProbs[heroRange] * villainRangeProbs[villainRange];
          const { heroValue, villainValue } = getActionPayoffs(
            currentHeroAction,
            currentVillainAction,
            equity,
            state, // Pass relevant parts of state
            initialPot,
            heroBetAmount,
            villainBetAmount,
            heroRaiseAmount,
            villainRaiseAmount,
            hero3betAmount
          );

          totalHeroValue += heroValue * probability;
          totalVillainValue += villainValue * probability;
        });
      });

      const { heroUtility, villainUtility } = calculateIndividualPayoffs(
        totalHeroValue,
        totalVillainValue,
        useLogUtility,
        heroStack,
        villainStack
      );
      heroMatrix[i][j] = heroUtility;
      villainMatrix[i][j] = villainUtility;

    });
  });

  return {
    heroMatrix,
    villainMatrix,
    heroRangeProbs,
    villainRangeProbs,
    equityMatrix
  };
}