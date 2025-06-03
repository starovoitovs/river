import type { GameState } from '../types';
import { getActionPayoffs, calculateIndividualPayoffs } from './calculationHelpers';

// Define the structure for a cell in the Conditional EV Matrix
export interface ConditionalEVCell {
  pJoint: number;
  heroEvConditional: number;
  villainEvConditional: number;
}

// Define the structure for the output of the main calculation function
export interface ConditionalEVMatrixOutput {
  matrix: ConditionalEVCell[][];
  heroRangeCategoryLabels: string[];
  villainRangeCategoryLabels: string[];
  heroVerificationValue?: number;
  villainVerificationValue?: number;
}

// Define the expected inputs for the main calculation function
export interface ConditionalEVMatrixInput {
  gameState: GameState;
  heroRangeProbs: number[]; // P(Hero has Hm)
  villainRangeProbs: number[]; // P(Villain has Vn)
  equityMatrix: number[][]; // Equity for Hero in Hm vs Vn
  rowStrategy: number[]; // Hero's converged mixed strategy (probs over pure strategies)
  colStrategy: number[]; // Villain's converged mixed strategy (probs over pure strategies)
  heroPureStrategies: [number, string][][]; // Hero's pure strategies [rangeIdx, actionName][]
  villainPureStrategies: [number, string][][]; // Villain's pure strategies
  heroActions: string[]; // Available actions for Hero
  villainActions: string[]; // Available actions for Villain
  heroRangeLabels: string[]; // e.g., ["H1", "H2"]
  villainRangeLabels: string[]; // e.g., ["V1", "V2"]
}

