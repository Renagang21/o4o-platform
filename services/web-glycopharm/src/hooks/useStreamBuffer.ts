/**
 * useStreamBuffer — AI Streaming JSON → 읽기 좋은 텍스트 변환 버퍼
 * WO-O4O-AI-STREAMING-UX-REFINEMENT-V1
 *
 * LLM이 순수 JSON을 출력하므로, 스트리밍 토큰에서 summary 필드를 추출하여
 * 문장 단위로 버퍼링한 후 사용자에게 표시한다.
 */

import { useRef, useCallback } from 'react';

// summary 필드 값을 부분 JSON에서 추출하는 정규식
// "summary": "여기가 요약 텍스트..." (닫는 따옴표 없어도 매칭)
const SUMMARY_REGEX = /"summary"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/;

// 문장 종결 패턴: .!? 뒤에 공백 또는 문자열 끝
const SENTENCE_END = /[.!?。]\s/;

// JSON 이스케이프 시퀀스 복원
function unescapeJson(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

export interface StreamBuffer {
  /** 스트리밍 토큰 추가 (setState 호출 없음) */
  appendToken: (chunk: string) => void;
  /** 현재 표시할 텍스트 반환 (render tick에서 호출) */
  getDisplayText: () => string;
  /** 버퍼에 남은 텍스트를 모두 표시 텍스트에 반영 */
  flush: () => string;
  /** 상태 초기화 */
  reset: () => void;
}

export function useStreamBuffer(): StreamBuffer {
  // 원본 JSON 토큰 누적
  const rawJsonRef = useRef('');
  // 이전 추출에서 이미 표시된 summary 길이
  const prevExtractedLenRef = useRef(0);
  // 문장 버퍼 (아직 표시하지 않은 부분 텍스트)
  const sentenceBufferRef = useRef('');
  // 사용자에게 표시 중인 최종 텍스트
  const displayTextRef = useRef('');

  const appendToken = useCallback((chunk: string) => {
    rawJsonRef.current += chunk;

    // 부분 JSON에서 summary 값 추출 시도
    const match = rawJsonRef.current.match(SUMMARY_REGEX);
    if (!match) return;

    const fullExtracted = unescapeJson(match[1]);
    // 이전에 이미 처리한 부분 이후만 새로 추가
    const newText = fullExtracted.substring(prevExtractedLenRef.current);
    if (!newText) return;

    prevExtractedLenRef.current = fullExtracted.length;
    sentenceBufferRef.current += newText;

    // 문장 경계 또는 40자 초과 시 flush
    flushSentenceBuffer(false);
  }, []);

  const flushSentenceBuffer = useCallback((force: boolean) => {
    const buf = sentenceBufferRef.current;
    if (!buf) return;

    if (force) {
      displayTextRef.current += buf;
      sentenceBufferRef.current = '';
      return;
    }

    // 문장 종결점 찾기 (마지막 매칭 위치까지 flush)
    let lastBreak = -1;
    const re = new RegExp(SENTENCE_END.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(buf)) !== null) {
      lastBreak = m.index + m[0].length;
    }

    if (lastBreak > 0) {
      displayTextRef.current += buf.substring(0, lastBreak);
      sentenceBufferRef.current = buf.substring(lastBreak);
    } else if (buf.length > 40) {
      // 문장 경계 없이 40자 초과 — 전부 flush
      displayTextRef.current += buf;
      sentenceBufferRef.current = '';
    }
  }, []);

  const getDisplayText = useCallback(() => {
    return displayTextRef.current;
  }, []);

  const flush = useCallback(() => {
    flushSentenceBuffer(true);
    return displayTextRef.current;
  }, [flushSentenceBuffer]);

  const reset = useCallback(() => {
    rawJsonRef.current = '';
    prevExtractedLenRef.current = 0;
    sentenceBufferRef.current = '';
    displayTextRef.current = '';
  }, []);

  return { appendToken, getDisplayText, flush, reset };
}
