import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // HTML 요소에 테마 클래스 추가/제거
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    
    // 서버에 테마 설정 저장 (서버 기반 인증 사용)
    const saveThemeToServer = async () => {
      try {
        const token = (window as any).__AUTH_TOKEN__;
        if (!token) return;

        await fetch('/api/user-settings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ theme })
        });
        console.log('✅ 테마 설정 서버 저장 완료:', theme);
      } catch (error) {
        console.log('ℹ️ 테마 설정 서버 저장 실패:', error);
      }
    };

    saveThemeToServer();
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}; 