import type {Profile} from '../progression/profile';
export function LocalStakes({profile,notice,onConfirm,onAnte}:{profile:Profile;notice:string;onConfirm:(zero?:boolean)=>void;onAnte:()=>void}){
 const t=profile.localTable;if(!t)return null;
 const initial=t.status==='awaiting-buy-in',ante=t.status==='awaiting-ante',ready=t.status==='ready-to-deal',custom=t.gameType==='custom';
 if(!initial&&!ante&&!ready)return null;
 const exposure=t.entry*(custom?2*t.players.length+1:1),nextAnte=ante&&t.state?.game.winner===null?0:t.entry,pot=initial?t.entry*t.players.length:ante?t.pot+nextAnte*t.players.length:t.pot;
 return <section className="local-stake-sheet" aria-label={ante?'Next hand ante':'Championship buy-in'}>
  <span className="kicker">{custom?'Custom Table':'Quick Play'} · First to three</span>
  <h2>{ready?'ALL PLAYERS COMMITTED':ante?'NEXT HAND ANTE':'CHAMPIONSHIP BUY-IN'}</h2>
  <div className="stake-metrics"><div><span>{ante?'This hand':'Your buy-in'}</span><strong>{ante?nextAnte:t.entry}<small> chips</small></strong></div><div><span>Championship pot{initial?' after buy-in':''}</span><strong>{pot}<small> chips</small></strong></div></div>
  <p className="stake-available">Available <strong>{profile.chips} local chips</strong></p>
  <p>{custom?'Equal contributions before each hand. The pot grows until someone wins three hands.':'One buy-in. Every hand covered until someone wins three.'}</p>
  <ul>{t.players.map(p=><li key={p.id}><span>{p.name}<small>{p.bot?'Simulated bot':'You'}</small></span><strong>{ready?'✓ Committed':p.bot?'Auto-commits':'Awaiting your stake'}<small>{t.entry} chips</small></strong></li>)}</ul>
  <details><summary>Stake terms · local simulation</summary><p>{custom?`Reserve up to ${exposure} chips each. Each hand’s ante comes from that reservation. Unused chips return at settlement; stalemates carry the same ante.`:'The champion receives the full pot. Rematch requires a fresh buy-in.'} Coins are for cosmetics. No cash value, purchases, withdrawals or redeemable prizes.</p></details>
  {notice&&<p className="stake-error" role="alert">{notice} Try your stake again, or choose zero-stake play before buying in.</p>}
  <div className="stake-submit">{initial&&profile.chips<exposure&&<p role="status">Not enough chips for this reservation. Zero-stake play is available.</p>}{initial&&<><button className="button primary wide" disabled={profile.chips<exposure} onClick={()=>onConfirm(false)}>Stake {t.entry} chips</button><button className="button secondary wide" onClick={()=>onConfirm(true)}>Play zero-stake · 0 chips each</button></>}{ante&&<button className="button primary wide" onClick={onAnte}>{nextAnte?`Stake ${t.entry} chips`:'Confirm redeal · No new ante'}</button>}{ready&&<p role="status">✓ All committed. Dealing…</p>}</div>
 </section>;
}
