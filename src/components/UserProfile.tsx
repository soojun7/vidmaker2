import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Settings, Lock, Trash2, Activity, BarChart3 } from 'lucide-react';

interface UserData {
  id: number;
  username: string;
  email: string;
  profile_image?: string;
  subscription_type: string;
  subscription_expires?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  theme?: string;
  language?: string;
  notification_email?: boolean;
  notification_push?: boolean;
  auto_save?: boolean;
  total_projects?: number;
  total_videos?: number;
  total_views?: number;
  total_likes?: number;
  total_duration?: number;
}

interface UserProfileProps {
  onBackToDashboard?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onBackToDashboard }) => {
  const { token, logout } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'stats' | 'activity' | 'security'>('profile');
  
  // 프로필 업데이트 상태
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: ''
  });

  // 비밀번호 변경 상태
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 설정 상태
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'ko',
    notification_email: true,
    notification_push: true,
    auto_save: true
  });

  // 통계 데이터
  const [stats, setStats] = useState({
    total_projects: 0,
    total_videos: 0,
    total_views: 0,
    total_likes: 0,
    total_duration: 0,
    last_activity: ''
  });

  // 활동 로그
  const [activityLogs, setActivityLogs] = useState([]);

  // 사용자 정보 조회
  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserData(data.user);
        setEditForm({
          username: data.user.username,
          email: data.user.email
        });
        setSettings({
          theme: data.user.theme || 'light',
          language: data.user.language || 'ko',
          notification_email: data.user.notification_email !== false,
          notification_push: data.user.notification_push !== false,
          auto_save: data.user.auto_save !== false
        });
      }
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 통계 조회
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('통계 조회 오류:', error);
    }
  };

  // 활동 로그 조회
  const fetchActivityLogs = async () => {
    try {
      const response = await fetch('/api/user/activity?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs);
      }
    } catch (error) {
      console.error('활동 로그 조회 오류:', error);
    }
  };

  // 프로필 업데이트
  const handleProfileUpdate = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserData(prev => prev ? { ...prev, ...data.user } : null);
        setEditMode(false);
        alert('프로필이 업데이트되었습니다.');
      } else {
        const error = await response.json();
        alert(error.error || '프로필 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      alert('프로필 업데이트에 실패했습니다.');
    }
  };

  // 비밀번호 변경
  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      
      if (response.ok) {
        alert('비밀번호가 변경되었습니다.');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        alert(error.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      alert('비밀번호 변경에 실패했습니다.');
    }
  };

  // 설정 업데이트
  const handleSettingsUpdate = async () => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        alert('설정이 업데이트되었습니다.');
      } else {
        const error = await response.json();
        alert(error.error || '설정 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('설정 업데이트 오류:', error);
      alert('설정 업데이트에 실패했습니다.');
    }
  };

  // 계정 삭제
  const handleAccountDelete = async () => {
    if (!window.confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        alert('계정이 삭제되었습니다.');
        logout();
      } else {
        const error = await response.json();
        alert(error.error || '계정 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      alert('계정 삭제에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'activity') {
      fetchActivityLogs();
    }
  }, [activeTab, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">사용자 정보를 불러올 수 없습니다</h2>
          <button 
            onClick={fetchUserData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: '프로필', icon: User },
    { id: 'settings', label: '설정', icon: Settings },
    { id: 'stats', label: '통계', icon: BarChart3 },
    { id: 'activity', label: '활동', icon: Activity },
    { id: 'security', label: '보안', icon: Lock }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">사용자 관리</h1>
                <p className="text-purple-100">계정 정보와 설정을 관리하세요</p>
              </div>
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  대시보드로 돌아가기
                </button>
              )}
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 탭 컨텐츠 */}
          <div className="p-8">
            {/* 프로필 탭 */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">프로필 정보</h2>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {editMode ? '취소' : '편집'}
                  </button>
                </div>

                {editMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        사용자명
                      </label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이메일
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleProfileUpdate}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">사용자명</label>
                        <p className="text-lg font-semibold text-gray-900">{userData.username}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">이메일</label>
                        <p className="text-lg font-semibold text-gray-900">{userData.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">구독 유형</label>
                        <p className="text-lg font-semibold text-gray-900 capitalize">{userData.subscription_type}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">가입일</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(userData.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">마지막 로그인</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {userData.last_login 
                            ? new Date(userData.last_login).toLocaleString('ko-KR')
                            : '정보 없음'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">계정 상태</label>
                        <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                          userData.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {userData.is_active ? '활성' : '비활성'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 설정 탭 */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">사용자 설정</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        테마
                      </label>
                      <select
                        value={settings.theme}
                        onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="light">라이트</option>
                        <option value="dark">다크</option>
                        <option value="auto">자동</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        언어
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="ko">한국어</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">이메일 알림</label>
                        <p className="text-sm text-gray-500">이메일로 알림을 받습니다</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notification_email}
                        onChange={(e) => setSettings(prev => ({ ...prev, notification_email: e.target.checked }))}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">푸시 알림</label>
                        <p className="text-sm text-gray-500">브라우저 푸시 알림을 받습니다</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notification_push}
                        onChange={(e) => setSettings(prev => ({ ...prev, notification_push: e.target.checked }))}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">자동 저장</label>
                        <p className="text-sm text-gray-500">작업 내용을 자동으로 저장합니다</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.auto_save}
                        onChange={(e) => setSettings(prev => ({ ...prev, auto_save: e.target.checked }))}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleSettingsUpdate}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  설정 저장
                </button>
              </div>
            )}

            {/* 통계 탭 */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">사용 통계</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">총 프로젝트</p>
                        <p className="text-3xl font-bold">{stats.total_projects}</p>
                      </div>
                      <div className="text-blue-200">
                        <BarChart3 size={32} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">총 비디오</p>
                        <p className="text-3xl font-bold">{stats.total_videos}</p>
                      </div>
                      <div className="text-green-200">
                        <Activity size={32} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100">총 조회수</p>
                        <p className="text-3xl font-bold">{stats.total_views.toLocaleString()}</p>
                      </div>
                      <div className="text-purple-200">
                        <User size={32} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100">총 좋아요</p>
                        <p className="text-3xl font-bold">{stats.total_likes.toLocaleString()}</p>
                      </div>
                      <div className="text-red-200">
                        <Activity size={32} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100">총 재생시간</p>
                        <p className="text-3xl font-bold">{Math.round(stats.total_duration / 60)}분</p>
                      </div>
                      <div className="text-yellow-200">
                        <BarChart3 size={32} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 활동 탭 */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">활동 로그</h2>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            활동
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            설명
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            IP 주소
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            시간
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {activityLogs.map((log: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {log.activity_type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.ip_address}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.created_at).toLocaleString('ko-KR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 보안 탭 */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900">보안 설정</h2>
                
                {/* 비밀번호 변경 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">비밀번호 변경</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        현재 비밀번호
                      </label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        새 비밀번호
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        새 비밀번호 확인
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handlePasswordChange}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      비밀번호 변경
                    </button>
                  </div>
                </div>

                {/* 계정 삭제 */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-4">계정 삭제</h3>
                  <p className="text-red-700 mb-4">
                    계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                  </p>
                  <button
                    onClick={handleAccountDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 size={20} />
                    <span>계정 삭제</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 