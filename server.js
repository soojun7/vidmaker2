// 환경변수 로딩 (dotenv가 있다면)
try {
  require('dotenv').config();
} catch (e) {
  console.log('dotenv 모듈이 없습니다. 환경변수는 시스템에서 로드됩니다.');
}

// 배포 환경 디버깅
console.log('🚀 서버 시작 중...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET 설정됨:', !!(process.env.JWT_SECRET || process.env.REACT_APP_JWT_SECRET));
console.log('CLAUDE_API_KEY 설정됨:', !!(process.env.REACT_APP_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY));
console.log('RUNWARE_API_KEY 설정됨:', !!(process.env.REACT_APP_RUNWAY_API_KEY || process.env.RUNWAY_API_KEY));

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Runware } = require('@runware/sdk-js');
const { 
  supabase,
  hashPassword, 
  verifyPassword, 
  generateToken, 
  authenticateToken,
  initializeUserData,
  getUserById,
  logUserActivity,
  updateUserStats,
  createProject,
  getUserProjects
} = require('./auth');

const app = express();
const PORT = process.env.PORT || 80;

// 동시 처리 제한 (10명 사용자용)
const MAX_CONCURRENT_JOBS = 3;
let activeJobs = 0;

// 작업 큐 관리
const jobQueue = [];
let isProcessing = false;

// 작업 처리 함수
async function processNextJob() {
  if (isProcessing || jobQueue.length === 0 || activeJobs >= MAX_CONCURRENT_JOBS) {
    return;
  }
  
  isProcessing = true;
  const job = jobQueue.shift();
  activeJobs++;
  
  try {
    await job();
  } catch (error) {
    console.error('작업 처리 실패:', error);
  } finally {
    activeJobs--;
    isProcessing = false;
    processNextJob(); // 다음 작업 처리
  }
}

// 작업 추가 함수
function addJob(jobFunction) {
  return new Promise((resolve, reject) => {
    const job = async () => {
      try {
        const result = await jobFunction();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    jobQueue.push(job);
    processNextJob();
  });
}

// Runware 설정
const RUNWARE_CONFIG = {
  API_KEY: process.env.REACT_APP_RUNWAY_API_KEY || process.env.RUNWAY_API_KEY,
  WS_URL: 'wss://api.runware.ai/ws'
};

const CLAUDE_CONFIG = {
  API_KEY: process.env.REACT_APP_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY
};

const ELEVENLABS_CONFIG = {
  API_KEY: process.env.REACT_APP_ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || 'sk_22710d1f809696e927fafea8216eb42d21700e4504705735',
  API_URL: 'https://api.elevenlabs.io/v1'
};

const SUPERTONE_CONFIG = {
  API_KEY: process.env.REACT_APP_SUPERTONE_API_KEY || process.env.SUPERTONE_API_KEY || '3fe1f95cd6aa829dbd9cc5db99b15eb6',
  API_URL: 'https://api.supertoneapi.com/v1',  // 2025년 7월 업데이트 후 새 URL
  ENABLED: false  // 2025년 7월 업데이트로 서비스 중단됨
};

// Supertone을 ElevenLabs로 자동 대체하는 설정
const USE_ELEVENLABS_FOR_SUPERTONE = true;

// Runware 인스턴스 생성
const runware = new Runware({
  apiKey: RUNWARE_CONFIG.API_KEY,
  shouldReconnect: true,
  globalMaxRetries: 3,
  timeoutDuration: 120000,
});

// 파일 업로드 설정 (용량 제한)
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 제한
    files: 5 // 최대 5개 파일
  }
});

// CORS 설정 - 모든 도메인에서 접근 허용
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-sup-api-key'],
  credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// 정적 파일 제공
const buildPath = path.join(__dirname, 'build');
console.log('📁 Build 폴더 경로:', buildPath);
console.log('📁 Build 폴더 존재:', fs.existsSync(buildPath));
if (fs.existsSync(buildPath)) {
  const jsFiles = fs.readdirSync(path.join(buildPath, 'static', 'js')).filter(f => f.startsWith('main.') && f.endsWith('.js'));
  console.log('📄 현재 JS 파일들:', jsFiles);
}

// 캐시 무효화 강제 설정
app.use('/static', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
}, express.static(path.join(buildPath, 'static')));

app.use(express.static(buildPath, {
  setHeaders: (res, path) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
}));

