#!/usr/bin/env node
/**
 * generate-passhash.mjs
 *
 * Run this once to generate your passphrase hash:
 *   node generate-passhash.mjs
 *
 * Then paste the printed VITE_APP_PASSHASH line into your .env file.
 * The actual passphrase never appears in this file or in .env — only the hash.
 */

import { createInterface } from 'readline'
import { createHash } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const rl = createInterface({ input: process.stdin, output: process.stdout })

function sha256(text) {
  return createHash('sha256').update(text.trim()).digest('hex')
}

console.log('\n💕 Kishan & Aditi — Passphrase Setup\n')
console.log('Choose a secret word or short phrase that only you two know.')
console.log('Examples: a nickname, a favourite song lyric, a shared memory...\n')

rl.question('Enter your secret passphrase: ', (pass) => {
  if (!pass.trim()) {
    console.error('\n❌ Passphrase cannot be empty.\n')
    rl.close()
    process.exit(1)
  }

  const hash = sha256(pass)

  console.log('\n✅ Hash generated successfully!\n')
  console.log('─'.repeat(50))
  console.log(`VITE_APP_PASSHASH=${hash}`)
  console.log('─'.repeat(50))

  // Try to update .env automatically
  const envPath = '.env'
  try {
    let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
    if (envContent.includes('VITE_APP_PASSHASH=')) {
      envContent = envContent.replace(/VITE_APP_PASSHASH=.*/g, `VITE_APP_PASSHASH=${hash}`)
    } else {
      envContent += `\nVITE_APP_PASSHASH=${hash}\n`
    }
    writeFileSync(envPath, envContent)
    console.log('\n✨ Automatically added to your .env file!')
  } catch {
    console.log('\n⚠️  Could not write to .env automatically.')
    console.log('   Please manually add the line above to your .env file.')
  }

  console.log('\n🚀 Restart your dev server (npm run dev) and the new passphrase is active!\n')
  rl.close()
})
