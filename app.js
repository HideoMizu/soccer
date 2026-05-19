const KEY="soccerTeamManager.v2";
const OLDKEY="soccerTeamManager.v1";

const sampleData={
  team:{name:"BBS",password:"ABC"},
  masters:{
    uniforms:["赤","青"],
    itemTemplates:[
      {id:"it1",name:"基本セット",text:"ボール、すね当て、靴下"},
      {id:"it2",name:"夏セット",text:"ボール、すね当て、靴下、水筒、タオル、帽子"}
    ],
    noteTemplates:[
      {id:"nt1",name:"ユニフォーム注意",text:"1. 移動時はユニフォーム（上）が見えないように何か着るか、現地で着替えてください。"},
      {id:"nt2",name:"集合注意",text:"集合時間の10分前までに到着してください。欠席・遅刻は早めに連絡してください。"}
    ]
  },
  members:[
    {id:"m1",nickname:"太郎",entranceYear:2024},
    {id:"m2",nickname:"次郎",entranceYear:2024},
    {id:"m3",nickname:"三郎",entranceYear:2025}
  ],
  games:[
    {id:"g1",date:"2026-06-06",place:"第一小学校グラウンド",name:"練習試合 vs A小",time:"12:00-17:00",uniforms:["赤"],items:"ボール、すね当て、靴下",notes:"1. 移動時はユニフォーム（上）が見えないように何か着るか、現地で着替えてください。"},
    {id:"g2",date:"2026-06-14",place:"中央公園",name:"交流戦",time:"09:00-12:00",uniforms:["赤","青"],items:"ボール、すね当て、靴下、水筒",notes:"集合は8:40です。"}
  ],
  calls:[
    {gameId:"g1",memberIds:["m1","m2"]},
    {gameId:"g2",memberIds:["m1","m2","m3"]}
  ],
  responses:[
    {gameId:"g1",memberId:"m1",name:"太郎",answer:"参加",at:"2026-05-19T00:00:00.000Z"},
    {gameId:"g1",memberId:"m2",name:"次郎",answer:"不参加",at:"2026-05-19T00:00:00.000Z"},
    {gameId:"g2",memberId:"m1",name:"太郎",answer:"保留",at:"2026-05-19T00:00:00.000Z"}
  ]
};

let db=load();
let session=localStorage.getItem("soccer.loggedIn")==="1";
let page="check";
let adminTab="games";
let selectedGameId=null;
let currentMemberId=localStorage.getItem("soccer.currentMemberId")||"";

function normalize(d){
  d.masters=d.masters||{};
  if(!d.masters.itemTemplates)d.masters.itemTemplates=[{id:"it1",name:"基本セット",text:d.masters.itemTemplate||"ボール、すね当て、靴下"}];
  if(!d.masters.noteTemplates)d.masters.noteTemplates=[{id:"nt1",name:"基本注意",text:d.masters.noteTemplate||"1. 移動時はユニフォーム（上）が見えないように何か着るか、現地で着替えてください。"}];
  d.responses=d.responses||d.votes||[];
  d.responses=d.responses.map(r=>{
    const m=d.members.find(x=>x.nickname===r.name)||d.members.find(x=>x.id===r.memberId);
    return {...r,memberId:r.memberId||(m?m.id:""),answer:r.answer||"保留"};
  });
  delete d.votes;
  return d;
}
function load(){
  const raw=localStorage.getItem(KEY)||localStorage.getItem(OLDKEY);
  if(!raw){localStorage.setItem(KEY,JSON.stringify(sampleData));return structuredClone(sampleData);}
  try{const d=normalize(JSON.parse(raw));localStorage.setItem(KEY,JSON.stringify(d));return d}catch(e){return structuredClone(sampleData)}
}
function save(){localStorage.setItem(KEY,JSON.stringify(db));}
function uid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function today(){return new Date().toISOString().slice(0,10)}
function isFutureOrToday(d){return !d || d>=today()}
function schoolYear(){const d=new Date();return d.getMonth()+1>=4?d.getFullYear():d.getFullYear()-1;}
function grade(entranceYear){return Math.max(1,schoolYear()-Number(entranceYear)+1);}
function gameLabel(g){return `${g.date} ${g.name}`;}
function $(id){return document.getElementById(id);}
function callFor(gid){return db.calls.find(c=>c.gameId===gid)||{gameId:gid,memberIds:[]};}
function resFor(gid,mid){return db.responses.find(r=>r.gameId===gid&&r.memberId===mid);}
function calledMembers(gid){const ids=callFor(gid).memberIds;return ids.map(id=>db.members.find(m=>m.id===id)).filter(Boolean);}
function render(){session?renderApp():renderLogin();}

