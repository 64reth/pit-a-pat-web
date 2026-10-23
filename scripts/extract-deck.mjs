// Preserve the owner-supplied sheet as direct, unscaled PNG crops.
import './extract-courts.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const source='docs/design/orisha-deck-reference.png', output='public/assets/cards/orisha';
const manifest=JSON.parse(readFileSync(`${output}/manifest.json`,'utf8'));
const additions=[
 ['A-spades','War & Power',[950,731,125,208]],
 ['A-hearts','Life & Protection',[1079,731,130,208]],
 ['A-diamonds','Fate & Wisdom',[1213,731,135,208]],
 ['A-clubs','Earth & Nature',[1352,731,131,208]],
 ['2-spades','War & Power',[438,731,118,207]],
 ['5-hearts','Life & Protection',[560,731,116,207]],
 ['8-diamonds','Fate & Wisdom',[680,731,113,207]],
 ['10-clubs','Earth & Nature',[797,731,115,207]],
 ['back','Original Orisha patterned back',[33,691,189,266]],
];
for(const [id,name,rect] of additions){
 const [x,y,w,h]=rect,file=`${id}.png`;
 const result=spawnSync('sips',['--cropToHeightWidth',`${h}`,`${w}`,'--cropOffset',`${y}`,`${x}`,source,'--out',`${output}/${file}`],{encoding:'utf8'});
 if(result.status)throw new Error(result.stderr);
 manifest.cards=manifest.cards.filter(c=>c.id!==id);
 manifest.cards.push({id,name,file,rect});
}
manifest.sha256=createHash('sha256').update(readFileSync(source)).digest('hex');
writeFileSync(`${output}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
