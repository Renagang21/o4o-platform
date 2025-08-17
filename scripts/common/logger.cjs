#!/usr/bin/env node

/**
 * Logger Utility
 * 일관된 로깅 및 출력 관리
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class Logger {
  constructor(options = {}) {
    this.silent = options.silent || false;
    this.verbose = options.verbose || false;
    this.prefix = options.prefix || '';
  }
  
  // 기본 로그 메서드
  log(message, ...args) {
    if (!this.silent) {
      console.log(this.prefix + message, ...args);
    }
  }
  
  // 정보 메시지 (파란색)
  info(message, ...args) {
    if (!this.silent) {
      console.log(`${colors.blue}ℹ${colors.reset}  ${this.prefix}${message}`, ...args);
    }
  }
  
  // 성공 메시지 (녹색)
  success(message, ...args) {
    if (!this.silent) {
      console.log(`${colors.green}✓${colors.reset}  ${this.prefix}${message}`, ...args);
    }
  }
  
  // 경고 메시지 (노란색)
  warn(message, ...args) {
    console.warn(`${colors.yellow}⚠${colors.reset}  ${this.prefix}${message}`, ...args);
  }
  
  // 에러 메시지 (빨간색)
  error(message, ...args) {
    console.error(`${colors.red}✗${colors.reset}  ${this.prefix}${message}`, ...args);
  }
  
  // 디버그 메시지 (verbose 모드에서만)
  debug(message, ...args) {
    if (this.verbose && !this.silent) {
      console.log(`${colors.dim}🔍 ${this.prefix}${message}${colors.reset}`, ...args);
    }
  }
  
  // 작업 시작
  startTask(taskName) {
    if (!this.silent) {
      console.log(`${colors.cyan}►${colors.reset}  ${this.prefix}${taskName}...`);
    }
  }
  
  // 작업 완료
  endTask(taskName, success = true) {
    if (!this.silent) {
      if (success) {
        console.log(`${colors.green}✓${colors.reset}  ${this.prefix}${taskName} completed`);
      } else {
        console.log(`${colors.red}✗${colors.reset}  ${this.prefix}${taskName} failed`);
      }
    }
  }
  
  // 구분선
  separator(char = '=', length = 50) {
    if (!this.silent) {
      console.log(char.repeat(length));
    }
  }
  
  // 헤더
  header(title) {
    if (!this.silent) {
      this.separator();
      console.log(`${colors.bright}${title}${colors.reset}`);
      this.separator();
    }
  }
  
  // 리스트 출력
  list(items, prefix = '  • ') {
    if (!this.silent) {
      items.forEach(item => {
        console.log(`${prefix}${item}`);
      });
    }
  }
  
  // 테이블 출력
  table(data) {
    if (!this.silent) {
      console.table(data);
    }
  }
  
  // 진행률 표시
  progress(current, total, label = '') {
    if (!this.silent) {
      const percentage = Math.round((current / total) * 100);
      const barLength = 30;
      const filledLength = Math.round((percentage / 100) * barLength);
      const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      
      process.stdout.write(`\r${label} ${bar} ${percentage}% (${current}/${total})`);
      
      if (current >= total) {
        console.log(); // 줄바꿈
      }
    }
  }
  
  // 타이머 시작
  startTimer(label) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        const seconds = (duration / 1000).toFixed(2);
        this.debug(`${label} took ${seconds}s`);
        return duration;
      }
    };
  }
  
  // 박스 메시지
  box(message, type = 'info') {
    if (!this.silent) {
      const lines = message.split('\n');
      const maxLength = Math.max(...lines.map(l => l.length));
      const boxWidth = maxLength + 4;
      
      let color = colors.blue;
      if (type === 'success') color = colors.green;
      if (type === 'warning') color = colors.yellow;
      if (type === 'error') color = colors.red;
      
      console.log(color + '┌' + '─'.repeat(boxWidth - 2) + '┐' + colors.reset);
      lines.forEach(line => {
        const padding = ' '.repeat(maxLength - line.length);
        console.log(color + '│' + colors.reset + ` ${line}${padding} ` + color + '│' + colors.reset);
      });
      console.log(color + '└' + '─'.repeat(boxWidth - 2) + '┘' + colors.reset);
    }
  }
}

// 글로벌 인스턴스
const logger = new Logger();

// CLI 플래그 파싱
function parseLoggerFlags(argv = process.argv) {
  const flags = {
    silent: argv.includes('--silent') || argv.includes('-s'),
    verbose: argv.includes('--verbose') || argv.includes('-v')
  };
  
  return new Logger(flags);
}

module.exports = {
  Logger,
  logger,
  parseLoggerFlags,
  colors
};