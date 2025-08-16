import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { registerUser, loginUser } from '../services/supabaseApi';

interface User {
  id: string;
  username: string;
  email: string;
  subscription_type?: string;
  last_login?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 전역 토큰 액세스를 위한 window 객체 설정
  useEffect(() => {
    (window as any).__AUTH_TOKEN__ = token;
    (window as any).__AUTH_USER__ = user;
  }, [token, user]);

  // 초기 토큰 복원 (서버 세션 기반)
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔍 서버 기반 인증 상태 확인 시작');
      
      try {
        // 서버에 세션 확인 요청
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include', // 쿠키 포함
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user && data.token) {
            console.log('✅ 서버에서 세션 복원:', data.user.username);
            setUser(data.user);
            setToken(data.token);
          } else {
            console.log('ℹ️ 서버에 유효한 세션이 없음');
          }
        } else {
          console.log('ℹ️ 서버 세션 확인 실패');
        }
      } catch (error) {
        console.log('ℹ️ 서버 세션 확인 중 오류:', error);
      }

      setLoading(false);
      console.log('🔍 서버 기반 인증 상태 확인 완료');
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log('=== 서버 기반 로그인 시도 ===');
      console.log('사용자명:', username);
      
      const result = await loginUser(username, password);
      console.log('로그인 API 결과:', result.success);
      
      if (result.success) {
        console.log('✅ 로그인 성공! 서버 세션 생성됨');
        setUser(result.user);
        setToken(result.token);
        return { success: true };
      } else {
        console.log('❌ 로그인 실패:', result.message);
        return { success: false, error: result.message || '로그인에 실패했습니다' };
      }
    } catch (error) {
      console.error('❌ 로그인 오류:', error);
      return { success: false, error: '로그인 중 오류가 발생했습니다' };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      console.log('=== 서버 기반 회원가입 시도 ===');
      console.log('사용자명:', username, '이메일:', email);
      
      const result = await registerUser(username, email, password);
      console.log('회원가입 API 결과:', result.success);
      
      if (result.success) {
        console.log('✅ 회원가입 성공! 서버 세션 생성됨');
        setUser(result.user);
        setToken(result.token);
        return { success: true };
      } else {
        console.log('❌ 회원가입 실패:', result.message);
        return { success: false, error: result.message || '회원가입에 실패했습니다' };
      }
    } catch (error) {
      console.error('❌ 회원가입 오류:', error);
      return { success: false, error: '회원가입 중 오류가 발생했습니다' };
    }
  };

  const logout = async () => {
    try {
      // 서버 세션 종료
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
    } catch (error) {
      console.error('서버 로그아웃 오류:', error);
    }

    // 클라이언트 상태 초기화
    setUser(null);
    setToken(null);
    (window as any).__AUTH_TOKEN__ = null;
    (window as any).__AUTH_USER__ = null;
    
    console.log('✅ 로그아웃 완료 - 서버 세션 기반');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};