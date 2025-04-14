import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../hooks/useStores';
import { TranslationService } from '../../services/TranslationService';
import { FlagService } from '../../services/FlagService';
import './QuizMode.css';
import { CORRECT_ANSWER_DELAY, INCORRECT_ANSWER_DELAY } from '../../constants/timing';

export const QuizMode: React.FC = observer(() => {
  const { gameStore, settingsStore } = useStores();
  const [options, setOptions] = React.useState<string[]>([]);
  const [translatedOptions, setTranslatedOptions] = React.useState<string[]>([]);
  const [isAnswered, setIsAnswered] = React.useState(false);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
  const [isChangingText, setIsChangingText] = React.useState(false);
  const [currentFlagCountry, setCurrentFlagCountry] = React.useState<string | null>(null);

  const updateTranslations = React.useCallback(async () => {
    if (options.length > 0) {
      const translations = await Promise.all(
        options.map(country => 
          TranslationService.getTranslation(settingsStore.language, country)
        )
      );
      setTranslatedOptions(translations);
    }
  }, [options, settingsStore.language]);

  React.useEffect(() => {
    updateTranslations();
  }, [settingsStore.language, updateTranslations]);

  React.useEffect(() => {
    const loadOptions = async () => {
      setOptions([]);
      setTranslatedOptions([]);
      setIsAnswered(false);
      setSelectedAnswer(null);

      if (gameStore.currentFlag && !gameStore.isGameOver) {
        const savedState = gameStore.getQuizState();
        if (savedState) {
          setOptions(savedState.options);
          setTranslatedOptions(savedState.translatedOptions);
          setIsAnswered(savedState.isAnswered);
          setSelectedAnswer(savedState.selectedAnswer);
          return;
        }

        const flagOptions = await FlagService.getRandomOptions(
          gameStore.allFlags.filter(f => f.country !== gameStore.currentFlag?.country), 
          gameStore.currentFlag, 
          3, 
          gameStore.allFlags,
          settingsStore.difficulty
        );
        
        const countryOptions = flagOptions.map(flag => flag.country);
        setOptions(countryOptions);

        const translations = await Promise.all(
          countryOptions.map(country => 
            TranslationService.getTranslation(settingsStore.language, country)
          )
        );
        setTranslatedOptions(translations);

        gameStore.saveQuizState({
          options: countryOptions,
          translatedOptions: translations,
          isAnswered: false,
          selectedAnswer: null
        });
      }
    };

    loadOptions();
  }, [gameStore.currentFlag, gameStore.isGameOver]);

  React.useEffect(() => {
    if (gameStore.currentFlag) {
      setIsChangingText(true);
      const timer = setTimeout(() => {
        setIsChangingText(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [gameStore.currentFlag]);

  const handleAnswer = async (answer: string, index: number) => {
    if (isAnswered) return;
    
    const isCorrect = options[index] === gameStore.currentFlag?.country;
    setCurrentFlagCountry(gameStore.currentFlag?.country || null);
    
    React.startTransition(() => {
      setSelectedAnswer(answer);
      setIsAnswered(true);
      gameStore.saveQuizState({
        options,
        translatedOptions,
        isAnswered: true,
        selectedAnswer: answer
      });
    });

    await new Promise(resolve => setTimeout(resolve, isCorrect ? CORRECT_ANSWER_DELAY : INCORRECT_ANSWER_DELAY));
    
    React.startTransition(() => {
      setIsAnswered(false);
      setSelectedAnswer(null);
      setCurrentFlagCountry(null);
      gameStore.saveQuizState({
        options,
        translatedOptions,
        isAnswered: false,
        selectedAnswer: null
      });
    });
    
    await gameStore.handleAnswer(options[index]);
  };

  return (
    <div className="quiz-options">
      {translatedOptions.map((translation, index) => {
        const optionCountry = options[index];
        const isCorrectOption = optionCountry === currentFlagCountry;
        const isSelectedOption = optionCountry === selectedAnswer;
        
        return (
          <button
            key={`${optionCountry}-${index}-${currentFlagCountry}`}
            className={`option ${
              isAnswered
                ? isCorrectOption
                  ? 'correct'
                  : isSelectedOption && !isCorrectOption
                  ? 'incorrect'
                  : ''
                : ''
            }`}
            onClick={() => handleAnswer(optionCountry, index)}
            disabled={isAnswered}
          >
            <span className={`option-text ${isChangingText ? 'changing' : ''}`}>
              {translation}
            </span>
          </button>
        );
      })}
    </div>
  );
});