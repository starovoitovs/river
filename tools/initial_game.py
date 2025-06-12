import numpy as np
import pandas as pd
import nashpy as nash


index = [
    'check-fold',
    'check-call',
    'check-raise',
    'bet-fold',
    'bet-call',
    'bet-3bet'
]

columns = [
    'check/fold',
    'check/call',
    'check/raise-fold',
    'check/raise-call',
    'bet-fold/fold',
    'bet-fold/call',
    'bet-fold/raise-fold',
    'bet-fold/raise-call',
    'bet-call/fold',
    'bet-call/call',
    'bet-call/raise-fold',
    'bet-call/raise-call'
]


pot = 500

hero_bet = pot/2
hero_raise = pot/2
hero_3bet = pot

villain_bet = pot
villain_raise = pot/2

pwin_initial = 0.5
pwin_after_villain_bet = 0.5
pwin_after_villain_raise = 0.5


df = pd.DataFrame(index=index, columns=columns)
df.loc[['check-fold', 'check-call', 'check-raise'], ['check/fold', 'check/call', 'check/raise-fold', 'check/raise-call']] = pwin_initial * pot

df.loc[['check-fold'], ['bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call']] = 0
df.loc[['check-call'], ['bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call']] = pwin_after_villain_bet * (pot + villain_bet) - (1 - pwin_after_villain_bet) * villain_bet
df.loc[['check-raise'], ['bet-fold/fold', 'bet-fold/call', 'bet-fold/raise-fold', 'bet-fold/raise-call']] = pot + villain_bet

df.loc[['check-fold'], ['bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call']] = 0
df.loc[['check-call'], ['bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call']] = pwin_after_villain_bet * (pot + villain_bet) - (1 - pwin_after_villain_bet) * villain_bet
df.loc[['check-raise'], ['bet-call/fold', 'bet-call/call', 'bet-call/raise-fold', 'bet-call/raise-call']] = pwin_after_villain_bet * (pot + villain_bet + hero_raise) - (1 - pwin_after_villain_bet) * (villain_bet + hero_raise)

df.loc[['bet-fold', 'bet-call', 'bet-3bet'], ['check/fold', 'bet-fold/fold', 'bet-call/fold']] = pot
df.loc[['bet-fold', 'bet-call', 'bet-3bet'], ['check/call', 'bet-fold/call', 'bet-call/call']] = pwin_initial * (pot + hero_bet) - (1 - pwin_initial) * hero_bet

df.loc[['bet-fold'], ['check/raise-fold', 'bet-fold/raise-fold', 'bet-call/raise-fold']] = -hero_bet
df.loc[['bet-call'], ['check/raise-fold', 'bet-fold/raise-fold', 'bet-call/raise-fold']] = pwin_after_villain_raise * (pot + hero_bet + villain_raise) - (1 - pwin_after_villain_raise) * (hero_bet + villain_raise)
df.loc[['bet-3bet'], ['check/raise-fold', 'bet-fold/raise-fold', 'bet-call/raise-fold']] = pot + hero_bet + villain_raise

df.loc[['bet-fold'], ['check/raise-call', 'bet-fold/raise-call', 'bet-call/raise-call']] = -hero_bet
df.loc[['bet-call'], ['check/raise-call', 'bet-fold/raise-call', 'bet-call/raise-call']] = pwin_after_villain_raise * (pot + hero_bet + villain_raise) - (1 - pwin_after_villain_raise) * (hero_bet + villain_raise)
df.loc[['bet-3bet'], ['check/raise-call', 'bet-fold/raise-call', 'bet-call/raise-call']] = pwin_after_villain_raise * (pot + hero_bet + villain_raise + hero_3bet) - (1 - pwin_after_villain_raise) * (hero_bet + villain_raise + hero_3bet)

# subtracting half the pot makes it zero-sum, so zero-sum tools can be used
df = df - pot / 2
df


game = nash.Game(df.to_numpy(), -df.to_numpy())
s1, s2 = game.linear_program()

display(pd.DataFrame(s1, index=index))
display(pd.DataFrame(s2, index=columns))

game[s1, s2]  # utilities