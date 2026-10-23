import {execFileSync} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
const staged=process.argv.includes('--staged');
const names=execFileSync('git',staged?['diff','--cached','--name-only','-z']:['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden=/(^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.local-state[^/]*|\.server|\.cloudflare|\.wrangler|node_modules|dist)(\/|$)|\.(?:sqlite3?|db|pem|key|p12|pfx|log)$|(?:storage-state|storageState).*\.json$/i;
const keys=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/AKIA[0-9A-Z]{16}/,/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{30,}/];
const errors=[];
for(const name of names){if(forbidden.test(name)&&!name.endsWith('.example'))errors.push(`${name}: forbidden local data/credential path`);const info=await stat(name);if(info.size>95*1024*1024)errors.push(`${name}: exceeds safe GitHub blob size`);if(/\.(?:png|jpe?g|webp|woff2?|pdf|zip)$/i.test(name)||info.size>3*1024*1024)continue;const text=await readFile(name,'utf8');if(keys.some(p=>p.test(text)))errors.push(`${name}: possible embedded credential`);}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`PASS: ${names.length} ${staged?'staged':'candidate'} files; no local databases, environment secrets, private keys, GitHub tokens or oversized blobs`);
