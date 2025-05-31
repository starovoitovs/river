import type { ParsedFixedStrategyItem } from '../../utils/gameSolver'; // Adjusted import path

export const validateRanges = (probStr: string): [boolean, string] => {
  try {
    const probs = probStr.split(',').map(s => Number(s.trim()));
    if (probs.some(isNaN) || probs.some(p => p < 0)) {
      return [false, "All values must be non-negative numbers"];
    }
    const sum = probs.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      return [false, "Values cannot all be zero"];
    }
    return [true, ""];
  } catch {
    return [false, "Invalid input format"];
  }
};

export const validateEquitiesMatrix = (equitiesStr: string, heroRanges: string, villainRanges: string): [boolean, string] => {
  const heroCount = heroRanges.split(',').length;
  const villainCount = villainRanges.split(',').length;
  
  const rows = equitiesStr.trim().split('\n');
  if (rows.length !== heroCount) {
    return [false, `Matrix must have ${heroCount} rows`];
  }

  for (const row of rows) {
    const values = row.split(',').map(s => Number(s.trim()));
    if (values.length !== villainCount) {
      return [false, `Each row must have ${villainCount} values`];
    }
    if (values.some(isNaN)) {
      return [false, "All values must be numbers"];
    }
    // Removed restriction: Values must be between 0 and 100
    // Now allowing any numeric value, assuming input is already in decimal form (0-1)
    // or can be any real number for more complex equity definitions.
    // If negative values are not desired, a new validation rule could be added.
  }

  return [true, ""];
};

export const validateFixedStrategyInput = (
  input: string | undefined,
  availableStrategies: string[]
): [boolean, string, ParsedFixedStrategyItem[]] => {
  if (!input || input.trim() === "") {
    return [true, "", []]; // Empty input is valid (means not fixed)
  }

  const lines = input.trim().split('\n');
  const parsedItems: ParsedFixedStrategyItem[] = [];
  const strategyNames = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const firstCommaIndex = line.indexOf(',');
    if (firstCommaIndex === -1) {
      return [false, `Line ${i + 1}: Invalid format. Comma missing between frequency and StrategyName. Expected "frequency,StrategyName"`, []];
    }

    const freqStr = line.substring(0, firstCommaIndex).trim();
    let nameStr = line.substring(firstCommaIndex + 1).trim();

    const frequency = Number(freqStr);
    if (isNaN(frequency) || frequency <= 0) {
      return [false, `Line ${i + 1}: Frequency must be a positive number. Found "${freqStr}"`, []];
    }

    // Remove surrounding quotes from the strategy name if present
    if (nameStr.startsWith('"') && nameStr.endsWith('"')) {
      nameStr = nameStr.substring(1, nameStr.length - 1);
    }
    
    const strategyName = nameStr;
    if (!strategyName) {
      return [false, `Line ${i + 1}: Strategy name cannot be empty.`, []];
    }

    if (!availableStrategies.includes(strategyName)) {
      return [false, `Line ${i + 1}: Strategy "${strategyName}" is not a valid strategy for the current settings.`, []];
    }

    if (strategyNames.has(strategyName)) {
      return [false, `Line ${i + 1}: Strategy "${strategyName}" is duplicated.`, []];
    }
    strategyNames.add(strategyName);
    const index = availableStrategies.indexOf(strategyName); // This should always be found due to the check above
    parsedItems.push({ frequency, name: strategyName, index });
  }

  if (parsedItems.length === 0 && input.trim() !== "") {
      return [false, "No valid strategies found in the input.", []];
  }
  
  // Normalize frequencies if needed (though solveGame might handle this)
  // For now, just return parsed items.
  return [true, "", parsedItems];
};