'use strict';
const KEY='studyquest.v1',$=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>[...e.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const def=()=>({settings:{expQ:2,expMin:1,pass:80,ranks:['初級','中級','上級','熟練','MASTER'],defReq:[100,200,300,400]},cats:[],skills:[],logs:[]});
const valid=d=>d&&d.settings&&Array.isArray(d.settings.ranks)&&d.settings.ranks.length>1&&Array.isArray(d.settings.defReq)&&Array.isArray(d.cats)&&Array.isArray(d.skills)&&Array.isArray(d.logs);
let S=(()=>{try{const d=JSON.parse(localStorage.getItem(KEY));if(valid(d))return d}catch(e){}return def()})();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('保存に失敗しました')}};
const R=()=>S.settings.ranks,mx=()=>R().length-1,sk=id=>S.skills.find(s=>s.id===id),cat=id=>S.cats.find(c=>c.id===id);
const ri=s=>Math.min(s.rank||0,mx());
const req=(s,i)=>(s.req&&s.req[i]>0)?s.req[i]:(S.settings.defReq[i]>0?S.settings.defReq[i]:100*(i+1));
const unl=s=>ri(s)<mx()&&s.exp>=req(s,ri(s));
const calc=(m,q)=>Math.round((m*S.settings.expMin+q*S.settings.expQ)*10)/10;
const r1=n=>Math.round(n*10)/10;
const sorted=()=>[...S.logs].reverse().sort((a,b)=>b.date.localeCompare(a.date));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2800)}
function addExp(s,d){const was=unl(s);s.exp=Math.max(0,r1(s.exp+d));if(!was&&unl(s))toast(`「${s.name}」の昇格試験が解放されました！`)}
const rmSkill=id=>{S.skills=S.skills.filter(s=>s.id!==id);S.logs=S.logs.filter(l=>l.skill!==id)};
const bar=s=>{const m=ri(s)>=mx(),r=req(s,ri(s)),p=m?100:Math.min(100,s.exp/r*100);return `<div class="bar ${unl(s)?'full':''}"><i style="--w:${p}%"></i><span>${m?`MAX（累計 ${s.exp} EXP）`:`${s.exp} / ${r} EXP`}</span></div>`};
const card=s=>`<a class="card" href="#skill/${s.id}"><div class="top"><b>${esc(s.name)}</b><em class="rk">${esc(R()[ri(s)])}</em></div><small>${esc(cat(s.cat)?.name||'')}</small>${bar(s)}${unl(s)?'<div class="tag">⚔ 昇格試験が解放されました</div>':''}</a>`;
const logRow=(l,ed)=>{const s=sk(l.skill),t={study:'学習',manual:'手動',exam:'試験',rank:'昇格'}[l.type];return `<li><span class="d">${l.date}</span><span class="t ${l.type}">${t}</span><b>${esc(s?.name||'?')}</b><span>${esc(l.note||'')}${l.type==='study'?` ${l.min}分／${l.q}問`:''}</span><span class="x ${l.exp<0?'neg':''}">${l.exp?`${l.exp>0?'+':''}${l.exp} EXP`:''}</span>${ed?`<span class="acts">${l.type==='study'?`<button data-a="editLog" data-id="${l.id}">編集</button>`:''}<button data-a="delLog" data-id="${l.id}">削除</button></span>`:''}</li>`};
const nf=()=>'<p class="empty">見つかりません。<a href="#home">ホームへ戻る</a></p>';

