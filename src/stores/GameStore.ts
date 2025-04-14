import { makeAutoObservable, runInAction } from 'mobx';
import { Flag } from '../types/Flag';
import { FlagService } from '../services/FlagService';
import { SettingsStore } from './SettingsStore';
import { shuffle } from '../utils/helpers';
import { StorageService } from '../services/StorageService';

export class GameStore {
  currentFlag: Flag | null = null;
  remainingFlags: Flag[] = [];
  incorrectFlags: Flag[] = [];
  isLoading: boolean = false;
  isGameOver: boolean = false;
  elapsedTime: number = 0;
  nextFlag: Flag | null = null;

  private quizState: {
    options: string[];
    translatedOptions: string[];
    isAnswered: boolean;
    selectedAnswer: string | null;
  } | null = null;

  private typeState: {
    answer: string;
    feedback: 'correct' | 'incorrect' | null;
    correctAnswer: string;
    isProcessing: boolean;
  } | null = null;

  private _isReplayMode = false;
  private timerInterval: NodeJS.Timer | null = null;
  private _isNewHighscore: boolean = false;

  constructor(private settingsStore: SettingsStore) {
    makeAutoObservable(this);
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = StorageService.getGameState();
    if (stored) {
      this.currentFlag = stored.currentFlag;
      this.remainingFlags = stored.remainingFlags;
      this.incorrectFlags = stored.incorrectFlags;
      this.isLoading = false;
      this.isGameOver = stored.isGameOver;
      this._isReplayMode = stored.isReplayMode;
      this.quizState = stored.quizState;
      this.typeState = stored.typeState;
      this.elapsedTime = stored.elapsedTime;
      this.nextFlag = stored.nextFlag;
    } else {
      this.initializeGame();
    }
  }

  private saveToStorage(): void {
    StorageService.saveGameState({
      currentFlag: this.currentFlag,
      remainingFlags: this.remainingFlags,
      incorrectFlags: this.incorrectFlags,
      isLoading: this.isLoading,
      isGameOver: this.isGameOver,
      isReplayMode: this._isReplayMode,
      quizState: this.quizState,
      typeState: this.typeState,
      elapsedTime: this.elapsedTime,
      nextFlag: this.nextFlag
    });
  }

