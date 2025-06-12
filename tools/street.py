import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

# we consider 4 various bet sizes: 0, 1/2 pot, 1 pot, jam
# for each scenario:
# 1. estimate villain bet size
# 2. update priors after each villain action (call/check or raise)
# 3. compute EV of fold, call, raise in case of villain raise, pick the max
# 4. pick the action with the highest EV

def f(pot_model, pot, size_hero_bet, size_villain_raise, size_hero_reraise, priors, likelihood_fold, likelihood_call, likelihood_raise, likelihood_reraise_call):
    results = {}

    # Store inputs
    results['inputs'] = {
        "pot": pot,
        "size_hero_bet": size_hero_bet,
        "size_villain_raise": size_villain_raise, # Villain's raise amount over Hero's bet, or V's bet size if H checked
        "size_hero_reraise": size_hero_reraise, # Hero's additional reraise amount
        "priors": priors,
        "likelihood_fold_to_hero_bet": likelihood_fold,     # P(V Folds | V Hand, H action)
        "likelihood_call_to_hero_bet": likelihood_call,     # P(V Calls | V Hand, H action)
        "likelihood_raise_to_hero_bet": likelihood_raise,   # P(V Raises | V Hand, H action)
        "likelihood_villain_calls_hero_reraise": likelihood_reraise_call # P(V calls H's RR | V Hand, V raised, H RR'd)
    }

    # Compute posteriors
    # P(Villain hand | Villain calls Hero's initial action)
    posteriors_villain_calls_hero_bet = priors * likelihood_call
    if posteriors_villain_calls_hero_bet.sum() > 0:
        posteriors_villain_calls_hero_bet /= posteriors_villain_calls_hero_bet.sum()
    else:
        posteriors_villain_calls_hero_bet = np.zeros_like(priors)


    # P(Villain hand | Villain raises Hero's initial action)
    posteriors_villain_raises_hero_bet = priors * likelihood_raise
    if posteriors_villain_raises_hero_bet.sum() > 0:
        posteriors_villain_raises_hero_bet /= posteriors_villain_raises_hero_bet.sum()
    else:
        posteriors_villain_raises_hero_bet = np.zeros_like(priors)

    # P(Villain hand | Villain calls Hero's reraise, GIVEN Villain had raised Hero's initial action)
    # This posterior is based on Villain's range that would raise Hero's bet/check.
    posteriors_villain_calls_hero_reraise_after_villain_raise = posteriors_villain_raises_hero_bet * likelihood_reraise_call
    if posteriors_villain_calls_hero_reraise_after_villain_raise.sum() > 0:
        posteriors_villain_calls_hero_reraise_after_villain_raise /= posteriors_villain_calls_hero_reraise_after_villain_raise.sum()
    else:
        posteriors_villain_calls_hero_reraise_after_villain_raise = np.zeros_like(priors)
        
    results['posteriors'] = {
        "villain_hand_if_villain_calls_hero_action": posteriors_villain_calls_hero_bet,
        "villain_hand_if_villain_raises_hero_action": posteriors_villain_raises_hero_bet,
        "villain_hand_if_villain_calls_hero_reraise": posteriors_villain_calls_hero_reraise_after_villain_raise
    }

    # Step 2: Hero decides action if Villain bets/raises over Hero's initial action
    # This section calculates Hero's optimal response EV if Villain makes a bet/raise of `size_villain_raise`.

    # EV if Hero folds to Villain's bet/raise: Hero loses their initial bet if any.
    # This EV is relative to the decision point *after* Villain has bet/raised.
    # If Hero folds, the outcome for this branch of decision is 0 additional gain/loss.
    ev_hero_folds_to_villain_raise = 0

    # EV if Hero calls Villain's bet/raise
    # Pot at showdown: initial_pot + 2*size_hero_bet (if any from H's bet and V's call of it) + 2*size_villain_raise (V's raise + H's call of it)
    # Cost for Hero to call at this point: size_villain_raise
    # Correction 1: Use posteriors_villain_raises_hero_bet
    pot_if_hero_calls_villain_raise = pot + 2 * size_hero_bet + 2 * size_villain_raise
    ev_hero_calls_villain_raise = pot_model(pot_if_hero_calls_villain_raise, posteriors_villain_raises_hero_bet) - size_villain_raise

    # EV if Hero reraises Villain's bet/raise
    # P(Villain calls Hero's reraise | Villain raised Hero's action, Hero reraises)
    # This probability is against Villain's range that raised Hero's action.
    prob_villain_calls_hero_reraise = np.sum(posteriors_villain_raises_hero_bet * likelihood_reraise_call)
    
    # Gross pot won if Villain folds to Hero's reraise:
    # Pot before Hero's reraise = initial_pot + size_hero_bet (H) + size_hero_bet (V call H's bet) + size_villain_raise (V raise)
    # Correction 2: This is the gross pot won.
    ev_villain_folds_to_hero_reraise = pot + 2 * size_hero_bet + size_villain_raise
    
    # Gross EV if Villain calls Hero's reraise (showdown):
    # Pot at showdown: initial_pot + 2*size_hero_bet + 2*(size_villain_raise + size_hero_reraise)
    # Correction 3: Use posteriors_villain_calls_hero_reraise_after_villain_raise
    pot_if_villain_calls_hero_reraise = pot + 2 * size_hero_bet + 2 * (size_villain_raise + size_hero_reraise)
    ev_showdown_if_villain_calls_hero_reraise = pot_model(pot_if_villain_calls_hero_reraise, posteriors_villain_calls_hero_reraise_after_villain_raise)

    # Cost for Hero to reraise (call V's raise + add H's reraise amount)
    cost_hero_reraise_action = size_villain_raise + size_hero_reraise
    # Net EV of Hero reraising:
    ev_hero_reraises_villain_raise = \
        (1 - prob_villain_calls_hero_reraise) * ev_villain_folds_to_hero_reraise + \
        prob_villain_calls_hero_reraise * ev_showdown_if_villain_calls_hero_reraise - \
        cost_hero_reraise_action

    step2_evs = [ev_hero_folds_to_villain_raise, ev_hero_calls_villain_raise, ev_hero_reraises_villain_raise]
    hero_action_vs_villain_raise = ['f', 'c', 'r'][np.argmax(step2_evs)]
    # ev_hero_responds_to_villain_raise is the net EV from this decision point forward if Villain has bet/raised.
    ev_hero_responds_to_villain_raise = np.max(step2_evs)

    results['step2_hero_faces_villain_bet_or_raise'] = {
        "ev_fold": ev_hero_folds_to_villain_raise,
        "ev_call": ev_hero_calls_villain_raise,
        "ev_reraise": ev_hero_reraises_villain_raise,
        "prob_villain_calls_hero_reraise": prob_villain_calls_hero_reraise,
        "optimal_action": hero_action_vs_villain_raise,
        "ev_optimal_action_if_villain_raises": ev_hero_responds_to_villain_raise
    }

    # Step 1: Hero's initial action (bet size_hero_bet, or check if size_hero_bet=0)
    
    # Gross EV if Villain folds to Hero's initial action: Hero wins current pot
    ev_villain_folds_to_hero_action = pot

    # Gross EV if Villain calls Hero's initial action:
    # Pot at showdown: initial_pot + 2*size_hero_bet
    # Correction 4: Use posteriors_villain_calls_hero_bet
    pot_if_villain_calls_hero_action = pot + 2 * size_hero_bet
    ev_villain_calls_hero_action = pot_model(pot_if_villain_calls_hero_action, posteriors_villain_calls_hero_bet)

    # Probabilities of Villain's responses to Hero's initial action (based on priors)
    prob_villain_folds_vs_hero_action = np.sum(priors * likelihood_fold)
    prob_villain_calls_vs_hero_action = np.sum(priors * likelihood_call)
    prob_villain_raises_vs_hero_action = np.sum(priors * likelihood_raise)
    
    # Net EV of Hero's initial action:
    # Sum of [P(V_response) * GrossOutcome_if_V_response] - Cost_of_Hero_Initial_Action
    # GrossOutcome_if_V_folds = pot
    # GrossOutcome_if_V_calls = ev_villain_calls_hero_action (this is already a gross EV from showdown)
    # GrossOutcome_if_V_raises = ev_hero_responds_to_villain_raise (this is already a net EV from that sub-branch,
    #                                                              relative to the point after V raised)
    
    ev_hero_initial_action = \
        (prob_villain_folds_vs_hero_action * ev_villain_folds_to_hero_action) + \
        (prob_villain_calls_vs_hero_action * ev_villain_calls_hero_action) + \
        (prob_villain_raises_vs_hero_action * ev_hero_responds_to_villain_raise)
    
    # Subtract the cost of Hero's initial action (the bet itself)
    if size_hero_bet > 0:
        ev_hero_initial_action -= size_hero_bet
    
    results['step1_hero_initial_action'] = {
        "prob_villain_folds_to_hero_action": prob_villain_folds_vs_hero_action,
        "prob_villain_calls_hero_action": prob_villain_calls_vs_hero_action,
        "prob_villain_raises_to_hero_action": prob_villain_raises_vs_hero_action,
        "ev_if_villain_folds_to_hero_action": ev_villain_folds_to_hero_action, # Gross EV before subtracting initial bet cost
        "ev_if_villain_calls_hero_action": ev_villain_calls_hero_action,     # Gross EV before subtracting initial bet cost
        "ev_if_villain_raises_hero_responds_optimally": ev_hero_responds_to_villain_raise, # Net EV from this branch point
        "overall_ev_hero_action": ev_hero_initial_action # Net EV of making the bet/check
    }
    return results


