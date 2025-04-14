import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../hooks/useStores';
import './FlagDisplay.css';
import { useTranslation } from '../../hooks/useTranslation';

export const FlagDisplay: React.FC = observer(() => {
  const { gameStore, settingsStore } = useStores();
  const loadingText = useTranslation('loading', settingsStore.language, true);
  const [isChanging, setIsChanging] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (gameStore.currentFlag) {
      setIsChanging(true);
      // Wait for fade out before switching flags
      setTimeout(() => {
        setActiveIndex((prev) => (prev === 0 ? 1 : 0));
        setIsChanging(false);
      }, 150);
    }
  }, [gameStore.currentFlag]);

  if (!gameStore.currentFlag) {
    return <div className="flag-placeholder">{loadingText}</div>;
  }

  return (
    <div className="flag-container">
      <div 
        className={`flag-wrapper ${activeIndex === 0 ? 'active' : 'inactive'} ${isChanging ? 'changing' : ''}`}
      >
        <img
          src={activeIndex === 0 ? gameStore.currentFlag.url : gameStore.nextFlag?.url}
          alt="Flag to identify"
          className="flag-image"
          loading="eager"
        />
      </div>
      <div 
        className={`flag-wrapper ${activeIndex === 1 ? 'active' : 'inactive'} ${isChanging ? 'changing' : ''}`}
      >
        <img
          src={activeIndex === 1 ? gameStore.currentFlag.url : gameStore.nextFlag?.url}
          alt="Flag to identify"
          className="flag-image"
          loading="eager"
        />
      </div>
    </div>
  );
});