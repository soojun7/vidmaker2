import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Play, Sparkles, Zap, CheckCircle } from 'lucide-react';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { register } = useAuth();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    // 이메일 형식 확인
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('유효한 이메일 주소를 입력해주세요');
      return;
    }

    setLoading(true);
    console.log('📋 회원가입 폼 제출:', { username, email });

    try {
      const result = await register(username, email, password);
      console.log('📋 회원가입 결과:', result);
      
      if (!result.success) {
        console.log('❌ 회원가입 실패:', result.error);
        setError(result.error || '회원가입에 실패했습니다');
      } else {
        console.log('✅ 회원가입 성공 - 서버 세션 기반 인증');
      }
    } catch (error) {
      console.error('📋 회원가입 처리 중 오류:', error);
      setError('회원가입 처리 중 오류가 발생했습니다');
    }
    
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* 왼쪽 배경 - 우주 테마 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
        {/* 우주 배경 - 별들 */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-1 h-1 bg-white rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-40 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse delay-2000"></div>
          <div className="absolute top-60 right-1/3 w-1 h-1 bg-white rounded-full animate-pulse delay-1500"></div>
          <div className="absolute top-80 left-1/2 w-1 h-1 bg-white rounded-full animate-pulse delay-500"></div>
          <div className="absolute top-32 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse delay-3000"></div>
          <div className="absolute top-72 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse delay-2500"></div>
          <div className="absolute top-96 right-1/2 w-1 h-1 bg-white rounded-full animate-pulse delay-1800"></div>
        </div>
        
        {/* 토성 행성 */}
        <div className="absolute top-20 right-16 w-24 h-24">
          <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400 rounded-full relative">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent rounded-full"></div>
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-32 h-4 bg-gradient-to-r from-transparent via-pink-200/50 to-transparent rounded-full"></div>
          </div>
        </div>
        
        {/* 유성 */}
        <div className="absolute top-16 right-8 w-16 h-16 animate-bounce">
          <div className="w-2 h-8 bg-gradient-to-b from-red-400 to-transparent rounded-full transform rotate-45"></div>
        </div>
        
        {/* 로켓 */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-32 h-48">
          {/* 로켓 본체 */}
          <div className="w-16 h-40 bg-gradient-to-b from-blue-400 via-purple-500 to-pink-500 rounded-t-full mx-auto relative">
            {/* 로켓 창문 */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-400 rounded-full border-2 border-white"></div>
            {/* 로켓 날개 */}
            <div className="absolute bottom-8 -left-4 w-8 h-12 bg-gradient-to-r from-blue-300 to-blue-400 rounded-l-full transform -rotate-12"></div>
            <div className="absolute bottom-8 -right-4 w-8 h-12 bg-gradient-to-l from-blue-300 to-blue-400 rounded-r-full transform rotate-12"></div>
          </div>
          {/* 로켓 발사 연기 */}
          <div className="w-20 h-16 bg-gradient-to-t from-pink-400 via-purple-400 to-transparent rounded-b-full mx-auto mt-2 animate-pulse"></div>
        </div>
        
        {/* 지형/구름 */}
        <div className="absolute bottom-0 left-0 right-0 h-32">
          <div className="absolute bottom-0 left-0 w-1/3 h-20 bg-gradient-to-t from-purple-800 to-transparent rounded-t-full"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-16 bg-gradient-to-t from-indigo-800 to-transparent rounded-t-full"></div>
          <div className="absolute bottom-8 left-1/4 w-16 h-8 bg-gray-400/30 rounded-full blur-sm"></div>
          <div className="absolute bottom-12 right-1/3 w-20 h-6 bg-gray-400/30 rounded-full blur-sm"></div>
        </div>
        
        {/* 콘텐츠 */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
              <Play className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Vid Maker</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            자동화된 롱폼으로<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
              극대화된 수익을 만들어보세요!
            </span>
          </h2>
          
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            AI의 무한한 상상력으로<br />
            당신만의 수익 창출 시스템을 구축해보세요
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <CheckCircle className="w-4 h-4 text-green-300" />
              </div>
              <span className="text-white/90">무료 계정으로 시작</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <Sparkles className="w-4 h-4 text-yellow-300" />
              </div>
              <span className="text-white/90">AI 스토리 자동 생성</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                <Zap className="w-4 h-4 text-blue-300" />
              </div>
              <span className="text-white/90">고품질 이미지 생성</span>
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽 회원가입 폼 */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full">
          {/* 모바일 로고 */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mr-3">
              <Play className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Vid Maker</h1>
          </div>

                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            {/* 상단 네비게이션 */}
            <div className="flex justify-end mb-8">
              <div className="flex space-x-4 text-sm">
                <span className="text-gray-600 font-medium">회원가입</span>
                <span className="text-gray-400">|</span>
                <button
                  onClick={onSwitchToLogin}
                  className="text-purple-600 font-medium hover:text-purple-700 transition-colors duration-200"
                >
                  로그인
                </button>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h2>
              <p className="text-gray-600">Vid Maker 애플리케이션에 계속하려면 회원가입하세요</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="group">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-purple-600 transition-colors duration-200">
                  사용자명
                </label>
                <div className="relative">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="w-full px-4 py-3 pr-12 border-b-2 border-gray-300 focus:ring-0 focus:border-purple-500 transition-all duration-300 text-gray-900 placeholder-gray-500 bg-transparent"
                    placeholder="사용자명을 입력하세요"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="group">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-purple-600 transition-colors duration-200">
                  이메일
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 pr-12 border-b-2 border-gray-300 focus:ring-0 focus:border-purple-500 transition-all duration-300 text-gray-900 placeholder-gray-500 bg-transparent"
                    placeholder="bianca.rocha@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="group">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-purple-600 transition-colors duration-200">
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 pr-12 border-b-2 border-gray-300 focus:ring-0 focus:border-purple-500 transition-all duration-300 text-gray-900 placeholder-gray-500 bg-transparent"
                    placeholder="비밀번호를 입력하세요 (최소 6자)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="group">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-purple-600 transition-colors duration-200">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="w-full px-4 py-3 pr-12 border-b-2 border-gray-300 focus:ring-0 focus:border-purple-500 transition-all duration-300 text-gray-900 placeholder-gray-500 bg-transparent"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    회원가입 중...
                  </div>
                ) : (
                  '회원가입'
                )}
              </button>


            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 