'use strict';
/* STUDY QUEST v2 — 累計EXPは「学習履歴(秒)＋手動補正」から常に導出する。レベル・ランク・総合値はすべて下記の共通ロジックで算出。 */
const SK='studyquest.save',OLD='studyquest.v1',VER=2;
const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>[...e.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const fmt=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return(h?h+'時間':'')+(m||h?m+'分':'')+s%60+'秒'};
const def=()=>({profile:{name:'プレイヤー',bio:''},settings:{curve:{base:100,slope:0.5},ranks:[{min:1,name:'初心者'},{min:70,name:'初級卒業'},{min:300,name:'中級者'},{min:800,name:'上級者'},{min:1000,name:'極'}]},ui:{homeLogs:8},cats:[],skills:[],logs:[]});
let S,SAVED=null,AG=null,PREV={},ST={k:'ok'};const INIT=[];

/* ---------- 検証・移行 ---------- */
function migrateV1(o){const n=def();n.cats=o.cats;const rk=o.settings.ranks;
 n.skills=o.skills.map(s=>({id:s.id,name:s.name,cat:s.cat,desc:s.desc||'',legacy:{rank:rk[s.rank]??'',exp:s.exp}}));
 n.logs=o.logs.map(l=>{const st=l.type==='study'||l.type==='manual',sec=l.type==='study'?Math.round((l.min||0)*60):0;
  return{id:l.id,skill:l.skill,date:l.date,type:st?l.type:'note',sec,q:l.q||0,bonus:st?Math.round((l.exp||0)-sec/60):0,note:l.note||''}});return n}
function normalize(raw){
 if(!raw||typeof raw!=='object')throw new Error('JSONの形式が正しくありません');
 let d;
 if(raw.data&&raw.version!=null){if(!Number.isFinite(raw.version)||raw.version>VER)throw new Error(`未対応のバージョン（${raw.version}）です`);d=raw.data}
 else if(raw.settings&&Array.isArray(raw.settings.ranks)&&Array.isArray(raw.skills)&&Array.isArray(raw.logs)&&Array.isArray(raw.cats))d=migrateV1(raw);
 else throw new Error('STUDY QUESTのセーブデータではありません');
 const n=def(),isS=x=>typeof x==='string',num=x=>typeof x==='number'&&Number.isFinite(x);
 if(!d||!Array.isArray(d.cats)||!Array.isArray(d.skills)||!Array.isArray(d.logs))throw new Error('データが破損しています');
 n.profile={name:isS(d.profile?.name)&&d.profile.name.trim()?d.profile.name.trim().slice(0,30):'プレイヤー',bio:isS(d.profile?.bio)?d.profile.bio.slice(0,500):''};
 const c=d.settings?.curve;if(c){if(!(num(c.base)&&c.base>0&&num(c.slope)&&c.slope>=0))throw new Error('レベル設定が不正です');n.settings.curve={base:c.base,slope:c.slope}}
 const rk=d.settings?.ranks;if(rk){if(!Array.isArray(rk)||!rk.length||rk.some((r,i)=>!(r&&isS(r.name)&&r.name&&Number.isInteger(r.min)&&(i?r.min>rk[i-1].min:r.min===1))))throw new Error('ランク設定が不正です');n.settings.ranks=rk.map(r=>({min:r.min,name:r.name}))}
 if(num(d.ui?.homeLogs))n.ui.homeLogs=Math.min(50,Math.max(1,Math.floor(d.ui.homeLogs)));
 const cid=new Set(),sid=new Set(),lid=new Set();
 d.cats.forEach(x=>{if(!x||!isS(x.id)||!isS(x.name)||cid.has(x.id))throw new Error('カテゴリーデータが不正です');cid.add(x.id);n.cats.push({id:x.id,name:x.name})});
 d.skills.forEach(x=>{if(!x||!isS(x.id)||!isS(x.name)||!cid.has(x.cat)||sid.has(x.id))throw new Error('スキルデータが不正です');sid.add(x.id);n.skills.push({id:x.id,name:x.name,cat:x.cat,desc:isS(x.desc)?x.desc:'',...(x.legacy?{legacy:x.legacy}:{})})});
 d.logs.forEach(x=>{if(!x||!isS(x.id)||!sid.has(x.skill)||!isS(x.date)||!num(x.sec??0)||x.sec<0||!num(x.bonus??0)||lid.has(x.id))throw new Error('学習履歴データが不正です');lid.add(x.id);n.logs.push({id:x.id,skill:x.skill,date:x.date,type:['study','manual','note'].includes(x.type)?x.type:'note',sec:Math.round(x.sec||0),q:Math.max(0,+x.q||0),bonus:Math.round(x.bonus||0),note:isS(x.note)?x.note:''})});
 return n}

