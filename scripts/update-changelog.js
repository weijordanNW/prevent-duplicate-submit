#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const CHANGELOG_PATH = path.join(PROJECT_ROOT, 'CHANGELOG.md');
const FRONTEND_CHANGELOG_PATH = path.join(PROJECT_ROOT, 'frontend/CHANGELOG.md');
const FRONTEND_PUBLIC_CHANGELOG_PATH = path.join(PROJECT_ROOT, 'frontend/public/CHANGELOG.md');
const FRONTEND_PACKAGE_PATH = path.join(PROJECT_ROOT, 'frontend/package.json');
const SERVER_PACKAGE_PATH = path.join(PROJECT_ROOT, 'server/package.json');
const APP_VUE_PATH = path.join(PROJECT_ROOT, 'frontend/src/App.vue');
const LAST_COMMIT_FILE = path.join(__dirname, '.changelog-last-commit');

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
  if (/^feat(\(.+\))?:/.test(commitMessage)) return 'feat';
  if (/^fix(\(.+\))?:/.test(commitMessage)) return 'fix';
  if (/^docs(\(.+\))?:/.test(commitMessage)) return 'docs';
  if (/^refactor(\(.+\))?:/.test(commitMessage)) return 'refactor';
  if (/^perf(\(.+\))?:/.test(commitMessage)) return 'perf';
  if (/^test(\(.+\))?:/.test(commitMessage)) return 'test';
  if (/^chore(\(.+\))?:/.test(commitMessage)) return 'chore';
  if (/BREAKING CHANGE/.test(commitMessage)) return 'major';
  return 'other';
}

function getCommitTypeLabel(type) {
  const labels = {
    feat: '新增',
    fix: '修复',
    docs: '文档',
    refactor: '重构',
    perf: '性能',
    test: '测试',
    chore: '其他',
    major: '重大变更',
    other: '其他'
  };
  return labels[type] || '其他';
}

function getLastProcessedCommit() {
  try {
    if (fs.existsSync(LAST_COMMIT_FILE)) {
      return fs.readFileSync(LAST_COMMIT_FILE, 'utf-8').trim();
    }
  } catch (e) {}
  return null;
}

function saveLastProcessedCommit(hash) {
  fs.writeFileSync(LAST_COMMIT_FILE, hash);
}

function getCurrentCommitHash() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch (e) {
    return null;
  }
}

function getNewCommitMessages() {
  const lastHash = getLastProcessedCommit();
  try {
    let range;
    if (lastHash) {
      range = `${lastHash}..HEAD`;
    } else {
      range = 'HEAD~1..HEAD';
    }
    const output = execSync(`git log ${range} --format=%s`, { encoding: 'utf-8' });
    return output.trim().split('\n')
      .filter(Boolean)
      .filter(msg => !msg.startsWith('chore: CHANGELOG自动更新'));
  } catch (e) {
    return [];
  }
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch (e) {
    return 'main';
  }
}

function generateChangelogEntry(messages, newVersion) {
  const today = new Date().toISOString().split('T')[0];
  const groups = {};

  messages.forEach(msg => {
    const type = getCommitType(msg);
    const cleanMsg = msg.replace(/^(\w+(\(.+\))?:\s*)/, '');
    if (!groups[type]) groups[type] = [];
    groups[type].push(`- ${cleanMsg}`);
  });

  let entry = `## [${newVersion}] - ${today}\n\n`;

  const displayOrder = ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'major', 'other'];

  displayOrder.forEach(type => {
    if (groups[type] && groups[type].length > 0) {
      entry += `### ${getCommitTypeLabel(type)}\n\n`;
      entry += groups[type].join('\n') + '\n\n';
    }
  });

  return entry;
}

function determineBumpType(messages) {
  let bumpType = 'patch';
  messages.forEach(msg => {
    if (/BREAKING CHANGE/.test(msg)) bumpType = 'major';
    else if (/^feat(\(.+\))?:/.test(msg) && bumpType !== 'major') bumpType = 'minor';
  });
  return bumpType;
}

function updateChangelogFile() {
  const messages = getNewCommitMessages();
  if (messages.length === 0) {
    console.log('⚠️ 没有新的提交，跳过更新');
    return null;
  }

  console.log(`📝 检测到 ${messages.length} 个新提交:`);
  messages.forEach(msg => console.log(`  - ${msg}`));
  console.log('');

  const currentVersion = getCurrentVersion();
  const bumpType = determineBumpType(messages);
  const newVersion = bumpVersion(currentVersion, bumpType);
  const newEntry = generateChangelogEntry(messages, newVersion);

  let existingContent = '';
  if (fs.existsSync(CHANGELOG_PATH)) {
    existingContent = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  }

  let updatedContent;
  if (/^# 变更日志/.test(existingContent)) {
    const separatorMatch = existingContent.match(/\r?\n---\r?\n/);
    if (separatorMatch) {
      const separatorEnd = separatorMatch.index + separatorMatch[0].length;
      const header = existingContent.slice(0, separatorEnd);
      const body = existingContent.slice(separatorEnd);
      updatedContent = header + '\n' + newEntry + body.trimStart();
    } else {
      updatedContent = existingContent + '\n' + newEntry;
    }
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

  return { newVersion, messages };
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
  let appContent = fs.readFileSync(APP_VUE_PATH, 'utf-8');
  appContent = appContent.replace(/const version = '[\d.]+'/, `const version = '${newVersion}'`);
  fs.writeFileSync(APP_VUE_PATH, appContent);
  console.log(`✅ App.vue 版本已更新为 v${newVersion}`);
}

function copyChangelogToFrontend() {
  fs.copyFileSync(CHANGELOG_PATH, FRONTEND_CHANGELOG_PATH);
  fs.copyFileSync(CHANGELOG_PATH, FRONTEND_PUBLIC_CHANGELOG_PATH);
  console.log('✅ CHANGELOG.md 已复制到 frontend 和 frontend/public 目录');
}

function main() {
  const branch = getGitBranch();
  if (branch !== 'main') {
    console.log(`⚠️ 当前分支是 "${branch}"，仅在 main 分支自动更新 CHANGELOG`);
    process.exit(0);
  }

  const result = updateChangelogFile();
  if (!result) {
    process.exit(0);
  }

  const { newVersion } = result;
  updatePackageVersions(newVersion);
  updateFrontendApp(newVersion);
  copyChangelogToFrontend();

  const currentHash = getCurrentCommitHash();
  if (currentHash) {
    saveLastProcessedCommit(currentHash);
  }

  console.log('');
  console.log('🎉 CHANGELOG 自动更新完成！');

  return result;
}

if (require.main === module) {
  main();
}

module.exports = {
  updateChangelogFile,
  getNewCommitMessages,
  bumpVersion,
  main
};