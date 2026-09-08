#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { downloadTemplate } from 'giget';
import prompts from 'prompts';
import pc from 'picocolors';
import { LANG, GISCUS_CATEGORIES } from './constants.js';

async function main() {
  console.log('\n');

  console.log(pc.bgBlueBright(pc.black(pc.bold('🌸 Fumika Astro Blog Template Installer!'))));

  const response = await prompts(
    [
      {
        type: 'text',
        name: 'targetDir',
        message: 'Please enter the project name',
        initial: 'fumika'
      },
      {
        type: 'text',
        name: 'siteTitle',
        message: 'Please enter the site title',
        initial: 'Fumika'
      },
      {
        type: 'text',
        name: 'siteSubtitle',
        message: 'Please enter the site subtitle',
        initial: 'Blog'
      },
      {
        type: 'text',
        name: 'profileName',
        message: 'Please enter the site profile name',
        initial: 'Fumika'
      },
      {
        type: 'text',
        name: 'profileBio',
        message: 'Please enter the profile bio',
        initial: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
      },
      {
        type: 'select',
        name: 'siteLang',
        message: 'Please select the main language of the site',
        choices: LANG,
        initial: 0
      },
      {
        type: 'multiselect',
        name: 'siteSupportedLangs',
        message: 'Please select the supported languages of the site',
        choices: (prev, values) => {
          return LANG.filter((lang) => lang.value !== values.siteLang);
        },
        hint: '- Use [Space] fot select, [Enter] for confirm. (leave it empty if only main language)'
      },
      {
        type: 'confirm',
        name: 'setupGiscus',
        message: 'Wanna setup Giscus now?',
        initial: false
      },
      {
        type: (prev) => (prev ? 'text' : null),
        name: 'giscusRepo',
        message: 'Please enter the Giscus repo (example: username/repo)'
      },
      {
        type: (prev) => (prev ? 'text' : null),
        name: 'giscusRepoId',
        message: 'Please enter the Giscus repo ID'
      },
      {
        type: (prev) => (prev ? 'select' : null),
        name: 'giscusCategory',
        message: 'Please enter the Giscus category',
        choices: GISCUS_CATEGORIES,
        initial: 0
      },
      {
        type: (prev) => (prev ? 'text' : null),
        name: 'giscusCategoryId',
        message: 'Please enter the Giscus category ID'
      },
      {
        type: 'confirm',
        name: 'setupDeploy',
        message: 'Wanna setup deployment (siteUrl & baseUrl) now?',
        initial: false
      },
      {
        type: (prev) => (prev ? 'text' : null),
        name: 'deploySiteUrl',
        message: 'Please enter the site URL',
        initial: 'https://example.com'
      },
      {
        type: (prev, values) => (values.setupDeploy ? 'text' : null),
        name: 'deployBaseUrl',
        message: 'Please enter the site base URL',
        initial: '/'
      },
      {
        type: 'confirm',
        name: 'initGit',
        message: 'Inisialisasi Git repository (git init)?',
        initial: true
      },
      {
        type: 'confirm',
        name: 'runInstall',
        message: 'Run pnpm install?',
        initial: true
      },
    ],
    {
      onCancel: () => {
        console.log(pc.red('\n✖ Process canceled.'));
        process.exit(0);
      }
    }
  );

  const targetPath = path.resolve(process.cwd(), response.targetDir);

  if (fs.existsSync(targetPath) && fs.readdirSync(targetPath).length > 0) {
    const { overwrite } = await prompts(
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory "${response.targetDir}" already exist. Want overwrite it?`,
        initial: false
      },
      {
        onCancel: () => {
          console.log(pc.red('\n✖ Process canceled.'));
          process.exit(0);
        }
      }
    );

    if (!overwrite) {
      console.log(pc.red('\n✖ Process canceled.'));
      process.exit(0);
    }
  }

  function updateConfigFile(targetPath, data) {
    const configPath = path.join(targetPath, 'src', 'config.ts');

    if (!fs.existsSync(configPath)) return;

    let content = fs.readFileSync(configPath, 'utf8');

    if (data.siteTitle) {
      content = content.replace(/title:\s*["'].*?["']/, `title: "${data.siteTitle}"`);
    }
    if (data.siteSubtitle) {
      content = content.replace(/subtitle:\s*["'].*?["']/, `subtitle: "${data.siteSubtitle}"`);
    }
    if (data.siteLang) {
      content = content.replace(/lang:\s*["'].*?["']/, `lang: "${data.siteLang}"`);
    }
    if (data.siteSupportedLangs) {
      const formattedArray = JSON.stringify(data.siteSupportedLangs).replace(/"/g, "'"); 
      content = content.replace(/supportedLangs:\s*\[[\s\S]*?\]/, `supportedLangs: ${formattedArray}`);
    }

    if (data.profileName) {
      content = content.replace(/(export const profileConfig: ProfileConfig = {[\s\S]*?name:\s*["']).*?(["'])/, `$1${data.profileName}$2`);
    }
    if (data.profileBio) {
      content = content.replace(/(export const profileConfig: ProfileConfig = {[\s\S]*?bio:\s*["']).*?(["'])/, `$1${data.profileBio}$2`);
    }

    if (data.setupGiscus && data.giscusRepo) {
      content = content.replace(/repo:\s*["'].*?["']/, `repo: "${data.giscusRepo}"`);
      if (data.giscusRepoId) {
        content = content.replace(/repoId:\s*["'].*?["']/, `repoId: "${data.giscusRepoId}"`);
      }
      if (data.giscusCategory) {
        content = content.replace(/category:\s*["'].*?["']/, `category: "${data.giscusCategory}"`);
      }
      if (data.giscusCategoryId) {
        content = content.replace(/categoryId:\s*["'].*?["']/, `categoryId: "${data.giscusCategoryId}"`);
      }
    } else {
      const emptyCommentConfig = `export const commentConfig: CommentConfig = {
\tgiscus: undefined,
};`;
      content = content.replace(/export const commentConfig: CommentConfig = {[\s\S]*?};/, emptyCommentConfig);
    }

    if (data.setupDeploy) {
      if (data.deploySiteUrl) {
        content = content.replace(/siteUrl:\s*["'].*?["']/, `siteUrl: "${data.deploySiteUrl}"`);
      }
      if (data.deployBaseUrl) {
        content = content.replace(/baseUrl:\s*["'].*?["']/, `baseUrl: "${data.deployBaseUrl}"`);
      }
    } else {
      content = content.replace(/siteUrl:\s*["'].*?["']/, `siteUrl: "https://example.com"`);
      content = content.replace(/baseUrl:\s*["'].*?["']/, `baseUrl: "/"`);
    }

    fs.writeFileSync(configPath, content, 'utf8');
  }

  console.log(`\n${pc.cyan(`Downloading at ./${response.targetDir}`)}...`);

  await downloadTemplate('github:iyanarmanda/fumika#main', {
    dir: `./${response.targetDir}`,
    force: true
  });

  updateConfigFile(targetPath, {
    siteTitle: response.siteTitle,
    siteSubtitle: response.siteSubtitle,
    profileName: response.profileName,
    profileBio: response.profileBio,
    siteLang: response.siteLang,
    siteSupportedLangs: response.siteSupportedLangs,
    setupGiscus: response.setupGiscus,
    giscusRepo: response.giscusRepo,
    giscusRepoId: response.giscusRepoId,
    giscusCategory: response.giscusCategory,
    giscusCategoryId: response.giscusCategoryId,
    setupDeploy: response.setupDeploy,
    deploySiteUrl: response.deploySiteUrl,
    deployBaseUrl: response.deployBaseUrl
  });

  if (response.initGit) {
    try {
      console.log(pc.cyan('\nInitiate Git repository...'));
      execSync('git init', { cwd: targetPath, stdio: 'ignore' });
      console.log(pc.green('✔ Git repository initiated successfully.'));
    } catch (err) {
      console.log(pc.red('✖ Failed to initiate Git repository.'));
    }
  }

  if (response.runInstall) {
    try {
      console.log(pc.cyan(`\nInstall dependencies with pnpm (${pc.dim(`please wait`)}) ...`));
      execSync('pnpm install', { cwd: targetPath, stdio: 'inherit' });
      console.log(pc.green('\n✔ Dependencies installed successfully.'));
    } catch (err) {
      console.log(pc.red('\n✖ Failed to running "pnpm install".'));
    }
  }

  console.log(`\n${pc.bold(pc.green('🎉 Fumika downloaded successfully.'))}\n`);
  console.log('Next Step:');
  console.log(`  1. ${pc.cyan(`cd ${response.targetDir}`)}`);
  
  let step = 2;
  if (!response.runInstall) {
    console.log(`  ${step}. ${pc.cyan('pnpm install')}`);
    step++;
  }
  
  console.log(`  ${step}. ${pc.cyan('pnpm dev')}\n`);

  console.log(pc.magenta('Happy writing nyaa~ 🐈\n'));  
}

main();