function renderLogin(){
  document.querySelector("#app").innerHTML=`
    <div class="header"><h1>Soccer Team Manager</h1><div class="small">小学校サッカーチーム管理</div></div>
    <div class="card">
      <h2>ログイン</h2>
      <div class="notice">試作版です。データはこのiPhone/ブラウザ内に保存されます。チーム全員共有は次段階でサーバー保存にします。</div>
      <label>チーム名</label><input id="team" value="BBS">
      <label>パスワード</label><input id="pw" type="password" value="ABC">
      <p id="msg" class="danger small"></p>
      <button class="red" onclick="login()">入る</button>
    </div>`;
}
function login(){
  if($("team").value.trim()===db.team.name && $("pw").value.trim()===db.team.password){
    localStorage.setItem("soccer.loggedIn","1");session=true;render();
  }else $("msg").textContent="チーム名またはパスワードが違います。";
}

function renderApp(){
  const titles={check:"試合確認",answer:"招集回答",admin:"管理者向け"};
  document.querySelector("#app").innerHTML=`
    <div class="header"><h1>${titles[page]}</h1><div class="small">チーム：${esc(db.team.name)} / ${db.members.length}名 / ${db.games.length}試合</div></div>
    <main id="main"></main>
    <div class="nav">
      ${navBtn("check","試合確認")}${navBtn("answer","招集回答")}${navBtn("admin","管理者向け")}
    </div>`;
  if(page==="check") checkPage();
  if(page==="answer") answerPage();
  if(page==="admin") adminPage();
}
function navBtn(p,t){return `<button class="${page===p?"active":""}" onclick="page='${p}';selectedGameId=null;render()">${t}</button>`}

/* 試合確認：ホーム相当。メニューなし。直近試合一覧→詳細1画面 */
function checkPage(){
  const games=[...db.games].filter(g=>isFutureOrToday(g.date)).sort((a,b)=>a.date.localeCompare(b.date));
  if(selectedGameId){
    const g=db.games.find(x=>x.id===selectedGameId);
    if(!g){selectedGameId=null;return checkPage();}
    $("main").innerHTML=gameDetail(g)+`<button class="secondary" onclick="selectedGameId=null;render()">一覧に戻る</button>`;
    return;
  }
  $("main").innerHTML=`
    <div class="card">
      <h2>直近の試合</h2>
      <div class="small">試合を押すと、LINEにスクショしやすい詳細画面を表示します。</div>
      ${games.map(g=>`
        <div class="listItem tap" onclick="selectedGameId='${g.id}';render()">
          <div class="gameTitle">${esc(g.name)}</div>
          <div class="small">${esc(g.date)} ${esc(g.time)} / ${esc(g.place)}</div>
          ${g.uniforms.map(u=>`<span class="badge">${esc(u)}</span>`).join("")}
        </div>`).join("")||"<div class='small'>未来日の試合はありません。</div>"}
    </div>`;
}
function gameDetail(g){
  const members=calledMembers(g.id);
  const yes=db.responses.filter(r=>r.gameId===g.id&&r.answer==="参加").map(r=>r.name);
  const hold=db.responses.filter(r=>r.gameId===g.id&&r.answer==="保留").map(r=>r.name);
  const no=db.responses.filter(r=>r.gameId===g.id&&r.answer==="不参加").map(r=>r.name);
  return `
    <div class="card screenShot">
      <h2>${esc(g.name)}</h2>
      <div class="kv">
        <div>日付</div><div>${esc(g.date)}</div>
        <div>時間</div><div>${esc(g.time)}</div>
        <div>場所</div><div>${esc(g.place)}</div>
        <div>ユニ</div><div>${g.uniforms.map(u=>`<span class="badge">${esc(u)}</span>`).join("")}</div>
      </div>
      <h3>招集メンバ</h3>
      <div>${members.map(m=>`<span class="badge">${esc(m.nickname)}</span>`).join("")||"<span class='small'>未設定</span>"}</div>
      <h3>参加状況</h3>
      <div><span class="badge ok">参加 ${yes.length}</span><span class="badge warn">保留 ${hold.length}</span><span class="badge bad">不参加 ${no.length}</span></div>
      <h3>持ち物</h3><div class="lineText">${esc(g.items)}</div>
      <h3>注意事項</h3><div class="lineText">${esc(g.notes)}</div>
    </div>`;
}

