const API_BASE_URL = '';

export interface ImageGenerationParams {
  prompt: string;
  negative_prompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  num_images?: number;
  output_format?: string;
  output_quality?: number;
  check_nsfw?: boolean;
  seed?: number;
  reference_image?: string;
  reference_strength?: number;
}

export interface GeneratedImage {
  url: string;
  seed?: number;
  prompt: string;
  index: number;
}

export interface ImageGenerationResponse {
  success: boolean;
  images: Array<{ url: string }>;
  seed?: number;
  error?: string;
}

export interface ClaudeVisionResponse {
  content: Array<{ text: string }>;
  error?: string;
}

export const imageApi = {
  // 이미지 생성
  async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('이미지 생성 오류:', error);
      throw error;
    }
  },

  // 이미지 분석 (Claude Vision)
  async analyzeImage(imageFile: File, prompt: string = '이 이미지를 분석해줘'): Promise<ClaudeVisionResponse> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('prompt', prompt);

      const response = await fetch(`${API_BASE_URL}/api/claude-vision`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('이미지 분석 오류:', error);
      throw error;
    }
  },

  // Runware 설정 가져오기
  async getRunwareConfig() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/runware-config`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Runware 설정 가져오기 오류:', error);
      throw error;
    }
  },

  // 파일을 Base64로 변환
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
  },

  // 이미지 다운로드
  downloadImage(url: string, filename?: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `generated-image-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}; 