function home(){const L=S.logs,tm=L.reduce((a,l)=>a+(l.min||0),0),tq=L.reduce((a,l)=>a+(l.q||0),0),lv=S.skills.reduce((a,s)=>a+ri(s),0),op=S.skills.filter(unl);
return `<section class="panel stats"><div><small>総合ランクLv</small><b>${lv}</b></div><div><small>スキル数</small><b>${S.skills.length}</b></div><div><small>学習時間</small><b>${Math.floor(tm/60)}h${tm%60}m</b></div><div><small>解いた問題</small><b>${tq}</b></div></section>
${op.length?`<section class="panel"><h2>⚔ 昇格試験が解放中</h2><div class="grid">${op.map(card).join('')}</div></section>`:''}
<section class="panel"><h2>カテゴリー<button data-a="addCat">カテゴリーを追加</button></h2>${S.cats.length?`<div class="grid">${S.cats.map(c=>{const ss=S.skills.filter(s=>s.cat===c.id);return `<a class="card" href="#cat/${c.id}"><b>${esc(c.name)}</b><small>${ss.length} スキル</small>${ss.map(s=>`<div class="mini"><span>${esc(s.name)}</span><em class="rk">${esc(R()[ri(s)])}</em>${bar(s)}</div>`).join('')}</a>`}).join('')}</div>`:'<p class="empty">カテゴリーがまだありません。「カテゴリーを追加」から科目を作り、冒険を始めましょう。</p>'}</section>
<section class="panel"><h2>最近の学習履歴<a href="#log">学習を記録</a></h2>${L.length?`<ul class="logs">${sorted().slice(0,8).map(l=>logRow(l)).join('')}</ul>`:'<p class="empty">履歴はまだありません。</p>'}</section>`}

function catv(id){const c=cat(id);if(!c)return nf();const ss=S.skills.filter(s=>s.cat===id);
return `<section class="panel"><a href="#home">← ホーム</a><h2>${esc(c.name)}<span><button data-a="addSkill" data-id="${id}">スキルを追加</button><button data-a="editCat" data-id="${id}">名称変更</button><button class="danger" data-a="delCat" data-id="${id}">削除</button></span></h2>${ss.length?`<div class="grid">${ss.map(s=>`<div class="wrap">${card(s)}<div class="acts"><button data-a="editSkill" data-id="${s.id}">編集</button><button class="danger" data-a="delSkill" data-id="${s.id}">削除</button></div></div>`).join('')}</div>`:'<p class="empty">スキルがありません。「スキルを追加」から作成してください。</p>'}</section>`}

function skillv(id){const s=sk(id);if(!s)return nf();const lg=sorted().filter(l=>l.skill===id);
return `<section class="panel hero"><a href="#cat/${s.cat}">← ${esc(cat(s.cat)?.name||'')}</a><h1>${esc(s.name)}</h1><div class="rank">${esc(R()[ri(s)])}</div>${bar(s)}${s.desc?`<p>${esc(s.desc)}</p>`:''}${unl(s)?`<a class="btn pri" href="#exam/${id}">⚔ 昇格試験に挑戦</a>`:''}
<div class="acts"><a class="btn" href="#log/${id}">学習を記録</a><button data-a="adjust" data-id="${id}">EXP加減算</button><button data-a="editReq" data-id="${id}">必要EXP編集</button><button data-a="editSkill" data-id="${id}">編集</button><button class="danger" data-a="delSkill" data-id="${id}">削除</button></div></section>
<section class="panel"><h2>昇格条件</h2><p>必要EXPに到達すると昇格試験が解放され、正答率 ${S.settings.pass}% 以上で昇格します。</p><ol class="steps">${R().slice(0,-1).map((n,i)=>`<li class="${i<ri(s)?'done':i===ri(s)?'cur':''}">${esc(n)} → ${esc(R()[i+1])}：${req(s,i)} EXP</li>`).join('')}</ol></section>
<section class="panel"><h2>学習履歴</h2>${lg.length?`<ul class="logs">${lg.map(l=>logRow(l,1)).join('')}</ul>`:'<p class="empty">履歴はまだありません。</p>'}</section>`}

function logv(pre){if(!S.skills.length)return '<section class="panel"><p class="empty">先にカテゴリーとスキルを追加してください。<a href="#home">ホームへ</a></p></section>';
return `<section class="panel"><h2>学習を記録</h2><form id="logf" class="form"><label>スキル<select name="skill">${S.skills.map(s=>`<option value="${s.id}" ${s.id===pre?'selected':''}>${esc(cat(s.cat)?.name)} / ${esc(s.name)}</option>`).join('')}</select></label><label>日付<input type="date" name="date" value="${today()}" required></label><label>学習時間（分）<input type="number" name="min" min="0" value="0"></label><label>解いた問題数<input type="number" name="q" min="0" value="0"></label><label>メモ<input name="note"></label><p class="calc">獲得EXP：<b id="gain">0</b></p><button class="pri">記録を保存</button></form></section><section class="panel"><h2>過去の記録</h2>${S.logs.length?`<ul class="logs">${sorted().map(l=>logRow(l,1)).join('')}</ul>`:'<p class="empty">記録はまだありません。</p>'}</section>`}

