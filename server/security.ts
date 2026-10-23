export function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');}
export async function hash(value:string){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}
export async function verify(value:string,expected:string){
 const bytes=await hash(value),saved=Uint8Array.from(expected.match(/.{2}/g)??[],s=>parseInt(s,16));
 if(bytes.byteLength!==saved.byteLength)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('pitapat-secret-comparison'),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 const signature=await crypto.subtle.sign('HMAC',key,bytes);return crypto.subtle.verify('HMAC',key,signature,saved);
}
export async function hashHex(value:string){return Array.from(await hash(value),n=>n.toString(16).padStart(2,'0')).join('');}
export function displayName(value:unknown){if(typeof value!=='string')throw new Error('Enter a display name.');const name=value.trim();if(name.length<1||name.length>20||/[\u0000-\u001f\u007f]/.test(name))throw new Error('Use a name of 1–20 characters.');return name;}
export function roomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>alphabet[n&31]).join('');}
export function validCode(code:string){return /^[A-HJ-NP-Z2-9]{8}$/.test(code);}
export function json(value:unknown,status=200,headers:Record<string,string>={}){return Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});}