export function calculateConditionalEVMatrix(
  inputs: ConditionalEVMatrixInput
): ConditionalEVMatrixOutput {
  const {
    gameState,
    heroRangeProbs,
    villainRangeProbs,
    equityMatrix,
    rowStrategy,
    colStrategy,
    heroPureStrategies,
    villainPureStrategies,
    heroActions,
    villainActions,
    heroRangeLabels,
    villainRangeLabels,
  } = inputs;

  const numHeroRanges = heroRangeProbs.length;
  const numVillainRanges = villainRangeProbs.length;

  // Calculate pot and bet sizes from gameState, similar to matrixCalculator.ts
  const {
    potSize,
    heroBet,
    villainBet,
    heroRaise,
    villainRaise,
    hero3bet,
    maxActions, // For getActionPayoffs state param
    utility, // For calculateIndividualPayoffs
    heroStack, // For calculateIndividualPayoffs
    villainStack // For calculateIndividualPayoffs
  } = gameState;

  const initialPot = potSize;
  const heroBetAmount = initialPot * heroBet;
  const villainBetAmount = initialPot * villainBet;

  // Pot after villain bets, for hero's raise calculation
  const potAfterVillainBet = initialPot + villainBetAmount + villainBetAmount; // initialPot + 2 * villainBetAmount (villain's bet + hero's call to match)
  const heroRaiseAmountOnTopOfVillainBet = villainBetAmount + (potAfterVillainBet * heroRaise); // Hero's total bet if they raise over villain's bet

  // Pot after hero bets, for villain's raise calculation
  const potAfterHeroBet = initialPot + heroBetAmount + heroBetAmount; // initialPot + 2 * heroBetAmount
  const villainRaiseAmountOnTopOfHeroBet = heroBetAmount + (potAfterHeroBet * villainRaise); // Villain's total bet if they raise over hero's bet
  
  // Pot after villain raises over hero's bet, for hero's 3-bet calculation
  // This assumes a sequence: Hero bets, Villain raises, Hero 3-bets
  const potAfterVillainRaise = potAfterHeroBet + (villainRaiseAmountOnTopOfHeroBet - heroBetAmount) + (villainRaiseAmountOnTopOfHeroBet - heroBetAmount); // pot after hero bet + villain's raise amount + hero's call to match villain's raise
  const hero3BetAmountOnTopOfVillainRaise = villainRaiseAmountOnTopOfHeroBet + (potAfterVillainRaise * hero3bet);


  const outputMatrix: ConditionalEVCell[][] = Array(numHeroRanges)
    .fill(null)
    .map(() => Array(numVillainRanges).fill(null).map(() => ({ pJoint: 0, heroEvConditional: 0, villainEvConditional: 0 })));

  let totalHeroVerificationValue = 0;
  let totalVillainVerificationValue = 0;

  for (let hm_idx = 0; hm_idx < numHeroRanges; hm_idx++) {
    for (let vn_idx = 0; vn_idx < numVillainRanges; vn_idx++) {
      const pJoint = heroRangeProbs[hm_idx] * villainRangeProbs[vn_idx];
      let currentHeroConditionalEV = 0;
      let currentVillainConditionalEV = 0;

      // Determine Hero's action probabilities given they hold Hm
      const heroActionProbs: { [action: string]: number } = {};
      heroActions.forEach(act => heroActionProbs[act] = 0);

      heroPureStrategies.forEach((pureStrategy, i) => {
        const pureStrategyProb = rowStrategy[i];
        if (pureStrategyProb > 0) {
          // Find the action for the current hero range hm_idx in this pure strategy
          const actionForRange = pureStrategy.find(a => a[0] === hm_idx);
          if (actionForRange) {
            heroActionProbs[actionForRange[1]] += pureStrategyProb;
          }
        }
      });
      
      // Normalize heroActionProbs if sum is not 1 (it should be, due to rowStrategy summing to 1)
      // For safety, though practically, sum(rowStrategy) is 1.
      // const heroActionProbSum = Object.values(heroActionProbs).reduce((s, p) => s + p, 0);
      // if (heroActionProbSum > 0 && Math.abs(heroActionProbSum - 1) > 1e-9) { // Check for floating point issues
      //   Object.keys(heroActionProbs).forEach(act => heroActionProbs[act] /= heroActionProbSum);
      // }


      // Determine Villain's action probabilities given they hold Vn
      const villainActionProbs: { [action: string]: number } = {};
      villainActions.forEach(act => villainActionProbs[act] = 0);

      villainPureStrategies.forEach((pureStrategy, i) => {
        const pureStrategyProb = colStrategy[i];
        if (pureStrategyProb > 0) {
          // Find the action for the current villain range vn_idx in this pure strategy
          const actionForRange = pureStrategy.find(a => a[0] === vn_idx);
          if (actionForRange) {
            villainActionProbs[actionForRange[1]] += pureStrategyProb;
          }
        }
      });
      // Normalize villainActionProbs (similar safety check as for hero)

      // Calculate weighted average payoff
      for (const h_action of heroActions) {
        const probHeroTakesHAction = heroActionProbs[h_action] || 0;
        if (probHeroTakesHAction === 0) continue;

        for (const v_action of villainActions) {
          const probVillainTakesVAction = villainActionProbs[v_action] || 0;
          if (probVillainTakesVAction === 0) continue;

          const probActionMatchup = probHeroTakesHAction * probVillainTakesVAction;

          if (probActionMatchup > 0) {
            const { heroValue, villainValue } = getActionPayoffs(
              h_action,
              v_action,
              equityMatrix[hm_idx][vn_idx],
              { maxActions }, // Use destructured maxActions
              initialPot, // Use pre-calculated initialPot
              heroBetAmount, // Use pre-calculated heroBetAmount
              villainBetAmount, // Use pre-calculated villainBetAmount
              heroRaiseAmountOnTopOfVillainBet, // Use pre-calculated heroRaiseAmountOnTopOfVillainBet
              villainRaiseAmountOnTopOfHeroBet, // Use pre-calculated villainRaiseAmountOnTopOfHeroBet
              hero3BetAmountOnTopOfVillainRaise // Use pre-calculated hero3BetAmountOnTopOfVillainRaise
            );

            const { heroUtility, villainUtility } = calculateIndividualPayoffs(
              heroValue,
              villainValue,
              utility, // Use destructured utility
              heroStack, // Use destructured heroStack
              villainStack // Use destructured villainStack
            );
            currentHeroConditionalEV += probActionMatchup * heroUtility;
            currentVillainConditionalEV += probActionMatchup * villainUtility;
          }
        }
      }
      outputMatrix[hm_idx][vn_idx] = { pJoint, heroEvConditional: currentHeroConditionalEV, villainEvConditional: currentVillainConditionalEV };
      if (pJoint > 0) { // Avoid issues with 0 probability matchups
        totalHeroVerificationValue += pJoint * currentHeroConditionalEV;
        totalVillainVerificationValue += pJoint * currentVillainConditionalEV;
      }
    }
  }

  return {
    matrix: outputMatrix,
    heroRangeCategoryLabels: heroRangeLabels,
    villainRangeCategoryLabels: villainRangeLabels,
    heroVerificationValue: totalHeroVerificationValue,
    villainVerificationValue: totalVillainVerificationValue,
  };
}