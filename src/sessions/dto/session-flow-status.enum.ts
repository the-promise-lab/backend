/**
 * SessionFlowStatus describes the state returned by the session progression APIs.
 */
export enum SessionFlowStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  DAY_END = 'DAY_END',
  GAME_END = 'GAME_END',
  GAME_OVER = 'GAME_OVER',
  SUDDEN_DEATH = 'SUDDEN_DEATH',
}
