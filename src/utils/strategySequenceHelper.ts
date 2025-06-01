export type PokerAction = 'ch' | 'be' | 'fo' | 'ca' | 'ra'; // Check, Bet, Fold, Call, Raise

/**
 * Represents a sequence of actions a player commits to for a specific hand category,
 * contingent on opponent responses.
 * e.g., for H1:ch-ca -> ['ch', 'ca'] means Hero checks; if Villain bets, Hero calls.
 */
export type ActionSubSequence = PokerAction[];

export interface ParsedHeroRangeStrategy {
  rangeName: string; // e.g., "H1"
  actionSequence: ActionSubSequence; // e.g., ['ch', 'ca'] for "ch-ca"
}

export interface ParsedVillainRangeStrategy {
  rangeName: string; // e.g., "V1"
  // Sequence if Hero's first action was 'check'
  ifHeroChecks: ActionSubSequence;
  // Sequence if Hero's first action was 'bet'
  ifHeroBets: ActionSubSequence;
}

export type ParsedRangeStrategy = ParsedHeroRangeStrategy | ParsedVillainRangeStrategy;

export interface ParsedPlayerStrategy {
  probability: number;
  ranges: Array<ParsedHeroRangeStrategy | ParsedVillainRangeStrategy>;
  rawLabel: string; // The original "H1:ch-ca,H2:ch-fo" part
}

/**
 * Represents a single action taken by a player at one decision point in the game.
 */
export interface ActionStep {
  player: 'Hero' | 'Villain';
  action: PokerAction;
}
export type SelectedActionSequence = ActionStep[];


// --- Strategy String Parsing ---

function parseActionSubSequence(subSeqStr: string): ActionSubSequence {
  if (!subSeqStr || subSeqStr.trim() === '') return [];
  return subSeqStr.split('-').map(part => {
    switch (part) {
      case 'ch': // Check
        return 'ch';
      case 'be': // Bet
        return 'be';
      case 'fo': // Fold
        return 'fo';
      case 'ca': // Call
        return 'ca';
      case 'ra': // Raise (e.g., from "check-raise")
        return 'ra';
      case '3b': // 3-bet (e.g., from "bet-3bet") is a type of raise
        return 'ra';
      default:
        throw new Error(`Invalid action part '${part}' in sub-sequence '${subSeqStr}'`);
    }
  });
}

/**
 * Parses a full hero strategy string.
 * @param playerStrategyString Example: `0.575,"H1:ch-ca,H2:ch-fo"` or `1.8e-5,"H1:ch-fo,H2:ch-fo"`
 */
export function parseHeroStrategy(playerStrategyString: string): ParsedPlayerStrategy {
  // Regex to match a floating point number (including scientific notation) and the rest of the string in quotes
  const match = playerStrategyString.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?),"(.+)"$/);
  if (!match) throw new Error(`Invalid hero strategy string format: ${playerStrategyString}`);
  
  const probability = parseFloat(match[1]);
  const rangesStr = match[2]; // "H1:ch-ca,H2:ch-fo"

  const parsedRanges: ParsedHeroRangeStrategy[] = rangesStr.split(',').map(rangePart => {
    const [rangeName, actionsStr] = rangePart.split(':', 2);
    if (!rangeName || !actionsStr) throw new Error(`Invalid hero range part: ${rangePart}`);
    return {
      rangeName,
      actionSequence: parseActionSubSequence(actionsStr)
    };
  });

  return { probability, ranges: parsedRanges, rawLabel: rangesStr };
}

/**
 * Parses a full villain strategy string.
 * @param playerStrategyString Example: `0.646,"V1:be-ca/ra-ca,V2:ch/ca"` or `1.89e-9,"V1:ch/fo,V2:ch/ca"`
 */
