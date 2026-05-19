const KEY="soccerTeamManager.v1";

const sampleData={
  team:{name:"BBS",password:"ABC"},
  masters:{
    uniforms:["赤","青"],
    itemTemplate:"ボール、すね当て、靴下",
    noteTemplate:"1. 移動時はユニフォーム（上）が見えないように何か着るか、現地で着替えてください。"
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
  votes:[
    {gameId:"g1",name:"太郎",answer:"参加",at:"2026-05-19T00:00:00.000Z"},
    {gameId:"g1",name:"次郎",answer:"不参加",at:"2026-05-19T00:00:00.000Z"}
  ]
};

let db=load();
let session=localStorage.getItem("soccer.loggedIn")==="1";
let page="home";

function load(){
  const raw=localStorage.getItem(KEY);
  if(!raw){localStorage.setItem(KEY,JSON.stringify(sampleData));return structuredClone(sampleData);}
  try{return JSON.parse(raw)}catch(e){return structuredClone(sampleData)}
}
function save(){localStorage.setItem(KEY,JSON.stringify(db));}
function uid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function schoolYear(){const d=new Date();return d.getMonth()+1>=4?d.getFullYear():d.getFullYear()-1;}
function grade(entranceYear){return Math.max(1,schoolYear()-Number(entranceYear)+1);}
function gameLabel(g){return `${g.date} ${g.name}`;}
function $(id){return document.getElementById(id);}
function render(){session?renderApp():renderLogin();}

function renderLogin(){
  document.querySelector("#app").innerHTML=`
    <div class="header"><h1>Soccer Team Manager</h1><div class="small">小学校サッカーチーム管理</div></div>
    <div class="card">
      <h2>ログイン</h2>
      <div class="notice">試作版です。データはこのiPhone/ブラウザ内のlocalStorageに保存されます。チーム全員共有には後でサーバー側保存が必要です。</div>
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
  const titles={home:"ホーム",members:"メンバ",games:"試合",call:"招集",vote:"アンケート",master:"マスタ"};
  document.querySelector("#app").innerHTML=`
    <div class="header"><h1>${titles[page]||"ホーム"}</h1><div class="small">チーム：${esc(db.team.name)} / ${db.members.length}名 / ${db.games.length}試合</div></div>
    <main id="main"></main>
    <div class="nav">
      ${navBtn("home","ホーム")}${navBtn("members","メンバ")}${navBtn("games","試合")}${navBtn("call","招集")}${navBtn("vote","投票")}
    </div>`;
  if(page==="home") home();
  if(page==="members") members();
  if(page==="games") games();
  if(page==="call") call();
  if(page==="vote") vote();
  if(page==="master") master();
}
function navBtn(p,t){return `<button class="${page===p?"active":""}" onclick="page='${p}';render()">${t}</button>`}
function home(){
  $("main").innerHTML=`
    <div class="card"><h2>メニュー</h2>
      <button onclick="page='members';render()">メンバ管理</button><br><br>
      <button onclick="page='games';render()">試合管理</button><br><br>
      <button onclick="page='call';render()">試合招集</button><br><br>
      <button onclick="page='vote';render()">参加アンケート</button><br><br>
      <button class="secondary" onclick="page='master';render()">マスタ設定</button>
    </div>
    <div class="card"><h2>直近の試合</h2>${db.games.map(gameCard).join("")||"<div class='small'>未登録</div>"}</div>
    <div class="card"><h2>データ操作</h2>
      <button class="secondary" onclick="exportData()">データをJSON表示</button><br><br>
      <button class="danger" onclick="resetData()">サンプルに戻す</button><br><br>
      <button class="secondary" onclick="localStorage.removeItem('soccer.loggedIn');session=false;render()">ログアウト</button>
    </div>`;
}
function gameCard(g){
  const callObj=db.calls.find(c=>c.gameId===g.id);
  const called=callObj?callObj.memberIds.length:0;
  const votes=db.votes.filter(v=>v.gameId===g.id);
  return `<div class="listItem"><b>${esc(g.name)}</b><div class="kv">
    <div>日時</div><div>${esc(g.date)} ${esc(g.time)}</div>
    <div>場所</div><div>${esc(g.place)}</div>
    <div>ユニ</div><div>${g.uniforms.map(u=>`<span class="badge">${esc(u)}</span>`).join("")}</div>
    <div>招集</div><div>${called}名</div>
    <div>投票</div><div>${votes.length}件</div>
  </div></div>`;
}

function members(){
  $("main").innerHTML=`
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
  db.members.push({id:uid("m"),nickname:n,entranceYear:y});save();render();
}
function delMember(id){
  if(!confirm("削除しますか？"))return;
  db.members=db.members.filter(m=>m.id!==id);
  db.calls.forEach(c=>c.memberIds=c.memberIds.filter(x=>x!==id));
  save();render();
}

function games(){
  $("main").innerHTML=`
    <div class="card"><h2>試合追加</h2>
      <label>日時</label><input id="gd" type="date">
      <label>場所</label><input id="gp" placeholder="例：第一小学校">
      <label>試合名</label><input id="gn" placeholder="例：練習試合">
      <label>時間</label><input id="gt" placeholder="12:00-17:00">
      <label>ユニフォーム</label><div class="checks">
        ${db.masters.uniforms.map(u=>`<label class="check"><input type="checkbox" name="uni" value="${esc(u)}">${esc(u)}</label>`).join("")}
      </div>
      <label>持ち物</label><textarea id="gi">${esc(db.masters.itemTemplate)}</textarea>
      <label>注意事項</label><textarea id="gno">${esc(db.masters.noteTemplate)}</textarea>
      <button onclick="addGame()">追加</button>
    </div>
    <div class="card"><h2>試合一覧</h2>${db.games.map(g=>`
      <div class="listItem">
        ${gameCard(g)}
        <button class="danger" onclick="delGame('${g.id}')">この試合を削除</button>
      </div>`).join("")||"<div class='small'>未登録</div>"}</div>`;
}
function addGame(){
  const uniforms=[...document.querySelectorAll("input[name=uni]:checked")].map(x=>x.value);
  const g={id:uid("g"),date:$("gd").value,place:$("gp").value.trim(),name:$("gn").value.trim(),time:$("gt").value.trim(),uniforms,items:$("gi").value.trim(),notes:$("gno").value.trim()};
  if(!g.date||!g.place||!g.name||!g.time)return alert("日時、場所、試合名、時間は必須です。");
  db.games.push(g);save();render();
}
function delGame(id){
  if(!confirm("試合を削除しますか？関連する招集・投票も消えます。"))return;
  db.games=db.games.filter(g=>g.id!==id);
  db.calls=db.calls.filter(c=>c.gameId!==id);
  db.votes=db.votes.filter(v=>v.gameId!==id);
  save();render();
}

function call(){
  const options=db.games.map(g=>`<option value="${g.id}">${esc(gameLabel(g))}</option>`).join("");
  $("main").innerHTML=`
    <div class="card"><h2>試合招集</h2>
      <label>試合</label><select id="cg" onchange="renderCallMembers()">${options}</select>
      <label>学年で絞る</label><select id="gradeFilter" onchange="renderCallMembers()">
        <option value="">全員</option>${[1,2,3,4,5,6].map(g=>`<option value="${g}">${g}年生</option>`).join("")}
      </select>
      <div id="callMembers"></div>
      <button onclick="saveCall()">招集を保存</button>
    </div>
    <div class="card"><h2>招集状況</h2>${db.games.map(g=>{
      const c=db.calls.find(x=>x.gameId===g.id);
      const names=(c?c.memberIds:[]).map(id=>db.members.find(m=>m.id===id)?.nickname).filter(Boolean);
      return `<div class="listItem"><b>${esc(g.name)}</b><div>${names.map(n=>`<span class="badge">${esc(n)}</span>`).join("")||"<span class='small'>未設定</span>"}</div></div>`;
    }).join("")}</div>`;
  renderCallMembers();
}
function renderCallMembers(){
  const gid=$("cg")?.value;if(!gid)return;
  const gf=$("gradeFilter").value;
  const c=db.calls.find(x=>x.gameId===gid);
  const selected=new Set(c?c.memberIds:[]);
  const ms=db.members.filter(m=>!gf||grade(m.entranceYear)===Number(gf));
  $("callMembers").innerHTML=`<h3>メンバ選択</h3>${ms.map(m=>`
    <label class="check"><input type="checkbox" name="callMember" value="${m.id}" ${selected.has(m.id)?"checked":""}>${esc(m.nickname)} <span class="small">${grade(m.entranceYear)}年</span></label>`).join("")||"<div class='small'>対象者なし</div>"}`;
}
function saveCall(){
  const gid=$("cg").value;
  const ids=[...document.querySelectorAll("input[name=callMember]:checked")].map(x=>x.value);
  db.calls=db.calls.filter(c=>c.gameId!==gid);
  db.calls.push({gameId:gid,memberIds:ids});save();render();
}

function vote(){
  const options=db.games.map(g=>`<option value="${g.id}">${esc(gameLabel(g))}</option>`).join("");
  $("main").innerHTML=`
    <div class="card"><h2>参加アンケート</h2>
      <label>試合</label><select id="vg" onchange="renderVoteResults()">${options}</select>
      <label>名前</label><select id="vn">${db.members.map(m=>`<option>${esc(m.nickname)}</option>`).join("")}</select>
      <label>回答</label><select id="va"><option>参加</option><option>不参加</option></select>
      <button onclick="addVote()">回答する</button>
    </div>
    <div class="card"><h2>結果</h2><div id="voteResults"></div></div>`;
  renderVoteResults();
}
function addVote(){
  const gameId=$("vg").value,name=$("vn").value,answer=$("va").value;
  db.votes=db.votes.filter(v=>!(v.gameId===gameId&&v.name===name));
  db.votes.push({gameId,name,answer,at:new Date().toISOString()});save();render();
}
function renderVoteResults(){
  const gid=$("vg")?.value;if(!gid)return;
  const vs=db.votes.filter(v=>v.gameId===gid);
  const yes=vs.filter(v=>v.answer==="参加").length,no=vs.filter(v=>v.answer==="不参加").length;
  $("voteResults").innerHTML=`
    <div><span class="badge">参加 ${yes}</span><span class="badge">不参加 ${no}</span></div>
    ${vs.map(v=>`<div class="listItem result"><div>${esc(v.name)}</div><b class="${v.answer==="参加"?"ok":"danger"}">${esc(v.answer)}</b></div>`).join("")||"<div class='small'>未回答</div>"}`;
}

function master(){
  $("main").innerHTML=`
    <div class="card"><h2>マスタ設定</h2>
      <label>ユニフォーム候補（カンマ区切り）</label><input id="mu" value="${esc(db.masters.uniforms.join(","))}">
      <label>持ち物テンプレ</label><textarea id="mi">${esc(db.masters.itemTemplate)}</textarea>
      <label>注意事項テンプレ</label><textarea id="mn">${esc(db.masters.noteTemplate)}</textarea>
      <button onclick="saveMaster()">保存</button>
    </div>`;
}
function saveMaster(){
  db.masters.uniforms=$("mu").value.split(",").map(x=>x.trim()).filter(Boolean);
  db.masters.itemTemplate=$("mi").value;
  db.masters.noteTemplate=$("mn").value;
  save();render();
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