/* ---------- 保存 ---------- */
function setSt(k){ST.k=k;const a=$('#ss');if(!a)return;a.className=k;a.textContent=k==='saving'?'保存中…':k==='err'?'保存エラー':SAVED?`保存済み ${new Date(SAVED).toLocaleTimeString('ja-JP')}`:'未保存'}
function save(){setSt('saving');AG=null;try{const t=new Date().toISOString();localStorage.setItem(SK,JSON.stringify({app:'STUDY_QUEST',version:VER,savedAt:t,data:S}));SAVED=t;setTimeout(()=>{if(ST.k==='saving')setSt('ok')},250);return true}catch(e){setSt('err');return false}}
function load(){let raw=null;try{raw=localStorage.getItem(SK)}catch(e){INIT.push('ブラウザの保存領域を使えません。データは保存されません');return def()}
 if(raw)try{const w=JSON.parse(raw),n=normalize(w);SAVED=w.savedAt||null;return n}catch(e){try{localStorage.setItem(SK+'.corrupt',raw)}catch(x){}INIT.push('保存データを読み込めませんでした（コピーを退避しました）：'+e.message)}
 let old=null;try{old=localStorage.getItem(OLD)}catch(e){}
 if(old)try{const n=normalize(JSON.parse(old));try{localStorage.setItem(OLD+'.backup',old)}catch(x){}INIT.push('旧バージョンのデータを新形式に移行しました（旧データは退避済み）');return n}catch(e){INIT.push('旧データの移行に失敗しました（旧データは削除していません）：'+e.message)}
 return def()}

/* ---------- EXP・レベル・ランク（共通ロジック） ---------- */
function agg(){if(AG)return AG;const m={};S.skills.forEach(s=>m[s.id]={sec:0,bonus:0,q:0,days:new Set()});
 S.logs.forEach(l=>{const a=m[l.skill];if(!a)return;a.sec+=l.sec||0;a.bonus+=l.bonus||0;a.q+=l.q||0;if(l.type==='study'&&l.sec>0)a.days.add(l.date)});return AG=m}
const expOf=s=>{const a=agg()[s.id];return Math.max(0,Math.floor(a.sec/60)+a.bonus)};
const totExp=()=>S.skills.reduce((t,s)=>t+expOf(s),0);
const need=L=>Math.ceil(S.settings.curve.base+S.settings.curve.slope*L);
const rankOf=lv=>{let r=S.settings.ranks[0].name;S.settings.ranks.forEach(x=>{if(lv>=x.min)r=x.name});return r};
function lvOf(exp){let lv=1,r=exp,n=need(1);while(r>=n){r-=n;lv++;n=need(lv)}const rank=rankOf(lv);return{lv,cur:r,need:n,exp,pct:r/n*100,rank,tier:rank}}
/* スキル専用レベル（総合とは独立）: Lv.Lに必要な累計EXP = 30×L×(L−1) */
const SKR=['未経験','初級','下級','中級','上級','熟練','精鋭','達人','至高','極致'];
const skRank=L=>L<=10?SKR[L-1]:`極致+${L-10}`;
function skLv(exp){let L=Math.max(1,Math.floor((1+Math.sqrt(1+4*exp/30))/2));while(L>1&&30*L*(L-1)>exp)L--;while(30*(L+1)*L<=exp)L++;const b=30*L*(L-1),n=60*L;return{lv:L,cur:exp-b,need:n,exp,pct:(exp-b)/n*100,rank:skRank(L),tier:Math.min(L,10)}}
function snap(){const o={t:lvOf(totExp()),s:{}};S.skills.forEach(s=>o.s[s.id]=skLv(expOf(s)));return o}
const sk=id=>S.skills.find(s=>s.id===id),cat=id=>S.cats.find(c=>c.id===id);
const sorted=()=>[...S.logs].reverse().sort((a,b)=>b.date.localeCompare(a.date));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),3200)}

