export interface GameState {
  pot: number;
  heroBet: number;
  heroRaise: number;
  hero3bet: number;
  villainBet: number;
  villainRaise: number;
  pwinInitial: number;
  pwinAfterVillainBet: number;
  pwinAfterVillainRaise: number;
}

export const index = [
  'check-fold',
  'check-call',
  'check-raise',
  'bet-fold',
  'bet-call',
  'bet-3bet'
] as string[];

export const columns = [
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
] as string[];

export type Index = typeof index[number];
export type Column = typeof columns[number];