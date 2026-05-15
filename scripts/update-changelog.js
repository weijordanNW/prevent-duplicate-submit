#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.join(__dirname, '../CHANGELOG.md');
const FRONTEND_PACKAGE_PATH = path.join(__dirname, '../frontend/package.json');
const SERVER_PACKAGE_PATH = path.join(__dirname, '../server/package.json');

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(FRONTEND_PACKAGE_PATH, 'utf-8'));
  return pkg.version;
}

function bumpVersion(version, type = 'patch') {
  const parts = version.split('.').map(Number);
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  return parts.join('.');
}

function getCommitType(commitMessage) {
  if (commitMessage.startsWith('feat:')) return { type: 'feat', label: '新增' };
  if (commitMessage.startsWith('fix:')) return { type: 'fix', label: '修复' };
  if (commitMessage.startsWith('docs:')) return { type: 'docs', label: '文档' };
  if (commitMessage.startsWith('refactor:')) return { type: 'refactor', label: '重构' };
  if (commitMessage.startsWith('perf:')) return { type: 'perf', label: '性能' };
  if (commitMessage.startsWith('test:')) return { type: 'test', label: '测试' };
  if (commitMessage.startsWith('chore:')) return { type: 'chore', label: '其他' };
  return { type: 'other', label: '其他' };
}

function getCommitMessages(since = 'HEAD~1') {
  const { execSync } = require('child_process');
  try {
    const output = execSync(`git log ${since}..HEAD --oneline --format=%s`, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (e) {
    return [];
  }
}

function getGitBranch() {
  const { execSync } = require('child_process');
  try {
    const output = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' });
    return output.trim();
  } catch (e) {
    return 'main';
  }
}

function generateChangelogEntry(messages, newVersion) {
  const today = new Date().toISOString().split('T')[0];
  const entries = {
    feat: [],
    fix: [],
    docs: [],
    refactor: [],
    perf: [],
    test: [],
    chore: [],
    other: []
  };

  messages.forEach(msg => {
    const { type, label } = getCommitType(msg);
    const cleanMsg = msg.replace(/^(\w+:\s*)/, '');
    entries[type].push(`- ${cleanMsg}`);
  });

  let entry = `## [${newVersion}] - ${today}\n\n`;

  const order = ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'other'];
  const labels = {
    feat: '新增',
    fix: '修复',
    refactor: '重构',
    perf: '性能',
    docs: '文档',
    test: '测试',
    chore: '其他',
    other: '其他'
  };

  order.forEach(type => {
    if (entries[type].length > 0) {
      entry += `### ${labels[type]}\n\n`;
      entry += entries[type].join('\n') + '\n\n';
    }
  });

  return entry;
}

function updateChangelog(messages) {
  const currentVersion = getCurrentVersion();
  
  let bumpType = 'patch';
  messages.forEach(msg => {
    if (msg.startsWith('feat:')) bumpType = 'minor';
    if (msg.startsWith('BREAKING CHANGE:')) bumpType = 'major';
  });
  
  const newVersion = bumpVersion(currentVersion, bumpType);

  const newEntry = generateChangelogEntry(messages, newVersion);

  let existingContent = '';
  if (fs.existsSync(CHANGELOG_PATH)) {
    existingContent = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  }

  let updatedContent;
  if (existingContent.startsWith('# 变更日志')) {
    const header = existingContent.match(/^# 变更日志[\s\S]*?---\n/)[0];
    updatedContent = header + '\n' + newEntry + existingContent.slice(header.length);
  } else {
    updatedContent = `# 变更日志

所有重要的项目变更都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
本项目遵循 [语义化版本控制](https://semver.org/lang/zh-CN/)。

---

${newEntry}`;
  }

  fs.writeFileSync(CHANGELOG_PATH, updatedContent);
  console.log(`✅ CHANGELOG.md 已更新，新版本: v${newVersion}`);

  return newVersion;
}

function updatePackageVersions(newVersion) {
  const frontendPkg = JSON.parse(fs.readFileSync(FRONTEND_PACKAGE_PATH, 'utf-8'));
  const serverPkg = JSON.parse(fs.readFileSync(SERVER_PACKAGE_PATH, 'utf-8'));

  frontendPkg.version = newVersion;
  serverPkg.version = newVersion;

  fs.writeFileSync(FRONTEND_PACKAGE_PATH, JSON.stringify(frontendPkg, null, 2) + '\n');
  fs.writeFileSync(SERVER_PACKAGE_PATH, JSON.stringify(serverPkg, null, 2) + '\n');
  console.log(`✅ package.json 版本已更新为 v${newVersion}`);
}

function updateFrontendApp(newVersion) {
  const appPath = path.join(__dirname, '../frontend/src/App.vue');
  let appContent = fs.readFileSync(appPath, 'utf-8');
  appContent = appContent.replace(/const version = '[\d.]+'/, `const version = '${newVersion}'`);
  fs.writeFileSync(appPath, appContent);
  console.log(`✅ App.vue 版本已更新为 v${newVersion}`);
}

function copyChangelogToFrontend() {
  const source = CHANGELOG_PATH;
  const dest = path.join(__dirname, '../frontend/CHANGELOG.md');
  fs.copyFileSync(source, dest);
  console.log(`✅ CHANGELOG.md 已复制到 frontend 目录`);
}

function main() {
  const branch = getGitBranch();
  if (branch !== 'main') {
    console.log(`⚠️ 当前分支不是 main，跳过自动更新 CHANGELOG`);
    process.exit(0);
  }

  const messages = getCommitMessages();
  if (messages.length === 0) {
    console.log(`⚠️ 没有新的提交，跳过更新`);
    process.exit(0);
  }

  console.log(`📝 检测到 ${messages.length} 个新提交:`);
  messages.forEach(msg => console.log(`  - ${msg}`));
  console.log('');

  const newVersion = updateChangelog(messages);
  updatePackageVersions(newVersion);
  updateFrontendApp(newVersion);
  copyChangelogToFrontend();

  console.log('');
  console.log('🎉 CHANGELOG 自动更新完成！');
}

if (require.main === module) {
  main();
}

module.exports = {
  updateChangelog,
  getCommitMessages,
  bumpVersion
};
