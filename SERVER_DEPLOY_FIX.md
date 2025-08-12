# 서버 배포 문제 해결 가이드

## 문제
- 로컬 빌드: `wp-i18n-Niz9RVma.js` (새 파일)
- 서버 에러: `wp-i18n-DOK2wPpo.js` (이전 파일) 참조 중

## 원인
서버가 이전 빌드 파일을 제공하고 있음

## 해결 방법

### 1. 서버에서 다시 빌드 및 배포
```bash
# 서버에 SSH 접속 후
cd /path/to/o4o-platform

# 최신 코드 가져오기
git pull origin main

# 깨끗한 빌드를 위해 기존 dist 삭제
rm -rf apps/admin-dashboard/dist

# 의존성 재설치
npm ci

# 다시 빌드
npm run build --workspace=@o4o/admin-dashboard

# 웹서버 디렉토리 백업 (선택사항)
sudo cp -r /var/www/admin.neture.co.kr /var/www/admin.neture.co.kr.backup

# 기존 파일 삭제 후 새 파일 복사
sudo rm -rf /var/www/admin.neture.co.kr/*
sudo cp -r apps/admin-dashboard/dist/* /var/www/admin.neture.co.kr/

# 권한 설정
sudo chown -R www-data:www-data /var/www/admin.neture.co.kr
```

### 2. 캐시 클리어

#### Nginx 캐시 (사용 중인 경우)
```bash
sudo nginx -s reload
```

#### CloudFlare 캐시 (사용 중인 경우)
CloudFlare 대시보드에서:
1. Caching → Configuration
2. Purge Everything 클릭

#### PM2 재시작 (Node.js 서버인 경우)
```bash
pm2 restart admin-dashboard
```

### 3. 확인 사항
```bash
# 배포된 파일 확인
ls -la /var/www/admin.neture.co.kr/assets/ | grep wp-i18n
# 결과: wp-i18n-Niz9RVma.js 가 있어야 함

# index.html 확인
grep wp-i18n /var/www/admin.neture.co.kr/index.html
# 결과: wp-i18n-Niz9RVma.js 를 참조해야 함
```

### 4. 브라우저 확인
1. 시크릿 모드로 admin.neture.co.kr 접속
2. F12 개발자 도구 → Network 탭
3. 새로고침 (Ctrl+Shift+R)
4. wp-i18n 파일명 확인 (Niz9RVma 이어야 함)

## 추가 디버깅

만약 여전히 문제가 있다면:

```bash
# 서버의 웹 루트 확인
ls -la /var/www/admin.neture.co.kr/assets/wp-i18n*

# 어떤 프로세스가 파일을 제공하는지 확인
sudo lsof | grep admin.neture.co.kr

# Nginx 설정 확인 (Nginx 사용 시)
sudo nginx -t
cat /etc/nginx/sites-enabled/admin.neture.co.kr

# Apache 설정 확인 (Apache 사용 시)
sudo apachectl -t
cat /etc/apache2/sites-enabled/admin.neture.co.kr.conf
```

## 임시 해결책 (급한 경우)

서버에서 직접 polyfill 추가:
```bash
# index.html 수정
sudo nano /var/www/admin.neture.co.kr/index.html

# <head> 태그 안 맨 위에 추가:
<script>
  // WordPress Polyfill - Emergency Fix
  window.wp = window.wp || {};
  window.wp.i18n = {
    __: function(text) { return text; },
    _x: function(text) { return text; },
    _n: function(single, plural, number) { return number === 1 ? single : plural; },
    _nx: function(single, plural, number) { return number === 1 ? single : plural; },
    sprintf: function(format) { 
      var args = Array.prototype.slice.call(arguments, 1);
      var i = 0;
      return format.replace(/%[sdjf]/g, function() { return String(args[i++]); });
    },
    isRTL: function() { return false; },
    setLocaleData: function() {},
    getLocaleData: function() { return {}; },
    hasTranslation: function() { return false; },
    subscribe: function() { return function() {}; }
  };
  window.wp.blocks = { 
    registerBlockType: function() {},
    getCategories: function() { return []; },
    setCategories: function() {}
  };
  window.wp.data = {
    select: function() { return {}; },
    dispatch: function() { return {}; },
    subscribe: function() { return function() {}; },
    registerStore: function() {}
  };
  window.wp.hooks = {
    addFilter: function() {},
    applyFilters: function(hookName, value) { return value; },
    addAction: function() {},
    doAction: function() {},
    removeFilter: function() {},
    removeAction: function() {}
  };
  window.wp.domReady = function(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  };
  console.log('[WordPress Polyfill] Emergency initialization complete');
</script>
```

저장 후 브라우저에서 확인