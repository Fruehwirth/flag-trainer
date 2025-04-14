import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../hooks/useStores';
import { TranslationService } from '../../services/TranslationService';
import { FlagService } from '../../services/FlagService';
import './PickerMode.css';
import { CORRECT_ANSWER_DELAY, INCORRECT_ANSWER_DELAY } from '../../constants/timing';

export const PickerMode: React.FC = observer(() => {
  const { gameStore, settingsStore } = useStores();
  const [currentOptions, setCurrentOptions] = React.useState<string[]>([]);
  const [nextOptions, setNextOptions] = React.useState<string[]>([]);
  const [currentFlagUrls, setCurrentFlagUrls] = React.useState<string[]>([]);
  const [nextFlagUrls, setNextFlagUrls] = React.useState<string[]>([]);
  const [isAnswered, setIsAnswered] = React.useState(false);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
  const [countryName, setCountryName] = React.useState<string>('');
  const [isChangingFlags, setIsChangingFlags] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isSwitchingOptions, setIsSwitchingOptions] = React.useState(false);

  const loadOptions = React.useCallback(async (flag: typeof gameStore.currentFlag) => {
    if (!flag) return;

    const flagOptions = await FlagService.getRandomOptions(
      gameStore.allFlags,
      flag,
      3,
      gameStore.allFlags,
      settingsStore.difficulty
    );
    
    const countryOptions = flagOptions.map(flag => flag.country);
    const urls = flagOptions.map(flag => flag.url);

    return { options: countryOptions, flagUrls: urls };
  }, [gameStore.allFlags, settingsStore.difficulty]);

  React.useEffect(() => {
    const initializeOptions = async () => {
      setIsAnswered(false);
      setSelectedAnswer(null);

      if (gameStore.currentFlag && !gameStore.isGameOver) {
        const translation = await TranslationService.getTranslation(
          settingsStore.language,
          gameStore.currentFlag.country
        );
        setCountryName(translation);

        // Load current options
        const current = await loadOptions(gameStore.currentFlag);
        if (current) {
          setCurrentOptions(current.options);
          setCurrentFlagUrls(current.flagUrls);
        }

        // Load next options
        if (gameStore.nextFlag) {
          const next = await loadOptions(gameStore.nextFlag);
          if (next) {
            setNextOptions(next.options);
            setNextFlagUrls(next.flagUrls);
          }
        }
      }
    };

    initializeOptions();
  }, [gameStore.currentFlag, gameStore.isGameOver, gameStore.nextFlag, loadOptions, settingsStore.language]);

  React.useEffect(() => {
    if (gameStore.currentFlag) {
      setIsChangingFlags(true);
      // Wait for fade out before switching flags
      setTimeout(() => {
        setActiveIndex((prev) => (prev === 0 ? 1 : 0));
        setIsChangingFlags(false);
      }, 150);
    }
  }, [gameStore.currentFlag]);

  const handleAnswer = async (answer: string, index: number) => {
    if (isAnswered || isSwitchingOptions) return;
    
    const currentOpts = activeIndex === 0 ? currentOptions : nextOptions;
    const isCorrect = currentOpts[index] === gameStore.currentFlag?.country;
    
    React.startTransition(() => {
      setSelectedAnswer(answer);
      setIsAnswered(true);
    });

    await new Promise(resolve => setTimeout(resolve, isCorrect ? CORRECT_ANSWER_DELAY : INCORRECT_ANSWER_DELAY));
    
    // Start the fade out transition
    setIsSwitchingOptions(true);
    
    // Wait for fade out to complete
    await new Promise(resolve => setTimeout(resolve, 150));
    
    await gameStore.handleAnswer(currentOpts[index]);
    
    // After handling answer, current becomes next and next becomes new options
    setCurrentOptions(nextOptions);
    setCurrentFlagUrls(nextFlagUrls);
    
    if (gameStore.nextFlag) {
      const next = await loadOptions(gameStore.nextFlag);
      if (next) {
        setNextOptions(next.options);
        setNextFlagUrls(next.flagUrls);
      }
    } else {
      setNextOptions([]);
      setNextFlagUrls([]);
    }
    
    // Reset states and allow fade in
    setIsAnswered(false);
    setSelectedAnswer(null);
    setIsSwitchingOptions(false);
  };

  return (
    <div className="picker-container">
      <div className="country-name">{countryName}</div>
      <div className="picker-options">
        <div className={`picker-options-wrapper ${activeIndex === 0 ? 'active' : 'inactive'} ${isChangingFlags || isSwitchingOptions ? 'changing' : ''}`}>
          {currentFlagUrls.map((url, index) => {
            const optionCountry = currentOptions[index];
            const isCorrectOption = optionCountry === gameStore.currentFlag?.country;
            const isSelectedOption = optionCountry === selectedAnswer;
            
            return (
              <button
                key={`current-${optionCountry}-${index}`}
                className={`picker-option ${
                  isAnswered
                    ? isCorrectOption
                      ? 'correct'
                      : isSelectedOption
                      ? 'incorrect'
                      : ''
                    : ''
                }`}
                onClick={() => handleAnswer(optionCountry, index)}
                disabled={isAnswered}
              >
                <div className="flag-container">
                  <img 
                    src={url} 
                    alt="Flag option"
                    className="flag-image"
                    loading="eager"
                  />
                </div>
              </button>
            );
          })}
        </div>
        <div className={`picker-options-wrapper ${activeIndex === 1 ? 'active' : 'inactive'} ${isChangingFlags || isSwitchingOptions ? 'changing' : ''}`}>
          {nextFlagUrls.map((url, index) => {
            const optionCountry = nextOptions[index];
            const isCorrectOption = optionCountry === gameStore.currentFlag?.country;
            const isSelectedOption = optionCountry === selectedAnswer;
            
            return (
              <button
                key={`next-${optionCountry}-${index}`}
                className={`picker-option ${
                  isAnswered
                    ? isCorrectOption
                      ? 'correct'
                      : isSelectedOption
                      ? 'incorrect'
                      : ''
                    : ''
                }`}
                onClick={() => handleAnswer(optionCountry, index)}
                disabled={isAnswered}
              >
                <div className="flag-container">
                  <img 
                    src={url} 
                    alt="Flag option"
                    className="flag-image"
                    loading="eager"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});