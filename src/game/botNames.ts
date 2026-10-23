// Owner-approved Build 004D roster. Names are selected once per championship.
export const BOT_ROSTER=['Ama','Kofi','Nia','Kwame','Zuri','Malik','Abena','Tunde','Imani','Kojo','Ayana','Jelani','Sade','Nana','Ayo','Eshe'] as const;
export function selectBotNames(count:number,humanName:string,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296):string[]{
 const available=BOT_ROSTER.filter(name=>name.toLocaleLowerCase()!==humanName.trim().toLocaleLowerCase());
 if(!Number.isInteger(count)||count<1||count>3)throw Error('Choose 1–3 bot opponents.');
 for(let i=available.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[available[i],available[j]]=[available[j],available[i]];}
 return available.slice(0,count);
}
