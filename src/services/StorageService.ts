import { GameMode, Language, Region, Difficulty } from '../types/Settings';
import { Flag } from '../types/Flag';

interface GameState {
  currentFlag: Flag | null;
  remainingFlags: Flag[];
  incorrectFlags: Flag[];
  isLoading: boolean;
  isGameOver: boolean;
  isReplayMode: boolean;
  elapsedTime: number;
  nextFlag: Flag | null;
  allFlags: Flag[];
  quizState: {
    options: string[];
    translatedOptions: string[];
    isAnswered: boolean;
    selectedAnswer: string | null;
  } | null;
  typeState: {
    answer: string;
    feedback: 'correct' | 'incorrect' | null;
    correctAnswer: string;
    isProcessing: boolean;
  } | null;
}

interface SettingsState {
  gameMode: GameMode;
  language: Language;
  selectedRegions: Region[];
  difficulty: Difficulty;
}

export class StorageService {
  private static GAME_STATE_KEY = 'flagTrainer_gameState';
  private static SETTINGS_STATE_KEY = 'flagTrainer_settingsState';
  private static HIGHSCORES_KEY = 'flagTrainer_highscores';

  static saveGameState(state: GameState): void {
    localStorage.setItem(this.GAME_STATE_KEY, JSON.stringify(state));
  }

  static getGameState(): GameState | null {
    const stored = localStorage.getItem(this.GAME_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  static saveSettingsState(state: SettingsState): void {
    localStorage.setItem(this.SETTINGS_STATE_KEY, JSON.stringify(state));
  }

  static getSettingsState(): SettingsState | null {
    const stored = localStorage.getItem(this.SETTINGS_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  static clearStorage(): void {
    localStorage.removeItem(this.GAME_STATE_KEY);
    localStorage.removeItem(this.SETTINGS_STATE_KEY);
  }

  static clearGameState(): void {
    localStorage.removeItem(this.GAME_STATE_KEY);
  }

  static setHighscore(regions: Region[], mode: GameMode, difficulty: Difficulty, score: number): void {
    const key = `${regions.sort().join(',')}_${mode}_${difficulty}`;
    const highscores = this.getHighscores();
    highscores[key] = score;
    localStorage.setItem(this.HIGHSCORES_KEY, JSON.stringify(highscores));
  }

  static getHighscore(regions: Region[], mode: GameMode, difficulty: Difficulty): number | null {
    const key = `${regions.sort().join(',')}_${mode}_${difficulty}`;
    const highscores = this.getHighscores();
    return highscores[key] || null;
  }

  private static getHighscores(): Record<string, number> {
    const stored = localStorage.getItem(this.HIGHSCORES_KEY);
    return stored ? JSON.parse(stored) : {};
  }
} 