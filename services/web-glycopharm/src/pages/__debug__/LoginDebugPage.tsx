/**
 * Login Debug Page
 *
 * Purpose: Capture and export login flow as structured JSON for debugging
 * Work Order: WO-DEBUG-LOGIN-MINIMAL-001
 *
 * This page is intentionally minimal and focused solely on:
 * 1. Executing login API call
 * 2. Capturing request/response data
 * 3. Exporting as JSON for analysis
 */

import { useState } from 'react';

interface ProbeTimeline {
  step: string;
  at: string;
  data?: unknown;
}

interface LoginProbeResult {
  timestamp: string;
  request: {
    url: string;
    method: string;
    payload: {
      email: string;
      password: string; // masked
    };
  };
  response: {
    status: number | null;
    statusText: string | null;
    body: unknown;
    error: string | null;
  };
  timeline: ProbeTimeline[];
  duration_ms: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

export default function LoginDebugPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<LoginProbeResult | null>(null);
  const [copied, setCopied] = useState(false);

  const runLoginProbe = async () => {
    if (!email || !password) {
      alert('이메일과 비밀번호를 입력하세요.');
      return;
    }

    setIsRunning(true);
    setResult(null);
    setCopied(false);

    const timeline: ProbeTimeline[] = [];
    const startTime = Date.now();

    // Initialize probe result
    const probeResult: LoginProbeResult = {
      timestamp: new Date().toISOString(),
      request: {
        url: `${API_BASE_URL}/api/v1/auth/login`,
        method: 'POST',
        payload: {
          email: email,
          password: '***MASKED***'
        }
      },
      response: {
        status: null,
        statusText: null,
        body: null,
        error: null
      },
      timeline: timeline,
      duration_ms: 0
    };

    timeline.push({
      step: 'probe_started',
      at: new Date().toISOString()
    });

    try {
      timeline.push({
        step: 'request_preparing',
        at: new Date().toISOString(),
        data: {
          url: probeResult.request.url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      });

      timeline.push({
        step: 'request_sending',
        at: new Date().toISOString()
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      timeline.push({
        step: 'response_received',
        at: new Date().toISOString(),
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      });

      probeResult.response.status = response.status;
      probeResult.response.statusText = response.statusText;

      // Parse response body
      const responseText = await response.text();
      timeline.push({
        step: 'response_body_read',
        at: new Date().toISOString(),
        data: {
          bodyLength: responseText.length
        }
      });

      try {
        const responseJson = JSON.parse(responseText);
        probeResult.response.body = responseJson;
        timeline.push({
          step: 'response_json_parsed',
          at: new Date().toISOString()
        });
      } catch {
        probeResult.response.body = responseText;
        timeline.push({
          step: 'response_json_parse_failed',
          at: new Date().toISOString(),
          data: {
            rawBody: responseText.substring(0, 500)
          }
        });
      }

      if (!response.ok) {
        probeResult.response.error = `HTTP ${response.status}: ${response.statusText}`;
        timeline.push({
          step: 'login_failed',
          at: new Date().toISOString(),
          data: {
            reason: 'non_2xx_status'
          }
        });
      } else {
        timeline.push({
          step: 'login_success',
          at: new Date().toISOString()
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      probeResult.response.error = errorMessage;
      timeline.push({
        step: 'request_error',
        at: new Date().toISOString(),
        data: {
          error: errorMessage,
          type: error instanceof Error ? error.name : 'Unknown'
        }
      });
    }

    probeResult.duration_ms = Date.now() - startTime;
    timeline.push({
      step: 'probe_completed',
      at: new Date().toISOString(),
      data: {
        duration_ms: probeResult.duration_ms
      }
    });

    setResult(probeResult);
    setIsRunning(false);
  };

  const copyJson = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(result, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusColor = () => {
    if (!result) return 'bg-gray-100';
    if (result.response.status === 200) return 'bg-green-100 border-green-500';
    if (result.response.status && result.response.status >= 400) return 'bg-red-100 border-red-500';
    return 'bg-yellow-100 border-yellow-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
          <h1 className="text-xl font-bold text-yellow-800">Login Debug Page</h1>
          <p className="text-yellow-700 text-sm mt-1">
            WO-DEBUG-LOGIN-MINIMAL-001 | 로그인 오류 진단용
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Login Credentials</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isRunning}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isRunning}
              />
            </div>

            <button
              onClick={runLoginProbe}
              disabled={isRunning || !email || !password}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                isRunning || !email || !password
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRunning ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running Probe...
                </span>
              ) : (
                'Run Login Probe'
              )}
            </button>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${getStatusColor()}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">Probe Result</h2>
                <p className="text-sm text-gray-500">
                  Status: {result.response.status || 'N/A'} | Duration: {result.duration_ms}ms
                </p>
              </div>
              <button
                onClick={copyJson}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>

            {/* Timeline Summary */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Timeline</h3>
              <div className="flex flex-wrap gap-2">
                {result.timeline.map((item, index) => (
                  <span
                    key={index}
                    className={`text-xs px-2 py-1 rounded ${
                      item.step.includes('error') || item.step.includes('failed')
                        ? 'bg-red-100 text-red-700'
                        : item.step.includes('success')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.step}
                  </span>
                ))}
              </div>
            </div>

            {/* JSON Output */}
            <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
              <pre className="text-sm text-green-400 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-2">사용 방법</h3>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>이메일과 비밀번호를 입력합니다</li>
            <li>"Run Login Probe" 버튼을 클릭합니다</li>
            <li>결과가 표시되면 "Copy JSON" 버튼을 클릭합니다</li>
            <li>복사된 JSON을 Claude Code에 전달합니다</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