/* ユーザー向け：名前を選ぶと、やるべきことが出る */
function answerPage(){
  $("main").innerHTML=`
    <div class="card">
      <h2>自分の名前を選択</h2>
      <select id="myMember" onchange="setCurrentMember()">
        <option value="">選択してください</option>
        ${db.members.map(m=>`<option value="${m.id}" ${currentMemberId===m.id?"selected":""}>${esc(m.nickname)}（${grade(m.entranceYear)}年）</option>`).join("")}
      </select>
    </div>
    <div id="myTasks"></div>`;
  renderMyTasks();
}
function setCurrentMember(){
  currentMemberId=$("myMember").value;
  localStorage.setItem("soccer.currentMemberId",currentMemberId);
  renderMyTasks();
}
function renderMyTasks(){
  const box=$("myTasks"); if(!box)return;
  if(!currentMemberId){box.innerHTML=`<div class="card small">名前を選ぶと、未回答・保留・参加予定が表示されます。</div>`;return;}
  const m=db.members.find(x=>x.id===currentMemberId);
  const calledGameIds=db.calls.filter(c=>c.memberIds.includes(currentMemberId)).map(c=>c.gameId);
  const games=db.games.filter(g=>calledGameIds.includes(g.id)&&isFutureOrToday(g.date)).sort((a,b)=>a.date.localeCompare(b.date));
  const pending=games.filter(g=>!resFor(g.id,currentMemberId)||resFor(g.id,currentMemberId).answer==="保留");
  const yes=games.filter(g=>resFor(g.id,currentMemberId)?.answer==="参加");
  box.innerHTML=`
    <div class="card">
      <h2>${esc(m.nickname)}さんが今やること</h2>
      ${pending.length?pending.map(g=>taskCard(g,m)).join(""):`<div class="notice">未回答・保留の招集はありません。</div>`}
    </div>
    <div class="card">
      <h2>参加表明した試合予定</h2>
      ${yes.map(g=>miniGameWithAnswer(g,m)).join("")||"<div class='small'>参加予定はありません。</div>"}
    </div>`;
}
function taskCard(g,m){
  const r=resFor(g.id,m.id);
  return `<div class="listItem">
    <b>${esc(g.name)}</b><div class="small">${esc(g.date)} ${esc(g.time)} / ${esc(g.place)}</div>
    <div class="small">現在：${r?esc(r.answer):"未回答"}</div>
    <div class="bigAnswer">
      <button class="yes" onclick="answer('${g.id}','${m.id}','参加')">参加</button>
      <button class="hold" onclick="answer('${g.id}','${m.id}','保留')">保留</button>
      <button class="no" onclick="answer('${g.id}','${m.id}','不参加')">不参加</button>
    </div>
  </div>`;
}
function miniGameWithAnswer(g,m){
  return `<div class="listItem">
    <b>${esc(g.name)}</b><div class="small">${esc(g.date)} ${esc(g.time)} / ${esc(g.place)}</div>
    <button class="secondary" onclick="selectedGameId='${g.id}';page='check';render()">詳細を見る</button>
  </div>`;
}
function answer(gameId,memberId,ans){
  const m=db.members.find(x=>x.id===memberId);
  db.responses=db.responses.filter(r=>!(r.gameId===gameId&&r.memberId===memberId));
  db.responses.push({gameId,memberId,name:m.nickname,answer:ans,at:new Date().toISOString()});
  save();renderMyTasks();
}

