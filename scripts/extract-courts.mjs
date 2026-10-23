// Direct, lossless crops of owner-supplied art. Never repaint or rescale the source.
// macOS sips; rectangles are x,y,width,height in the original 1536×1024 sheet.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const source='docs/design/orisha-deck-reference.png';
const output='public/assets/cards/orisha';
const rows=[
 {suit:'spades',y:23,cards:[['J','Ogun',156,201],['Q','Oya',363,195],['K','Shango',562,194]]},
 {suit:'hearts',y:23,cards:[['J','Oshun',894,196],['Q','Yemoja',1095,195],['K','Obatala',1296,194]]},
 {suit:'diamonds',y:354,cards:[['J','Eshu',156,201],['Q','Orunmila',363,195],['K','Oduduwa',562,194]]},
 {suit:'clubs',y:354,cards:[['J','Erinle',894,196],['Q','Osanyin',1095,195],['K','Aganju',1296,194]]},
];
mkdirSync(output,{recursive:true});
const cards=[];
for(const row of rows)for(const [rank,name,x,width]of row.cards){
 const height=row.y===23?312:311;
 const file=`${rank}-${row.suit}.png`;
 const result=spawnSync('sips',['--cropToHeightWidth',String(height),String(width),'--cropOffset',String(row.y),String(x),source,'--out',`${output}/${file}`],{encoding:'utf8'});
 if(result.status!==0)throw new Error(result.stderr);
 cards.push({id:`${rank}-${row.suit}`,name,file,rect:[x,row.y,width,height]});
}
writeFileSync(`${output}/manifest.json`,JSON.stringify({source,sourceSize:[1536,1024],sha256:createHash('sha256').update(readFileSync(source)).digest('hex'),method:'Direct sips PNG crop; no resampling, repainting or generative alteration',cards},null,2)+'\n');
console.log(`Extracted ${cards.length} original court illustrations.`);
