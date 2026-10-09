import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../../..');
const packages = new Map<string, { directory: string; manifest: any }>();
for (const area of ['packages', 'services', 'apps']) {
  for (const entry of fs.readdirSync(path.join(root, area))) {
    const directory = `${area}/${entry}`;
    const file = path.join(root, directory, 'package.json');
    if (fs.existsSync(file)) {
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      packages.set(manifest.name, { directory, manifest });
    }
  }
}

function copySources(text: string): string[] {
  return text.split('\n').flatMap(line => {
    const tokens = line.trim().split(/\s+/);
    return tokens[0] === 'COPY' && !tokens.some(t => t.startsWith('--from='))
      ? tokens.slice(1, -1).filter(t => !t.startsWith('--')) : [];
  });
}
const includes = (sources: string[], file: string) => sources.some(source =>
  file === source || file.startsWith(`${source.replace(/\/$/, '')}/`),
);

it.each(['services/web-lecture', 'services/web-store'])('%s image contains its complete declared workspace dependency graph', directory => {
  const source = fs.readFileSync(path.join(root, directory, 'Dockerfile'), 'utf8');
  const install = source.indexOf('RUN pnpm install');
  expect(install).toBeGreaterThan(0);
  const beforeInstall = copySources(source.slice(0, install));
  const allSources = copySources(source);
  const first = JSON.parse(fs.readFileSync(path.join(root, directory, 'package.json'), 'utf8')).name;
  const queue = [first]; const visited = new Set<string>();
  while (queue.length) {
    const name = queue.pop()!;
    if (visited.has(name)) continue;
    visited.add(name);
    const pkg = packages.get(name);
    expect(pkg).toBeDefined();
    expect(includes(beforeInstall, `${pkg!.directory}/package.json`)).toBe(true);
    expect(includes(allSources, `${pkg!.directory}/`)).toBe(true);
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const [dependency, version] of Object.entries(pkg!.manifest[section] ?? {})) {
        if (String(version).startsWith('workspace:')) queue.push(dependency);
      }
    }
  }
});
