import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 语音输入：用浏览器自带的 Web Speech API 把语音转成文字。
 *
 * 模型服务（DeepSeek）的 API 只吃文本，没有 ASR/音频接口，发音频会 413。
 * 官方 App 的「语音输入」其实也是手机系统听写，所以这里走同一条路：
 * 系统把语音转成文字 → 文字进输入框 → 照常按文本发给模型。
 *
 * 浏览器支持：iOS Safari 14.5+ / Chrome / Edge（`webkitSpeechRecognition`）。
 * 需要安全上下文（HTTPS 或 localhost），否则会报 service-not-allowed。
 */

/* ------------------------------------------------------------------ */
/* Web Speech API 的最小类型声明                                       */
/* lib.dom 目前还没有 SpeechRecognition，只能自己声明用到的部分         */
/* ------------------------------------------------------------------ */

interface SpeechAlternative {
  readonly transcript: string;
}

interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternative;
}

interface SpeechResultList {
  readonly length: number;
  [index: number]: SpeechResult;
}

interface SpeechResultEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}

interface SpeechErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** 把浏览器的错误码翻成人话 */
const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': '麦克风权限被拒绝，请在浏览器设置里允许后重试',
  'service-not-allowed': '当前环境不允许语音识别，需要用 HTTPS 或 localhost 打开',
  'audio-capture': '没有找到可用的麦克风',
  'no-speech': '没有听到声音，再试一次',
  network: '语音识别服务连接失败，检查网络后重试',
};

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

interface UseSpeechInputOptions {
  /**
   * 识别到内容时回调。
   * `text` 是本次听写的完整文本（含还没定稿的部分），调用方只管整段替换。
   */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** 出错时回调，用于提示用户 */
  onError?: (message: string) => void;
}

export interface SpeechInputController {
  /** 当前浏览器是否支持语音识别 */
  supported: boolean;
  /** 正在收音 */
  listening: boolean;
  start: () => void;
  stop: () => void;
}

export function useSpeechInput({
  onTranscript,
  onError,
}: UseSpeechInputOptions): SpeechInputController {
  const [supported] = useState(() => getConstructor() !== null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** 已经定稿的部分，未定稿的增量每次都重新拼在后面 */
  const settledRef = useRef('');

  // 用 ref 存回调，这样 start/stop 不必因为回调变化而重建
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  });

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getConstructor();
    if (!Ctor) return;

    // 上一次会话还没收干净就先掐掉，避免 start() 抛 InvalidStateError
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = 'zh-CN';
    // iOS 对 continuous 支持很差，一次说一句最稳；停顿后会自动结束
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    settledRef.current = '';

    recognition.onresult = (event) => {
      let settled = '';
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) settled += transcript;
        else pending += transcript;
      }
      settledRef.current += settled;
      onTranscriptRef.current(settledRef.current + pending, pending === '');
    };

    recognition.onerror = (event) => {
      // 用户主动停的不算错误
      if (event.error === 'aborted') return;
      onErrorRef.current?.(ERROR_MESSAGES[event.error] ?? `语音识别失败：${event.error}`);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    // 先亮起来，权限被拒时 onerror/onend 会把它收回去
    setListening(true);

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      onErrorRef.current?.('麦克风启动失败，稍后再试');
    }
  }, []);

  // 卸载时别把麦克风留在开着的状态
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  return { supported, listening, start, stop };
}
