import type { GameState, GameTreeNode } from '../types';
import type { ParsedPlayerStrategy, ActionStep, PokerAction, ParsedHeroRangeStrategy, ParsedVillainRangeStrategy } from './strategySequenceHelper';
import { getAvailablePokerActions, analyzeSequence } from './strategySequenceHelper';
import { GAME_TREE_PRUNING_THRESHOLD } from '../components/home/homeConstants';

interface GameTreeContext {
  currentSequence: ActionStep[];
  currentPlayer: 'Hero' | 'Villain';
  conditionalProbSoFar: number;
  overallProbSoFar: number; // Probability of reaching this node from the tree root (considering global conditioning)
  depth: number;
  heroRangePriors: number[]; // Original P(Hm)
  villainRangePriors: number[]; // Original P(Vn)
  allParsedHeroStrategies: ParsedPlayerStrategy[];
  allParsedVillainStrategies: ParsedPlayerStrategy[];
  gameState: GameState;
  maxDepth: number;
  conditionedHeroRangeIndex?: number;
  conditionedVillainRangeIndex?: number;
  isBranchTheOnlyOption?: boolean; // Was this branch the only option from its parent?
}

function getPlannedActionForRange(
    player: 'Hero' | 'Villain',
    rangeStrategy: ParsedHeroRangeStrategy | ParsedVillainRangeStrategy,
    currentSequence: ActionStep[],
    maxActionsOnStreet: number
): PokerAction | undefined {
    const actionsTakenByPlayerThisStreet = currentSequence.filter(s => s.player === player).length;

    if (player === 'Hero') {
        const heroRangeStrat = rangeStrategy as ParsedHeroRangeStrategy;
        const heroActionsInSequenceSoFar = currentSequence.filter(s => s.player === 'Hero').map(s => s.action);

        // Validate that the strategy's prefix matches Hero's actions already taken in the current sequence
        for (let k = 0; k < actionsTakenByPlayerThisStreet; k++) {
            if (k >= heroRangeStrat.actionSequence.length || // Strategy is shorter than actions taken
                heroRangeStrat.actionSequence[k] !== heroActionsInSequenceSoFar[k]) { // Or action mismatches
                return undefined; // This pure strategy for this range is not consistent with the game flow
            }
        }

        // If the prefix is consistent, and there are more actions in this strategy for the current street
        if (actionsTakenByPlayerThisStreet < heroRangeStrat.actionSequence.length) {
            const nextAction = heroRangeStrat.actionSequence[actionsTakenByPlayerThisStreet];
            // Check if this planned next action is actually available given the current game state
            const availableActions = getAvailablePokerActions(currentSequence, player, maxActionsOnStreet, 3);
            if (availableActions.includes(nextAction)) {
                return nextAction;
            }
        }
        // If strategy ends here, or next planned action isn't available, no action is returned from this path (implicitly returns undefined).
    } else { // Villain
        const villainRangeStrat = rangeStrategy as ParsedVillainRangeStrategy;
        
        let heroBranchAction: PokerAction | 'unknown' = 'unknown';
        if (currentSequence.length > 0) {
            // Find the first action Hero took in the current betting round/sequence
            // This determines which path of Villain's strategy to follow.
            // This simplified logic assumes the currentSequence starts from Hero's first action on the street.
            if (currentSequence[0] && currentSequence[0].player === 'Hero') {
                heroBranchAction = currentSequence[0].action;
            }
        }


        const villainActionsToUse = heroBranchAction === 'be' ? villainRangeStrat.ifHeroBets : villainRangeStrat.ifHeroChecks;
        
        // Count villain's actions *within the current path* defined by heroBranchAction
        let villainActionsOnThisPath = 0;
        let heroActionProcessed = false;
        if (heroBranchAction === 'unknown' && currentSequence.length > 0) { // Should not happen if sequence starts with Hero
             villainActionsOnThisPath = currentSequence.filter(s => s.player === 'Villain').length;
        } else {
            for(const step of currentSequence) {
                if (step.player === 'Hero' && step.action === heroBranchAction) {
                    heroActionProcessed = true;
                }
                if (heroActionProcessed && step.player === 'Villain') {
                    villainActionsOnThisPath++;
                }
                 // If hero acts again after villain, it's a new decision point for villain based on that new hero action (more complex tree)
                 // Current model: villain commits to a line based on hero's *first* action.
            }
        }


        if (villainActionsOnThisPath < villainActionsToUse.length) {
            const nextAction = villainActionsToUse[villainActionsOnThisPath];
            const availableActions = getAvailablePokerActions(currentSequence, player, maxActionsOnStreet, 3);
            if (availableActions.includes(nextAction)) {
                return nextAction;
            }
        }
    }
    return undefined;
}