  async initializeGame(): Promise<void> {
    this.isLoading = true;
    this.incorrectFlags = [];
    this.isGameOver = false;
    this.elapsedTime = 0;
    this.quizState = null;
    this.typeState = null;

    try {
      const flags = await FlagService.getFlagsForRegions(this.settingsStore.selectedRegions);
      runInAction(() => {
        // Only shuffle once at initialization
        this.remainingFlags = shuffle([...flags]);
        this.currentFlag = this.remainingFlags[0] || null;
        // Prepare the next flag
        this.nextFlag = this.remainingFlags[1] || null;
        this.incorrectFlags = [];
        this.isGameOver = false;
        this.isLoading = false;
        this.quizState = null;
        this.typeState = null;
        this._isReplayMode = false;
        this.startTimer();
        this.saveToStorage();
      });
    } catch (error) {
      console.error('Failed to initialize game:', error);
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async handleAnswer(answer: string, isCorrect?: boolean): Promise<boolean> {
    if (!this.currentFlag) return false;

    const answerIsCorrect = isCorrect !== undefined ? 
      isCorrect : 
      answer.toLowerCase() === this.currentFlag.country.toLowerCase();
    
    runInAction(() => {
      if (!answerIsCorrect) {
        this.incorrectFlags.push(this.currentFlag!);
      }
      
      // Remove the current flag from remaining flags
      this.remainingFlags = this.remainingFlags.slice(1);
      
      // Update current and next flags
      this.currentFlag = this.nextFlag;
      this.nextFlag = this.remainingFlags[0] || null;
      
      // Check if game is over
      if (this.remainingFlags.length === 0) {
        this.isGameOver = true;
        this.stopTimer();
        this.quizState = null;
        this.typeState = null;
        
        if (this.incorrectFlags.length > 0 && !this._isReplayMode) {
          // Prepare incorrect flags for replay
          setTimeout(() => {
            runInAction(() => {
              this.remainingFlags = shuffle([...this.incorrectFlags]);
              this.currentFlag = this.remainingFlags[0];
              this.nextFlag = this.remainingFlags[1] || null;
              this.checkAndUpdateHighscore();
            });
          }, 300);
        } else {
          this.currentFlag = null;
          this.nextFlag = null;
          this.checkAndUpdateHighscore();
        }
      }
      
      this.saveToStorage();
    });

    return answerIsCorrect;
  }
  
  async replayIncorrect(): Promise<void> {
    runInAction(() => {
      this._isReplayMode = true;
      this.remainingFlags = shuffle([...this.incorrectFlags]);
      this.currentFlag = this.remainingFlags[0];
      this.nextFlag = this.remainingFlags[1] || null;
      this.incorrectFlags = [];
      this.isGameOver = false;
      this.elapsedTime = 0;
      this.quizState = null;
      this.typeState = null;
      this.startTimer();
      this.saveToStorage();
    });
  }
  
  async restartGame(): Promise<void> {
    this._isReplayMode = false;
    StorageService.clearStorage();
    await this.initializeGame();
  }

  get progress(): number {
    if (this.remainingFlags === this.incorrectFlags) {
      return ((this.incorrectFlags.length - this.remainingFlags.length) / this.incorrectFlags.length) * 100;
    }
    return ((this.allFlags.length - this.remainingFlags.length) / this.allFlags.length) * 100;
  }

  get scorePercentage(): string {
    let answeredFlags = this.allFlags.length - this.remainingFlags.length;
    if (answeredFlags === 0) return '0';
    return ((this.correctCount / answeredFlags) * 100).toFixed(0);
  }

  getQuizState() {
    return this.quizState;
  }

  saveQuizState(state: typeof this.quizState) {
    this.quizState = state;
    this.saveToStorage();
  }

  clearGameState(): void {
    runInAction(() => {
      this.currentFlag = null;
      this.remainingFlags = [];
      this.incorrectFlags = [];
      this.isLoading = false;
      this.isGameOver = false;
      this._isReplayMode = false;
      this.quizState = null;
      this.typeState = null;
      StorageService.clearGameState();
    });
  }

  startTimer(): void {
    if (!this.timerInterval) {
      this.timerInterval = setInterval(() => {
        runInAction(() => {
          this.elapsedTime += 1;
          this.saveToStorage();
        });
      }, 1000);
    }
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval as NodeJS.Timeout);
      this.timerInterval = null;
    }
  }

  formatTime(): string {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = this.elapsedTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  get correctCount(): number {
    return this.isReplayMode ? 
      this.remainingFlags.length :
      this.allFlags.length - (this.remainingFlags.length + this.incorrectFlags.length);
  }

  get allFlags(): Flag[] {
    return this.isReplayMode ? this.incorrectFlags : [...this.remainingFlags, ...this.incorrectFlags];
  }

  get isReplayMode(): boolean {
    return this._isReplayMode;
  }

  get isNewHighscore(): boolean {
    return this._isNewHighscore;
  }

  private checkAndUpdateHighscore(): void {
    if (this._isReplayMode) {
      this._isNewHighscore = false;
      return;
    }
    
    const currentScore = parseInt(this.scorePercentage);
    const currentHighscore = StorageService.getHighscore(
      this.settingsStore.selectedRegions,
      this.settingsStore.gameMode,
      this.settingsStore.difficulty
    );

    if (currentHighscore === null || currentScore > currentHighscore) {
      StorageService.setHighscore(
        this.settingsStore.selectedRegions,
        this.settingsStore.gameMode,
        this.settingsStore.difficulty,
        currentScore
      );
      this._isNewHighscore = currentHighscore !== null;
    } else {
      this._isNewHighscore = false;
    }
  }

  get currentHighscore(): number | null {
    if (this._isReplayMode) return null;
    return StorageService.getHighscore(
      this.settingsStore.selectedRegions,
      this.settingsStore.gameMode,
      this.settingsStore.difficulty
    );
  }

}