function examv(pre){const o=S.skills.filter(unl);if(!o.length)return '<section class="panel"><h2>昇格試験</h2><p class="empty">昇格試験が解放されたスキルはありません。EXPを貯めて必要EXPに到達しましょう。</p></section>';
return `<section class="panel"><h2>昇格試験</h2><form id="exf" class="form"><label>対象スキル<select name="skill">${o.map(s=>`<option value="${s.id}" ${s.id===pre?'selected':''}>${esc(s.name)}（${esc(R()[ri(s)])} → ${esc(R()[ri(s)+1])}）</option>`).join('')}</select></label><label>問題数<input type="number" name="t" min="1" required></label><label>正解数<input type="number" name="c" min="0" required></label><p class="calc">正答率：<b id="rate">-</b>%　合格基準：${S.settings.pass}%　<b id="jd"></b></p><button class="pri">合否を判定</button></form></section>`}

function setv(){const s=S.settings;return `<section class="panel"><h2>設定</h2><form id="setf" class="form"><label>問題1問あたりのEXP<input type="number" name="expQ" step="any" min="0" value="${s.expQ}"></label><label>学習1分あたりのEXP<input type="number" name="expMin" step="any" min="0" value="${s.expMin}"></label><label>合格基準（正答率 %）<input type="number" name="pass" min="1" max="100" value="${s.pass}"></label><label>ランク名称（1行1ランク、下位から。2段階以上）<textarea name="ranks" rows="6">${esc(s.ranks.join('\n'))}</textarea></label><label>デフォルト必要EXP（カンマ区切り。各ランクの昇格に必要な量）<input name="defReq" value="${s.defReq.slice(0,s.ranks.length-1).join(',')}"></label><p class="hint">スキルごとの必要EXPは、スキル詳細画面で個別に変更できます。</p><button class="pri">設定を保存</button></form></section><section class="panel"><h2>データ管理</h2><div class="acts"><button data-a="export">JSONエクスポート</button><button data-a="import">JSONインポート</button><button class="danger" data-a="reset">初期化</button></div><input type="file" id="imp" accept="application/json" hidden></section>`}

function modal(t,fs,ok){const o=$('#modal');o.innerHTML=`<div class="box"><h3>${esc(t)}</h3><form>${fs.map(f=>`<label>${f.l}${f.t==='select'?`<select name="${f.k}">${f.opts.map(([v,x])=>`<option value="${esc(v)}" ${v==f.v?'selected':''}>${esc(x)}</option>`).join('')}</select>`:f.t==='textarea'?`<textarea name="${f.k}">${esc(f.v)}</textarea>`:`<input name="${f.k}" type="${f.t||'text'}" value="${esc(f.v??'')}" ${f.req?'required':''} ${f.t==='number'?'step="any" min="0"':''}>`}</label>`).join('')}<div class="row"><button type="button" id="mx">キャンセル</button><button class="pri">OK</button></div></form></div>`;
o.classList.add('on');const f=$('form',o),close=()=>o.classList.remove('on');$('#mx',o).onclick=close;
f.onsubmit=e=>{e.preventDefault();e.stopPropagation();const v=Object.fromEntries(new FormData(f));close();ok(v)};$('input,select,textarea',f).focus()}
function skForm(t,s,fn){if(!S.cats.length)return toast('先にカテゴリーを追加してください');modal(t,[{k:'name',l:'スキル名',v:s.name,req:1},{k:'cat',l:'カテゴリー',t:'select',v:s.cat,opts:S.cats.map(c=>[c.id,c.name])},{k:'rank',l:'現在のランク',t:'select',v:s.rank||0,opts:R().map((n,i)=>[i,n])},{k:'desc',l:'説明（任意）',t:'textarea',v:s.desc}],v=>{if(!v.name.trim())return toast('スキル名を入力してください');fn(v);save();render()})}

function rankUp(s,from){const o=$('#fx');o.innerHTML=`<div class="burst">${'<u></u>'.repeat(28)}</div><div class="fxbox"><small>RANK UP!</small><h2>${esc(s.name)}</h2><p>${esc(from)} → <b>${esc(R()[ri(s)])}</b></p><button class="pri" id="fxc">続ける</button></div>`;
$$('u',o).forEach((u,i)=>{u.style.setProperty('--a',i*(360/28)+'deg');u.style.setProperty('--d',Math.random()*.5+'s')});o.classList.add('on');$('#fxc').focus()}

function doLog(f){const s=sk(f.skill.value),m=Math.max(0,+f.min.value||0),q=Math.max(0,+f.q.value||0);if(!s||m+q===0)return toast('学習時間か問題数を入力してください');const g=calc(m,q);addExp(s,g);S.logs.push({id:uid(),skill:s.id,date:f.date.value||today(),type:'study',min:m,q,exp:g,note:f.note.value.trim()});save();toast(`+${g} EXP を獲得！`);render()}
function doExam(f){const s=sk(f.skill.value),t=+f.t.value,c=+f.c.value;if(!s||!(t>0)||c<0||c>t)return toast('問題数と正解数を確認してください（正解数は問題数以下）');
const r=c/t*100,ok=r>=S.settings.pass,from=R()[ri(s)],rs=r.toFixed(1);
if(ok){s.exp=r1(s.exp-req(s,ri(s)));s.rank=ri(s)+1;S.logs.push({id:uid(),skill:s.id,date:today(),type:'rank',exp:0,note:`昇格試験に合格 ${c}/${t}（${rs}%）${from}→${R()[s.rank]}`});save();render();rankUp(s,from)}
else{S.logs.push({id:uid(),skill:s.id,date:today(),type:'exam',exp:0,note:`昇格試験に不合格 ${c}/${t}（${rs}%）`});save();render();toast(`不合格（${rs}%）。ランクは維持され、再挑戦できます`)}}
function saveSet(f){const ranks=f.ranks.value.split('\n').map(x=>x.trim()).filter(Boolean);if(ranks.length<2||new Set(ranks).size!==ranks.length)return toast('ランク名は重複しない2つ以上が必要です');
const dr=f.defReq.value.split(/[,、\s]+/).filter(Boolean).map(Number);if(dr.some(x=>!(x>0)))return toast('必要EXPは正の数で入力してください');const n=ranks.length-1;while(dr.length<n)dr.push(100*(dr.length+1));
if(ranks.length<R().length&&!confirm('ランク段階を減らすと、上位ランクのスキルは新しい最高ランクに調整されます。続けますか？'))return;
Object.assign(S.settings,{expQ:+f.expQ.value||0,expMin:+f.expMin.value||0,pass:Math.min(100,Math.max(1,+f.pass.value||80)),ranks,defReq:dr.slice(0,n)});S.skills.forEach(s=>{s.rank=Math.min(s.rank||0,n)});save();toast('設定を保存しました');render()}

