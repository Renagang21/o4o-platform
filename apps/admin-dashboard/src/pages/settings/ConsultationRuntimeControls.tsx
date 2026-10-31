import { useEffect, useState } from 'react';
import { setConsultationRuntime, type ConsultationRuntimeSettings } from '@/api/ai-management';
import type { ModelController } from './AiModelControls';

const defaults: ConsultationRuntimeSettings = { recognition: 'browser', translation: 'policy', synthesis: 'browser', detectLanguage: true, speechLanguages: ['ko', 'en', 'zh'] };
const languages = [['ko', '한국어'], ['en', '영어'], ['zh', '중국어'], ['ja', '일본어'], ['vi', '베트남어'], ['th', '태국어'], ['id', '인도네시아어']];
export function ConsultationRuntimeControls({ control }: { control: ModelController }) {
  const [settings, setSettings] = useState(defaults);
  useEffect(() => { setSettings(control.data?.consultation ?? defaults); }, [control.data]);
  return <section aria-label="상담 실행 수단" className="space-y-4 rounded border bg-white p-4">
    <h3 className="font-semibold">상담 실행 수단</h3>
    <p className="text-sm">연결된 수단을 용도별로 선택합니다. 저장은 실제 인증·가격 준비 또는 현장 품질 검증을 뜻하지 않습니다. 서버 선택은 다음 요청에 적용됩니다. 음성 선택을 바꾼 뒤 상담 화면을 새로 열어 주세요. 진행 중 요청은 시작한 수단으로 마치며 다른 수단으로 자동 전환하지 않습니다.</p>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void control.run(() => setConsultationRuntime(settings, control.data!.revision), '상담 실행 수단을 저장했습니다. 다음 요청부터 적용합니다.'); }}>
      <fieldset disabled={!control.data || control.busy || control.loading} className="space-y-3">
        {(['recognition', 'translation', 'synthesis'] as const).map(key => <label key={key} className="block">
          {{ recognition: '음성 인식', translation: '언어 번역', synthesis: '음성 재생' }[key]}
          <select aria-label={`상담 ${key}`} className="mt-2 block min-h-11 max-w-full rounded border p-2 sm:ml-3 sm:mt-0 sm:inline-block" value={settings[key]} onChange={event => setSettings(previous => ({ ...previous, [key]: event.target.value }))}>
            <option value={key === 'translation' ? 'policy' : 'browser'}>{key === 'translation' ? '상담 번역 사용처의 정책 모델' : '브라우저 기능 · 현재 Chrome'}</option>
            <option value="google-cloud">Google Cloud API · 연결·가격 확인 필요</option>
          </select>
        </label>)}
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={settings.detectLanguage} onChange={event => setSettings(previous => ({ ...previous, detectLanguage: event.target.checked }))} />고객 입력 언어 자동 감지 허용 · 수동 수정 가능</label>
        <div><p>Google 음성 자동 감지 후보 · 최대 3개</p><div className="flex flex-wrap gap-3">{languages.map(([code, label]) => <label key={code} className="flex min-h-11 items-center gap-1"><input type="checkbox" checked={settings.speechLanguages.includes(code)}
          disabled={!settings.speechLanguages.includes(code) && settings.speechLanguages.length >= 3}
          onChange={event => setSettings(previous => ({ ...previous, speechLanguages: event.target.checked ? [...previous.speechLanguages, code] : previous.speechLanguages.filter(value => value !== code) }))} />{label}</label>)}</div></div>
        <button className="min-h-11 rounded border px-4 disabled:opacity-50" disabled={!settings.speechLanguages.length}>상담 실행 수단 저장</button>
      </fieldset>
    </form>
    <p className="text-sm">브라우저 음성 인식은 선택 언어를 사용합니다. Chrome 텍스트 언어 감지는 기기별 지원 확인이 필요하며 모바일에서 보장되지 않습니다. Google은 서버 ADC·프로젝트와 모델별 가격/한도 준비가 필요합니다. STT는 음성 초, 번역·TTS는 문자 단위로 측정합니다.</p>
    <p className="text-sm">맥락·약사 판단 모델은 ‘상담 맥락·약사 판단 지원’ 사용처에서 지정합니다. DeepSeek는 상담 실행 미지원, KIWI는 서비스/API 식별 대기이며 현재 실행 선택지에 포함하지 않습니다.</p>
  </section>;
}
