# River Analysis Tool

This tool helps analyze poker scenarios where the Hero (player) is out of position on the river. The analysis uses game theory to determine optimal strategies in various betting scenarios.

## Game Structure

For simplicity, the analysis assumes a maximum of 4 actions per street, resulting in a structured game tree:

![Betting Game Tree](/river/assets/game_tree.svg)

### Game matrix and strategies

The game matrix represents:
- Y-axis: Hero's actions `(action1-action2)`
- X-axis: Villain's actions `(action1-action2 if Hero checks first/action1-action2 if Hero bets first)`
- Cell entries: payoff/log-payoff for Hero's perspective in the units of BB/log-BB

Each player aims to maximize their own value. The Nash Equilibrium (NE) represents a stable state where neither player can improve by unilaterally changing their strategy. The NE can be a pure strategy (if a saddlepoint exists) or a mixed strategy (otherwise). A bar plot visualizes the (potentially mixed) equilibrium strategies.

*   **Linear Payoff:** The game is constant-sum (effectively zero-sum). Hero maximizes Hero's payoff (Y-axis), while Villain simultaneously minimizes Hero's payoff (X-axis). The `initial pot/2` adjustment simplifies the zero-sum analysis.
*   **Logarithmic Payoff:** The game becomes non-constant-sum.

We approximate the Nash Equilibrium using fictitious play, as in the non-constant-sum games players' individual log-payoff maximization no longer creates a perfectly antagonistic relationship where one's gain is exactly the other's loss.

## Configuration Options

### 1. Payoff Type

See [discussion below](#advanced-considerations).

#### Linear Payoff
- Suitable for cash games with deep stacks
- Uses raw expected chip value (EV)
- Stack size irrelevant beyond certain depth
- Focuses on absolute chip maximization

#### Logarithmic Payoff
- Appropriate for tournaments and short-stack scenarios
- Based on Kelly criterion for bankroll management
- Optimizes long-term capital growth rate
- More conservative as bankroll decreases

### 2. Stack and Pot Settings
- **Stack Size**: Your current stack before the street (before river in our case)
- **Pot Size**: Amount in pot before the street (before river in our case)

If not using log-payoff, relation of stack size to the current pot does not matter, only current pot size.

### 3. Hero Equity
Input your range equity estimates based on:
- Initial situation
- After Hero's check and subsequent Villain's bet
- After Hero's bet and subsequent Villain's raise

These estimates are basically universal knowledge, so that both Hero and Villain have the same opinion about these probabilities.

### 4. Bet Sizing
Specify anticipated bet sizes as pot percentages. The tool shows total bet amounts in brackets.

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