/* 管理者向け：メンバ・試合・招集・テンプレ */
function adminPage(){
  $("main").innerHTML=`
    <div class="tabs">
      ${adminBtn("games","試合")}${adminBtn("call","招集")}${adminBtn("members","メンバ")}${adminBtn("master","テンプレ")}
    </div>
    <div id="adminBody"></div>`;
  if(adminTab==="games") adminGames();
  if(adminTab==="call") adminCall();
  if(adminTab==="members") adminMembers();
  if(adminTab==="master") adminMaster();
}
function adminBtn(t,label){return `<button class="${adminTab===t?"active":""}" onclick="adminTab='${t}';adminPage()">${label}</button>`}

function adminMembers(){
  $("adminBody").innerHTML=`
    <div class="card"><h2>メンバ追加</h2>
      <label>ニックネーム</label><input id="mn" placeholder="例：太郎">
      <label>入学年</label><input id="ey" type="number" value="${schoolYear()}">
      <button onclick="addMember()">追加</button>
    </div>
    <div class="card"><h2>メンバ一覧</h2>${db.members.map(m=>`
      <div class="listItem row">
        <div><b>${esc(m.nickname)}</b><div class="small">入学年 ${m.entranceYear} / ${grade(m.entranceYear)}年生</div></div>
        <button class="danger fit" onclick="delMember('${m.id}')">削除</button>
      </div>`).join("")||"<div class='small'>未登録</div>"}</div>`;
}
function addMember(){
  const n=$("mn").value.trim(), y=Number($("ey").value);
  if(!n||!y)return alert("ニックネームと入学年を入れてください。");
  db.members.push({id:uid("m"),nickname:n,entranceYear:y});save();adminMembers();
}
function delMember(id){
  if(!confirm("削除しますか？"))return;
  db.members=db.members.filter(m=>m.id!==id);
  db.calls.forEach(c=>c.memberIds=c.memberIds.filter(x=>x!==id));
  db.responses=db.responses.filter(r=>r.memberId!==id);
  save();adminMembers();
}

