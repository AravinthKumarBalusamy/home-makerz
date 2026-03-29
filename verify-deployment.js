#!/usr/bin/env node

/**
 * Pre-Deployment Verification Script
 * Run this before deploying to catch common issues
 * 
 * Usage: node verify-deployment.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 HomeMakerz Pre-Deployment Verification\n');

let errors = 0;
let warnings = 0;

// Check required files
console.log('📁 Checking required files...');
const requiredFiles = [
  'package.json',
  'server.js',
  'db.js',
  'public/index.html',
  'public/login.html',
  '.env.example',
  'Dockerfile',
  'render.yaml'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    errors++;
  }
});

// Check package.json
console.log('\n📦 Checking package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (pkg.engines && pkg.engines.node) {
    console.log(`  ✅ Node version specified: ${pkg.engines.node}`);
  } else {
    console.log('  ⚠️  Node version not specified');
    warnings++;
  }
  
  if (pkg.scripts && pkg.scripts.start) {
    console.log(`  ✅ Start script: ${pkg.scripts.start}`);
  } else {
    console.log('  ❌ Start script missing');
    errors++;
  }
  
  const requiredDeps = [
    'express',
    'mongodb',
    '@anthropic-ai/sdk',
    'multer',
    'sharp',
    'helmet',
    'cookie-parser'
  ];
  
  requiredDeps.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      console.log(`  ✅ ${dep}: ${pkg.dependencies[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
      errors++;
    }
  });
} catch (e) {
  console.log('  ❌ Error reading package.json:', e.message);
  errors++;
}

// Check .env.example
console.log('\n🔐 Checking .env.example...');
try {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  const requiredVars = ['PORT', 'NODE_ENV', 'APP_PIN', 'MONGODB_URI', 'ANTHROPIC_API_KEY'];
  
  requiredVars.forEach(varName => {
    if (envExample.includes(varName)) {
      console.log(`  ✅ ${varName}`);
    } else {
      console.log(`  ❌ ${varName} - MISSING`);
      errors++;
    }
  });
} catch (e) {
  console.log('  ❌ Error reading .env.example:', e.message);
  errors++;
}

// Check server.js
console.log('\n🚀 Checking server.js...');
try {
  const server = fs.readFileSync('server.js', 'utf8');
  
  if (server.includes('process.env.PORT')) {
    console.log('  ✅ PORT environment variable used');
  } else {
    console.log('  ⚠️  PORT environment variable not found');
    warnings++;
  }
  
  if (server.includes('process.env.MONGODB_URI')) {
    console.log('  ✅ MONGODB_URI environment variable used');
  } else {
    console.log('  ❌ MONGODB_URI environment variable not found');
    errors++;
  }
  
  if (server.includes('process.env.APP_PIN')) {
    console.log('  ✅ APP_PIN environment variable used');
  } else {
    console.log('  ⚠️  APP_PIN environment variable not found');
    warnings++;
  }
  
  if (server.includes('helmet')) {
    console.log('  ✅ Security headers (helmet) configured');
  } else {
    console.log('  ⚠️  Security headers not configured');
    warnings++;
  }
} catch (e) {
  console.log('  ❌ Error reading server.js:', e.message);
  errors++;
}

// Check public directory
console.log('\n🌐 Checking public directory...');
const publicFiles = [
  'public/index.html',
  'public/login.html',
  'public/css/styles.css',
  'public/js/app.js',
  'public/js/api.js',
  'public/js/utils.js'
];

publicFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    errors++;
  }
});

// Check .gitignore
console.log('\n🚫 Checking .gitignore...');
try {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const shouldIgnore = ['node_modules', '.env', 'data/', 'backups/', 'uploads/'];
  
  shouldIgnore.forEach(pattern => {
    if (gitignore.includes(pattern)) {
      console.log(`  ✅ ${pattern} ignored`);
    } else {
      console.log(`  ⚠️  ${pattern} not ignored`);
      warnings++;
    }
  });
} catch (e) {
  console.log('  ⚠️  .gitignore not found');
  warnings++;
}

// Check Dockerfile
console.log('\n🐳 Checking Dockerfile...');
try {
  const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
  
  if (dockerfile.includes('FROM node:')) {
    console.log('  ✅ Node base image specified');
  } else {
    console.log('  ❌ Node base image not found');
    errors++;
  }
  
  if (dockerfile.includes('EXPOSE')) {
    console.log('  ✅ Port exposed');
  } else {
    console.log('  ⚠️  Port not exposed');
    warnings++;
  }
  
  if (dockerfile.includes('CMD') || dockerfile.includes('ENTRYPOINT')) {
    console.log('  ✅ Start command specified');
  } else {
    console.log('  ❌ Start command not found');
    errors++;
  }
} catch (e) {
  console.log('  ⚠️  Dockerfile not found (optional)');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(60));

if (errors === 0 && warnings === 0) {
  console.log('✅ All checks passed! Ready to deploy! 🚀');
  console.log('\nNext steps:');
  console.log('1. Push code to GitHub');
  console.log('2. Follow DEPLOY_NOW.md for deployment');
  console.log('3. Configure environment variables on hosting platform');
  process.exit(0);
} else {
  if (errors > 0) {
    console.log(`❌ ${errors} error(s) found - MUST FIX before deploying`);
  }
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} warning(s) found - recommended to fix`);
  }
  console.log('\nPlease fix the issues above before deploying.');
  process.exit(errors > 0 ? 1 : 0);
}