export function parseVillainStrategy(playerStrategyString: string): ParsedPlayerStrategy {
  // Regex to match a floating point number (including scientific notation) and the rest of the string in quotes
  const match = playerStrategyString.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?),"(.+)"$/);
  if (!match) throw new Error(`Invalid villain strategy string format: ${playerStrategyString}`);
  
  const probability = parseFloat(match[1]);
  const rangesStr = match[2]; // "V1:be-ca/ra-ca,V2:ch/ca"

  const parsedRanges: ParsedVillainRangeStrategy[] = rangesStr.split(',').map(rangePart => {
    const [rangeName, actionsStr] = rangePart.split(':', 2);
    if (!rangeName || !actionsStr) throw new Error(`Invalid villain range part: ${rangePart}`);

    const conditionalActions = actionsStr.split('/', 2);
    let ifHeroChecks: ActionSubSequence;
    let ifHeroBets: ActionSubSequence;

    if (conditionalActions.length !== 2) {
      // According to ABOUT.md and examples, Villain strategies are specified as:
      // "V1: action1-action2 if Hero checks first/action1-action2 if Hero bets first"
      // The '/' is mandatory to separate these two conditional paths.
      // An empty path (e.g., "ch/") means an action for one condition and implies no action or fold for the other.
      // parseActionSubSequence handles empty strings by returning [].
      if (actionsStr.includes('/')) {
        // It has a slash, so it's trying to be conditional
         ifHeroChecks = parseActionSubSequence(conditionalActions[0]);
         ifHeroBets = parseActionSubSequence(conditionalActions[1] || ""); // Ensure second part exists, even if empty after slash
      } else {
        // No slash, implies this is the action Villain takes if Hero checks, and implicitly folds if Hero bets.
        // Or, this needs to be an error based on stricter interpretation of "V1: check_line/bet_line"
        // For now, let's assume if no slash, it's the "ifHeroChecks" line and "ifHeroBets" is an implicit fold (empty sequence).
        // This interpretation might need to be revised based on how strategy generation tools format this.
        // Given the prompt's example "V1:be-ca/ra-ca,V2:ch/ca", the slash is always there for conditionals.
        // If a strategy string was just "V1:ch", it's ambiguous.
        // Let's be strict: the format requires "actionsIfCheck/actionsIfBet".
        throw new Error(
          `Invalid villain range strategy part '${rangePart}'. Expected format 'RangeName:actionsIfHeroChecks/actionsIfHeroBets'. Missing '/' or one of the paths.`
        );
      }
    } else {
        ifHeroChecks = parseActionSubSequence(conditionalActions[0]);
        ifHeroBets = parseActionSubSequence(conditionalActions[1]);
    }


    return {
      rangeName,
      ifHeroChecks,
      ifHeroBets
    };
  });
  return { probability, ranges: parsedRanges, rawLabel: rangesStr };
}


// --- Action Sequence Logic (Simplified Initial Versions) ---

export interface PotAnalysisState {
  amountToCall: number; // Amount the current player needs to call
  lastAggressor: 'Hero' | 'Villain' | null;
  numRaisesThisRound: number; // Number of raises so far in the current betting round
  isBettingClosed: boolean; // True if action is check-check or bet-call
}

export function analyzeSequence(sequence: SelectedActionSequence): PotAnalysisState {
  let amountToCall = 0;
  let lastAggressor: 'Hero' | 'Villain' | null = null;
  let numRaisesThisRound = 0;
  let lastBetSize = 0; // Tracks the size of the current bet/raise that needs to be called
  let playerWhoBet = null; // Tracks who made the current bet/raise

  // Simplified: does not handle actual bet amounts, only structure
  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i];
    if (step.action === 'be') {
      if (lastAggressor !== null) numRaisesThisRound = 0; // New betting round if previous was check
      lastAggressor = step.player;
      // Simplified bet size tracking
      lastBetSize = 1; // Assume bet is 1 unit for structure
      playerWhoBet = step.player;
      numRaisesThisRound = 0; // First bet is not a raise
    } else if (step.action === 'ra') {
      lastAggressor = step.player;
      numRaisesThisRound++;
      // Simplified raise size tracking
      lastBetSize = 2; // Assume raise is 2 units for structure
      playerWhoBet = step.player;
    } else if (step.action === 'ca') {
      lastBetSize = 0; // Bet is called
      // playerWhoBet remains the last aggressor until a new bet/raise
    } else if (step.action === 'fo') {
      lastBetSize = 0;
      // playerWhoBet remains
      return { amountToCall: 0, lastAggressor, numRaisesThisRound, isBettingClosed: true }; // Fold ends
    } else if (step.action === 'ch') {
      // If previous action was also a check by the other player, action might be closed
      if (i > 0 && sequence[i-1].action === 'ch' && sequence[i-1].player !== step.player) {
         return { amountToCall: 0, lastAggressor, numRaisesThisRound, isBettingClosed: true }; // Check-check
      }
      // If I check and there was a bet to me, this is invalid, but getAvailableActions should prevent this.
      // If I check and there was no bet, lastBetSize remains 0.
    }
  }
  
  // Determine amountToCall for the *next* player
  const nextPlayer = sequence.length > 0 ? (sequence[sequence.length-1].player === 'Hero' ? 'Villain' : 'Hero') : 'Hero';
  if (playerWhoBet && playerWhoBet !== nextPlayer && lastBetSize > 0) {
      amountToCall = lastBetSize;
  } else {
      amountToCall = 0;
  }
  
  // Betting is closed if last action was a call to a bet, or check-check
  let isBettingClosed = false;
  if (sequence.length > 0) {
      const lastStep = sequence[sequence.length-1];
      if (lastStep.action === 'ca' && amountToCall === 0) isBettingClosed = true;
      // Check-check handled above
  }


  return { amountToCall, lastAggressor, numRaisesThisRound, isBettingClosed };
}