/* ---------- 部品 ---------- */
const gauge=(key,x)=>{const pv=PREV[key];return `<div class="gauge"><i data-k="${key}" data-p="${x.pct}" data-lv="${x.lv}" style="width:${pv&&pv.lv===x.lv?pv.p:0}%"></i></div>`};
const lvBlock=(key,exp,label,big,fn=lvOf)=>{const x=fn(exp);return `<div class="lb">${label?`<div class="lbl">${label}</div>`:''}<div class="lv"><b class="${big?'big':''}">Lv.${x.lv}</b><span class="rk">${esc(x.rank)}</span></div>${gauge(key,x)}<div class="meta"><span>レベル内 ${x.cur} / ${x.need} EXP（あと ${x.need-x.cur}）</span><span>累計 ${exp} EXP</span></div></div>`};
const skCard=s=>`<a class="card" href="#skill/${s.id}"><div class="top"><b>${esc(s.name)}</b><small>${esc(cat(s.cat)?.name||'')}</small></div>${lvBlock('s:'+s.id,expOf(s),'',0,skLv)}</a>`;
const logRow=(l,ed)=>{const s=sk(l.skill),ty={study:'学習',manual:'手動',note:'記録'}[l.type];return `<li><span class="d">${l.date}</span><span class="t">${ty}</span><b>${esc(s?.name||'?')}</b><span>${esc(l.note)}</span><span class="x">${l.type==='study'?`${fmt(l.sec)}${l.q?`／${l.q}問`:''}${l.bonus?`（旧EXP補正 ${l.bonus>0?'+':''}${l.bonus}）`:''}`:l.type==='manual'?`${l.bonus>0?'+':''}${l.bonus} EXP`:''}</span>${ed?`<span class="acts">${l.type==='study'?`<button data-a="editLog" data-id="${l.id}">編集</button>`:''}<button data-a="delLog" data-id="${l.id}">削除</button></span>`:''}</li>`};
const nf=()=>'<p class="muted">見つかりません。<a href="#home">ホームへ戻る</a></p>';
const logList=(L,ed)=>L.length?`<ul class="logs">${L.map(l=>logRow(l,ed)).join('')}</ul>`:'<p class="muted">履歴はまだありません。</p>';

