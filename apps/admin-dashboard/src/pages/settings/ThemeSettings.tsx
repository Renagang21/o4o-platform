import { useState, FC } from 'react';
import { Check, Palette, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

type ThemeName = 'light' | 'dark' | 'evening' | 'noon' | 'dusk' | 'afternoon' | 'twilight'

const themes = {
  light: { name: 'light' as ThemeName, displayName: 'Light', description: '밝고 깨끗한 테마' },
  dark: { name: 'dark' as ThemeName, displayName: 'Dark', description: '어두운 색상의 테마' },
  evening: { name: 'evening' as ThemeName, displayName: 'Evening', description: '저녁 분위기의 테마' },
  noon: { name: 'noon' as ThemeName, displayName: 'Noon', description: '한낮의 밝은 테마' },
  dusk: { name: 'dusk' as ThemeName, displayName: 'Dusk', description: '황혼의 따뜻한 테마' },
  afternoon: { name: 'afternoon' as ThemeName, displayName: 'Afternoon', description: '오후의 부드러운 테마' },
  twilight: { name: 'twilight' as ThemeName, displayName: 'Twilight', description: '어스름한 테마' }
}

const ThemeSettings: FC = () => {
  const { theme: currentThemeName, setTheme } = useTheme()
  const currentTheme = themes[currentThemeName as ThemeName] || themes.light
  const [selectedTheme, setSelectedTheme] = useState(currentTheme.name)
  const [isApplying, setIsApplying] = useState(false)

  const handleApplyTheme = () => {
    setIsApplying(true)
    setTheme(selectedTheme)
    
    // Simulate a brief loading state
    setTimeout(() => {
      setIsApplying(false)
    }, 500)
  }

  const getThemeColors = (themeName: ThemeName) => {
    const colorMappings: Record<ThemeName, { bg: string; accent: string; text: string }> = {
      light: { bg: '#ffffff', accent: '#3b82f6', text: '#1a1a1a' },
      dark: { bg: '#1a1a1a', accent: '#60a5fa', text: '#f5f5f5' },
      evening: { bg: '#1a1625', accent: '#ff6b9d', text: '#e8e3f5' },
      noon: { bg: '#fefefe', accent: '#ffd93d', text: '#1a1a1a' },
      dusk: { bg: '#2b2d42', accent: '#ee6c4d', text: '#edf2f4' },
      afternoon: { bg: '#faf7f0', accent: '#dda15e', text: '#3e3e3e' },
      twilight: { bg: '#0f0e17', accent: '#a685e2', text: '#e7f6f2' }
    }
    return colorMappings[themeName]
  }

  const getThemeIcon = (themeName: ThemeName) => {
    if (themeName === 'light' || themeName === 'noon' || themeName === 'afternoon') {
      return <Sun className="w-5 h-5" />
    }
    return <Moon className="w-5 h-5" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">테마 설정</h1>
        <p className="text-gray-600 mt-1">시스템 전체의 시각적 테마를 선택하고 관리합니다</p>
      </div>

      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Palette className="w-5 h-5" />
            테마 선택
          </h2>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.values(themes).map((theme: any) => {
              const colors = getThemeColors(theme.name)
              const isSelected = selectedTheme === theme.name
              const isCurrent = currentTheme.name === theme.name
              
              return (
                <div
                  key={theme.name}
                  onClick={() => setSelectedTheme(theme.name)}
                  className={`
                    relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
                    ${isSelected 
                      ? 'border-blue-500 shadow-lg transform scale-105' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Current theme badge */}
                  {isCurrent && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        현재 사용 중
                      </span>
                    </div>
                  )}

                  {/* Theme preview */}
                  <div className="mb-4">
                    <div 
                      className="w-full h-24 rounded-md shadow-inner relative overflow-hidden"
                      style={{ backgroundColor: colors.bg }}
                    >
                      {/* Color dots preview */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                        <div 
                          className="w-6 h-6 rounded-full shadow-sm"
                          style={{ backgroundColor: colors.bg }}
                        />
                        <div 
                          className="w-6 h-6 rounded-full shadow-sm"
                          style={{ backgroundColor: colors.accent }}
                        />
                        <div 
                          className="w-6 h-6 rounded-full shadow-sm"
                          style={{ backgroundColor: colors.text }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Theme info */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {getThemeIcon(theme.name)}
                      <h3 className="font-semibold text-sm">{theme.displayName}</h3>
                    </div>
                    <p className="text-xs text-gray-500">{theme.description}</p>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-blue-500 text-white rounded-full p-1">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Apply button */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setSelectedTheme(currentTheme.name)}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              disabled={isApplying}
            >
              취소
            </button>
            <button
              onClick={handleApplyTheme}
              disabled={selectedTheme === currentTheme.name || isApplying}
              className={`
                px-6 py-2 text-sm font-medium rounded-md transition-colors
                ${selectedTheme === currentTheme.name
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              {isApplying ? '적용 중...' : '테마 적용'}
            </button>
          </div>
        </div>
      </div>

      {/* Theme information */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-medium">테마 정보</h2>
        </div>
        <div className="wp-card-body">
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-600">
              테마는 시스템 전체의 색상 스킴을 변경합니다. 각 테마는 다음과 같은 특징을 가집니다:
            </p>
            <ul className="text-gray-600">
              <li><strong>Light / Noon / Afternoon</strong>: 밝은 배경의 테마로 주간 사용에 적합합니다.</li>
              <li><strong>Dark / Evening / Dusk / Twilight</strong>: 어두운 배경의 테마로 야간 사용이나 눈의 피로를 줄이는데 적합합니다.</li>
            </ul>
            <p className="text-gray-600">
              선택한 테마는 브라우저에 저장되며, 다음 방문 시에도 유지됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeSettings