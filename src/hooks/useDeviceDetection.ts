import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent;

      // 모바일 디바이스 감지 (여러 방법 조합)
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(userAgent);
      const isMobileWidth = width <= 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // 태블릿 감지
      const isTabletWidth = width > 768 && width <= 1024;
      const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(userAgent);

      // 최종 판단
      const isMobile = (isMobileUA || (isMobileWidth && isTouchDevice)) && !isTabletUA;
      const isTablet = isTabletUA || (isTabletWidth && isTouchDevice && !isMobile);
      const isDesktop = !isMobile && !isTablet;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        userAgent,
      });
    };

    // 초기 감지
    detectDevice();

    // 리사이즈 이벤트 리스너
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);
    
    // 방향 변경 감지 (모바일)
    const handleOrientationChange = () => {
      setTimeout(detectDevice, 100); // 약간의 지연 후 감지
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return deviceInfo;
};