/* ---------- 画面 ---------- */
function home(){const L=S.logs,sec=L.reduce((a,l)=>a+(l.sec||0),0),days=new Set(L.filter(l=>l.type==='study'&&l.sec>0).map(l=>l.date)).size,q=L.reduce((a,l)=>a+(l.q||0),0);
return `<section class="panel prof"><div class="top"><div><h1>${esc(S.profile.name)}</h1>${S.profile.bio?`<p class="muted">${esc(S.profile.bio)}</p>`:''}</div><button data-a="editProf">プロフィール編集</button></div>${lvBlock('t',totExp(),'総合レベル',1)}</section>
<section class="panel stats"><div><small>累計学習時間</small><b>${fmt(sec)}</b></div><div><small>学習日数</small><b>${days}日</b></div><div><small>スキル数</small><b>${S.skills.length}</b></div><div><small>解いた問題</small><b>${q}</b></div></section>
<section class="panel"><h2>スキル一覧<a href="#cats">カテゴリー管理</a></h2>${S.skills.length?`<div class="grid">${S.skills.map(skCard).join('')}</div>`:'<p class="muted">スキルがまだありません。「カテゴリー」画面でカテゴリーとスキルを追加してください。</p>'}</section>
<section class="panel"><h2>最近の学習履歴<a href="#log">学習を記録</a></h2>${logList(sorted().slice(0,S.ui.homeLogs))}</section>`}
function catsv(){return `<section class="panel"><h2>カテゴリー<button data-a="addCat">カテゴリーを追加</button></h2>${S.cats.length?`<div class="grid">${S.cats.map(c=>{const ss=S.skills.filter(s=>s.cat===c.id);return `<a class="card" href="#cat/${c.id}"><b>${esc(c.name)}</b><br><small>${ss.length} スキル ／ 累計 ${ss.reduce((a,s)=>a+expOf(s),0)} EXP</small></a>`}).join('')}</div>`:'<p class="muted">カテゴリーがありません。「カテゴリーを追加」から科目を作成してください。</p>'}</section>`}
function catv(id){const c=cat(id);if(!c)return nf();const ss=S.skills.filter(s=>s.cat===id);
return `<section class="panel"><a href="#cats">← カテゴリー一覧</a><h2>${esc(c.name)}<span><button data-a="addSkill" data-id="${id}">スキルを追加</button><button data-a="editCat" data-id="${id}">名称変更</button><button class="danger" data-a="delCat" data-id="${id}">削除</button></span></h2>${ss.length?`<div class="grid">${ss.map(s=>`<div>${skCard(s)}<div class="acts"><button data-a="editSkill" data-id="${s.id}">編集</button><button class="danger" data-a="delSkill" data-id="${s.id}">削除</button></div></div>`).join('')}</div>`:'<p class="muted">スキルがありません。「スキルを追加」から作成してください。</p>'}</section>`}
function skillv(id){const s=sk(id);if(!s)return nf();const a=agg()[id],x=skLv(expOf(s));
return `<section class="panel"><a href="#cat/${s.cat}">← ${esc(cat(s.cat)?.name||'')}</a><h1>${esc(s.name)}</h1>${s.desc?`<p class="muted">${esc(s.desc)}</p>`:''}${lvBlock('s:'+id,expOf(s),'',1,skLv)}<div class="stats sm"><div><small>学習時間</small><b>${fmt(a.sec)}</b></div><div><small>学習日数</small><b>${a.days.size}日</b></div><div><small>問題数</small><b>${a.q}</b></div></div><div class="acts"><a class="btn pri" href="#log/${id}">学習を記録</a><button data-a="adjust" data-id="${id}">EXP加減算</button><button data-a="editSkill" data-id="${id}">編集</button><button class="danger" data-a="delSkill" data-id="${id}">削除</button></div></section>
<section class="panel"><h2>スキルランク一覧</h2><ul class="ranks">${SKR.map((n,i)=>`<li class="${Math.min(x.lv,10)===i+1?'cur':''}"><span>Lv.${i+1}</span>${n}<small>（累計 ${30*(i+1)*i} EXP〜）</small></li>`).join('')}<li class="${x.lv>10?'cur':''}"><span>Lv.11〜</span>極致+1、極致+2 …</li></ul></section>
<section class="panel"><h2>学習履歴</h2>${logList(sorted().filter(l=>l.skill===id),1)}</section>`}
function logv(pre){if(!S.skills.length)return '<section class="panel"><p class="muted">先にカテゴリーとスキルを追加してください。<a href="#cats">カテゴリーへ</a></p></section>';
return `<section class="panel"><h2>学習を記録</h2><form id="logf" class="form"><label>スキル<select name="skill">${S.skills.map(s=>`<option value="${s.id}" ${s.id===pre?'selected':''}>${esc(cat(s.cat)?.name)} / ${esc(s.name)}</option>`).join('')}</select></label><label>日付<input type="date" name="date" value="${today()}" required></label><div class="two"><label>学習時間（分）<input type="number" name="mi" min="0" step="1" value="0"></label><label>秒<input type="number" name="se" min="0" step="1" value="0"></label></div><label>解いた問題数（記録のみ・EXPには影響しません）<input type="number" name="q" min="0" step="1" value="0"></label><label>メモ<input name="note"></label><p class="calc" id="gain"></p><button class="pri">記録を保存</button></form></section><section class="panel"><h2>過去の記録</h2>${logList(sorted(),1)}</section>`}
function setv(){return `<section class="panel"><h2>設定</h2><form id="setf" class="form"><label>ランク設定（1行1ランク「開始レベル,名称」。最初はLv.1、以降は昇順）<textarea name="ranks" rows="6">${esc(S.settings.ranks.map(r=>r.min+','+r.name).join('\n'))}</textarea></label><label>ホームに表示する履歴の件数<input type="number" name="hl" min="1" max="50" value="${S.ui.homeLogs}"></label><p class="muted">ランクは総合・各スキルのレベルから自動判定されます。変更しても学習記録・累計EXPは変わりません。</p><button class="pri">設定を保存</button></form></section><section class="panel"><h2>セーブデータ<a href="#save">セーブデータ管理を開く</a></h2><p class="muted">書き出し・読み込み・初期化はセーブデータ管理から行えます。</p></section>`}
function savev(){const t=totExp(),x=lvOf(t),sec=S.logs.reduce((a,l)=>a+(l.sec||0),0);let bk=false;try{bk=localStorage.getItem(OLD+'.backup')!=null}catch(e){}
return `<section class="panel"><h2>セーブデータ管理</h2><dl class="kv"><dt>自動保存</dt><dd>${{ok:'有効（保存済み）',saving:'保存中',err:'保存エラー'}[ST.k]}</dd><dt>最終保存日時</dt><dd>${SAVED?new Date(SAVED).toLocaleString('ja-JP'):'—'}</dd></dl>${ST.k==='err'?'<p class="warn">保存に失敗しています（容量不足やブラウザ設定の可能性）。セーブデータを書き出して保管してください。</p>':''}<div class="acts"><button data-a="saveNow">今すぐ保存</button><button class="pri" data-a="export">書き出し（JSON）</button><button data-a="import">読み込み（JSON）</button></div><input type="file" id="imp" accept="application/json,.json" hidden></section>
<section class="panel"><h2>現在のセーブデータ</h2><dl class="kv"><dt>プレイヤー名</dt><dd>${esc(S.profile.name)}</dd><dt>総合レベル</dt><dd>Lv.${x.lv}（${esc(x.rank)}）</dd><dt>総合経験値</dt><dd>${t} EXP</dd><dt>登録スキル数</dt><dd>${S.skills.length}</dd><dt>累計学習時間</dt><dd>${fmt(sec)}</dd><dt>最終保存日時</dt><dd>${SAVED?new Date(SAVED).toLocaleString('ja-JP'):'—'}</dd><dt>データ形式</dt><dd>version ${VER}${bk?'（旧データを退避済み）':''}</dd></dl></section>
<section class="panel"><h2>初期化</h2><p class="muted">すべてのデータを削除します。事前に書き出しを推奨します。</p><button class="danger" data-a="reset">すべて初期化</button></section>`}