const A={
addCat(){modal('カテゴリーを追加',[{k:'name',l:'名称',req:1}],v=>{if(!v.name.trim())return;S.cats.push({id:uid(),name:v.name.trim()});save();render()})},
editCat(id){const c=cat(id);modal('カテゴリー名を変更',[{k:'name',l:'名称',v:c.name,req:1}],v=>{if(!v.name.trim())return;c.name=v.name.trim();save();render()})},
delCat(id){const n=S.skills.filter(s=>s.cat===id).length;if(!confirm(`このカテゴリーと所属スキル（${n}件）、およびその学習履歴を削除します。よろしいですか？`))return;S.skills.filter(s=>s.cat===id).forEach(s=>rmSkill(s.id));S.cats=S.cats.filter(c=>c.id!==id);save();location.hash='#home';render()},
addSkill(id){skForm('スキルを追加',{name:'',desc:'',cat:id,rank:0},v=>S.skills.push({id:uid(),name:v.name.trim(),cat:v.cat,desc:v.desc.trim(),rank:+v.rank,exp:0,req:{}}))},
editSkill(id){const s=sk(id);skForm('スキルを編集',s,v=>Object.assign(s,{name:v.name.trim(),cat:v.cat,desc:v.desc.trim(),rank:+v.rank}))},
delSkill(id){const s=sk(id);if(!confirm(`スキル「${s.name}」と学習履歴を削除します。よろしいですか？`))return;const c=s.cat;rmSkill(id);save();location.hash='#cat/'+c;render()},
editReq(id){const s=sk(id);modal('必要EXPを編集',R().slice(0,-1).map((n,i)=>({k:'r'+i,l:`${n} → ${R()[i+1]}`,t:'number',v:req(s,i),req:1})),v=>{s.req=s.req||{};R().slice(0,-1).forEach((_,i)=>{if(+v['r'+i]>0)s.req[i]=+v['r'+i]});save();render();if(unl(s))toast('昇格試験が解放されました')})},
adjust(id){const s=sk(id);modal('EXPを手動で加減算',[{k:'sign',l:'操作',t:'select',v:1,opts:[[1,'追加'],[-1,'減算']]},{k:'n',l:'EXP量',t:'number',v:10,req:1},{k:'note',l:'メモ',v:''}],v=>{const d=Math.abs(+v.n)*+v.sign;if(!d)return;const b=s.exp;addExp(s,d);S.logs.push({id:uid(),skill:id,date:today(),type:'manual',exp:r1(s.exp-b),note:v.note});save();render()})},
delLog(id){const l=S.logs.find(x=>x.id===id);if(!confirm('この記録を削除します。獲得したEXPも取り消されます。よろしいですか？'))return;const s=sk(l.skill);if(s&&(l.type==='study'||l.type==='manual'))addExp(s,-l.exp);S.logs=S.logs.filter(x=>x.id!==id);save();render()},
editLog(id){const l=S.logs.find(x=>x.id===id);modal('学習記録を編集',[{k:'date',l:'日付',t:'date',v:l.date,req:1},{k:'min',l:'学習時間（分）',t:'number',v:l.min},{k:'q',l:'問題数',t:'number',v:l.q},{k:'note',l:'メモ',v:l.note}],v=>{const m=+v.min||0,q=+v.q||0,g=calc(m,q),s=sk(l.skill);if(s)addExp(s,g-l.exp);Object.assign(l,{date:v.date,min:m,q,exp:g,note:v.note});save();render()})},
export(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.download=`study-quest-${today()}.json`;a.click();URL.revokeObjectURL(a.href)},
import(){$('#imp').click()},
reset(){if(confirm('すべてのデータを削除して初期化します。よろしいですか？')&&confirm('本当に初期化しますか？この操作は元に戻せません。')){S=def();save();render();toast('初期化しました')}}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)return A[b.dataset.a]?.(b.dataset.id);if(e.target.id==='fxc')$('#fx').classList.remove('on')});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target;({logf:doLog,exf:doExam,setf:saveSet})[f.id]?.(f)});
document.addEventListener('input',e=>{const f=e.target.form;if(!f)return;
if(f.id==='logf')$('#gain').textContent=calc(+f.min.value||0,+f.q.value||0);
if(f.id==='exf'){const t=+f.t.value,c=+f.c.value;if(t>0&&c>=0){const r=c/t*100;$('#rate').textContent=r.toFixed(1);$('#jd').textContent=r>=S.settings.pass?'✔ 合格圏':'✖ 不合格圏'}}});
document.addEventListener('change',e=>{if(e.target.id!=='imp')return;const file=e.target.files[0];if(!file)return;const fr=new FileReader();
fr.onload=()=>{try{const d=JSON.parse(fr.result);if(!valid(d))throw 0;if(!confirm('現在のデータを上書きしてインポートします。よろしいですか？'))return;S=d;save();render();toast('インポートしました')}catch(x){toast('インポートに失敗しました：形式が正しくありません')}};fr.readAsText(file);e.target.value=''});
function render(){const [p,a]=(location.hash.slice(1)||'home').split('/'),m={home,cat:catv,skill:skillv,log:logv,exam:examv,settings:setv};$('#app').innerHTML=(m[p]||home)(a);$$('nav a').forEach(x=>x.classList.toggle('on',x.getAttribute('href')==='#'+p))}
addEventListener('hashchange',()=>{render();scrollTo(0,0)});render();