function getActionProbability(
  playerToAct: 'Hero' | 'Villain',
  targetAction: PokerAction,
  currentSequence: ActionStep[],
  allPlayerStrategies: ParsedPlayerStrategy[],
  playerRangePriors: number[], // Original priors P(Range_i) for playerToAct
  gameState: GameState,
  activeConditionedRangeIndexForPlayer?: number // The specific index playerToAct is conditioned on, if any
): number {
  let totalWeightedProbForTargetAction = 0;
  const numRangesForPlayer = playerRangePriors.length;

  for (const pureStrategy of allPlayerStrategies) {
    if (pureStrategy.probability === 0) continue;

    for (let i = 0; i < numRangesForPlayer; i++) {
      const rangeName = `${playerToAct === 'Hero' ? 'H' : 'V'}${i + 1}`;
      const rangeCatStrategy = pureStrategy.ranges.find(r => r.rangeName === rangeName);

      if (!rangeCatStrategy) continue;

      const plannedAction = getPlannedActionForRange(playerToAct, rangeCatStrategy, currentSequence, gameState.maxActions);

      if (plannedAction === targetAction) {
        let weight = pureStrategy.probability; // P(S_j)
        if (activeConditionedRangeIndexForPlayer !== undefined) {
          // Player is conditioned on a specific range.
          if (activeConditionedRangeIndexForPlayer === i) {
            // This is the range they are conditioned on. Its "prior" becomes 1.
            // Contribution is P(S_j) * 1.0
          } else {
            // This is NOT the range they are conditioned on. Contribution is 0.
            weight = 0;
          }
        } else {
          // Player is NOT conditioned on a specific range. Use original prior P(Range_i).
          // Contribution is P(S_j) * P(Range_i).
          weight *= playerRangePriors[i];
        }
        totalWeightedProbForTargetAction += weight;
      }
    }
  }
  return totalWeightedProbForTargetAction;
}

function buildTreeRecursive(ctx: GameTreeContext): GameTreeNode[] {
  const nodes: GameTreeNode[] = [];
  const potState = analyzeSequence(ctx.currentSequence);

  // Pruning Check: If the probability of reaching this current node (ctx.overallProbSoFar)
  // is below the threshold, and this wasn't the only way to get here from its parent,
  // and it's not the root of the tree, then prune this entire branch.
  if (ctx.depth > 0 && // Don't prune the root node itself based on this
      !ctx.isBranchTheOnlyOption &&
      ctx.overallProbSoFar < GAME_TREE_PRUNING_THRESHOLD) {
    return []; // Prune this branch
  }

  if (ctx.depth >= ctx.maxDepth || potState.isBettingClosed) {
    return []; // Terminal condition due to depth or game state
  }

  const availableActions = getAvailablePokerActions(ctx.currentSequence, ctx.currentPlayer, ctx.gameState.maxActions, 3);
  let sumOfProbsForNormalization = 0;
  const preliminaryNodes: (GameTreeNode & { rawProb: number })[] = [];

  for (const action of availableActions) {
    const activeConditionedIndex = ctx.currentPlayer === 'Hero' ? ctx.conditionedHeroRangeIndex : ctx.conditionedVillainRangeIndex;
    
    const actionProb = getActionProbability(
      ctx.currentPlayer,
      action,
      ctx.currentSequence,
      ctx.currentPlayer === 'Hero' ? ctx.allParsedHeroStrategies : ctx.allParsedVillainStrategies,
      ctx.currentPlayer === 'Hero' ? ctx.heroRangePriors : ctx.villainRangePriors,
      ctx.gameState,
      activeConditionedIndex
    );

    // Keep actions even if very low probability, normalization will handle it.
    // Pruning is now handled at the branch level (overallProbSoFar).
    // We still filter out actions that are essentially zero prob if there are other options.
    if (actionProb < 1e-9 && availableActions.length > 1) continue;
    
    sumOfProbsForNormalization += actionProb;
    preliminaryNodes.push({
        actionName: `${ctx.currentPlayer[0]}: ${action}`,
        conditionalProbability: 0, // Will be normalized
        rawProb: actionProb,
        player: ctx.currentPlayer,
        children: []
    });
  }
  
  // If no preliminary nodes were generated (e.g., all actions were < 1e-9 and there was more than one), return empty.
  if (preliminaryNodes.length === 0) {
    return [];
  }

  // Normalize probabilities for the children of the current node
  if (sumOfProbsForNormalization === 0) {
      // This case should be rare if preliminaryNodes.length > 0 and actionProb >= 1e-9 filter is working.
      // If it happens, distribute equally.
      const numNodes = preliminaryNodes.length;
      preliminaryNodes.forEach(node => node.conditionalProbability = 1 / numNodes);
  } else {
      preliminaryNodes.forEach(node => node.conditionalProbability = node.rawProb / sumOfProbsForNormalization);
  }

  // Now, iterate over all preliminary nodes (children actions) that have a non-zero conditional probability.
  // The previous filtering based on pathOverallProb for each child is removed.
  for (const pNode of preliminaryNodes) {
    // If a node's conditional probability after normalization is effectively zero, skip it.
    // This can happen if sumOfProbsForNormalization was > 0 but this pNode.rawProb was extremely small.
    if (pNode.conditionalProbability < 1e-9 && preliminaryNodes.length > 1) continue;

    const newSequence: ActionStep[] = [...ctx.currentSequence, { player: ctx.currentPlayer, action: pNode.actionName.split(': ')[1] as PokerAction }];
    
    // The overall probability of reaching this child node from the tree root.
    const childOverallProbSoFar = ctx.overallProbSoFar * pNode.conditionalProbability;

    // If this child's own path from the root is too improbable, AND it's not the only option,
    // then don't create or display this child node.
    if (childOverallProbSoFar < GAME_TREE_PRUNING_THRESHOLD && preliminaryNodes.length > 1) {
        continue;
    }

    const childNode: GameTreeNode = {
      actionName: pNode.actionName,
      conditionalProbability: pNode.conditionalProbability,
      overallProbability: undefined, // Will be set if it becomes a terminal node in the displayed tree
      player: pNode.player,
      children: [],
    };

    const nextPlayer = ctx.currentPlayer === 'Hero' ? 'Villain' : 'Hero';
    const children = buildTreeRecursive({
      ...ctx,
      currentSequence: newSequence,
      currentPlayer: nextPlayer,
      conditionalProbSoFar: pNode.conditionalProbability, // This is P(Child | Parent)
      overallProbSoFar: childOverallProbSoFar,          // This is P(Child | Root)
      depth: ctx.depth + 1,
      isBranchTheOnlyOption: preliminaryNodes.length === 1, // Pass if this child was the only option
    });

    childNode.children = children;
    const endPotState = analyzeSequence(newSequence);

    // A node becomes terminal in the displayed tree if:
    // 1. It has no children (either naturally or because its children's branches were pruned).
    // 2. Betting is closed.
    // 3. Max depth is reached.
    if (children.length === 0 || endPotState.isBettingClosed || (ctx.depth + 1 >= ctx.maxDepth) ) {
        childNode.isTerminal = true;
        // The overallProbability displayed for a terminal node is its probability from the root of the tree.
        childNode.overallProbability = childOverallProbSoFar;
    }
    nodes.push(childNode);
  }

  return nodes;
}