/* ---------- モーダル・演出 ---------- */
function modal(t,fs,ok){const o=$('#modal');o.innerHTML=`<div class="box"><h3>${esc(t)}</h3><form>${fs.map(f=>`<label>${f.l}${f.t==='select'?`<select name="${f.k}">${f.opts.map(([v,x])=>`<option value="${esc(v)}" ${v==f.v?'selected':''}>${esc(x)}</option>`).join('')}</select>`:f.t==='textarea'?`<textarea name="${f.k}" rows="3">${esc(f.v)}</textarea>`:`<input name="${f.k}" type="${f.t||'text'}" value="${esc(f.v??'')}" ${f.req?'required':''} ${f.t==='number'?'step="1" min="0"':''}>`}</label>`).join('')}<div class="row"><button type="button" id="mx">キャンセル</button><button class="pri">OK</button></div></form></div>`;
 o.classList.add('on');const f=$('form',o),close=()=>o.classList.remove('on');$('#mx',o).onclick=close;f.onsubmit=e=>{e.preventDefault();e.stopPropagation();const v=Object.fromEntries(new FormData(f));close();ok(v)};$('input,select,textarea',f).focus()}
function fx(b,a){const ev=[],chk=(n,x,y)=>{if(y&&x&&y.lv>x.lv)ev.push({n,x,y})};chk('総合',b.t,a.t);S.skills.forEach(s=>chk(s.name,b.s[s.id],a.s[s.id]));
 if(!ev.length){const g=a.t.exp-b.t.exp;if(g>0)toast(`+${g} EXP`);return}
 const rk=ev.some(e=>e.x.tier!==e.y.tier),o=$('#fx');
 const lines=ev.map(e=>`<div class="ev"><b>${esc(e.n)}</b>　Lv.${e.x.lv} → <b>Lv.${e.y.lv}</b>（+${e.y.lv-e.x.lv}）${e.x.rank!==e.y.rank?`<em>${esc(e.x.rank)} → ${esc(e.y.rank)}</em>`:''}<small>獲得 ${e.y.exp-e.x.exp} EXP ／ 累計 ${e.y.exp} EXP</small></div>`).join('');
 o.className=rk?'rank':'lvl';o.innerHTML=(rk?'<div class="ring"></div><div class="ring r2"></div>':'')+`<div class="fxbox"><div class="cap">${rk?'RANK UP':'LEVEL UP'}</div>${lines}<button id="fxc" class="${rk?'pri':''}">閉じる</button></div>`;
 clearTimeout(fx.t);if(!rk)fx.t=setTimeout(()=>{o.className=''},9000)}