// --- Simulation Logic ---

/**
 * Simulates the sequence of actions that would occur given specific strategies for a Hero range and a Villain range.
 * This is a critical function for determining consistency with a selected (partial) action sequence.
 *
 * @param heroActionSubSequence The planned sequence of actions for Hero's specific range (e.g., ['ch', 'ca']).
 * @param villainParsedRangeStrategy The Villain's strategy for their specific range, including conditional paths.
 * @param maxStreetActions The maximum total number of actions (ch, be, fo, ca, ra) allowed on the street.
 * @returns The actual sequence of actions that played out.
 */
export function simulateActionsForRangePair(
  heroActionSubSequence: ActionSubSequence,
  villainParsedRangeStrategy: ParsedVillainRangeStrategy,
  maxStreetActions: number
): SelectedActionSequence {
  const actualSequence: SelectedActionSequence = [];
  let heroActionIndex = 0;
  let villainActionIndex = 0;
  let currentPotState = analyzeSequence(actualSequence); // Initial state
  let heroFirstAction: PokerAction | null = null;

  for (let turn = 0; turn < maxStreetActions; turn++) {
    currentPotState = analyzeSequence(actualSequence);
    if (currentPotState.isBettingClosed || actualSequence.length >= maxStreetActions) {
      break;
    }

    const playerToAct: 'Hero' | 'Villain' = actualSequence.length % 2 === 0 ? 'Hero' : 'Villain';

    if (playerToAct === 'Hero') {
      if (heroActionIndex >= heroActionSubSequence.length) break; // Hero has no more actions planned

      const action = heroActionSubSequence[heroActionIndex];
      // Basic validation: can Hero make this action?
      const availableHeroActions = getAvailablePokerActions(actualSequence, 'Hero', maxStreetActions, 3);
      if (!availableHeroActions.includes(action)) {
        // This path is impossible given the strategy vs. game rules (e.g. strategy says bet, but must check)
        // Or, strategy implies an action that's not available (e.g. trying to 'ca' when no bet)
        // This indicates an issue with strategy string or interpretation. For now, break.
        break;
      }
      actualSequence.push({ player: 'Hero', action });
      if (heroActionIndex === 0) heroFirstAction = action;
      heroActionIndex++;
      if (action === 'fo' || action === 'ca') break; // Terminal action for this player's turn in the betting round
      if (action === 'ch' && actualSequence.length > 1 && actualSequence[actualSequence.length-2].action === 'ch') break; // Check-check

    } else { // Villain's turn
      const villainActionsToUse = heroFirstAction === 'be' ? villainParsedRangeStrategy.ifHeroBets : villainParsedRangeStrategy.ifHeroChecks;
      if (villainActionIndex >= villainActionsToUse.length) break; // Villain has no more actions planned

      const action = villainActionsToUse[villainActionIndex];
      const availableVillainActions = getAvailablePokerActions(actualSequence, 'Villain', maxStreetActions, 3);
       if (!availableVillainActions.includes(action)) {
        break;
      }
      actualSequence.push({ player: 'Villain', action });
      villainActionIndex++;
      if (action === 'fo' || action === 'ca') break;
      if (action === 'ch' && actualSequence.length > 1 && actualSequence[actualSequence.length-2].action === 'ch') break;
    }
  }
  return actualSequence;
}


