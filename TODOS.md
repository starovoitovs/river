# bet-fold

Can we somehow cook up a game where optimum would be bet-fold vs. \*/raise-\*? Or it's not covered in this framework?

In Game Theory Optimal (GTO) poker, the strategy is about playing in a way that is unexploitable. This means every action you take must be part of a balanced range that prevents your opponent from gaining an edge, no matter what they do.

So, is a "bet-fold" strategy ever GTO?
Yes — but only in certain spots and with certain hands. Here's how it breaks down:

✅ When bet-fold can be GTO:

In heads-up poker, particularly out-of-position, there are many spots where a GTO strategy includes:

Betting for value or as a semi-bluff.

Folding to a raise if that specific hand is too weak to continue.

This is particularly true on the river or in small pots where you make a thin value bet or blocker bet, and the opponent raises large. GTO allows folding here because:

You’re not supposed to defend everything.

Your betting range must include some weak hands or bluffs that can’t call a raise.

Yes — **if you're building or analyzing a poker strategy (even outside of a full GTO solver)**, then **modeling fold equity is essential** when you're making bets with the possibility of folding to a raise.

# Is this the use case for fold equity?

### 🔁 Why Fold Equity Matters

When you bet, you're not just trying to get value — you're also trying to:

1. **Make your opponent fold worse hands** (which is pure value).
2. **Make your opponent fold better hands** (which is a bluff).
3. Set up future plays (e.g. bet/fold vs. certain raises).

To **evaluate the profitability** of your bet (EV), you need to consider:

$$
\text{EV}(\text{Bet}) = P_{\text{fold}} \cdot \text{Pot} + (1 - P_{\text{fold}}) \cdot \text{EV when called/raised}
$$

Where $P_{\text{fold}}$ is your **fold equity** — the probability that your opponent folds to your bet.

---

### 🔎 If You're Modeling Strategy (GTO or Exploitative)

Yes — modeling **fold equity explicitly** helps you:

* Decide whether a bluff is +EV.
* Know when a **bet-fold** line is reasonable.
* See when to **check** instead, because your hand has no equity and your opponent never folds.

In GTO solvers, fold equity is **implicitly** built into the calculations via range balancing and equilibrium. But if you're coding a simplified strategy model or doing EV calcs manually, you’ll need to **explicitly estimate**:

* Opponent’s calling range
* Raise frequency
* How they respond to different bet sizes

---

### 🎯 Use cases where modeling fold equity helps:

* Bluffing on the river (pure fold equity spot)
* Semi-bluffing on the flop/turn (fold equity + equity realization)
* Blocker bets on the river (small bets to induce folds or prevent big raises)
* Determining whether bet-fold is reasonable when out-of-position

---

### TL;DR

Yes — if you're modeling poker strategy, **you should absolutely model fold equity** when considering bet-fold lines or bluffing spots. It's key to knowing whether the bet is profitable, especially if you're not planning to call a raise.

Would you like a code-level breakdown for how to include fold equity in a bet decision model?

# Equities

* Right now we model only 3 equities, perhaps model equities for all outcomes?
* Perhaps model game value instead of equities, which would allow passage to the analysis of the turn?