if __name__ == '__main__':
    priors = np.array([0.03, 0.2, 0.5, 0.17])
    pot = 300

    # --- Scenario 1: Hero Checks ---
    # Hero's initial action is to check.
    hero_bet_check_scenario = 0
    # If Hero checks, Villain might bet. Let's say Villain bets 200.
    villain_bet_vs_hero_check = 200
    # If Hero check-raises, Hero makes their total reraise amount `hero_reraise_amount_val`
    # This is the *additional* amount Hero puts in *on top of calling* Villain's bet.
    hero_reraise_amount_val = 500

    # Likelihoods for Villain's response to Hero's CHECK:
    # likelihood_fold: Villain checks back.
    # likelihood_call: Not directly applicable (no bet to call), can be 0 or part of "check back".
    # likelihood_raise: Villain bets out.
    # Example: If Hero checks, Villain checks back 30% of the time, bets 70% of the time (averaged over hand types).
    # These likelihoods are per hand type.
    lh_V_checks_back_if_H_checks = np.array([0.1, 0.2, 0.5, 0.8]) # P(V checks back | V hand, H checked)
    lh_V_bets_if_H_checks        = 1.0 - lh_V_checks_back_if_H_checks   # P(V bets | V hand, H checked)

    # Map to function parameters for Hero Check scenario:
    # f() expects likelihood_fold, likelihood_call, likelihood_raise for Hero's initial action.
    # If Hero checks:
    #   likelihood_fold  (V folds to H's check) -> V checks back
    #   likelihood_call  (V calls H's check)    -> 0 (no bet from Hero to call)
    #   likelihood_raise (V raises H's check)   -> V bets out
    param_lh_fold_H_checks = np.zeros_like(priors) # Villain cannot "fold" a check
    param_lh_call_H_checks = lh_V_checks_back_if_H_checks
    param_lh_raise_H_checks = lh_V_bets_if_H_checks

    # Likelihood of Villain calling Hero's reraise (check-raise in this case)
    # P(V calls H's check-raise | V hand, V bet, H check-raised)
    lh_V_calls_H_check_raise = np.array([1., 0.5, 0.1, 0.])


    def pot_model_func(current_pot_at_showdown, opponent_hand_distribution):
        # Simplified model of Hero's equity realization if hand reaches showdown
        prob_board_favors_hero = 0.2
        hero_eqs_vs_villain_types = np.array([
            [0.7, 0.8, 0.9, 1.0],  # Equities if board runs out favorably for Hero
            [0.2, 0.3, 0.4, 0.5]   # Equities if board runs out unfavorably for Hero
        ])
        expected_hero_eq_vs_villain_type = prob_board_favors_hero * hero_eqs_vs_villain_types[0,:] + \
                                           (1 - prob_board_favors_hero) * hero_eqs_vs_villain_types[1,:]
        hero_overall_equity_share = np.sum(opponent_hand_distribution * expected_hero_eq_vs_villain_type)
        return current_pot_at_showdown * hero_overall_equity_share

    print("--- Analysis for Hero Checking (size_hero_bet = 0) ---")
    results_check_scenario = f(
        pot_model_func, pot,
        hero_bet_check_scenario,        # Hero's initial bet = 0 (check)
        villain_bet_vs_hero_check,      # Villain's bet size if Hero checks
        hero_reraise_amount_val,        # Hero's reraise amount if V bets and H check-raises
        priors,
        param_lh_fold_H_checks,         # P(V checks back | V hand, H checks)
        param_lh_call_H_checks,         # P(V calls H's check) = 0
        param_lh_raise_H_checks,        # P(V bets | V hand, H checks)
        lh_V_calls_H_check_raise        # P(V calls H's check-raise | V hand, V bet, H check-raised)
    )

    def print_results(results_dict, scenario_title=""):
        print(f"\n=== {scenario_title} Inputs ===\n")
        inputs = results_dict['inputs']
        print(f"Pot: Initial             {inputs['pot']:8}")
        print(f"Hero Initial Bet Size:   {inputs['size_hero_bet']:8}")
        print(f"Villain Bet/Raise Size:  {inputs['size_villain_raise']:8} (Villain's bet if H checked, or V's raise over H's bet)")
        print(f"Hero Reraise Amount:     {inputs['size_hero_reraise']:8} (Hero's additional amount for reraise)\n")
        print(f"Priors (Villain Hands):  {' '.join(f'{x:7.3f}' for x in inputs['priors'])}")
        print(f"L(V Folds to H Action):  {' '.join(f'{x:7.3f}' for x in inputs['likelihood_fold_to_hero_bet'])}")
        print(f"L(V Calls H Action):     {' '.join(f'{x:7.3f}' for x in inputs['likelihood_call_to_hero_bet'])}")
        print(f"L(V Raises H Action):    {' '.join(f'{x:7.3f}' for x in inputs['likelihood_raise_to_hero_bet'])}")
        print(f"L(V Calls H Reraise):    {' '.join(f'{x:7.3f}' for x in inputs['likelihood_villain_calls_hero_reraise'])}")

        print(f"\n=== {scenario_title} Posteriors (Villain Hand Probs) ===\n")
        posteriors = results_dict['posteriors']
        print(f"P(V Hand | V Calls H Action):  {' '.join(f'{x:7.3f}' for x in posteriors['villain_hand_if_villain_calls_hero_action'])}")
        print(f"P(V Hand | V Raises H Action): {' '.join(f'{x:7.3f}' for x in posteriors['villain_hand_if_villain_raises_hero_action'])}")
        print(f"P(V Hand | V Calls H Reraise): {' '.join(f'{x:7.3f}' for x in posteriors['villain_hand_if_villain_calls_hero_reraise'])}")

        print(f"\n=== {scenario_title} Step 2: Hero Faces Villain Bet/Raise ===\n")
        step2 = results_dict['step2_hero_faces_villain_bet_or_raise']
        print(f"EV[Hero Folds to V Bet/Raise]:   {step2['ev_fold']:7.3f}")
        print(f"EV[Hero Calls V Bet/Raise]:      {step2['ev_call']:7.3f}")
        print(f"EV[Hero Reraises V Bet/Raise]:   {step2['ev_reraise']:7.3f}")
        print(f"P(Villain Calls Hero Reraise):   {step2['prob_villain_calls_hero_reraise']:7.3f}\n")
        print(f"Optimal Action for Hero:         {step2['optimal_action']}")
        print(f"EV of Optimal Action for Hero:   {step2['ev_optimal_action_if_villain_raises']:7.3f} (Net EV from this point)")

        print(f"\n=== {scenario_title} Step 1: Hero's Initial Action ===\n")
        step1 = results_dict['step1_hero_initial_action']
        hero_action_desc = "Checks" if inputs['size_hero_bet'] == 0 else f"Bets {inputs['size_hero_bet']}"
        print(f"P(V Folds to H {hero_action_desc}): {step1['prob_villain_folds_to_hero_action']:7.3f}")
        print(f"P(V Calls H {hero_action_desc}):    {step1['prob_villain_calls_hero_action']:7.3f}")
        print(f"P(V Raises H {hero_action_desc}):   {step1['prob_villain_raises_to_hero_action']:7.3f}\n")
        print(f"Gross EV (H {hero_action_desc}, V Folds): {step1['ev_if_villain_folds_to_hero_action']:7.3f}")
        print(f"Gross EV (H {hero_action_desc}, V Calls): {step1['ev_if_villain_calls_hero_action']:7.3f}")
        print(f"Net EV (H {hero_action_desc}, V Raises, H responds optimally): {step1['ev_if_villain_raises_hero_responds_optimally']:7.3f}")
        print(f"Overall Net EV[Hero {hero_action_desc}]: {step1['overall_ev_hero_action']:7.3f}")

    print_results(results_check_scenario, "Hero Checks;")

    # --- Scenario 2: Hero Bets (e.g., 1/2 pot = 150) ---
    hero_bet_halfpot_scenario = 150
    # If Hero bets 150, Villain might raise. Let's say Villain makes it 300 more (total bet from V is 450).
    # So, size_villain_raise is the *additional* amount Villain raises over Hero's bet.
    villain_raise_over_hero_bet = 300
    # Hero's reraise amount is still hero_reraise_amount_val = 500

    # Likelihoods for Villain's response to Hero's BET of 150:
    # These are P(V Folds | V Hand, H bets 150), P(V Calls | V Hand, H bets 150), etc.
    # Using the user's original example likelihoods for when Hero bets:
    lh_V_folds_to_H_bet = np.array([0.1, 0.2, 0.0, 0.0]) # Example: Stronger V hands don't fold
    lh_V_calls_H_bet    = np.array([0.7, 0.7, 0.8, 1.0]) # Example: V calls often
    lh_V_raises_H_bet   = np.array([0.2, 0.1, 0.2, 0.0]) # Example: V raises sometimes
    # Ensure these sum to 1 for each hand type, e.g. by normalizing last one or defining carefully.
    # For this example, let's assume they are defined to sum to 1.
    # E.g., for first hand type: 0.1+0.7+0.2 = 1.0. For second: 0.2+0.7+0.1 = 1.0. etc.

    # Likelihood of Villain calling Hero's reraise (after H bet, V raised, H reraised)
    # P(V calls H's reraise | V hand, H bet, V raised, H reraised)
    lh_V_calls_H_bet_reraise = np.array([0.8, 0.3, 0.05, 0.])


    print("\n\n--- Analysis for Hero Betting 1/2 Pot (size_hero_bet = 150) ---")
    results_bet_scenario = f(
        pot_model_func, pot,
        hero_bet_halfpot_scenario,      # Hero's initial bet = 150
        villain_raise_over_hero_bet,    # Villain's raise amount over Hero's bet
        hero_reraise_amount_val,        # Hero's reraise amount if V raises and H reraises
        priors,
        lh_V_folds_to_H_bet,            # P(V folds | V hand, H bets 150)
        lh_V_calls_H_bet,               # P(V calls | V hand, H bets 150)
        lh_V_raises_H_bet,              # P(V raises | V hand, H bets 150)
        lh_V_calls_H_bet_reraise        # P(V calls H's reraise | V hand, H bet, V raised, H reraised)
    )
    
    print_results(results_bet_scenario, "Hero Bets 150;")
