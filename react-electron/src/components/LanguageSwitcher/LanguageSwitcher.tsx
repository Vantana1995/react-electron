import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './LanguageSwitcher.css';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (newLanguage: 'en' | 'ru') => {
    setLanguage(newLanguage);
  };

  return (
    <div className="language-switcher">
      <select 
        value={language} 
        onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'ru')}
        className="language-select"
      >
        <option value="en">🇺🇸 English</option>
        <option value="ru">🇷🇺 Русский</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher;
