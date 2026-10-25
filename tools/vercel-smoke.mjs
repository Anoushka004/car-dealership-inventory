import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { lstat, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

// This is a real, credential-free packaging check. Hosted routing and runtime
// behavior remain release checks; a Windows build is not a Linux wheel check.
assert.equal(process.platform, 'linux', 'Run the Vercel packaging smoke on Linux.');
assert.equal(process.arch, 'x64', 'This smoke verifies the selected x86_64 bundle.');

const { build } = await import('@vercel/python');
const { FileFsRef } = await import('@vercel/build-utils');
const sourceDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'dealership-vercel-smoke-'));

const excludedSource = /(^|\/)(?:\.git|\.github|\.venv|\.vercel|node_modules|__pycache__|tests|docs|tools)(?:\/|$)|(^|\/)\.env(?:[./]|$)|\.(?:pyc|pem|key|sqlite3|db|log)$/i;
const forbiddenBundle = /(^|\/)(?:\.git|\.github|\.venv|node_modules|tests|docs|tools)(?:\/|$)|(^|\/)\.env(?:[./]|$)|\.(?:pem|key|sqlite3|db|log)$/i;

try {
  const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
    cwd: sourceDirectory,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  }).split('\0').filter((name) => name && !excludedSource.test(name));
  const files = {};
  for (const name of trackedFiles) {
    const source = path.resolve(sourceDirectory, name);
    assert(source.startsWith(sourceDirectory + path.sep), `Unsafe source path: ${name}`);
    const stat = await lstat(source);
    assert(stat.isFile(), `Packaging input must be a regular tracked file: ${name}`);
    files[name] = new FileFsRef({ fsPath: source, mode: stat.mode });
  }
  for (const required of ['app/main.py', 'pyproject.toml', '.python-version', 'requirements.lock']) {
    assert(files[required], `Missing tracked packaging input: ${required}`);
  }
  assert.equal((await readFile(path.join(sourceDirectory, '.python-version'), 'utf8')).trim(), '3.13');

  const workPath = path.join(temporaryRoot, 'build');
  await mkdir(workPath);
  const result = await build({
    files,
    workPath,
    repoRootPath: workPath,
    entrypoint: 'app/main.py',
    config: {
      framework: 'fastapi',
      excludeFiles: '{tests/**,docs/**,tools/**,.github/**,.env*}',
    },
    meta: { isDev: false },
  });
  assert.equal(result.resultVersion, 2, 'The pinned framework builder must return a file graph.');
  const lambdas = Object.values(result.result.output).filter((output) => output.type === 'Lambda');
  assert.equal(lambdas.length, 1, 'The foundation must package one FastAPI function.');
  const lambda = lambdas[0];
  assert.equal(lambda.runtime, 'python3.13');
  const names = Object.keys(lambda.files);
  assert(names.includes('app/main.py'), 'The packaged ASGI entrypoint is missing.');
  assert(names.some((name) => /(?:^|\/)django\/__init__\.py$/.test(name)), 'Django is not vendored.');
  assert(names.some((name) => /(?:^|\/)psycopg\/__init__\.py$/.test(name)), 'psycopg is not vendored.');
  assert(names.some((name) => /(?:^|\/)psycopg_binary\/[^/]+\.so$/.test(name)), 'The Linux psycopg binary wheel is missing.');
  assert(!names.some((name) => /\.pyd$/i.test(name)), 'A Windows native package entered the Linux bundle.');
  for (const name of names) {
    assert(!forbiddenBundle.test(name), `Forbidden development or secret file in bundle: ${name}`);
  }

  const bundleDirectory = path.join(temporaryRoot, 'bundle');
  await mkdir(bundleDirectory);
  for (const [name, file] of Object.entries(lambda.files)) {
    const destination = path.resolve(bundleDirectory, name);
    assert(destination.startsWith(bundleDirectory + path.sep), `Unsafe bundle path: ${name}`);
    await mkdir(path.dirname(destination), { recursive: true });
    await pipeline(await file.toStream(), createWriteStream(destination));
  }

  // Use pip's PEP 508 parser only to interpret the lock on the build machine.
  // The application smoke below disables site-packages and loads the bundle.
  const expectedVersions = execFileSync('python3.13', ['-c', `
import json, pathlib, sys
from pip._vendor.packaging.requirements import Requirement
expected = {}
for line in pathlib.Path(sys.argv[1]).read_text().splitlines():
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    requirement = Requirement(line)
    if requirement.marker and not requirement.marker.evaluate():
        continue
    pins = list(requirement.specifier)
    assert len(pins) == 1 and pins[0].operator == '==' and '*' not in pins[0].version, line
    expected[requirement.name] = pins[0].version
print(json.dumps(expected))
`, path.join(sourceDirectory, 'requirements.lock')], { encoding: 'utf8' }).trim();

  execFileSync('python3.13', ['-I', '-S', '-c', `
import asyncio, importlib.metadata, json, pathlib, sys
bundle = pathlib.Path(sys.argv[1])
sys.path[:0] = [str(bundle / '_vendor'), str(bundle)]
for package, expected in json.loads(sys.argv[2]).items():
    actual = importlib.metadata.version(package)
    assert actual == expected, (package, expected, actual)
import django, psycopg
assert psycopg.pq.__impl__ == 'binary', psycopg.pq.__impl__
from app.main import app

async def check_health():
    incoming = asyncio.Queue()
    await incoming.put({'type': 'http.request', 'body': b'', 'more_body': False})
    messages = []
    async def receive():
        return await incoming.get()
    async def send(message):
        messages.append(message)
    scope = {'type': 'http', 'asgi': {'version': '3.0', 'spec_version': '2.3'},
             'http_version': '1.1', 'method': 'GET', 'scheme': 'http',
             'path': '/health', 'raw_path': b'/health', 'root_path': '',
             'query_string': b'', 'headers': [], 'client': ('127.0.0.1', 12345),
             'server': ('127.0.0.1', 8000)}
    await asyncio.wait_for(app(scope, receive, send), timeout=10)
    start = next(message for message in messages if message['type'] == 'http.response.start')
    body = b''.join(message.get('body', b'') for message in messages if message['type'] == 'http.response.body')
    assert start['status'] == 200, start
    assert json.loads(body) == {'status': 'ok'}, body
asyncio.run(check_health())
print('Packaged Python 3.13 ASGI health, Django and binary psycopg imports passed.')
`, bundleDirectory, expectedVersions], {
    cwd: bundleDirectory,
    stdio: 'inherit',
    timeout: 30_000,
  });
  console.log('Credential-free Vercel Linux packaging smoke passed. No deployment was created.');
} finally {
  // mkdtemp creates this exact owned child directory; no repository is removed.
  assert(path.dirname(temporaryRoot) === path.resolve(tmpdir()));
  await rm(temporaryRoot, { recursive: true, force: true });
}