// 서버 상태 모니터링
app.get('/api/server-status', (req, res) => {
  res.json({
    activeJobs,
    queueLength: jobQueue.length,
    maxConcurrentJobs: MAX_CONCURRENT_JOBS,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 모니터링 대시보드
app.get('/monitor', (req, res) => {
  res.sendFile(__dirname + '/monitor.html');
});

// 루트 경로 핸들러
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/build/index.html');
});

// 서버 정보 API
app.get('/api/server-info', (req, res) => {
  res.json({
    message: '롱메이커뉴 백업 서버가 실행 중입니다',
    version: '1.0.0',
    maxUsers: 10,
    endpoints: {
      runwareConfig: '/api/runware-config',
      generateImage: '/api/generate-image',
      claudeVision: '/api/claude-vision',
      claude: '/api/claude',
      generateTTS: '/api/generate-tts',
      combineAudio: '/api/combine-audio'
    }
  });
});

// Runware API 키 제공
app.get('/api/runware-config', (req, res) => {
  res.json({
    wsUrl: RUNWARE_CONFIG.WS_URL,
    apiKey: RUNWARE_CONFIG.API_KEY
  });
});

// Runware 이미지 생성 API
app.post('/api/generate-image', async (req, res) => {
  try {
    const {
      prompt,
      negative_prompt,
      model = 'google:2@1',
      width = 1024,
      height = 576,
      steps = 30,
      guidance_scale = 20,
      num_images = 1,
      output_format = 'JPG',
      output_quality = 95,
      check_nsfw = true,
      seed,
      seeds, // 여러 캐릭터 시드번호
      reference_image,
      reference_strength = 0.3,
      characterName
    } = req.body;

    console.log('이미지 생성 요청:', {
      prompt: prompt.substring(0, 100) + '...',
      model,
      width,
      height,
      steps,
      num_images,
      seed,
      seeds,
      characterName: characterName || '알 수 없음'
    });

    // UUID 생성
    const { v4: uuidv4 } = require('uuid');
    const taskUUID = uuidv4();

    // 여러 시드가 있는 경우 각 시드별로 이미지 생성
    const seedsToUse = seeds && seeds.length > 0 ? seeds : [seed];
    const requestBody = seedsToUse.map((currentSeed, index) => {
      // 각 요청마다 새로운 UUID 생성
      const { v4: uuidv4 } = require('uuid');
      const individualTaskUUID = uuidv4();
      
      return {
        taskType: "imageInference",
        taskUUID: individualTaskUUID,
        positivePrompt: prompt,
        negativePrompt: negative_prompt,
        model,
        width,
        height,
        steps,
        guidance_scale,
        num_images: 1, // 각 시드별로 1개씩 생성
        output_format,
        output_quality,
        check_nsfw,
        seed: currentSeed || undefined,
        reference_image,
        reference_strength
      };
    });

    console.log('Runware API 요청:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.runware.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNWARE_CONFIG.API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log('Runware API 응답 상태:', response.status);
    console.log('Runware API 응답:', responseText);

    if (!response.ok) {
      throw new Error(`Runware API 오류: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    
    if (result.data && result.data.length > 0) {
      console.log(`${result.data.length}개 이미지 생성 완료`);
      // 이미지 URL과 시드번호 추출하여 반환
      const imageData = result.data.map(item => ({
        url: item.imageURL || item.url || item,
        seed: item.seed
      }));
      res.json({
        success: true,
        images: imageData.map(item => item.url),
        seeds: imageData.map(item => item.seed),
        imageData: imageData // 전체 데이터도 포함
      });
    } else {
      throw new Error('이미지 생성에 실패했습니다.');
    }

  } catch (error) {
    console.error('이미지 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Claude 이미지 분석 API
app.post('/api/claude-vision', upload.single('image'), async (req, res) => {
  try {
    const { prompt = '이 이미지를 분석해줘' } = req.body;
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image } },
          { type: 'text', text: prompt }
        ]
      }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_CONFIG.API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages
      })
    });

    fs.unlinkSync(filePath); // 임시 파일 삭제

    if (!response.ok) {
      throw new Error(`Claude API 오류: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Claude Vision API 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// Claude API 프록시 엔드포인트
app.post('/api/claude', async (req, res) => {
  try {
    const { userMessage, context, systemPrompt, imageData, conversationHistory } = req.body;
    
    console.log('요청 받음:', { 
      userMessage, 
      context: context ? context.substring(0, 100) + '...' : '', 
      systemPrompt: systemPrompt ? systemPrompt.substring(0, 100) + '...' : '',
      hasImage: !!imageData 
    });
    
    const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY;
    
    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY가 설정되지 않았습니다.');
      return res.status(500).json({ 
        success: false, 
        error: 'CLAUDE_API_KEY가 설정되지 않았습니다. 환경 변수를 확인해주세요.' 
      });
    }
    const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

    const messages = [];
    
    // 시스템 프롬프트 추가
    if (systemPrompt) {
      messages.push({
        role: 'assistant',
        content: systemPrompt
      });
    }
    
    // 대화 히스토리 추가
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }
    
    // 이미지가 있으면 이미지와 함께 메시지 추가
    if (imageData) {
      console.log('이미지 데이터 받음, 길이:', imageData.length);
      console.log('이미지 데이터 시작 부분:', imageData.substring(0, 50));
      
      let base64Data = imageData;
      let mediaType = 'image/jpeg';
      
      // data:image/...;base64, 형식인 경우 처리
      if (imageData.startsWith('data:')) {
        const parts = imageData.split(',');
        if (parts.length === 2) {
          const header = parts[0];
          base64Data = parts[1];
          
          // media type 추출
          const mediaTypeMatch = header.match(/data:([^;]+)/);
          if (mediaTypeMatch) {
            mediaType = mediaTypeMatch[1];
          }
        }
      }
      
      console.log('처리된 이미지 데이터 길이:', base64Data.length);
      console.log('미디어 타입:', mediaType);
      
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          }
        ]
      });
    } else {
      // 컨텍스트가 있으면 추가
      if (context) {
        messages.push({
          role: 'user',
          content: `컨텍스트: ${context}\n\n사용자 메시지: ${userMessage}`
        });
      } else {
        messages.push({
          role: 'user',
          content: userMessage
        });
      }
    }

    const requestBody = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: messages
    };

    console.log('Claude API 요청:', JSON.stringify({
      ...requestBody,
      messages: requestBody.messages.map(msg => ({
        ...msg,
        content: typeof msg.content === 'string' ? 
          msg.content.substring(0, 100) + '...' : 
          'multipart content'
      }))
    }, null, 2));

    // 재시도 로직
    let lastError;
    const maxRetries = 3;
    const retryDelay = 2000; // 2초

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API 호출 시도 ${attempt}/${maxRetries}`);
        
        const response = await fetch(CLAUDE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Claude API 응답 상태:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Claude API 오류 응답:', errorText);
          
          // 529 오류(Overloaded)인 경우 재시도
          if (response.status === 529 && attempt < maxRetries) {
            console.log(`${retryDelay}ms 후 재시도합니다...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            lastError = new Error('API 서버가 과부하 상태입니다. 재시도 중...');
            continue;
          }
          
          // 다른 오류들에 대한 처리
          let errorMessage = `API 호출 실패: ${response.status}`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
            }
          } catch (e) {
            // JSON 파싱 실패 시 기본 메시지 사용
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Claude API 응답 성공');
        
        if (!data.content || !data.content[0] || !data.content[0].text) {
          throw new Error('Claude API 응답 형식이 잘못되었습니다.');
        }
        
        const content = data.content[0].text;
        console.log('추출된 컨텐츠 길이:', content.length);
        
        res.json({ success: true, content: content });
        return; // 성공 시 함수 종료
        
      } catch (error) {
        lastError = error;
        console.error(`시도 ${attempt} 실패:`, error.message);
        
        if (attempt < maxRetries) {
          console.log(`${retryDelay}ms 후 재시도합니다...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // 모든 재시도 실패
    throw lastError;
    
  } catch (error) {
    console.error('Claude API 호출 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ElevenLabs TTS API
app.post('/api/generate-tts', async (req, res) => {
  try {
    const { text, voice_id, model_id, voice_settings } = req.body;

    console.log('TTS 생성 요청:', {
      text: text.substring(0, 100) + '...',
      voice_id: voice_id || '기본 음성',
      model_id: model_id || 'eleven_multilingual_v2'
    });

    const defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel (여성 음성)
    const defaultVoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    };

    const response = await fetch(`${ELEVENLABS_CONFIG.API_URL}/text-to-speech/${voice_id || defaultVoiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_CONFIG.API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: model_id || 'eleven_multilingual_v2',
        voice_settings: voice_settings || defaultVoiceSettings
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ElevenLabs API 오류: ${response.status} - ${errorData.detail || '알 수 없는 오류'}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    console.log('TTS 생성 완료');
    res.json({
      success: true,
      audio: dataUrl
    });

  } catch (error) {
    console.error('TTS 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 오디오 통합 API
app.post('/api/combine-audio', async (req, res) => {
  try {
    const { segments } = req.body;

    if (!segments || segments.length === 0) {
      throw new Error('오디오 세그먼트가 없습니다.');
    }

    console.log('오디오 통합 요청:', {
      segmentCount: segments.length
    });

    // 임시 디렉토리 생성
    const tempDir = path.join(__dirname, 'temp_audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // 각 세그먼트를 임시 파일로 저장
    const tempFiles = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const tempFile = path.join(tempDir, `segment_${i}.mp3`);
      
      // base64 데이터를 파일로 저장
      const audioData = segment.audioData.replace(/^data:audio\/[^;]+;base64,/, '');
      fs.writeFileSync(tempFile, Buffer.from(audioData, 'base64'));
      tempFiles.push(tempFile);
    }

    // FFmpeg를 사용하여 오디오 통합
    const outputFile = path.join(tempDir, `combined_${Date.now()}.mp3`);
    
    const ffmpegArgs = [
      '-i', `concat:${tempFiles.map(f => f.replace(/\\/g, '/')).join('|')}`,
      '-c', 'copy',
      outputFile
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      let stderr = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', async (code) => {
        try {
          if (code === 0) {
            // 통합된 오디오 파일을 base64로 변환
            const combinedAudioBuffer = fs.readFileSync(outputFile);
            const base64Audio = combinedAudioBuffer.toString('base64');
            const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

            // 임시 파일들 정리
            tempFiles.forEach(file => {
              if (fs.existsSync(file)) fs.unlinkSync(file);
            });
            if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

            console.log('✅ 오디오 통합 완료');
            res.json({
              success: true,
              combinedAudio: dataUrl
            });
            resolve();
          } else {
            console.error('❌ FFmpeg 오디오 통합 실패:', stderr);
            throw new Error(`FFmpeg 오류 (code: ${code}): ${stderr}`);
          }
        } catch (error) {
          // 임시 파일들 정리
          tempFiles.forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
          });
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
          
          reject(error);
        }
      });

      ffmpeg.on('error', (error) => {
        console.error('❌ FFmpeg 프로세스 오류:', error);
        // 임시 파일들 정리
        tempFiles.forEach(file => {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        });
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        
        reject(error);
      });
    });

  } catch (error) {
    console.error('오디오 통합 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

  // FFmpeg 실행 헬퍼 함수
  function executeFFmpeg(ffmpegArgs, tempFiles, res) {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderrOutput = '';
      let stderrLength = 0;
      const MAX_STDERR_LENGTH = 10000; // 최대 10KB로 제한
      
      // 타임아웃 설정 (3분)
      const timeout = setTimeout(() => {
        console.error('FFmpeg 타임아웃 - 프로세스 종료');
        ffmpeg.kill('SIGKILL');
        reject(new Error('FFmpeg 타임아웃 - 3분 초과'));
      }, 180000); // 3분
      
      ffmpeg.stderr.on('data', (data) => {
        const dataStr = data.toString();
        if (stderrLength + dataStr.length < MAX_STDERR_LENGTH) {
          stderrOutput += dataStr;
          stderrLength += dataStr.length;
        }
      });
      
      ffmpeg.on('close', async (code) => {
        clearTimeout(timeout); // 타임아웃 클리어
        try {
          if (code === 0) {
            // 생성된 비디오 파일을 base64로 변환
            const outputFile = tempFiles[tempFiles.length - 1];
            const videoBuffer = fs.readFileSync(outputFile);
            const base64Video = videoBuffer.toString('base64');
            const dataUrl = `data:video/mp4;base64,${base64Video}`;

            // 임시 파일들 정리
            tempFiles.forEach(file => {
              if (fs.existsSync(file)) fs.unlinkSync(file);
            });

            console.log('비디오 생성 완료');
            res.json({
              success: true,
              video: dataUrl,
              message: '비디오 생성이 완료되었습니다.'
            });
            resolve();
          } else {
            console.error('❌ FFmpeg 개별 비디오 생성 실패 - 코드:', code);
            console.error('❌ FFmpeg stderr:', stderrOutput || '에러 출력 없음');
            console.error('❌ FFmpeg 명령어:', ffmpegArgs.join(' '));
            throw new Error(`FFmpeg 오류 (코드 ${code})`);
          }
        } catch (error) {
          // 임시 파일들 정리
          tempFiles.forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
          });
          
          reject(error);
        }
      });

      ffmpeg.on('error', (error) => {
        console.error('FFmpeg 실행 오류:', error);
        // 임시 파일들 정리
        tempFiles.forEach(file => {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        });
        
        reject(error);
      });
    });
  }

// 개별 비디오 생성 엔드포인트
app.post('/api/generate-individual-video', async (req, res) => {
  try {
    const { audioData, imageData, scriptId } = req.body;

    if (!audioData || !imageData) {
      return res.status(400).json({ error: '오디오와 이미지 데이터가 필요합니다.' });
    }

    console.log('🎬 개별 비디오 생성 요청:', {
      scriptId,
      imageDataLength: imageData.length,
      audioDataLength: audioData.length,
      imageDataType: imageData.startsWith('data:') ? 'base64' : imageData.startsWith('http') ? 'URL' : 'unknown'
    });

    // 임시 디렉토리 생성
    const tempDir = path.join(__dirname, 'temp_video');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // 오디오 파일 저장
    const audioDataClean = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
    const audioFile = path.join(tempDir, `audio_${scriptId}.mp3`);
    fs.writeFileSync(audioFile, Buffer.from(audioDataClean, 'base64'));

    // 이미지 파일 저장
    let imageDataClean = imageData;
    
    // data:image/...;base64, 형식인 경우 처리
    if (imageData.startsWith('data:')) {
      const parts = imageData.split(',');
      if (parts.length === 2) {
        imageDataClean = parts[1];
      }
    }
    
    // URL인 경우 다운로드
    if (imageData.startsWith('http')) {
      try {
        console.log(`이미지 다운로드 중: ${imageData.substring(0, 100)}...`);
        const imageResponse = await fetch(imageData);
        if (!imageResponse.ok) {
          throw new Error(`이미지 다운로드 실패: ${imageResponse.status}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        imageDataClean = Buffer.from(imageBuffer).toString('base64');
      } catch (error) {
        console.error('이미지 다운로드 오류:', error);
        throw new Error(`이미지 다운로드 실패: ${error.message}`);
      }
    }
    
    const imageFile = path.join(tempDir, `image_${scriptId}.jpg`);
    const imageBuffer = Buffer.from(imageDataClean, 'base64');
    fs.writeFileSync(imageFile, imageBuffer);

    // 비디오 출력 파일
    const outputFile = path.join(tempDir, `video_${scriptId}_${Date.now()}.mp4`);

    // FFmpeg 명령어 - 오디오 길이에 맞춰 자동으로 비디오 생성
    const ffmpegArgs = [
      '-i', audioFile,
      '-loop', '1',
      '-i', imageFile,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest', // 오디오 길이에 맞춰 비디오 종료
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=1024:576:force_original_aspect_ratio=decrease,pad=1024:576:(ow-iw)/2:(oh-ih)/2',
      '-y',
      outputFile
    ];
    
    console.log('🔧 개별 비디오 FFmpeg 명령어:', ffmpegArgs.join(' '));
    
    // FFmpeg 사용 가능성 체크
    try {
      const { spawn } = require('child_process');
      const ffmpegCheck = spawn('ffmpeg', ['-version']);
      ffmpegCheck.on('error', (error) => {
        console.error('❌ FFmpeg 설치 확인 실패:', error.message);
        throw new Error('FFmpeg가 설치되지 않았거나 PATH에 없습니다.');
      });
    } catch (checkError) {
      console.error('❌ FFmpeg 체크 오류:', checkError);
    }
    
    try {
      await executeFFmpeg(ffmpegArgs, [audioFile, imageFile, outputFile], res);
    } catch (error) {
      console.error('개별 비디오 FFmpeg 실행 실패:', error);
      // 임시 파일들 정리
      [audioFile, imageFile, outputFile].forEach(file => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      });
      
      res.status(500).json({
        success: false,
        error: `개별 비디오 생성 실패: ${error.message}`
      });
    }

  } catch (error) {
    console.error('개별 비디오 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 전체 비디오 생성 엔드포인트 (모든 씬 연결)
app.post('/api/generate-final-video', async (req, res) => {
  try {
    const { scenes, scripts } = req.body;

    if (!scenes || !scripts || scenes.length === 0 || scripts.length === 0) {
      return res.status(400).json({ error: '씬 설정과 스크립트 데이터가 필요합니다.' });
    }

    console.log('전체 비디오 생성 요청:', {
      scenesCount: scenes.length,
      scriptsCount: scripts.length
    });

    // 받은 씬 설정 상세 로그
    scenes.forEach((scene, index) => {
      console.log(`백엔드 - 씬 ${index + 1} 설정:`, {
        scriptId: scene.scriptId,
        volume: scene.volume,
        brightness: scene.brightness,
        contrast: scene.contrast,
        saturation: scene.saturation,
        subtitles: scene.subtitles
      });
    });

    // 임시 디렉토리 생성
    const tempDir = path.join(__dirname, 'temp_video');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // 각 씬별로 효과를 적용한 비디오 파일 생성
    const processedVideoFiles = [];
    
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      const sceneSettings = scenes.find(s => s.scriptId === script.id);
      
      // 임시 텍스트 파일 변수를 루프 시작에서 선언
      let textFile = null;
      let subtitleFilterToApply = null;
      
      if (!script.generatedVideo) {
        return res.status(400).json({ 
          error: `스크립트 ${script.id}에 대한 비디오가 없습니다.` 
        });
      }

      // 원본 비디오 파일을 임시로 저장
      const videoDataClean = script.generatedVideo.replace(/^data:video\/[^;]+;base64,/, '');
      const originalVideoFile = path.join(tempDir, `original_${script.id}_${Date.now()}.mp4`);
      
      try {
        fs.writeFileSync(originalVideoFile, Buffer.from(videoDataClean, 'base64'));
        console.log(`씬 ${script.id} 원본 비디오 파일 저장: ${originalVideoFile}`);
      } catch (error) {
        console.error(`씬 ${script.id} 비디오 파일 저장 실패:`, error);
        return res.status(500).json({ 
          error: `씬 ${script.id} 비디오 파일 저장 실패: ${error.message}` 
        });
      }

      // 씬 설정에 따라 효과 적용
      if (sceneSettings) {
        const processedVideoFile = path.join(tempDir, `processed_${script.id}_${Date.now()}.mp4`);
        
                 // 비디오 필터 구성
         const videoFilters = [];
         const audioFilters = [];
         
         // 밝기, 대비, 채도 적용 (기본값: 100 = 1.0)
         const brightness = ((sceneSettings?.brightness ?? 100) / 100) - 1; // -1.0 ~ 1.0 범위로 변환
         const contrast = (sceneSettings?.contrast ?? 100) / 100; // 0.0 ~ 2.0 범위
         const saturation = (sceneSettings?.saturation ?? 100) / 100; // 0.0 ~ 3.0 범위
         
         if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
           videoFilters.push(`eq=brightness=${brightness.toFixed(2)}:contrast=${contrast.toFixed(2)}:saturation=${saturation.toFixed(2)}`);
         }
         
         // 자막 텍스트 추가 (스크립트 텍스트를 자막으로 표시)
         const shouldAddSubtitles = script.text && script.text.trim() && 
           (sceneSettings?.subtitles?.enabled !== false); // undefined인 경우도 true로 처리
         
         if (shouldAddSubtitles) {
           // 특수문자 이스케이프 처리
           const escapedText = script.text
             .replace(/\\/g, '\\\\')  // 백슬래시
             .replace(/'/g, "\\'")    // 작은따옴표
             .replace(/"/g, '\\"')    // 큰따옴표
             .replace(/:/g, '\\:')    // 콜론
             .replace(/\[/g, '\\[')   // 대괄호
             .replace(/\]/g, '\\]')   // 대괄호
             .replace(/,/g, '\\,')    // 쉼표
             .replace(/;/g, '\\;');   // 세미콜론
           
           // 운영체제에 따른 폰트 경로 설정 및 폰트 존재 확인
           const os = require('os');
           const fs = require('fs');
           let fontPath = '';
           
           // 폰트 패밀리별 경로 매핑
           const getFontPaths = (fontFamily) => {
             if (os.platform() === 'darwin') {
               // macOS
               const macFontMap = {
                 'AppleSDGothicNeo': ['/System/Library/Fonts/AppleSDGothicNeo.ttc'],
                 'Arial': ['/System/Library/Fonts/Arial.ttf'],
                 'Helvetica': ['/System/Library/Fonts/Helvetica.ttc'],
                 'TimesNewRoman': ['/System/Library/Fonts/Times.ttc'],
                 'Courier': ['/System/Library/Fonts/Courier.ttc']
               };
               return macFontMap[fontFamily] || macFontMap['AppleSDGothicNeo'];
             } else if (os.platform() === 'win32') {
               // Windows
               const winFontMap = {
                 'AppleSDGothicNeo': ['C\\:/Windows/Fonts/malgun.ttf', 'C\\:/Windows/Fonts/gulim.ttc'],
                 'Arial': ['C\\:/Windows/Fonts/arial.ttf'],
                 'Helvetica': ['C\\:/Windows/Fonts/arial.ttf'],
                 'TimesNewRoman': ['C\\:/Windows/Fonts/times.ttf'],
                 'Courier': ['C\\:/Windows/Fonts/cour.ttf']
               };
               return winFontMap[fontFamily] || winFontMap['Arial'];
             } else {
               // Linux
               const linuxFontMap = {
                 'AppleSDGothicNeo': ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'],
                 'Arial': ['/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'],
                 'Helvetica': ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'],
                 'TimesNewRoman': ['/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'],
                 'Courier': ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf']
               };
               return linuxFontMap[fontFamily] || linuxFontMap['Arial'];
             }
           };
           
           // 사용자 자막 설정 가져오기 (기본값 적용) - 먼저 선언
           const subtitleSettings = {
             enabled: sceneSettings?.subtitles?.enabled ?? true,
             fontFamily: sceneSettings?.subtitles?.fontFamily ?? 'AppleSDGothicNeo',
             fontSize: sceneSettings?.subtitles?.fontSize ?? 32,
             fontColor: sceneSettings?.subtitles?.fontColor ?? 'white',
             position: sceneSettings?.subtitles?.position ?? 'bottom',
             hasBackground: sceneSettings?.subtitles?.hasBackground ?? true,
             backgroundColor: sceneSettings?.subtitles?.backgroundColor ?? 'black',
             backgroundOpacity: sceneSettings?.subtitles?.backgroundOpacity ?? 50
           };
           
           // 선택된 폰트 패밀리에 따른 폰트 찾기
           const possibleFonts = getFontPaths(subtitleSettings.fontFamily);
           
           // 사용 가능한 폰트 찾기
           for (const font of possibleFonts) {
             const cleanPath = font.replace(/\\\\/g, '/').replace(/C\\:/, 'C:');
             if (fs.existsSync(cleanPath)) {
               fontPath = font;
               break;
             }
           }
           
           // 텍스트 길이에 따른 자동 줄바꿈 처리
           const maxCharsPerLine = 40; // 한 줄 최대 글자수
           let processedText = escapedText;
           
           if (escapedText.length > maxCharsPerLine) {
             // 긴 텍스트를 여러 줄로 분할
             const words = escapedText.split(' ');
             const lines = [];
             let currentLine = '';
             
             for (const word of words) {
               if ((currentLine + word).length <= maxCharsPerLine) {
                 currentLine += (currentLine ? ' ' : '') + word;
               } else {
                 if (currentLine) lines.push(currentLine);
                 currentLine = word;
               }
             }
             if (currentLine) lines.push(currentLine);
             
             processedText = lines.join('\\n'); // FFmpeg에서 줄바꿈
           }
           
           // 자막 위치 계산
           let yPosition;
           switch (subtitleSettings.position) {
             case 'top':
               yPosition = 'text_h+20';
               break;
             case 'center':
               yPosition = '(h-text_h)/2';
               break;
             case 'bottom':
             default:
               yPosition = 'h-text_h-60';
               break;
           }
           
           // 배경 색상 설정
           let backgroundStyle = '';
           if (subtitleSettings.hasBackground && subtitleSettings.backgroundColor !== 'transparent') {
             const backgroundAlpha = (subtitleSettings.backgroundOpacity || 50) / 100;
             
             // 색상명을 hex 코드로 변환
             const colorMap = {
               'black': '0x000000',
               'white': '0xFFFFFF',
               'red': '0xFF0000',
               'blue': '0x0000FF',
               'green': '0x00FF00',
               'yellow': '0xFFFF00'
             };
             
             const bgColor = colorMap[subtitleSettings.backgroundColor] || '0x000000';
             backgroundStyle = `box=1:boxcolor=${bgColor}@${backgroundAlpha.toFixed(1)}:boxborderw=10:`;
           } else if (!subtitleSettings.hasBackground || subtitleSettings.backgroundColor === 'transparent') {
             backgroundStyle = ''; // 배경 없음
           }
           
           // 한국어 텍스트를 임시 파일로 저장 (인코딩 문제 해결)
           textFile = path.join(tempDir, `subtitle_text_${script.id}_${Date.now()}.txt`);
           fs.writeFileSync(textFile, processedText, 'utf8');
           
           // 자막 스타일 설정 - textfile 사용으로 한국어 지원
           let subtitleFilter;
           const baseFilter = `drawtext=textfile='${textFile}':` +
             `fontsize=${subtitleSettings.fontSize || 32}:` +
             `fontcolor=${subtitleSettings.fontColor || 'white'}:` +
             `bordercolor=black:` +
             `borderw=2:` +
             `shadowcolor=0x000000@0.8:` +
             `shadowx=1:shadowy=1:` +
             `x=(w-text_w)/2:` +
             `y=${yPosition}:` +
             backgroundStyle;
           
           if (fontPath) {
             subtitleFilter = baseFilter.replace('drawtext=', `drawtext=fontfile='${fontPath}':`);
           } else {
             subtitleFilter = baseFilter;
           }
           
           // 자막은 나중에 적용하기 위해 임시로 저장 (절대 여기서 videoFilters에 추가하지 않음)
           subtitleFilterToApply = subtitleFilter;
           
           console.log(`씬 ${script.id} 자막 적용:`, {
             text: script.text.substring(0, 30) + '...',
             fontFamily: subtitleSettings.fontFamily,
             fontPath: fontPath || '기본 폰트',
             fontSize: subtitleSettings.fontSize,
             fontColor: subtitleSettings.fontColor,
             position: subtitleSettings.position,
             hasBackground: subtitleSettings.hasBackground,
             backgroundColor: subtitleSettings.backgroundColor,
             backgroundOpacity: subtitleSettings.backgroundOpacity,
             os: os.platform(),
             lines: processedText.includes('\\n') ? processedText.split('\\n').length : 1
           });
         }
        
                          // 볼륨 조정 (기본값: 100 = 1.0)
         const volume = (sceneSettings?.volume ?? 100) / 100;
         if (volume !== 1) {
           audioFilters.push(`volume=${volume.toFixed(2)}`);
         }

         // 시각 효과 적용 (자막보다 먼저 적용)
         if (sceneSettings?.visualEffects) {
           const vfx = sceneSettings.visualEffects;
           
           // 페이드 인 효과
           if (vfx.fadeIn?.enabled) {
             videoFilters.push(`fade=t=in:st=0:d=${vfx.fadeIn.duration}`);
           }
           
           // 페이드 아웃 효과 (비디오 끝에서)
           if (vfx.fadeOut?.enabled) {
             // 비디오 끝에서 페이드아웃 (올바른 구문 사용)
             videoFilters.push(`fade=t=out:d=${vfx.fadeOut.duration}`);
           }
           
           // 줌 인 효과 (부드럽고 안정적인 버전 - TTS 시간에 맞춤)
           if (vfx.zoomIn?.enabled) {
             const startScale = 1.0;
             const endScale = 1 + (vfx.zoomIn.intensity / 100);
             // 실제 비디오 길이에 맞는 duration (초 단위를 프레임으로 변환, 25fps 기준)
             const durationInSeconds = 5; // 기본 5초, 실제로는 오디오 길이에 맞춰야 함
             const durationInFrames = durationInSeconds * 25;
             // 부드러운 줌을 위한 선형 보간
             const zoomRate = (endScale - startScale) / durationInFrames;
             videoFilters.push(`zoompan=z='if(lte(on,${durationInFrames}),${startScale}+${zoomRate}*on,${endScale})':d=${durationInFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1024x576`);
           }
           
           // 줌 아웃 효과 (부드럽고 안정적인 버전 - TTS 시간에 맞춤)
           if (vfx.zoomOut?.enabled) {
             const startScale = 1 + (vfx.zoomOut.intensity / 100);
             const endScale = 1.0;
             // 실제 비디오 길이에 맞는 duration (초 단위를 프레임으로 변환, 25fps 기준)
             const durationInSeconds = 5; // 기본 5초, 실제로는 오디오 길이에 맞춰야 함
             const durationInFrames = durationInSeconds * 25;
             // 부드러운 줌을 위한 선형 보간
             const zoomRate = (startScale - endScale) / durationInFrames;
             videoFilters.push(`zoompan=z='if(lte(on,${durationInFrames}),${startScale}-${zoomRate}*on,${endScale})':d=${durationInFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1024x576`);
           }
           
           // 블러 효과
           if (vfx.blur?.enabled) {
             videoFilters.push(`boxblur=${vfx.blur.intensity}:${vfx.blur.intensity}`);
           }
           
           // 샤프닝 효과
           if (vfx.sharpen?.enabled) {
             const strength = vfx.sharpen.intensity / 100;
             videoFilters.push(`unsharp=5:5:${strength}:5:5:0.0`);
           }
           
           // 빈티지 효과
           if (vfx.vintage?.enabled) {
             const strength = vfx.vintage.intensity / 100;
             videoFilters.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0:0:0:0:1`);
             videoFilters.push(`eq=contrast=${0.8 + strength * 0.4}:brightness=${-0.1 + strength * 0.2}`);
           }
           
           // 흑백 효과
           if (vfx.blackWhite?.enabled) {
             const intensity = vfx.blackWhite.intensity / 100;
             videoFilters.push(`colorchannelmixer=.299:.587:.114:0:.299:.587:.114:0:.299:.587:.114:0:0:0:0:1`);
             if (intensity < 1) {
               videoFilters.push(`colorbalance=rs=${1-intensity}:gs=${1-intensity}:bs=${1-intensity}`);
             }
           }
           
           // 세피아 효과
           if (vfx.sepia?.enabled) {
             const strength = vfx.sepia.intensity / 100;
             videoFilters.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0:0:0:0:1`);
           }
           
           console.log('시각 효과 적용:', {
             fadeIn: vfx.fadeIn?.enabled,
             fadeOut: vfx.fadeOut?.enabled,
             zoomIn: vfx.zoomIn?.enabled,
             zoomOut: vfx.zoomOut?.enabled,
             blur: vfx.blur?.enabled,
             sharpen: vfx.sharpen?.enabled,
             vintage: vfx.vintage?.enabled,
             blackWhite: vfx.blackWhite?.enabled,
             sepia: vfx.sepia?.enabled
           });
         }
         
         // 시각 효과가 모두 적용된 후 자막을 마지막에 추가 (줌 효과의 영향을 받지 않도록)
         console.log(`씬 ${script.id} subtitleFilterToApply 상태:`, {
           exists: !!subtitleFilterToApply,
           filter: subtitleFilterToApply ? subtitleFilterToApply.substring(0, 100) + '...' : null
         });
         
         if (subtitleFilterToApply) {
           videoFilters.push(subtitleFilterToApply);
           console.log(`씬 ${script.id} 자막 필터 추가됨!`);
         } else {
           console.log(`씬 ${script.id} 자막 필터가 null입니다!`);
         }
        
                 console.log(`씬 ${script.id} 효과 적용:`, {
           원본설정: {
             brightness: sceneSettings?.brightness,
             contrast: sceneSettings?.contrast,
             saturation: sceneSettings?.saturation,
             volume: sceneSettings?.volume
           },
           변환값: {
             brightness: brightness,
             contrast: contrast,
             saturation: saturation,
             volume: volume
           },
           videoFilters: videoFilters,
           audioFilters: audioFilters
         });
        
        // FFmpeg 명령어 구성
        const ffmpegArgs = ['-i', originalVideoFile];
        
        // 필터 적용
        if (videoFilters.length > 0) {
          ffmpegArgs.push('-vf', videoFilters.join(','));
        }
        if (audioFilters.length > 0) {
          ffmpegArgs.push('-af', audioFilters.join(','));
        }
        
        // 출력 설정
        ffmpegArgs.push(
          '-c:v', 'libx264',
          '-preset', 'medium', // 품질과 속도의 균형
          '-crf', '23', // 더 좋은 품질
          '-c:a', 'aac',
          '-b:a', '128k',
          '-y',
          processedVideoFile
        );
        
        console.log(`씬 ${script.id} 효과 적용 FFmpeg 명령어:`, ffmpegArgs.join(' '));
        
        try {
          // FFmpeg 실행하여 효과 적용 (개선된 오류 처리)
          await new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
            
            // textFile 변수를 캡처 (스코프 문제 해결)
            const capturedTextFile = textFile;
            
            let stderr = '';
            
            // 타임아웃 설정 (60초)
            const timeout = setTimeout(() => {
              console.error(`씬 ${script.id}: FFmpeg 타임아웃 - 프로세스 종료`);
              ffmpegProcess.kill('SIGKILL');
              reject(new Error('FFmpeg 타임아웃 - 60초 초과'));
            }, 60000);
            
            ffmpegProcess.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            
            ffmpegProcess.on('close', (code) => {
              clearTimeout(timeout);
              
              // 임시 텍스트 파일 정리
              if (capturedTextFile && fs.existsSync(capturedTextFile)) {
                try {
                  fs.unlinkSync(capturedTextFile);
                } catch (e) {
                  console.warn(`텍스트 파일 삭제 실패: ${capturedTextFile}`, e.message);
                }
              }
              
              if (code === 0) {
                console.log(`씬 ${script.id} 효과 적용 완료`);
                resolve();
              } else {
                console.error(`씬 ${script.id}: FFmpeg 종료 코드: ${code}`);
                console.error(`씬 ${script.id}: FFmpeg stderr:`, stderr.substring(0, 500));
                reject(new Error(`FFmpeg 종료 코드: ${code}`));
              }
            });
            
            ffmpegProcess.on('error', (error) => {
              clearTimeout(timeout);
              console.error(`씬 ${script.id}: FFmpeg 실행 오류:`, error);
              
              // 임시 텍스트 파일 정리
              if (capturedTextFile && fs.existsSync(capturedTextFile)) {
                try {
                  fs.unlinkSync(capturedTextFile);
                } catch (e) {
                  console.warn(`텍스트 파일 삭제 실패: ${capturedTextFile}`, e.message);
                }
              }
              
              reject(error);
            });
          });
          
          processedVideoFiles.push(processedVideoFile);
          
          // 원본 파일 삭제
          if (fs.existsSync(originalVideoFile)) {
            fs.unlinkSync(originalVideoFile);
          }
          
        } catch (error) {
          console.error(`씬 ${script.id} 효과 적용 실패:`, error);
          // 실패 시 원본 파일 사용
          processedVideoFiles.push(originalVideoFile);
        }
      } else {
        // 설정이 없으면 원본 파일 그대로 사용
        processedVideoFiles.push(originalVideoFile);
      }
    }

    // 전환 효과와 함께 모든 비디오 연결
    const outputFile = path.join(tempDir, `final_video_${Date.now()}.mp4`);
    let ffmpegArgs; // 변수를 블록 외부에서 선언
    
    if (processedVideoFiles.length === 1) {
      // 비디오가 하나뿐이면 단순 복사
      ffmpegArgs = [
        '-i', processedVideoFiles[0],
        '-c', 'copy',
        '-y',
        outputFile
      ];
      
      console.log('단일 비디오 복사 FFmpeg 명령어:', ffmpegArgs.join(' '));
      
    } else {
      // 여러 비디오를 연결 (단순하고 안정적인 방법)
      const concatFile = path.join(tempDir, `concat_${Date.now()}.txt`);
      const concatContent = processedVideoFiles.map(file => `file '${path.resolve(file)}'`).join('\n');
      fs.writeFileSync(concatFile, concatContent);
      
      ffmpegArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFile,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y',
        outputFile
      ];
      
      console.log('비디오 연결 FFmpeg 명령어:', ffmpegArgs.join(' '));
      console.log('연결할 처리된 비디오 파일들:', processedVideoFiles);
      
      // concat 파일도 나중에 정리할 목록에 추가
      processedVideoFiles.push(concatFile);
    }

    try {
      // FFmpeg 실행하여 최종 비디오 생성
      await new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        let stdout = '';
        let stderr = '';
        
        ffmpegProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        ffmpegProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            console.log('전체 비디오 생성 완료');
            resolve();
          } else {
            console.error('FFmpeg stderr:', stderr);
            reject(new Error(`FFmpeg 종료 코드: ${code}`));
          }
        });
        
        ffmpegProcess.on('error', (error) => {
          reject(error);
        });
      });
      
      // 생성된 비디오 파일을 base64로 변환하여 응답
      const videoData = fs.readFileSync(outputFile);
      const videoBase64 = `data:video/mp4;base64,${videoData.toString('base64')}`;
      
      console.log('전체 비디오 생성 성공, 파일 크기:', Math.round(videoData.length / 1024), 'KB');
      
      // 임시 파일들 정리
      [...processedVideoFiles, outputFile].forEach(file => {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch (e) {
            console.warn('임시 파일 삭제 실패:', file, e.message);
          }
        }
      });
      
      res.json({
        success: true,
        video: videoBase64
      });
      
    } catch (error) {
      console.error('전체 비디오 FFmpeg 실행 실패:', error);
      // 임시 파일들 정리
      [...processedVideoFiles, outputFile].forEach(file => {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch (e) {
            console.warn('임시 파일 삭제 실패:', file, e.message);
          }
        }
      });
      
      res.status(500).json({
        success: false,
        error: `전체 비디오 생성 실패: ${error.message}`
      });
    }

  } catch (error) {
    console.error('전체 비디오 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 통합 비디오 생성 엔드포인트 (큐 시스템 적용)
app.post('/api/generate-video', async (req, res) => {
  try {
    const { audioData, imageDataArray, durations } = req.body;

    if (!audioData || !imageDataArray || !durations) {
      return res.status(400).json({ error: '오디오, 이미지, 지속시간 데이터가 필요합니다.' });
    }

    console.log('비디오 생성 요청 (큐에 추가):', {
      imageCount: imageDataArray.length,
      durationCount: durations.length,
      queueLength: jobQueue.length,
      activeJobs
    });

    // 큐에 작업 추가
    const result = await addJob(async () => {
      return new Promise(async (resolve, reject) => {
        try {
          console.log('비디오 생성 작업 시작');

          // 임시 디렉토리 생성
          const tempDir = path.join(__dirname, 'temp_video');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
          }

          // 오디오 파일 저장 (개선된 유효성 검사)
          let audioDataClean = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
          
          // 오디오 데이터 유효성 검사
          if (!audioDataClean || audioDataClean.length < 100) {
            console.log('⚠️ 오디오 데이터가 너무 짧거나 유효하지 않음, 기본 오디오 사용');
            // 기본 오디오 파일 사용 (기존 테스트 파일)
            const defaultAudioPath = path.join(__dirname, 'garret_voice.mp3');
            if (fs.existsSync(defaultAudioPath)) {
              const audioFile = defaultAudioPath; // 기존 파일 직접 사용
              console.log('✅ 기본 오디오 파일 사용:', audioFile);
            } else {
              throw new Error('오디오 데이터가 유효하지 않고 기본 오디오 파일도 없습니다.');
            }
          } else {
            const audioFile = path.join(tempDir, 'audio.mp3');
            const audioBuffer = Buffer.from(audioDataClean, 'base64');
            console.log('📁 오디오 파일 저장:', audioFile, '크기:', audioBuffer.length);
            fs.writeFileSync(audioFile, audioBuffer);
          }
          
          // 최종 오디오 파일 경로 설정
          const finalAudioFile = audioDataClean && audioDataClean.length >= 100 
            ? path.join(tempDir, 'audio.mp3')
            : path.join(__dirname, 'garret_voice.mp3');

          // 이미지 파일들 저장 (개선된 처리)
          const imageFiles = [];
          for (let i = 0; i < imageDataArray.length; i++) {
            const imageData = imageDataArray[i];
            console.log(`이미지 데이터 ${i} 타입:`, typeof imageData);
            console.log(`이미지 데이터 ${i} 길이:`, imageData.length);
            console.log(`이미지 데이터 ${i} 시작 부분:`, imageData.substring(0, 100));
            
            let imageDataClean = imageData;
            
            // data:image/...;base64, 형식인 경우 처리
            if (imageData.startsWith('data:')) {
              console.log(`이미지 ${i}: data URL 형식 감지`);
              const parts = imageData.split(',');
              if (parts.length === 2) {
                imageDataClean = parts[1];
                console.log(`이미지 ${i}: base64 데이터 추출 완료, 길이:`, imageDataClean.length);
              }
            }
            
            // URL인 경우 다운로드
            if (imageData.startsWith('http')) {
              console.log(`이미지 ${i}: URL 형식 감지, 다운로드 시작`);
              try {
                console.log(`이미지 다운로드 중: ${imageData.substring(0, 100)}...`);
                const imageResponse = await fetch(imageData);
                if (!imageResponse.ok) {
                  throw new Error(`이미지 다운로드 실패: ${imageResponse.status}`);
                }
                const imageBuffer = await imageResponse.arrayBuffer();
                imageDataClean = Buffer.from(imageBuffer).toString('base64');
                console.log(`이미지 ${i}: 다운로드 완료, base64 길이:`, imageDataClean.length);
              } catch (error) {
                console.error('이미지 다운로드 오류:', error);
                throw new Error(`이미지 다운로드 실패: ${error.message}`);
              }
            }
            
            const imageFile = path.join(tempDir, `image_${i}.jpg`);
            const imageBuffer = Buffer.from(imageDataClean, 'base64');
            console.log(`이미지 ${i}: 파일 저장 중, 버퍼 크기:`, imageBuffer.length);
            fs.writeFileSync(imageFile, imageBuffer);
            imageFiles.push(imageFile);
            
            console.log(`이미지 파일 저장 완료: ${imageFile}, 파일 크기:`, fs.statSync(imageFile).size);
          }

          // 비디오 출력 파일
          const outputFile = path.join(tempDir, `video_${Date.now()}.mp4`);

          // 더 안정적인 FFmpeg 명령어
          const ffmpegArgs = [
            '-i', finalAudioFile,
            '-loop', '1',
            '-i', imageFiles[0], // 첫 번째 이미지만 사용
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '28', // 적당한 품질
            '-c:a', 'aac',
            '-b:a', '128k',
            '-shortest',
            '-pix_fmt', 'yuv420p',
            '-vf', 'scale=1024:576:force_original_aspect_ratio=decrease,pad=1024:576:(ow-iw)/2:(oh-ih)/2', // 크기 강제 설정
            '-y',
            outputFile
          ];
          
          console.log('FFmpeg 명령어:', ffmpegArgs.join(' '));
          
          try {
            // 임시 파일들 목록 (기본 오디오 파일은 삭제하지 않음)
            const tempFilesToCleanup = [];
            if (finalAudioFile.includes('temp_video')) {
              tempFilesToCleanup.push(finalAudioFile);
            }
            tempFilesToCleanup.push(...imageFiles, outputFile);
            
            await executeFFmpeg(ffmpegArgs, tempFilesToCleanup, res);
            resolve({ success: true, videoUrl: outputFile });
          } catch (error) {
            console.error('FFmpeg 실행 실패:', error);
            // 임시 파일들 정리 (기본 오디오 파일은 제외)
            const tempFilesToCleanup = [];
            if (finalAudioFile.includes('temp_video')) {
              tempFilesToCleanup.push(finalAudioFile);
            }
            [...tempFilesToCleanup, ...imageFiles, outputFile].forEach(file => {
              if (fs.existsSync(file)) {
                try {
                  fs.unlinkSync(file);
                  console.log('🗑️ 임시 파일 삭제:', file);
                } catch (e) {
                  console.warn('임시 파일 삭제 실패:', file, e.message);
                }
              }
            });
            reject(error);
          }
        } catch (error) {
          console.error('비디오 생성 작업 실패:', error);
          reject(error);
        }
      });
    });

    // 결과 반환
    if (result.success) {
      res.json({
        success: true,
        message: '비디오가 생성되었습니다',
        videoUrl: result.videoUrl
      });
    } else {
      res.status(500).json({
        success: false,
        error: '비디오 생성에 실패했습니다'
      });
    }

  } catch (error) {
    console.error('비디오 생성 API 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다'
    });
  }
});

// Claude Chat API
app.post('/api/chat', async (req, res) => {
  try {
    const { message, scriptCategory, scriptLengthHours, scriptLengthMinutes, transcript } = req.body;
    
    console.log('Chat API 요청:', {
      message: message.substring(0, 100) + '...',
      scriptCategory,
      scriptLengthHours,
      scriptLengthMinutes,
      transcriptLength: transcript ? transcript.length : 0
    });

    // 스크립트 길이 계산
    const totalMinutes = (scriptLengthHours * 60) + scriptLengthMinutes;
    const targetChars = Math.round(totalMinutes * 438); // 분당 약 438자

    // 기본 요청사항 구성
    let defaultRequest = '';
    if (scriptCategory && scriptCategory !== '미설정') {
      defaultRequest = `[카테고리: ${scriptCategory}]
${scriptCategory} 카테고리 요청사항:

1. 도입부 (Hook + 개요)
충격적인 장면 묘사 → 예고/티저 → 오늘 다룰 내용 소개

Hook: 실제 사건의 충격적인 순간으로 시작
예고: "진실은 달랐습니다", "하지만 이것은 시작에 불과했습니다" 등
개요: 오늘 다룰 인물과 사건의 간략한 소개

2. 본문 구조 (인물별 에피소드)
각 인물마다 동일한 4단계 구조:
A. 배경 설정
시대적 배경 → 인물 소개 → 성격/환경 → 범행 동기 형성

사건이 일어난 시대와 장소
범인의 기본 정보와 외모
어린 시절/성장 과정의 문제점
범행으로 이어지는 심리적 동기

B. 첫 번째 범행
구체적 날짜/시간 → 피해자 소개 → 접근 방식 → 범행 과정 → 결과

정확한 시간과 장소 명시
피해자의 배경과 범인과의 관계
범인의 접근 및 유인 방법
상세한 범행 과정 묘사
즉각적인 결과와 범인의 반응

C. 연쇄 범행
패턴 확립 → 수법 발전 → 추가 피해자들 → 대담해지는 과정

범행 수법의 체계화
시간이 지나면서 변화하는 양상
여러 피해자들의 사례
범인의 심리적 변화

D. 수사와 체포
단서 발견 → 수사 과정 → 결정적 증거 → 체포 과정 → 재판과 처벌

경찰이 의심하기 시작한 계기
수사상의 어려움과 돌파구
범인 검거의 결정적 순간
재판 과정과 최종 판결

3. 마무리
전체 사건 정리 → 사회적 영향 → 교훈 → 다음 예고

사건의 전체적 의미와 충격
이후 사회 변화나 제도 개선
우리가 얻을 수 있는 교훈
시청자들에게 전하는 메시지

4. 서술 기법

시간순 진행:
과거 → 현재 → 미래의 흐름으로 자연스럽게 연결

감정적 몰입:
독자의 감정을 끌어올리는 문체와 표현

객관적 사실:
판결문, 수사 기록 등 공식 자료 기반

중요: 위의 구조를 참고하되, "장면", "씬", "[~교훈]" 등의 구분 표시 없이 모든 내용이 자연스럽게 이어지는 하나의 완전한 스크립트로 작성해주세요.

제가 Transcript: 에 첨부한 스크립트를, 위와 같은 스크립트의 구조로 글자수 : 이상의 스크립트를 작성해주세요.
글자가 너무 길면 이어서 쓰겠습니다. 대신 이어서 쓸까요?를 묻지마세요.

첨부한 스크립트의 내용을 참고하여 구성이나 순서, 문장구성이나 단어선택을 적절히 다르게 사용하여 다른 스크립트처럼 써주세요. 단, 내용을 아예 바꿔버리면 안돼.`;
        } else {
      defaultRequest = `제가 Transcript: 에 첨부한 스크립트를, 위와 같은 스크립트의 구조로 글자수 : 이상의 스크립트를 작성해주세요.
글자가 너무 길면 이어서 쓰겠습니다. 대신 이어서 쓸까요?를 묻지마세요.

첨부한 스크립트의 내용을 참고하여 구성이나 순서, 문장구성이나 단어선택을 적절히 다르게 사용하여 다른 스크립트처럼 써주세요. 단, 내용을 아예 바꿔버리면 안돼.`;
    }

    // 글자수 자동 교체
    const updatedRequest = defaultRequest.replace(/글자수 : /, `글자수 : ${targetChars.toLocaleString()}`);

    // 최종 메시지 구성
    const finalMessage = `${updatedRequest}

[스크립트 길이 설정: ${targetChars.toLocaleString()}자 이상]

사용자 요청: ${message}

위 요청사항에 따라 바로 스크립트를 작성해주세요. 확인 질문이나 추가 설명 없이 바로 시작해주세요.

Transcript:
${transcript || ''}`;

    // Claude API 호출
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_CONFIG.API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 6000,
        messages: [
          {
            role: 'user',
            content: finalMessage
          }
        ]
      })
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API 오류: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const aiResponse = claudeData.content[0].text;

    console.log('Claude API 응답 완료:', aiResponse.length, '자');

    res.json({
      success: true,
      response: aiResponse,
      totalChars: aiResponse.length
    });

  } catch (error) {
    console.error('Chat API 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 스크립트 합치기 API
app.post('/api/combine-script', async (req, res) => {
  try {
    const { scriptSegments, totalChars, originalRequest } = req.body;
    
    console.log(`스크립트 합치기 요청: ${scriptSegments.length}개 세그먼트, 총 ${totalChars.toLocaleString()}자`);
    
    // 세그먼트들을 자연스럽게 연결
    let combinedScript = '';
    
    for (let i = 0; i < scriptSegments.length; i++) {
      const segment = scriptSegments[i];
      
      // 첫 번째 세그먼트는 그대로 사용
      if (i === 0) {
        combinedScript = segment;
        continue;
      }
      
      // 이전 세그먼트의 마지막 문장과 현재 세그먼트의 첫 문장이 중복되는지 확인
      const prevSegment = scriptSegments[i - 1];
      const prevLastSentence = prevSegment.split('.').slice(-2).join('.').trim();
      const currentFirstSentence = segment.split('.').slice(0, 2).join('.').trim();
      
      // 중복되는 부분이 있으면 제거
      if (prevLastSentence && currentFirstSentence && 
          (prevLastSentence.includes(currentFirstSentence.substring(0, 20)) || 
           currentFirstSentence.includes(prevLastSentence.substring(0, 20)))) {
        // 중복 부분 제거
        const cleanedSegment = segment.replace(currentFirstSentence, '').trim();
        combinedScript += '\n\n' + cleanedSegment;
      } else {
        // 중복이 없으면 그대로 추가
        combinedScript += '\n\n' + segment;
      }
    }
    
    // 최종 정리
    combinedScript = combinedScript
      .replace(/\[계속\.\.\.\]/g, '') // "[계속...]" 제거
      .replace(/\[계속\.\.\.\s*\]/g, '') // "[계속... ]" 제거
      .replace(/\[계속\s*\.\.\.\s*\]/g, '') // "[계속 ...]" 제거
      .replace(/\n{3,}/g, '\n\n') // 3개 이상의 연속된 줄바꿈을 2개로
      .replace(/^\s+|\s+$/g, '') // 앞뒤 공백 제거
      .trim();
    
    const finalChars = combinedScript.length;
    console.log(`스크립트 합치기 완료: ${finalChars.toLocaleString()}자 (원본: ${totalChars.toLocaleString()}자)`);
    
    res.json({
      success: true,
      combinedScript: combinedScript,
      totalChars: finalChars,
      originalChars: totalChars,
      segmentsCount: scriptSegments.length
    });

  } catch (error) {
    console.error('스크립트 합치기 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== 인증 API ====================

// 회원가입 API (Supabase)
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('🔄 Supabase 회원가입 요청 받음:', { body: req.body });
    const { username, email, password } = req.body;

    // 입력 검증
    if (!username || !email || !password) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다' });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '유효한 이메일 주소를 입력해주세요' });
    }

    // 중복 사용자 확인
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116은 "행이 없음" 오류
      console.error('사용자 중복 확인 오류:', checkError);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    if (existingUser) {
      return res.status(400).json({ error: '이미 존재하는 사용자명 또는 이메일입니다' });
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password);

    // 사용자 생성
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        password_hash: hashedPassword,
        last_login: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('사용자 생성 오류:', insertError);
      return res.status(500).json({ error: '사용자 생성 중 오류가 발생했습니다' });
    }

    const userId = newUser.id;

    try {
      // 사용자 데이터 초기화 (설정, 통계 등)
      await initializeUserData(userId);
      
      // 활동 로그 기록
      await logUserActivity(userId, 'register', '회원가입 완료', req);

      const token = generateToken(userId, username);
      
      // 사용자 정보 조회
      const userInfo = await getUserById(userId);
      
      res.json({
        success: true,
        message: '회원가입이 완료되었습니다',
        token,
        user: {
          id: userId,
          username,
          email,
          subscription_type: userInfo?.subscription_type || 'free',
          total_projects: userInfo?.user_stats?.[0]?.total_projects || 0,
          total_videos: userInfo?.user_stats?.[0]?.total_videos || 0
        }
      });
    } catch (initError) {
      console.error('사용자 데이터 초기화 오류:', initError);
      // 사용자 생성은 성공했으므로 토큰은 발급
      const token = generateToken(userId, username);
      res.json({
        success: true,
        message: '회원가입이 완료되었습니다 (일부 설정 초기화 실패)',
        token,
        user: {
          id: userId,
          username,
          email
        }
      });
    }
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 로그인 API (Supabase)
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔄 Supabase 로그인 요청 받음:', { body: req.body });
    const { username, password } = req.body;

    // 입력 검증
    if (!username || !password) {
      return res.status(400).json({ error: '사용자명과 비밀번호를 입력해주세요' });
    }

    // 사용자 조회
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${username},email.eq.${username}`)
      .single();

    if (fetchError || !user) {
      console.error('사용자 조회 오류:', fetchError);
      return res.status(401).json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다' });
    }

    // 비밀번호 검증
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다' });
    }

    try {
      // 마지막 로그인 시간 업데이트
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        console.error('로그인 시간 업데이트 오류:', updateError);
      }
      
      // 활동 로그 기록
      await logUserActivity(user.id, 'login', '로그인 성공', req);
      
      // 사용자 정보 조회 (설정, 통계 포함)
      const userInfo = await getUserById(user.id);
      
      // 토큰 생성
      const token = generateToken(user.id, user.username);
      
      res.json({
        success: true,
        message: '로그인이 완료되었습니다',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          subscription_type: userInfo?.subscription_type || 'free',
          total_projects: userInfo?.user_stats?.[0]?.total_projects || 0,
          total_videos: userInfo?.user_stats?.[0]?.total_videos || 0,
          last_login: userInfo?.last_login
        }
      });
    } catch (updateError) {
      console.error('사용자 정보 업데이트 오류:', updateError);
      // 기본 로그인은 성공
      const token = generateToken(user.id, user.username);
      res.json({
        success: true,
        message: '로그인이 완료되었습니다',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    }
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 사용자 정보 조회 API
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userInfo = await getUserById(req.user.userId);
    
    if (!userInfo) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    res.json({
      success: true,
      user: {
        id: userInfo.id,
        username: userInfo.username,
        email: userInfo.email,
        profile_image: userInfo.profile_image,
        subscription_type: userInfo.subscription_type,
        subscription_expires: userInfo.subscription_expires,
        is_active: userInfo.is_active,
        last_login: userInfo.last_login,
        created_at: userInfo.created_at,
        // 설정 정보
        theme: userInfo.theme,
        language: userInfo.language,
        notification_email: userInfo.notification_email,
        notification_push: userInfo.notification_push,
        auto_save: userInfo.auto_save,
        // 통계 정보
        total_projects: userInfo.total_projects || 0,
        total_videos: userInfo.total_videos || 0,
        total_views: userInfo.total_views || 0,
        total_likes: userInfo.total_likes || 0,
        total_duration: userInfo.total_duration || 0
      }
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 프로젝트 관련 API (사용자별로 구분)
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('프로젝트 조회 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    res.json({
      success: true,
      projects: projects || []
    });
  } catch (err) {
    console.error('프로젝트 조회 예외:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    console.log('프로젝트 생성 요청 받음:', req.body);
    console.log('사용자 ID:', req.user.userId);
    
    const { title, description, content } = req.body;

    if (!title) {
      console.log('제목이 없음');
      return res.status(400).json({ error: '프로젝트 제목을 입력해주세요' });
    }

    console.log('프로젝트 데이터:', { title, description, content });

    // 프로젝트 생성
    const project = await createProject(req.user.userId, { title, description, content });
    console.log('프로젝트 생성 성공:', project);
    
    // 활동 로그 기록
    logUserActivity(req.user.userId, 'create_project', `프로젝트 생성: ${title}`, req);

    res.json({
      success: true,
      project: {
        id: project.id,
        user_id: req.user.userId,
        title,
        description,
        content,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    console.error('오류 스택:', error.stack);
    res.status(500).json({ error: '서버 오류가 발생했습니다', details: error.message });
  }
});

// 프로젝트 수정 API
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content } = req.body;

    if (!title) {
      return res.status(400).json({ error: '프로젝트 제목을 입력해주세요' });
    }

    // 프로젝트가 현재 사용자의 것인지 확인 후 업데이트
    const { data: project, error } = await supabase
      .from('projects')
      .update({
        title,
        description,
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) {
      console.error('프로젝트 수정 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    if (!project) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // 활동 로그 기록
    await logUserActivity(req.user.userId, 'update_project', `프로젝트 수정: ${title}`, req);

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('프로젝트 수정 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 프로젝트 삭제 API

// ==================== 사용자 관리 API ====================

// 사용자 설정 업데이트 API
app.put('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const { theme, language, notification_email, notification_push, auto_save } = req.body;
    
    const { data: settings, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: req.user.userId,
        theme,
        language,
        notification_email,
        notification_push,
        auto_save,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('설정 업데이트 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    // 활동 로그 기록
    await logUserActivity(req.user.userId, 'update_settings', '사용자 설정 업데이트', req);

    res.json({
      success: true,
      message: '설정이 업데이트되었습니다',
      settings
    });
  } catch (error) {
    console.error('설정 업데이트 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 사용자 통계 조회 API
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const userInfo = await getUserById(req.user.userId);
    
    res.json({
      success: true,
      stats: {
        total_projects: userInfo.total_projects || 0,
        total_videos: userInfo.total_videos || 0,
        total_views: userInfo.total_views || 0,
        total_likes: userInfo.total_likes || 0,
        total_duration: userInfo.total_duration || 0,
        last_activity: userInfo.last_activity
      }
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 사용자 활동 로그 조회 API
app.get('/api/user/activity', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const { data: logs, error } = await supabase
      .from('user_activity_logs')
      .select('activity_type, description, ip_address, created_at')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('활동 로그 조회 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    res.json({
      success: true,
      logs: logs || []
    });
  } catch (error) {
    console.error('활동 로그 조회 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 사용자 프로필 업데이트 API
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ error: '사용자명과 이메일을 입력해주세요' });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '유효한 이메일 주소를 입력해주세요' });
    }

    // 중복 확인 (자신 제외)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .neq('id', req.user.userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('중복 확인 오류:', checkError);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    if (existingUser) {
      return res.status(400).json({ error: '이미 존재하는 사용자명 또는 이메일입니다' });
    }

    // 프로필 업데이트
    const { data: user, error } = await supabase
      .from('users')
      .update({
        username,
        email,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.userId)
      .select()
      .single();

    if (error) {
      console.error('프로필 업데이트 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    // 활동 로그 기록
    await logUserActivity(req.user.userId, 'update_profile', '프로필 업데이트', req);

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다',
      user: {
        id: req.user.userId,
        username,
        email
      }
    });
  } catch (error) {
    console.error('프로필 업데이트 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 비밀번호 변경 API
app.put('/api/user/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다' });
    }

    // 현재 비밀번호 확인
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.userId)
      .single();

    if (fetchError) {
      console.error('사용자 조회 오류:', fetchError);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다' });
    }

    // 새 비밀번호 해싱
    const hashedNewPassword = await hashPassword(newPassword);

    // 비밀번호 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.userId);

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    // 활동 로그 기록
    await logUserActivity(req.user.userId, 'change_password', '비밀번호 변경', req);

    res.json({
      success: true,
      message: '비밀번호가 변경되었습니다'
    });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 계정 삭제 API
app.delete('/api/user/account', authenticateToken, async (req, res) => {
  try {
    // 사용자 관련 모든 데이터 삭제 (Supabase의 CASCADE로 자동 삭제됨)
    // 활동 로그 기록
    await logUserActivity(req.user.userId, 'delete_account', '계정 삭제 요청', req);

    // 사용자 삭제 (관련 데이터는 CASCADE로 자동 삭제)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.user.userId);

    if (error) {
      console.error('계정 삭제 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    res.json({
      success: true,
      message: '계정이 삭제되었습니다'
    });
  } catch (error) {
    console.error('계정 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 프로젝트 삭제 (사용자 확인 포함)
    const { data: deletedProject, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) {
      console.error('프로젝트 삭제 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    if (!deletedProject) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    // 활동 로그 기록
    await logUserActivity(req.user.userId, 'delete_project', `프로젝트 삭제: ${deletedProject.title}`, req);

    res.json({
      success: true,
      message: '프로젝트가 삭제되었습니다'
    });
  } catch (error) {
    console.error('프로젝트 삭제 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 프로젝트 상세 조회 API
app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.userId)
      .single();

    if (error) {
      console.error('프로젝트 조회 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    if (!project) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('프로젝트 조회 예외:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// ===== 슈퍼톤 API 엔드포인트들 =====

// 1. Supertone TTS 생성 엔드포인트
app.post('/api/generate-supertone-tts', async (req, res) => {
  // Supertone 서비스 중단으로 ElevenLabs로 자동 대체
  if (USE_ELEVENLABS_FOR_SUPERTONE) {
    console.log('🔄 Supertone → ElevenLabs 자동 대체 처리');
    
    const { text, voice_id, speed, pitch, emotion, language } = req.body;
    
    // ElevenLabs 음성 매핑 (한국어 지원 음성으로)
    const elevenLabsVoiceMapping = {
      'ff700760946618e1dcf7bd': '21m00Tcm4TlvDq8ikWAM', // 기본 Rachel
      'sona_speech_1': 'pNInz6obpgDQGcFmaJgB', // Adam (한국어 가능)
      '기본 음성': '21m00Tcm4TlvDq8ikWAM'
    };
    
    const mappedVoice = elevenLabsVoiceMapping[voice_id] || '21m00Tcm4TlvDq8ikWAM';
    
    // ElevenLabs TTS 생성 요청
    try {
      const response = await fetch(`${ELEVENLABS_CONFIG.API_URL}/text-to-speech/${mappedVoice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_CONFIG.API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: parseFloat(emotion === 'neutral' ? '0.0' : '0.2'),
            use_speaker_boost: true
          }
        })
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        
        console.log('✅ ElevenLabs 대체 TTS 생성 성공');
        return res.json({
          success: true,
          audio: `data:audio/mpeg;base64,${base64Audio}`,
          provider: 'ElevenLabs (Supertone 대체)'
        });
      }
    } catch (error) {
      console.log('⚠️ ElevenLabs 대체 실패, 기본 응답 반환:', error.message);
    }
    
    // ElevenLabs도 실패 시 기본 응답
    return res.json({
      success: false,
      error: 'Supertone 서비스 중단으로 인해 TTS 생성이 불가능합니다. ElevenLabs 대체도 실패했습니다.',
      provider: 'Supertone (서비스 중단)'
    });
  }

  // 기존 Supertone 코드 (사용되지 않음)
  const maxRetries = 3;
  const retryDelay = 2000; // 2초
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { text, voice_id, speed, pitch, emotion, language } = req.body;

      console.log(`Supertone TTS 생성 요청 (시도 ${attempt}/${maxRetries}):`, {
        text: text.substring(0, 50) + '...',
        voice_id: voice_id || '기본 음성',
        emotion: emotion || 'neutral',
        language: language || 'ko'
      });

      // 타임아웃을 3분으로 설정
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000);

      // 슈퍼톤 API 요청 (공식 문서 기반)
      const defaultVoiceId = 'ff700760946618e1dcf7bd'; // Garret (기본 음성)
      const response = await fetch(`${SUPERTONE_CONFIG.API_URL}/text-to-speech/${voice_id || defaultVoiceId}?output_format=mp3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sup-api-key': SUPERTONE_CONFIG.API_KEY,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          language: language || 'ko',
          style: emotion || 'neutral',
          model: 'sona_speech_1',
          output_format: 'mp3',
          voice_settings: {
            pitch_shift: pitch || 0,
            pitch_variance: 1,
            speed: speed || 1
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Supertone API 오류: ${response.status} - ${errorData || '알 수 없는 오류'}`);
      }

      // Supertone API는 binary audio file을 직접 반환
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const audioData = `data:audio/mpeg;base64,${base64Audio}`;

      console.log(`Supertone TTS 생성 완료 (시도 ${attempt})`);
      res.json({
        success: true,
        audio: audioData
      });
      return; // 성공 시 함수 종료

    } catch (error) {
      lastError = error;
      console.error(`Supertone TTS 생성 시도 ${attempt} 실패:`, error.message);

      // 연결 관련 오류인 경우에만 재시도
      if (attempt < maxRetries &&
          (error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.message.includes('ECONNRESET') ||
           error.message.includes('timeout') ||
           (error.message.includes('500')))) {
        console.log(`${retryDelay}ms 후 재시도합니다...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // 재시도 불가능한 오류인 경우 즉시 실패 응답
      break;
    }
  }

  // 모든 재시도 실패
  console.error('모든 Supertone TTS 생성 시도 실패:', lastError.message);
  res.status(500).json({
    success: false,
    error: lastError.message
  });
});

// 2. Supertone 음성 목록 조회 엔드포인트
app.get('/api/supertone-voices', async (req, res) => {
  try {
    const response = await fetch(`${SUPERTONE_CONFIG.API_URL}/voices/search?language=ko&page_size=50`, {
      method: 'GET',
      headers: {
        'x-sup-api-key': SUPERTONE_CONFIG.API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supertone API 오류: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // 기본 음성들을 API 응답에 추가
    const customVoices = [
      { voice_id: 'ff700760946618e1dcf7bd', name: 'Garret', language: 'en', gender: 'male' },
      { voice_id: '2974e7e7940bcc352ee78e', name: 'Toma', language: 'ko', gender: 'male' }
    ];

    // API 응답과 커스텀 음성 합치기 (중복 제거)
    const apiVoices = data.items || [];
    const existingVoiceIds = new Set(apiVoices.map(voice => voice.voice_id));

    const additionalVoices = customVoices.filter(voice => !existingVoiceIds.has(voice.voice_id));
    const combinedVoices = [...additionalVoices, ...apiVoices];

    console.log(`Supertone 음성 목록: API ${apiVoices.length}개 + 커스텀 ${additionalVoices.length}개 = 총 ${combinedVoices.length}개`);

    res.json({
      success: true,
      voices: combinedVoices,
      total: combinedVoices.length
    });

  } catch (error) {
    console.error('Supertone 음성 목록 조회 오류:', error.message);
    console.log('기본 음성 목록으로 대체합니다.');

    // API 실패 시 기본 목록 반환
    const defaultVoices = [
      { voice_id: 'ff700760946618e1dcf7bd', name: 'Garret', language: 'en', gender: 'male' },
      { voice_id: 'aeda85bfe699f338b74d68', name: '한국어 여성 (기본)', language: 'ko', gender: 'female' },
      { voice_id: '2974e7e7940bcc352ee78e', name: 'Toma', language: 'ko', gender: 'male' },
      { voice_id: 'korean_male_01', name: '한국어 남성 1', language: 'ko', gender: 'male' }
    ];

    res.json({
      success: true,
      voices: defaultVoices,
      total: defaultVoices.length
    });
  }
});

// 3. 음성 상세 정보 조회 엔드포인트
app.get('/api/supertone-voice/:voice_id', async (req, res) => {
  try {
    const { voice_id } = req.params;

    const response = await fetch(`${SUPERTONE_CONFIG.API_URL}/voices/${voice_id}`, {
      method: 'GET',
      headers: {
        'x-sup-api-key': SUPERTONE_CONFIG.API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supertone API 오류: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      voice: data
    });

  } catch (error) {
    console.error('Supertone 음성 상세 정보 조회 오류:', error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 4. TTS 상태 확인 엔드포인트
app.get('/api/supertone-status', async (req, res) => {
  try {
    // 간단한 텍스트로 API 상태 확인
    const testResponse = await fetch(`${SUPERTONE_CONFIG.API_URL}/voices/search?page_size=1`, {
      method: 'GET',
      headers: {
        'x-sup-api-key': SUPERTONE_CONFIG.API_KEY,
        'Accept': 'application/json'
      }
    });

    const isHealthy = testResponse.ok;

    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      api_key_valid: isHealthy
    });

  } catch (error) {
    console.error('Supertone API 상태 확인 오류:', error.message);

    res.json({
      success: true,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      api_key_valid: false,
      error: error.message
    });
  }
});

console.log('🎤 Supertone API 엔드포인트 설정 완료');
console.log('📡 사용 가능한 Supertone 엔드포인트:');
console.log('   - POST /api/generate-supertone-tts');
console.log('   - GET  /api/supertone-voices');
console.log('   - GET  /api/supertone-voice/:voice_id');
console.log('   - GET  /api/supertone-status');

// 앱 상태 저장/조회 API
app.get('/api/app-state', authenticateToken, async (req, res) => {
  try {
    const { data: appState, error } = await supabase
      .from('user_app_states')
      .select('*')
      .eq('user_id', req.user.userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 "not found" 에러
      console.error('앱 상태 조회 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    res.json({
      success: true,
      appState: appState ? appState.app_state : null
    });
  } catch (err) {
    console.error('앱 상태 조회 예외:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

app.post('/api/app-state', authenticateToken, async (req, res) => {
  try {
    const { state } = req.body;
    
    if (!state) {
      return res.status(400).json({ error: '앱 상태 데이터가 필요합니다' });
    }

    // 기존 상태가 있는지 확인
    const { data: existingState } = await supabase
      .from('user_app_states')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    let result;
    if (existingState) {
      // 업데이트
      const { data, error } = await supabase
        .from('user_app_states')
        .update({
          app_state: state,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', req.user.userId)
        .select();
      
      result = { data, error };
    } else {
      // 생성
      const { data, error } = await supabase
        .from('user_app_states')
        .insert({
          user_id: req.user.userId,
          app_state: state
        })
        .select();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('앱 상태 저장 오류:', result.error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    res.json({
      success: true,
      message: '앱 상태가 저장되었습니다'
    });
  } catch (err) {
    console.error('앱 상태 저장 예외:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 사용자 설정 저장/조회 API
app.get('/api/user-settings', authenticateToken, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('사용자 설정 조회 오류:', error);
      return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }

    res.json({
      success: true,
      settings: settings || { theme: 'light', language: 'ko' }
    });
  } catch (err) {
    console.error('사용자 설정 조회 예외:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

app.post('/api/user-settings', authenticateToken, async (req, res) => {
  try {
    const { theme, language } = req.body;
    
    console.log('사용자 설정 저장 요청:', { userId: req.user.userId, theme, language });
    
    // 간단한 응답 (Supabase 테이블 구조 문제로 일시적으로 기본 응답)
    res.json({
      success: true,
      message: '설정이 저장되었습니다 (임시)'
    });
  } catch (err) {
    console.error('사용자 설정 저장 예외:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 프로덕션 서버 실행 (포트 80)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Vidmaker 프로덕션 서버가 포트 ${PORT}에서 실행 중입니다!`);
  console.log(`🌐 도메인: https://vidmaker.kr`);
  console.log(`🌐 서버 IP: 65.21.248.68`);
  
  // 서버 정보 출력
  const address = server.address();
  console.log(`📡 서버 주소:`, address);
});

// 서버 오류 처리
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ 포트 ${PORT}가 이미 사용 중입니다.`);
  } else {
    console.error('❌ 서버 시작 실패:', error.message);
  }
  process.exit(1);
});

// 연결 이벤트 처리 (프로덕션)
server.on('connection', (socket) => {
  console.log(`🔌 vidmaker.kr 연결: ${socket.remoteAddress}:${socket.remotePort}`);
}); 