/* ---------- 更新処理（すべてcommit経由で自動保存） ---------- */
function commit(fn){const b=snap();fn();AG=null;const ok=save(),a=snap();render();if(!ok)toast('保存エラー：データはこのページ上にのみあります。書き出しを推奨します');fx(b,a)}
function doLog(f){const s=sk(f.skill.value),n=x=>Math.max(0,Math.floor(+x||0)),sec=n(f.mi.value)*60+n(f.se.value),q=n(f.q.value);if(!s||sec+q===0)return toast('学習時間か問題数を入力してください');
 commit(()=>S.logs.push({id:uid(),skill:s.id,date:f.date.value||today(),type:'study',sec,q,bonus:0,note:f.note.value.trim()}))}
function saveSet(f){const rk=[];for(const ln of f.ranks.value.split('\n').filter(l=>l.trim())){const m=ln.match(/^\s*(\d+)\s*[,，:：]\s*(.+?)\s*$/);if(!m)return toast('形式が正しくありません：'+ln);rk.push({min:+m[1],name:m[2]})}
 if(!rk.length||rk[0].min!==1||rk.some((r,i)=>i&&r.min<=rk[i-1].min))return toast('最初のランクはLv.1から、以降は昇順（重複なし）で指定してください');
 const h=Math.min(50,Math.max(1,Math.floor(+f.hl.value)||8));commit(()=>{S.settings.ranks=rk;S.ui.homeLogs=h});toast('設定を保存しました')}