function adminGames(){
  $("adminBody").innerHTML=`
    <div class="card"><h2>試合追加</h2>
      <label>日時</label><input id="gd" type="date">
      <label>場所</label><input id="gp" placeholder="例：第一小学校">
      <label>試合名</label><input id="gn" placeholder="例：練習試合">
      <label>時間</label><input id="gt" placeholder="12:00-17:00">
      <label>ユニフォーム</label><div class="checks">
        ${db.masters.uniforms.map(u=>`<label class="check"><input type="checkbox" name="uni" value="${esc(u)}">${esc(u)}</label>`).join("")}
      </div>
      <label>持ち物テンプレ</label><select id="itemTpl" onchange="applyItemTpl()">
        ${db.masters.itemTemplates.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("")}
      </select>
      <textarea id="gi">${esc(db.masters.itemTemplates[0]?.text||"")}</textarea>
      <label>注意事項テンプレ</label><select id="noteTpl" onchange="applyNoteTpl()">
        ${db.masters.noteTemplates.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("")}
      </select>
      <textarea id="gno">${esc(db.masters.noteTemplates[0]?.text||"")}</textarea>
      <button onclick="addGame()">追加</button>
    </div>
    <div class="card"><h2>試合一覧・回答状況</h2>${db.games.map(g=>adminGameRow(g)).join("")||"<div class='small'>未登録</div>"}</div>`;
}
function applyItemTpl(){const t=db.masters.itemTemplates.find(x=>x.id===$("itemTpl").value);$("gi").value=t?t.text:"";}
function applyNoteTpl(){const t=db.masters.noteTemplates.find(x=>x.id===$("noteTpl").value);$("gno").value=t?t.text:"";}
function adminGameRow(g){
  const cm=calledMembers(g.id);
  const answered=new Set(db.responses.filter(r=>r.gameId===g.id&&r.answer!=="保留").map(r=>r.memberId));
  const hold=new Set(db.responses.filter(r=>r.gameId===g.id&&r.answer==="保留").map(r=>r.memberId));
  const noAns=cm.filter(m=>!answered.has(m.id)&&!hold.has(m.id));
  const yes=db.responses.filter(r=>r.gameId===g.id&&r.answer==="参加").length;
  const no=db.responses.filter(r=>r.gameId===g.id&&r.answer==="不参加").length;
  return `<div class="listItem">
    <b>${esc(g.name)}</b><div class="small">${esc(g.date)} ${esc(g.time)} / ${esc(g.place)}</div>
    <div><span class="badge ok">参加 ${yes}</span><span class="badge warn">保留 ${hold.size}</span><span class="badge bad">不参加 ${no}</span><span class="badge">未回答 ${noAns.length}</span></div>
    <div class="small">未回答：${noAns.map(m=>esc(m.nickname)).join("、")||"なし"}</div>
    <div class="row"><button class="secondary" onclick="selectedGameId='${g.id}';page='check';render()">詳細</button><button class="danger" onclick="delGame('${g.id}')">削除</button></div>
  </div>`;
}
function addGame(){
  const uniforms=[...document.querySelectorAll("input[name=uni]:checked")].map(x=>x.value);
  const g={id:uid("g"),date:$("gd").value,place:$("gp").value.trim(),name:$("gn").value.trim(),time:$("gt").value.trim(),uniforms,items:$("gi").value.trim(),notes:$("gno").value.trim()};
  if(!g.date||!g.place||!g.name||!g.time)return alert("日時、場所、試合名、時間は必須です。");
  db.games.push(g);save();adminGames();
}
function delGame(id){
  if(!confirm("試合を削除しますか？関連する招集・回答も消えます。"))return;
  db.games=db.games.filter(g=>g.id!==id);
  db.calls=db.calls.filter(c=>c.gameId!==id);
  db.responses=db.responses.filter(v=>v.gameId!==id);
  save();adminGames();
}

function adminCall(){
  const options=db.games.map(g=>`<option value="${g.id}">${esc(gameLabel(g))}</option>`).join("");
  $("adminBody").innerHTML=`
    <div class="card"><h2>試合招集</h2>
      <label>試合</label><select id="cg" onchange="renderCallMembers()">${options}</select>
      <label>学年で絞る</label><select id="gradeFilter" onchange="renderCallMembers()">
        <option value="">全員</option>${[1,2,3,4,5,6].map(g=>`<option value="${g}">${g}年生</option>`).join("")}
      </select>
      <div id="callMembers"></div>
      <button onclick="saveCall()">招集を保存</button>
    </div>
    <div class="card"><h2>招集・未回答一覧</h2>${db.games.map(g=>callStatusRow(g)).join("")}</div>`;
  renderCallMembers();
}
function renderCallMembers(){
  const gid=$("cg")?.value;if(!gid)return;
  const gf=$("gradeFilter").value;
  const c=callFor(gid);
  const selected=new Set(c.memberIds);
  const ms=db.members.filter(m=>!gf||grade(m.entranceYear)===Number(gf));
  $("callMembers").innerHTML=`<h3>メンバ選択</h3>${ms.map(m=>`
    <label class="check"><input type="checkbox" name="callMember" value="${m.id}" ${selected.has(m.id)?"checked":""}>${esc(m.nickname)} <span class="small">${grade(m.entranceYear)}年</span></label>`).join("")||"<div class='small'>対象者なし</div>"}`;
}
function saveCall(){
  const gid=$("cg").value;
  const ids=[...document.querySelectorAll("input[name=callMember]:checked")].map(x=>x.value);
  db.calls=db.calls.filter(c=>c.gameId!==gid);
  db.calls.push({gameId:gid,memberIds:ids});save();adminCall();
}
function callStatusRow(g){
  const cm=calledMembers(g.id);
  const un=cm.filter(m=>!resFor(g.id,m.id));
  const hold=cm.filter(m=>resFor(g.id,m.id)?.answer==="保留");
  return `<div class="listItem">
    <b>${esc(g.name)}</b><div class="small">招集 ${cm.length}名 / 未回答 ${un.length}名 / 保留 ${hold.length}名</div>
    <div class="small">未回答：${un.map(m=>esc(m.nickname)).join("、")||"なし"}</div>
    <div class="small">保留：${hold.map(m=>esc(m.nickname)).join("、")||"なし"}</div>
  </div>`;
}

