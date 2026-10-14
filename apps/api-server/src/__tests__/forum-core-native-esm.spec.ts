import { spawnSync } from 'node:child_process';

describe('forum-core compiled exports in native Node ESM', () => {
  it.each([
    ['@o4o/forum-core', 'blocksToText', 'normalizeMetadata'],
    ['@o4o/forum-core/public-ui', 'ForumBlockRenderer', 'CommentSection'],
  ])('loads %s without a bundler or TypeScript loader', (entry, first, second) => {
    const result = spawnSync(process.execPath, [
      '--input-type=module',
      '--eval',
      `import * as api from ${JSON.stringify(entry)};
       if (typeof api[${JSON.stringify(first)}] !== 'function' ||
           typeof api[${JSON.stringify(second)}] !== 'function') process.exit(1);`,
    ], { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } });

    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