function exportData(){const t=totExp(),x=lvOf(t),d=new Date(),p=n=>String(n).padStart(2,'0'),stamp=`${today().replace(/-/g,'')}_${p(d.getHours())}${p(d.getMinutes())}`;
 const out={app:'STUDY_QUEST',version:VER,savedAt:d.toISOString(),summary:{playerName:S.profile.name,totalLevel:x.lv,totalRank:x.rank,totalExp:t,totalStudySeconds:S.logs.reduce((a,l)=>a+(l.sec||0),0),skills:S.skills.map(s=>{const e=expOf(s),y=skLv(e);return{name:s.name,exp:e,level:y.lv,rank:y.rank,studySeconds:agg()[s.id].sec}})},data:S};
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download=`STUDY_QUEST_save_${stamp}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('セーブデータを書き出しました')}
function importData(file){if(file.size>5e6)return toast('ファイルが大きすぎます（5MBまで）');const fr=new FileReader();fr.onerror=()=>toast('ファイルを読み込めませんでした');
 fr.onload=()=>{let n;try{n=normalize(JSON.parse(fr.result))}catch(e){return toast('読み込めません：'+(e instanceof SyntaxError?'JSONとして解析できません':e.message)+'（現在のデータは変更されていません）')}
  const prev=S;S=n;AG=null;const x=lvOf(totExp()),info=`「${S.profile.name}」 Lv.${x.lv} ／ ${totExp()} EXP ／ スキル${S.skills.length}件`;S=prev;AG=null;
  if(!confirm(`${info}\nのセーブデータを読み込みます。\n\n現在のデータはすべて上書きされます。事前の書き出しをおすすめします。続けますか？`))return;
  S=n;AG=null;PREV={};if(!save()){S=prev;AG=null;save();render();return toast('保存できなかったため、読み込みを取り消しました')}render();toast('セーブデータを読み込みました')};fr.readAsText(file)}
const skForm=(t,s,fn)=>S.cats.length?modal(t,[{k:'name',l:'スキル名',v:s.name,req:1},{k:'cat',l:'カテゴリー',t:'select',v:s.cat,opts:S.cats.map(c=>[c.id,c.name])},{k:'desc',l:'説明（任意）',t:'textarea',v:s.desc}],v=>{if(!v.name.trim())return toast('スキル名を入力してください');commit(()=>fn(v))}):toast('先にカテゴリーを追加してください');
const rmSkills=ids=>{S.skills=S.skills.filter(s=>!ids.includes(s.id));S.logs=S.logs.filter(l=>!ids.includes(l.skill))};
const A={
editProf(){modal('プロフィール編集',[{k:'name',l:'ユーザー名',v:S.profile.name,req:1},{k:'bio',l:'プロフィール（任意）',t:'textarea',v:S.profile.bio}],v=>{if(!v.name.trim())return;commit(()=>{S.profile.name=v.name.trim().slice(0,30);S.profile.bio=v.bio.slice(0,500)})})},
addCat(){modal('カテゴリーを追加',[{k:'name',l:'名称',req:1}],v=>{if(v.name.trim())commit(()=>S.cats.push({id:uid(),name:v.name.trim()}))})},
editCat(id){const c=cat(id);modal('カテゴリー名を変更',[{k:'name',l:'名称',v:c.name,req:1}],v=>{if(v.name.trim())commit(()=>{c.name=v.name.trim()})})},
delCat(id){const ss=S.skills.filter(s=>s.cat===id),e=ss.reduce((a,s)=>a+expOf(s),0);if(!confirm(`このカテゴリーと所属スキル${ss.length}件、その学習履歴を削除します。\n総合経験値から ${e} EXP が差し引かれ、元に戻せません。\n（事前の書き出しをおすすめします）\n続けますか？`))return;commit(()=>{rmSkills(ss.map(s=>s.id));S.cats=S.cats.filter(c=>c.id!==id)});location.hash='#cats'},
addSkill(id){skForm('スキルを追加',{name:'',desc:'',cat:id},v=>S.skills.push({id:uid(),name:v.name.trim(),cat:v.cat,desc:v.desc.trim()}))},
editSkill(id){const s=sk(id);skForm('スキルを編集',s,v=>Object.assign(s,{name:v.name.trim(),cat:v.cat,desc:v.desc.trim()}))},
delSkill(id){const s=sk(id),n=S.logs.filter(l=>l.skill===id).length;if(!confirm(`スキル「${s.name}」と学習履歴${n}件を削除します。\n累計 ${expOf(s)} EXP が総合経験値から差し引かれ、元に戻せません。\n（事前の書き出しをおすすめします）\n続けますか？`))return;const c=s.cat;commit(()=>rmSkills([id]));location.hash='#cat/'+c},
adjust(id){const s=sk(id);modal('EXPを手動で加減算',[{k:'sign',l:'操作',t:'select',v:1,opts:[[1,'追加'],[-1,'減算']]},{k:'n',l:'EXP量（整数）',t:'number',v:10,req:1},{k:'note',l:'メモ',v:''}],v=>{let n=Math.floor(Math.abs(+v.n)||0);if(+v.sign<0)n=-Math.min(n,expOf(s));if(!n)return toast('変更できるEXPがありません');commit(()=>S.logs.push({id:uid(),skill:id,date:today(),type:'manual',sec:0,q:0,bonus:n,note:v.note}))})},
delLog(id){if(confirm('この記録を削除します。獲得した学習時間・EXPも取り消されます。よろしいですか？'))commit(()=>{S.logs=S.logs.filter(l=>l.id!==id)})},
editLog(id){const l=S.logs.find(x=>x.id===id);modal('学習記録を編集',[{k:'date',l:'日付',t:'date',v:l.date,req:1},{k:'mi',l:'学習時間（分）',t:'number',v:Math.floor(l.sec/60)},{k:'se',l:'秒',t:'number',v:l.sec%60},{k:'q',l:'問題数',t:'number',v:l.q},{k:'note',l:'メモ',v:l.note}],v=>{const n=x=>Math.max(0,Math.floor(+x||0));commit(()=>Object.assign(l,{date:v.date,sec:n(v.mi)*60+n(v.se),q:n(v.q),note:v.note}))})},
saveNow(){save();render();toast(ST.k==='err'?'保存に失敗しました':'保存しました')},
export:exportData,import(){$('#imp').click()},
reset(){if(confirm('すべてのデータを削除して初期化します。よろしいですか？')&&confirm('本当に初期化しますか？元に戻せません。')){S=def();AG=null;PREV={};save();location.hash='#home';render()}}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)return A[b.dataset.a]?.(b.dataset.id);if(e.target.id==='fxc')$('#fx').className=''});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target;({logf:doLog,setf:saveSet})[f.id]?.(f)});
function preview(f){const s=sk(f.skill.value);if(!s)return;const n=x=>Math.max(0,Math.floor(+x||0)),add=n(f.mi.value)*60+n(f.se.value),a=agg()[s.id],g=Math.max(0,Math.floor((a.sec+add)/60)+a.bonus)-expOf(s);$('#gain').innerHTML=`獲得EXP：<b>+${g}</b>（端数 ${(a.sec+add)%60}秒は次回へ繰越）`}
document.addEventListener('input',e=>{if(e.target.form?.id==='logf')preview(e.target.form)});
document.addEventListener('change',e=>{if(e.target.id==='imp'&&e.target.files[0]){importData(e.target.files[0]);e.target.value=''}});
function render(){const [p,a]=(location.hash.slice(1)||'home').split('/'),m={home,cats:catsv,cat:catv,skill:skillv,log:logv,settings:setv,save:savev};$('#app').innerHTML=(m[p]||home)(a);
 const key={cat:'cats',skill:'home',save:'settings'}[p]||(m[p]?p:'home');$$('nav a').forEach(x=>x.classList.toggle('on',x.getAttribute('href')==='#'+key));
 if($('#logf'))preview($('#logf'));const is=$$('.gauge i');void document.body.offsetWidth;is.forEach(i=>{const p=+i.dataset.p;i.style.width=p+'%';PREV[i.dataset.k]={p,lv:+i.dataset.lv}});setSt(ST.k)}
addEventListener('hashchange',()=>{render();scrollTo(0,0)});
S=load();save();render();INIT.forEach((m,i)=>setTimeout(()=>toast(m),i*3400));