export function calculateAndBuildGameTree(
  gameState: GameState,
  allParsedHeroStrategies: ParsedPlayerStrategy[],
  allParsedVillainStrategies: ParsedPlayerStrategy[],
  heroRangePriors: number[], // Overall P(Hm)
  villainRangePriors: number[], // Overall P(Vn)
  conditionedHeroRangeIndex?: number,
  conditionedVillainRangeIndex?: number
): GameTreeNode[] | undefined {
  if (!allParsedHeroStrategies.length || !allParsedVillainStrategies.length || !heroRangePriors.length || !villainRangePriors.length) {
    return undefined;
  }

  let overallProbMultiplier = 1.0;

  if (conditionedHeroRangeIndex !== undefined) {
    if (conditionedHeroRangeIndex < 0 || conditionedHeroRangeIndex >= heroRangePriors.length || heroRangePriors[conditionedHeroRangeIndex] === 0) {
      return []; 
    }
    overallProbMultiplier *= heroRangePriors[conditionedHeroRangeIndex];
  }

  if (conditionedVillainRangeIndex !== undefined) {
     if (conditionedVillainRangeIndex < 0 || conditionedVillainRangeIndex >= villainRangePriors.length || villainRangePriors[conditionedVillainRangeIndex] === 0) {
      return []; 
    }
    overallProbMultiplier *= villainRangePriors[conditionedVillainRangeIndex];
  }
  
  if (overallProbMultiplier === 0 && (conditionedHeroRangeIndex !== undefined || conditionedVillainRangeIndex !== undefined)) {
      return []; 
  }

  const initialContext: GameTreeContext = {
    currentSequence: [],
    currentPlayer: 'Hero',
    conditionalProbSoFar: 1.0,
    // overallProbSoFar for the root of the tree being built is always 1.0 from its perspective.
    // The overallProbMultiplier is applied when calculating the display values for terminal nodes.
    overallProbSoFar: 1.0,
    depth: 0,
    heroRangePriors: heroRangePriors,
    villainRangePriors: villainRangePriors, // Pass original priors
    allParsedHeroStrategies,
    allParsedVillainStrategies,
    gameState,
    maxDepth: gameState.maxActions * 2 + 2, // Max actions per player + buffer
    conditionedHeroRangeIndex, // Pass the index for Hero
    conditionedVillainRangeIndex, // Pass the index for Villain
  };

  const tree = buildTreeRecursive(initialContext);

  // The `overallProbability` on terminal nodes, as calculated by buildTreeRecursive
  // (where initial overallProbSoFar was 1.0), should already represent P(Terminal Path | Global Conditioning Context).
  // These values should sum to 1.0 across all terminal nodes of the built tree.
  // No further normalization by overallProbMultiplier should be needed here if getActionProbability
  // correctly gives P(Action | Parent, CurrentPlayerConditioning).

  return tree;
}