function adminMaster(){
  $("adminBody").innerHTML=`
    <div class="card"><h2>ユニフォーム</h2>
      <label>候補（カンマ区切り）</label><input id="mu" value="${esc(db.masters.uniforms.join(","))}">
      <button onclick="saveUniforms()">保存</button>
    </div>
    <div class="card"><h2>持ち物テンプレ追加</h2>
      <label>テンプレ名</label><input id="itn" placeholder="例：遠征セット">
      <label>内容</label><textarea id="itt"></textarea>
      <button onclick="addTpl('item')">追加</button>
      ${db.masters.itemTemplates.map(t=>tplRow("item",t)).join("")}
    </div>
    <div class="card"><h2>注意事項テンプレ追加</h2>
      <label>テンプレ名</label><input id="ntn" placeholder="例：車移動注意">
      <label>内容</label><textarea id="ntt"></textarea>
      <button onclick="addTpl('note')">追加</button>
      ${db.masters.noteTemplates.map(t=>tplRow("note",t)).join("")}
    </div>
    <div class="card"><h2>データ操作</h2>
      <button class="secondary" onclick="exportData()">データをJSON表示</button><br><br>
      <button class="danger" onclick="resetData()">サンプルに戻す</button><br><br>
      <button class="secondary" onclick="localStorage.removeItem('soccer.loggedIn');session=false;render()">ログアウト</button>
    </div>`;
}
function saveUniforms(){db.masters.uniforms=$("mu").value.split(",").map(x=>x.trim()).filter(Boolean);save();adminMaster();}
function tplRow(kind,t){
  return `<div class="listItem"><b>${esc(t.name)}</b><div class="lineText">${esc(t.text)}</div>
    <button class="danger" onclick="delTpl('${kind}','${t.id}')">削除</button></div>`;
}
function addTpl(kind){
  const name=$(kind==="item"?"itn":"ntn").value.trim();
  const text=$(kind==="item"?"itt":"ntt").value.trim();
  if(!name||!text)return alert("テンプレ名と内容を入れてください。");
  const arr=kind==="item"?db.masters.itemTemplates:db.masters.noteTemplates;
  arr.push({id:uid(kind==="item"?"it":"nt"),name,text});save();adminMaster();
}
function delTpl(kind,id){
  const arr=kind==="item"?db.masters.itemTemplates:db.masters.noteTemplates;
  if(arr.length<=1)return alert("テンプレは最低1つ必要です。");
  if(!confirm("削除しますか？"))return;
  if(kind==="item")db.masters.itemTemplates=db.masters.itemTemplates.filter(t=>t.id!==id);
  else db.masters.noteTemplates=db.masters.noteTemplates.filter(t=>t.id!==id);
  save();adminMaster();
}

function exportData(){
  const w=window.open("","_blank");
  w.document.write("<pre>"+esc(JSON.stringify(db,null,2))+"</pre>");
}
function resetData(){
  if(!confirm("保存済みデータをサンプルに戻しますか？"))return;
  db=structuredClone(sampleData);save();render();
}
render();
