# River Analysis Tool

This tool helps analyze poker scenarios where the Hero (player) is out of position on the river. The analysis uses game theory to determine optimal strategies in various betting scenarios.

## Game Structure

For simplicity, the analysis assumes a maximum of 4 actions per street, resulting in a structured game tree:

![Betting Game Tree](/river/assets/game_tree.svg)

### Game matrix and strategies

The game matrix represents:
- Y-axis: Hero's actions, specified for each possible Hero's range category, e.g. `H1: action1-action2, H2: action1-action2`
- X-axis: Villain's actions, specified for each possible Hero's range category, e.g. `V1: action1-action2 if Hero checks first/action1-action2 if Hero bets first, V2: ...`
- Cell entries: value (payoff/log-payoff) for Hero/Villan in the units of BB/log-BB
- Color-coding: based on the value from Hero's perspective

Each player aims to maximize their own value. The Nash Equilibrium (NE) represents a stable state where neither player can improve by unilaterally changing their strategy. The NE can be a pure strategy (if a saddlepoint exists) or a mixed strategy (otherwise). The bar plots visualize the (potentially mixed) equilibrium strategies.

*   **Linear Payoff:** The game is constant-sum (effectively zero-sum). Hero maximizes Hero's payoff (Y-axis), while Villain simultaneously minimizes Hero's payoff (X-axis). The `initial pot/2` adjustment simplifies the zero-sum analysis.
*   **Logarithmic Payoff:** The game becomes non-constant-sum.

We approximate the Nash Equilibrium using fictitious play, as in the non-constant-sum games players' individual log-payoff maximization no longer creates a perfectly antagonistic relationship where one's gain is exactly the other's loss.

The bar plots display Hero's and Villain's mixed strategies (truncated at 0.01).

## Configuration Options

### Stack and Pot Settings
- **Stack Size**: Your current stack before the street (before river in our case)
- **Pot Size**: Amount in pot before the street (before river in our case)

If not using log-payoff, the stack size relative to the current pot size does not matter, only the current pot size.

### Range Settings

To begin, define each player's range categories (e.g., H1, H2 for Hero; V1, V2 for Villain) and assign their respective probabilities (summing to 1). Then, input a matrix where each cell represents Hero's estimated equity (win probability) when Hero's m-th range category goes against Villain's n-th range category.

#### Example: Heads-Up River - Flush Board

This scenario models a heads-up river decision where the board has four spades. We categorize each player's hand into two types: "Spade Flush" (Type 1) or "No Spade Flush" (Type 2).

*   **Hero Range Probabilities (0.45, 0.55):** Hero is 45% likely to have a "Spade Flush" and 55% likely to have "No Spade Flush."
*   **Villain Range Probabilities (0.55, 0.45):** Villain is 55% likely to have a "Spade Flush" and 45% likely to have "No Spade Flush."
*   **Hero Equities' Matrix:** Hero's win probability in showdowns:
    *   **Hero Flush vs. Villain Flush:** 53% (Hero slightly better on average)
    *   **Hero Flush vs. Villain No Flush:** 100% (Hero wins)
    *   **Hero No Flush vs. Villain Flush:** 0% (Hero loses)
    *   **Hero No Flush vs. Villain No Flush:** 53% (Hero slightly better on average)

The inputs in the range settings would be then:

```
Hero Range Probabilities:
45, 55

Villain Range Probabilities:
55, 45

Hero Equities' Matrix:
53, 100
0, 53
```

### Actions and bets

**Max actions**

Specifies how many total actions for Hero and Villain can take place (basically the number of levels in the game tree above). If less actions, there are less strategies to be considered by the players, and the game matrix is smaller.

**Bet sizes**

Specify anticipated bet sizes as pot percentages. The amounts in brackets are the total bet amounts after the respective action.

Example calculation:
```
Initial Pot: 20BB

1. Hero bets 100% pot: 
   20BB total bet amount

2. Villain raises 100% pot:
   20BB (call, pot becomes 60BB) + 60BB (raise 100% pot) = 80BB total bet amount

3. Hero 3-bets 100% pot:
   20BB (initial) + 60BB (call, pot becomes 180BB) + 180BB (raise 100% pot) = 260BB total bet amount
```

**Payoff Type**

* **Linear Payoff**
   - Suitable for cash games with deep stacks
   - Uses raw expected chip value (EV)
   - Stack size irrelevant beyond certain depth
   - Focuses on absolute chip maximization

* **Logarithmic Payoff**
   - Appropriate for tournaments and short-stack scenarios
   - Based on Kelly criterion for bankroll management
   - Optimizes long-term capital growth rate
   - More conservative as bankroll decreases

See [detailed discussion below](#advanced-considerations).

### Fixed Strategies

You can optionally specify fixed strategies for each player.
* If left empty, solver will look for the optimum for this player.
* If both strategies are fixed, then the solver onnly computes the value of the game.

The strategies should be written in the form:

```
Hero strategy:
3,"H1:ch-ca,H2:ch-fo"
2,"H1:be-ca,H2:ch-fo"

Villain strategy:
3,"V1:ch/ca,V2:ch/fo"
2,"V1:ch/ca,V2:be/fo"
1,"V1:be/ca,V2:ch/fo"
```

The first field corresponds to relative frequencies, the second corresponds to the strategy. All strategy entries should be unique. Note that you can copy a strategy from the solver's strategy bar plot output by clicking a clipboard icon.

### Solver settings

Algorithm uses fictitious play to learn the optimal strategy, for which one can specify:
* maximum number of iterations
* learning rate
* convergence threshold

## Advanced Considerations

### Tournament Play Limitations

The Kelly criterion analysis has several limitations in tournament contexts:

1. **No Negative EV Considerations**
   - Kelly never recommends negative EV bets
   - Cannot account for strategic "bold plays"
   - Misses ICM-positive but chip-negative spots

2. **Tournament Dynamics**
   - Does not factor increasing blinds/antes
   - Assumes continuous bet sizing (vs. discrete chips)
   - Cannot capture prize pool equity (ICM) implications

3. **Strategic Factors**
   - May miss profitable high-variance plays
   - Cannot evaluate ladder-up situations
   - Doesn't consider stack pressure dynamics

While the tool provides valuable insights for chip accumulation and risk management, tournament players should consider these limitations when making final decisions.
