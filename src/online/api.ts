export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T=unknown>(path:string,data?:unknown):Promise<T>{
 try{const r=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(10000)});const b=await r.json();if(!r.ok)throw new ApiError(typeof b.error==='string'?b.error:'Server temporarily unavailable. Retry shortly.',r.status);return b as T;}
 catch(e){if(e instanceof ApiError)throw e;throw new ApiError('Server temporarily unavailable. Check your connection and Retry.',503);}
}
