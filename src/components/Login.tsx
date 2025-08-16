import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Play, Sparkles, Zap } from 'lucide-react';

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('📋 로그인 폼 제출:', { username });

    try {
      const result = await login(username, password);
      console.log('📋 로그인 결과:', result);
      
      if (!result.success) {
        console.log('❌ 로그인 실패:', result.error);
        setError(result.error || '로그인에 실패했습니다');
      } else {
        console.log('✅ 로그인 성공 - 서버 세션 기반 인증');
      }
    } catch (error) {
      console.error('📋 로그인 처리 중 오류:', error);
      setError('로그인 처리 중 오류가 발생했습니다');
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
          <div className="flex items-center mb-8 group">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4 group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110">
              <Play className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <h1 className="text-3xl font-bold group-hover:text-yellow-300 transition-colors duration-300">Vid Maker</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-6 leading-tight animate-fade-in-up">
            자동화된 롱폼으로<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300 animate-gradient">
              극대화된 수익을 만들어보세요!
            </span>
          </h2>
          
          <p className="text-lg text-white/80 mb-8 leading-relaxed animate-fade-in-up delay-200">
            AI의 무한한 상상력으로<br />
            당신만의 수익 창출 시스템을 구축해보세요
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center group hover:translate-x-2 transition-transform duration-300 cursor-pointer">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-yellow-300/30 transition-all duration-300 group-hover:scale-110">
                <Sparkles className="w-4 h-4 text-yellow-300 group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <span className="text-white/90 group-hover:text-yellow-300 transition-colors duration-300">AI 스토리 자동 생성</span>
            </div>
            <div className="flex items-center group hover:translate-x-2 transition-transform duration-300 cursor-pointer">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-300/30 transition-all duration-300 group-hover:scale-110">
                <Zap className="w-4 h-4 text-blue-300 group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <span className="text-white/90 group-hover:text-blue-300 transition-colors duration-300">고품질 이미지 생성</span>
            </div>
            <div className="flex items-center group hover:translate-x-2 transition-transform duration-300 cursor-pointer">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-300/30 transition-all duration-300 group-hover:scale-110">
                <Play className="w-4 h-4 text-green-300 group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <span className="text-white/90 group-hover:text-green-300 transition-colors duration-300">원클릭 비디오 제작</span>
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md w-full">
          {/* 모바일 로고 */}
          <div className="lg:hidden flex items-center justify-center mb-8 group">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
              <Play className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors duration-300">Vid Maker</h1>
          </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]">
            {/* 상단 네비게이션 */}
            <div className="flex justify-end mb-8">
              <div className="flex space-x-4 text-sm">
                <button
                  onClick={onSwitchToRegister}
                  className="text-purple-600 font-medium hover:text-purple-700 transition-colors duration-200"
                >
                  회원가입
                </button>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600 font-medium">로그인</span>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인</h2>
              <p className="text-gray-600">Vid Maker 애플리케이션에 계속하려면 로그인하세요</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="group">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-purple-600 transition-colors duration-200">
                  이메일
                </label>
                <div className="relative">
                  <input
                    id="username"
                    name="username"
                    type="email"
                    required
                    className="w-full px-4 py-3 pr-12 border-b-2 border-gray-300 focus:ring-0 focus:border-purple-500 transition-all duration-300 text-gray-900 placeholder-gray-500 bg-transparent"
                    placeholder="bianca.rocha@mail.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    placeholder="비밀번호를 입력하세요"
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
                    로그인 중...
                  </div>
                ) : (
                  '로그인'
                )}
              </button>


            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 