/**
 * Checks if a fully simulated sequence of actions starts with a given partial sequence.
 * @param fullSequence The complete sequence of actions that played out.
 * @param partialSequence The partial sequence to check against (e.g., user's selection).
 * @returns True if fullSequence starts with partialSequence, false otherwise.
 */
function sequenceStartsWith(fullSequence: SelectedActionSequence, partialSequence: SelectedActionSequence): boolean {
  if (partialSequence.length === 0) return true; // Empty partial sequence is always a match
  if (partialSequence.length > fullSequence.length) return false;

  for (let i = 0; i < partialSequence.length; i++) {
    if (fullSequence[i].player !== partialSequence[i].player || fullSequence[i].action !== partialSequence[i].action) {
      return false;
    }
  }
  return true;
}

export interface ConditionalRangeProbsResult {
  heroProbs: number[]; // Conditional P(Hm | selectedSequence)
  villainProbs: number[]; // Conditional P(Vn | selectedSequence)
  totalSequenceProb: number; // P(selectedSequence)
}

/**
 * Calculates the conditional probabilities of each player's range categories,
 * given a selected sequence of actions.
 * P(Hm | A_seq) and P(Vn | A_seq)
 */
export function calculateConditionalRangeProbs(
  selectedSequence: SelectedActionSequence,
  allParsedHeroStrategies: ParsedPlayerStrategy[],
  allParsedVillainStrategies: ParsedPlayerStrategy[],
  heroPriors: number[], // P(H1), P(H2), ...
  villainPriors: number[], // P(V1), P(V2), ...
  maxStreetActions: number
): ConditionalRangeProbsResult {
  const numHeroRanges = heroPriors.length;
  const numVillainRanges = villainPriors.length;

  if (selectedSequence.length === 0) {
    return {
      heroProbs: [...heroPriors],
      villainProbs: [...villainPriors],
      totalSequenceProb: 1.0, // Probability of "any sequence" starting is 1
    };
  }

  // P(A_seq, Hm) = sum over all S_hero, S_villain, all Vn of P(A_seq, Hm, Vn, S_hero, S_villain)
  // P(A_seq, Hm) = sum over S_h, S_v, Vn [ P(A_seq | Hm, Vn, S_h, S_v) * P(Hm) * P(Vn) * P(S_h) * P(S_v) ]
  // where P(A_seq | Hm, Vn, S_h, S_v) is 1 if (Hm,Vn) with (S_h,S_v) produces A_seq, else 0.

  const heroConditionalNumerators = Array(numHeroRanges).fill(0.0); // Stores P(selectedSequence, Hm)
  const villainConditionalNumerators = Array(numVillainRanges).fill(0.0); // Stores P(selectedSequence, Vn)
  let totalProbOfSelectedSequence = 0.0; // Stores P(selectedSequence)

  for (const heroPureStrategy of allParsedHeroStrategies) {
    if (heroPureStrategy.probability === 0) continue;

    for (const villainPureStrategy of allParsedVillainStrategies) {
      if (villainPureStrategy.probability === 0) continue;

      // Iterate over each Hero range category (e.g., H1, H2)
      for (let hIdx = 0; hIdx < numHeroRanges; hIdx++) {
        const heroRangeName = `H${hIdx + 1}`;
        const heroRangeStrategy = heroPureStrategy.ranges.find(
          r => r.rangeName === heroRangeName
        ) as ParsedHeroRangeStrategy | undefined;

        if (!heroRangeStrategy) {
          // This pure strategy doesn't define behavior for this hero range (should not happen if data is consistent)
          console.warn(`Hero pure strategy ${heroPureStrategy.rawLabel} missing definition for ${heroRangeName}`);
          continue;
        }

        // Iterate over each Villain range category (e.g., V1, V2)
        for (let vIdx = 0; vIdx < numVillainRanges; vIdx++) {
          const villainRangeName = `V${vIdx + 1}`;
          const villainRangeStrategy = villainPureStrategy.ranges.find(
            r => r.rangeName === villainRangeName
          ) as ParsedVillainRangeStrategy | undefined;

          if (!villainRangeStrategy) {
            console.warn(`Villain pure strategy ${villainPureStrategy.rawLabel} missing definition for ${villainRangeName}`);
            continue;
          }
          
          // Simulate the game play for this specific combination of:
          // - Hero's pure strategy applied to heroRangeName (e.g., H1's actions from S_hero)
          // - Villain's pure strategy applied to villainRangeName (e.g., V1's actions from S_villain)
          const actualPlayedOutSequence = simulateActionsForRangePair(
            heroRangeStrategy.actionSequence,
            villainRangeStrategy,
            maxStreetActions
          );

          if (sequenceStartsWith(actualPlayedOutSequence, selectedSequence)) {
            // This combination of (hero hand, villain hand, hero strategy, villain strategy)
            // results in the selected action sequence.
            // Probability of this specific path:
            // P(S_hero) * P(S_villain) * P(Hm) * P(Vn)
            const pathProb = heroPureStrategy.probability *
                             villainPureStrategy.probability *
                             heroPriors[hIdx] *
                             villainPriors[vIdx];
            
            heroConditionalNumerators[hIdx] += pathProb;
            villainConditionalNumerators[vIdx] += pathProb;
            totalProbOfSelectedSequence += pathProb;
          }
        }
      }
    }
  }

  const finalHeroProbs = heroConditionalNumerators.map(num =>
    totalProbOfSelectedSequence > 0 ? num / totalProbOfSelectedSequence : 0
  );
  const finalVillainProbs = villainConditionalNumerators.map(num =>
    totalProbOfSelectedSequence > 0 ? num / totalProbOfSelectedSequence : 0
  );
  
  // If totalProbOfSelectedSequence is 0, it means the sequence is impossible.
  // In this case, what should we return? Perhaps priors, or all zeros?
  // For now, if sequence is impossible, probs will be 0.
  // If sequence is impossible, it might be good to indicate this to the UI.
  // The `totalSequenceProb` can be used for this.

  return {
    heroProbs: finalHeroProbs,
    villainProbs: finalVillainProbs,
    totalSequenceProb: totalProbOfSelectedSequence,
  };
}

