import { getHeroActions, getVillainActions } from '../../types';
import type { GameState } from '../../types';
import { ANNOTATION_THRESHOLD } from './homeConstants';

export const calculateBetAmounts = (
  potSize: number,
  heroBet: number,
  villainBet: number,
  heroRaise: number,
  villainRaise: number,
  hero3bet: number
) => {
  const initialPot = potSize;
  
  // Hero bet - direct pot fraction
  const heroBetSize = initialPot * heroBet;
  
  // Villain bet - direct pot fraction
  const villainBetSize = initialPot * villainBet;
  
  // Hero raise after villain bet
  // First call villain's bet, then add raise based on new pot
  const potAfterVillainBet = initialPot + 2 * villainBetSize;
  const heroRaiseSize = villainBetSize + (potAfterVillainBet * heroRaise);
  
  // Villain raise after hero bet
  // First call hero's bet, then add raise based on new pot
  const potAfterHeroBet = initialPot + 2 * heroBetSize;
  const villainRaiseSize = heroBetSize + (potAfterHeroBet * villainRaise);
  
  // Hero 3bet - first call villain's raise, then add raise based on new pot
  const potAfterVillainRaise = potAfterHeroBet + 2 * (villainRaiseSize - heroBetSize);
  const hero3betSize = villainRaiseSize + (potAfterVillainRaise * hero3bet);

  return {
    heroBet: Math.round(heroBetSize),
    villainBet: Math.round(villainBetSize),
    heroRaise: Math.round(heroRaiseSize),
    villainRaise: Math.round(villainRaiseSize),
    hero3bet: Math.round(hero3betSize)
  };
};

// Generate row and column labels
export const generateStrategyLabels = (
  heroRangesStr: string,
  villainRangesStr: string,
  maxActions: GameState['maxActions']
) => {
  const heroRangesCount = heroRangesStr.split(',').length;
  const villainRangesCount = villainRangesStr.split(',').length;
  
  const heroActions = getHeroActions(maxActions);
  const villainActions = getVillainActions(maxActions);
  
  // Generate hero labels (e.g., "H1:cf,H2:bc")
  const heroLabels: string[] = [];
  for (let i = 0; i < Math.pow(heroActions.length, heroRangesCount); i++) {
    let strategy = [];
    let temp = i;
    for (let r = 0; r < heroRangesCount; r++) {
      const action = heroActions[temp % heroActions.length];
      // Abbreviate actions
      const shortAction = action
        .split('-')
        .map((part: string) => part[0] + (part[1] || ''))
        .join('-');
      strategy.push(`H${r+1}:${shortAction}`);
      temp = Math.floor(temp / heroActions.length);
    }
    heroLabels.push(strategy.join(','));
  }

  // Generate villain labels with abbreviated actions
  const villainLabels: string[] = [];
  for (let i = 0; i < Math.pow(villainActions.length, villainRangesCount); i++) {
    let strategy = [];
    let temp = i;
    for (let r = 0; r < villainRangesCount; r++) {
      const fullAction = villainActions[temp % villainActions.length];
      // Split into base action and response
      const [baseAction, response] = fullAction.split('/');
      
      // Abbreviate base action
      const shortBaseAction = baseAction
        .replace('check-fold', 'ch-fo')
        .replace('check-call', 'ch-ca')
        .replace('check-raise', 'ch-3b')
        .replace('bet-fold', 'be-fo')
        .replace('bet-call', 'be-ca')
        .replace('bet-3bet', 'be-3b')
        .replace('raise-fold', 'ra-fo')
        .replace('raise-call', 'ra-ca')
        .replace('check', 'ch')
        .replace('bet', 'be')
        .replace('raise', 'ra')
        .replace('fold', 'fo')
        .replace('call', 'ca');

      // Abbreviate response
      const shortResponse = (response || '')
        .replace('check-fold', 'ch-fo')
        .replace('check-call', 'ch-ca')
        .replace('check-raise', 'ch-3b')
        .replace('bet-fold', 'be-fo')
        .replace('bet-call', 'be-ca')
        .replace('bet-3bet', 'be-3b')
        .replace('raise-fold', 'ra-fo')
        .replace('raise-call', 'ra-ca')
        .replace('check', 'ch')
        .replace('bet', 'be')
        .replace('raise', 'ra')
        .replace('fold', 'fo')
        .replace('call', 'ca');

      // Combine with slash
      const shortAction = shortBaseAction + (response ? '/' + shortResponse : '');
      strategy.push(`V${r+1}:${shortAction}`);
      temp = Math.floor(temp / villainActions.length);
    }
    villainLabels.push(strategy.join(','));
  }

  return { heroLabels, villainLabels };
};

export const formatMatrixForDisplay = (heroMatrix: number[][], villainMatrix: number[][]) => {
  return heroMatrix.slice().reverse().map((row, i) =>
    row.map((heroVal, j) => ({
      hero: heroVal,
      villain: villainMatrix[heroMatrix.length - 1 - i][j]
    }))
  );
};

export const copyStrategyToClipboard = (strategyProbs: number[], labels: string[]) => {
  const formattedStrategy = strategyProbs
    .map((prob, index) => ({ prob, label: labels[index] }))
    .filter(item => item.prob > ANNOTATION_THRESHOLD)
    .sort((a, b) => b.prob - a.prob) // Sort by probability descending
    .map(item => `${item.prob.toFixed(4)},"${item.label}"`)
    .join('\n');

  navigator.clipboard.writeText(formattedStrategy)
};