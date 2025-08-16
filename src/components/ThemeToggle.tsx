import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 p-3 rounded-full bg-white dark:bg-dark-800 text-light-700 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-all duration-300 shadow-md border border-light-200 dark:border-dark-700 z-50"
      aria-label={theme === 'dark' ? '라이트모드로 전환' : '다크모드로 전환'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

export default ThemeToggle; 