/**
 * Determines available single actions for the current player.
 * @param currentSequence The sequence of actions taken so far.
 * @param playerToAct The player whose turn it is.
 * @param maxTotalActionsPerStreet Max number of actions (e.g., H ch, V be, H ca, V fo = 4 actions).
 * @param maxRaisesPerStreet Max number of raises allowed (e.g., 3 raises means bet, raise, re-raise, final-raise).
 */
export function getAvailablePokerActions(
  currentSequence: SelectedActionSequence,
  _playerToAct: 'Hero' | 'Villain',
  maxTotalActionsPerStreet: number,
  maxRaisesPerStreet: number = 3 // Common cap: bet + 3 raises
): PokerAction[] {
  if (currentSequence.length >= maxTotalActionsPerStreet) return []; // Max actions for street reached

  const analysis = analyzeSequence(currentSequence);

  if (analysis.isBettingClosed) return []; // Street ended (fold, call, check-check)

  const available: PokerAction[] = [];
  const isFacingBet = analysis.amountToCall > 0;

  // Is this the last possible decision point due to maxTotalActionsPerStreet?
  const isLastDecisionNode = currentSequence.length === maxTotalActionsPerStreet - 1;

  if (isFacingBet) {
    available.push('fo');
    available.push('ca');
    if (!isLastDecisionNode && analysis.numRaisesThisRound < maxRaisesPerStreet) {
      available.push('ra');
    }
  } else { // Not facing a bet
    available.push('ch');
    if (!isLastDecisionNode) { // Cannot bet if it's the last action and no bet yet (must check)
      available.push('be');
    }
  }
  return available;
}