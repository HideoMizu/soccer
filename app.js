const KEY="soccerTeamManager.v4";
const OLDKEYS=["soccerTeamManager.v3","soccerTeamManager.v2","soccerTeamManager.v1"];

const I18N={
 ja:{title:"小学校サッカーチーム管理",login:"ログイン",team:"チーム名",password:"パスワード",enter:"入る",
 check:"試合確認",answer:"試合招集回答",admin:"管理者向け",gameReg:"試合登録",call:"試合招集",members:"メンバ管理",templates:"テンプレ管理",
 selectName:"名前を選択",all:"全員",noGames:"未来日の試合はありません。",date:"日付",time:"時間",place:"場所",min:"最低人数",called:"招集",people:"名",
 status:"参加状況",items:"持ち物",notes:"注意事項",yes:"参加",hold:"保留",no:"不参加",unanswered:"未回答",insufficient:"不足",surplus:"余裕",exact:"ちょうど",
 add:"追加",delete:"削除",save:"保存",gameName:"試合名",uniform:"ユニフォーム",locationTpl:"試合場所",noticeMsg:"お知らせメッセージ作成",
 gradeAdd:"学年を追加",memberSelect:"メンバ選択",sampleReset:"サンプルに戻す",logout:"ログアウト",dataJson:"データをJSON表示",clearAll:"一括でチェックを外す"},
 en:{title:"Elementary Soccer Team Manager",login:"Login",team:"Team",password:"Password",enter:"Enter",
 check:"Games",answer:"Call-up Reply",admin:"Admin",gameReg:"Game Entry",call:"Call-up",members:"Members",templates:"Templates",
 selectName:"Select name",all:"All",noGames:"No upcoming games.",date:"Date",time:"Time",place:"Place",min:"Min players",called:"Called",people:"",
 status:"Status",items:"Items",notes:"Notes",yes:"Join",hold:"Hold",no:"Absent",unanswered:"No reply",insufficient:"Short",surplus:"Extra",exact:"Exact",
 add:"Add",delete:"Delete",save:"Save",gameName:"Game name",uniform:"Uniform",locationTpl:"Location",noticeMsg:"Create reminder",
 gradeAdd:"Add grade",memberSelect:"Select members",sampleReset:"Reset sample",logout:"Logout",dataJson:"Show JSON data",clearAll:"Clear all"}
};

const sampleData={
 team:{name:"BBS",password:"ABC"},
 masters:{
  uniforms:["赤","青"],
  locations:[{id:"loc1",name:"第一小学校グラウンド"},{id:"loc2",name:"中央公園"},{id:"loc3",name:"河川敷サッカー場"}],
  itemTemplates:[{id:"it1",name:"基本セット",text:"ボール、すね当て、靴下"},{id:"it2",name:"夏セット",text:"ボール、すね当て、靴下、水筒、タオル、帽子"}],
  noteTemplates:[{id:"nt1",name:"ユニフォーム注意",text:"1. 移動時はユニフォーム（上）が見えないように何か着るか、現地で着替えてください。"},{id:"nt2",name:"集合注意",text:"集合時間の10分前までに到着してください。欠席・遅刻は早めに連絡してください。"}]
 },
 members:[{id:"m1",nickname:"太郎",entranceYear:2024},{id:"m2",nickname:"次郎",entranceYear:2024},{id:"m3",nickname:"三郎",entranceYear:2025}],
 games:[
  {id:"g1",date:"2026-06-06",place:"第一小学校グラウンド",name:"練習試合 vs A小",startTime:"12:00",endTime:"17:00",deadline:"2026-06-05",minPlayers:8,uniforms:["赤"],items:"ボール、すね当て、靴下",notes:"1. 移動時はユニフォーム（上）が見えないように何か着るか、現地で着替えてください。"},
  {id:"g2",date:"2026-06-14",place:"中央公園",name:"交流戦",startTime:"09:00",endTime:"12:00",deadline:"2026-06-13",minPlayers:8,uniforms:["赤","青"],items:"ボール、すね当て、靴下、水筒",notes:"集合は8:40です。"}
 ],
 calls:[{gameId:"g1",memberIds:["m1","m2"]},{gameId:"g2",memberIds:["m1","m2","m3"]}],
 responses:[{gameId:"g1",memberId:"m1",name:"太郎",answer:"参加",at:"2026-05-19T00:00:00.000Z"},{gameId:"g1",memberId:"m2",name:"次郎",answer:"不参加",at:"2026-05-19T00:00:00.000Z"},{gameId:"g2",memberId:"m1",name:"太郎",answer:"保留",at:"2026-05-19T00:00:00.000Z"}]
};

let lang=localStorage.getItem("soccer.lang")||"ja";
let db=load();
let session=localStorage.getItem("soccer.loggedIn")==="1";
let page="check";
let adminTab="";
let currentMemberId=localStorage.getItem("soccer.currentMemberId")||"";
let callSelection=new Set();
let flashMsg="";

function t(k){return (I18N[lang]&&I18N[lang][k])||I18N.ja[k]||k}
function toggleLang(){lang=lang==="ja"?"en":"ja";localStorage.setItem("soccer.lang",lang);render();}
function normalize(d){
 d.masters=d.masters||{};
 if(!d.masters.uniforms)d.masters.uniforms=["赤","青"];
 if(!d.masters.locations)d.masters.locations=[...new Set((d.games||[]).map(g=>g.place).filter(Boolean))].map((name,i)=>({id:"loc"+(i+1),name}));
 if(!d.masters.locations.length)d.masters.locations=structuredClone(sampleData.masters.locations);
 if(!d.masters.itemTemplates)d.masters.itemTemplates=[{id:"it1",name:"基本セット",text:d.masters.itemTemplate||"ボール、すね当て、靴下"}];
 if(!d.masters.noteTemplates)d.masters.noteTemplates=[{id:"nt1",name:"基本注意",text:d.masters.noteTemplate||sampleData.masters.noteTemplates[0].text}];
 d.responses=d.responses||d.votes||[];
 d.games=(d.games||[]).map(g=>{if(!g.startTime&&g.time){const a=String(g.time).split("-");g.startTime=a[0]||"";g.endTime=a[1]||""} if(!g.minPlayers)g.minPlayers=8; if(!g.deadline)g.deadline=g.date; return g;});
 d.responses=d.responses.map(r=>{const m=(d.members||[]).find(x=>x.nickname===r.name)||(d.members||[]).find(x=>x.id===r.memberId);return {...r,memberId:r.memberId||(m?m.id:""),answer:r.answer||"保留"}});
 delete d.votes; return d;
}
function load(){let raw=localStorage.getItem(KEY); if(!raw){for(const k of OLDKEYS){raw=localStorage.getItem(k);if(raw)break;}} if(!raw){localStorage.setItem(KEY,JSON.stringify(sampleData));return structuredClone(sampleData)} try{const d=normalize(JSON.parse(raw));localStorage.setItem(KEY,JSON.stringify(d));return d}catch(e){return structuredClone(sampleData)}}
function save(){localStorage.setItem(KEY,JSON.stringify(db));}
function uid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function today(){return new Date().toISOString().slice(0,10)}
function isFutureOrToday(d){return !d || d>=today()}
function canEditResponse(g){return !g.deadline || today()<=g.deadline}
function daysTo(d){const a=new Date(today()+"T00:00:00"), b=new Date(d+"T00:00:00");return Math.round((b-a)/86400000)}
function dayText(d){const n=daysTo(d); if(n===0)return lang==="ja"?"今日":"Today"; if(n===1)return lang==="ja"?"明日":"Tomorrow"; return lang==="ja"?`${n}日後`:`in ${n} days`}
function schoolYear(){const d=new Date();return d.getMonth()+1>=4?d.getFullYear():d.getFullYear()-1;}
function grade(entranceYear){return Math.max(1,schoolYear()-Number(entranceYear)+1);}
function timeText(g){return `${g.startTime||""}-${g.endTime||""}`.replace(/^-|-$/g,"")}
function gameLabel(g){return `${g.date} ${g.name}`}
function $(id){return document.getElementById(id);}
function callFor(gid){return db.calls.find(c=>c.gameId===gid)||{gameId:gid,memberIds:[]};}
function resFor(gid,mid){return db.responses.find(r=>r.gameId===gid&&r.memberId===mid);}
function calledMembers(gid){return callFor(gid).memberIds.map(id=>db.members.find(m=>m.id===id)).filter(Boolean);}
function yesMembers(gid){return db.responses.filter(r=>r.gameId===gid&&r.answer==="参加").map(r=>db.members.find(m=>m.id===r.memberId)).filter(Boolean)}
function yesCount(gid){return yesMembers(gid).length}
function balanceText(g){const diff=yesCount(g.id)-Number(g.minPlayers); if(diff<0)return `${t("insufficient")} ${Math.abs(diff)}${t("people")}`; if(diff>0)return `${t("surplus")} +${diff}${t("people")}`; return t("exact")}
function render(){session?renderApp():renderLogin();}

function langToggle(){return `<button type="button" class="langBtn" onclick="toggleLang()">${lang==="ja"?"EN":"日"}</button>`}
function renderLogin(){
 document.querySelector("#app").innerHTML=`
 <div class="header"><div class="headerTop"><div><h1>Soccer Team Manager</h1><div class="small">${t("title")}</div></div>${langToggle()}</div></div>
 <div class="card"><h2>${t("login")}</h2>
 <div class="notice">${lang==="ja"?"試作版です。データはこのiPhone/ブラウザ内に保存されます。":"Prototype: data is saved in this iPhone/browser."}</div>
 <label>${t("team")}</label><input id="team" value="BBS">
 <label>${t("password")}</label><input id="pw" type="password" value="ABC">
 <p id="msg" class="danger small"></p><button class="red" onclick="login()">${t("enter")}</button></div>`;
}
function login(){if($("team").value.trim()===db.team.name&&$("pw").value.trim()===db.team.password){localStorage.setItem("soccer.loggedIn","1");session=true;render()}else $("msg").textContent=lang==="ja"?"チーム名またはパスワードが違います。":"Wrong team or password."}
function renderApp(){
 document.querySelector("#app").innerHTML=`
 <div class="header"><div class="headerTop"><div><h1>${t(page)}</h1><div class="small">${t("team")}：${esc(db.team.name)} / ${db.members.length}${t("people")} / ${db.games.length} games</div></div>${langToggle()}</div></div>
 <main id="main"></main>
 <div class="nav">${navBtn("check",t("check"))}${navBtn("answer",t("answer"))}${navBtn("admin",t("admin"))}</div>`;
 if(page==="check")checkPage(); if(page==="answer")answerPage(); if(page==="admin")adminPage();
}
function navBtn(p,label){return `<button class="${page===p?"active":""}" onclick="page='${p}';render()">${label}</button>`}

/* 試合確認：詳細は出席者を表示 */
function checkPage(){
 const games=getVisibleGames();
 $("main").innerHTML=`
 <div class="card"><label>${t("selectName")}</label>
 <select id="filterMember" onchange="currentMemberId=this.value;localStorage.setItem('soccer.currentMemberId',currentMemberId);checkPage()">
 <option value="">${t("all")}</option>${db.members.map(m=>`<option value="${m.id}" ${currentMemberId===m.id?"selected":""}>${esc(m.nickname)}（${grade(m.entranceYear)}年）</option>`).join("")}</select></div>
 <div class="card"><h2>${t("check")}</h2>
 ${games.map(g=>gameAccordion(g)).join("")||`<div class="small">${t("noGames")}</div>`}</div>`;
}
function getVisibleGames(){
 const future=db.games.filter(g=>isFutureOrToday(g.date)).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
 if(!currentMemberId)return future;
 const calledIds=db.calls.filter(c=>c.memberIds.includes(currentMemberId)).map(c=>c.gameId);
 return future.filter(g=>calledIds.includes(g.id));
}
function gameAccordion(g){
 const yc=yesCount(g.id), cls=yc<Number(g.minPlayers)?"deficit":"enough";
 return `<details class="gameDetail ${cls}">
 <summary><div class="dayHead">${esc(dayText(g.date))}</div><div class="gameTitle">${esc(g.name)}</div>
 <div class="small">${esc(g.date)} ${esc(timeText(g))} / ${esc(g.place)}</div>
 <div><span class="badge ok">${t("yes")} ${yc}${t("people")}</span><span class="badge ${yc<g.minPlayers?"bad":"ok"}">${balanceText(g)}</span></div></summary>
 <div class="slideBox">${gameDetail(g)}</div></details>`;
}
function gameDetail(g){
 const attend=yesMembers(g.id);
 const hold=db.responses.filter(r=>r.gameId===g.id&&r.answer==="保留").map(r=>r.name);
 const no=db.responses.filter(r=>r.gameId===g.id&&r.answer==="不参加").map(r=>r.name);
 const called=calledMembers(g.id);
 const answeredIds=new Set(db.responses.filter(r=>r.gameId===g.id).map(r=>r.memberId));
 const un=called.filter(m=>!answeredIds.has(m.id)).map(m=>m.nickname);
 return `<div class="card screenShot"><h2>${esc(g.name)}</h2>
 <div class="kv"><div>${t("date")}</div><div>${esc(g.date)}</div><div>${t("time")}</div><div>${esc(timeText(g))}</div><div>${t("place")}</div><div>${esc(g.place)}</div><div>${t("min")}</div><div>${g.minPlayers}${t("people")} / ${balanceText(g)}</div></div>
 <h3>${t("yes")}</h3><div>${attend.map(m=>`<span class="badge ok">${esc(m.nickname)}</span>`).join("")||"<span class='small'>-</span>"}</div>
 <h3>${t("status")}</h3><div><span class="badge ok">${t("yes")} ${attend.length}</span><span class="badge warn">${t("hold")} ${hold.length}</span><span class="badge bad">${t("no")} ${no.length}</span><span class="badge">${t("unanswered")} ${un.length}</span></div>
 <h3>${t("items")}</h3><div class="lineText">${esc(g.items)}</div>
 <h3>${t("notes")}</h3><div class="lineText">${esc(g.notes)}</div></div>`;
}

/* 招集回答：締切前は修正可 */
function answerPage(){
 $("main").innerHTML=`<div class="card"><h2>${t("selectName")}</h2><select id="myMember" onchange="setCurrentMember()">
 <option value="">${lang==="ja"?"選択してください":"Please select"}</option>
 ${db.members.map(m=>`<option value="${m.id}" ${currentMemberId===m.id?"selected":""}>${esc(m.nickname)}（${grade(m.entranceYear)}年）</option>`).join("")}</select></div><div id="myTasks"></div>`;
 renderMyTasks();
}
function setCurrentMember(){currentMemberId=$("myMember").value;localStorage.setItem("soccer.currentMemberId",currentMemberId);renderMyTasks();}
function renderMyTasks(){
 const box=$("myTasks"); if(!box)return;
 if(!currentMemberId){box.innerHTML=`<div class="card small">${lang==="ja"?"名前を選ぶと、招集回答を確認・修正できます。":"Select your name to view and edit call-up replies."}</div>`;return;}
 const m=db.members.find(x=>x.id===currentMemberId);
 const calledGameIds=db.calls.filter(c=>c.memberIds.includes(currentMemberId)).map(c=>c.gameId);
 const games=db.games.filter(g=>calledGameIds.includes(g.id)&&isFutureOrToday(g.date)).sort((a,b)=>a.date.localeCompare(b.date));
 box.innerHTML=`<div class="card"><h2>${esc(m.nickname)}${lang==="ja"?"さんの招集回答":"'s replies"}</h2>${games.map(g=>taskCard(g,m)).join("")||`<div class="small">${t("noGames")}</div>`}</div>`;
}
function taskCard(g,m){
 const r=resFor(g.id,m.id), editable=canEditResponse(g);
 return `<div class="listItem"><b>${esc(g.name)}</b><div class="small">${esc(g.date)} ${esc(timeText(g))} / ${esc(g.place)}</div>
 <div class="small">${lang==="ja"?"現在":"Current"}：${r?esc(labelAnswer(r.answer)):t("unanswered")} / ${lang==="ja"?"締切":"Deadline"}：${esc(g.deadline||g.date)}</div>
 ${editable?`<div class="bigAnswer"><button class="yes" onclick="answer('${g.id}','${m.id}','参加')">${t("yes")}</button><button class="hold" onclick="answer('${g.id}','${m.id}','保留')">${t("hold")}</button><button class="no" onclick="answer('${g.id}','${m.id}','不参加')">${t("no")}</button></div>`:`<div class="notice">${lang==="ja"?"締切後のため修正できません。":"Deadline passed. Cannot edit."}</div>`}
 </div>`;
}
function labelAnswer(a){return a==="参加"?t("yes"):a==="不参加"?t("no"):t("hold")}
function answer(gameId,memberId,ans){const m=db.members.find(x=>x.id===memberId);db.responses=db.responses.filter(r=>!(r.gameId===gameId&&r.memberId===memberId));db.responses.push({gameId,memberId,name:m.nickname,answer:ans,at:new Date().toISOString()});save();renderMyTasks();}

/* 管理者向け */
function adminPage(){
 if(!adminTab){adminHome();return}
 $("main").innerHTML=`<div class="tabs">${adminBtn("games",t("gameReg"))}${adminBtn("call",t("call"))}${adminBtn("members",t("members"))}${adminBtn("master",t("templates"))}</div><button class="secondary mini" onclick="adminTab='';adminPage()">← ${t("admin")}</button><div id="adminBody"></div>`;
 if(adminTab==="games")adminGames(); if(adminTab==="call")adminCall(); if(adminTab==="members")adminMembers(); if(adminTab==="master")adminMaster();
}
function adminHome(){
 $("main").innerHTML=`<div class="card"><h2>${t("admin")}</h2>
 <div class="small">${lang==="ja"?"管理者向けメニューです。試合登録、招集、メンバ、テンプレを管理します。":"Admin menu. Manage games, call-ups, members, and templates."}</div>
 <div class="adminMenu" style="margin-top:10px">
 <button onclick="adminTab='games';adminPage()">${t("gameReg")}</button>
 <button onclick="adminTab='call';adminPage()">${t("call")}</button>
 <button onclick="adminTab='members';adminPage()">${t("members")}</button>
 <button onclick="adminTab='master';adminPage()">${t("templates")}</button>
 </div></div>`;
}
function adminBtn(tab,label){return `<button class="${adminTab===tab?"active":""}" onclick="adminTab='${tab}';adminPage()">${label}</button>`}

function adminGames(){
 $("adminBody").innerHTML=`
 <div class="card"><h2>${t("gameReg")}</h2>
 <label>${t("date")}</label><input id="gd" type="date">
 <label>${t("locationTpl")}</label><select id="locSel" onchange="applyLoc()"><option value="">${lang==="ja"?"選択または直接入力":"Select or type"}</option>${db.masters.locations.map(l=>`<option value="${esc(l.name)}">${esc(l.name)}</option>`).join("")}</select><input id="gp" placeholder="${t("place")}">
 <label>${t("gameName")}</label><input id="gn" placeholder="${lang==="ja"?"例：練習試合":"e.g. Friendly match"}">
 <label>${t("time")}</label><div class="timeRow"><input id="gst" type="time" value="12:00"><span class="small">〜</span><input id="get" type="time" value="17:00"></div>
 <label>${lang==="ja"?"回答締切":"Reply deadline"}</label><input id="gdl" type="date">
 <label>${t("min")}</label><input id="gmin" type="number" value="8">
 <label>${t("uniform")}</label><div class="memberGrid">${db.masters.uniforms.map(u=>`<label class="memberChip"><input type="checkbox" name="uni" value="${esc(u)}">${esc(u)}</label>`).join("")}</div>
 <label>${t("items")}</label><select id="itemTpl" onchange="applyItemTpl()">${db.masters.itemTemplates.map(tpl=>`<option value="${tpl.id}">${esc(tpl.name)}</option>`).join("")}</select><textarea id="gi">${esc(db.masters.itemTemplates[0]?.text||"")}</textarea>
 <label>${t("notes")}</label><select id="noteTpl" onchange="applyNoteTpl()">${db.masters.noteTemplates.map(tpl=>`<option value="${tpl.id}">${esc(tpl.name)}</option>`).join("")}</select><textarea id="gno">${esc(db.masters.noteTemplates[0]?.text||"")}</textarea>
 <button onclick="addGame()">${t("add")}</button></div>
 <div class="card"><h2>${t("check")}・${t("status")}</h2>${db.games.sort((a,b)=>a.date.localeCompare(b.date)).map(g=>adminGameRow(g)).join("")||"<div class='small'>未登録</div>"}</div>`;
}
function applyLoc(){if($("locSel").value)$("gp").value=$("locSel").value}
function applyItemTpl(){const tpl=db.masters.itemTemplates.find(x=>x.id===$("itemTpl").value);$("gi").value=tpl?tpl.text:""}
function applyNoteTpl(){const tpl=db.masters.noteTemplates.find(x=>x.id===$("noteTpl").value);$("gno").value=tpl?tpl.text:""}
function adminGameRow(g){
 const cm=calledMembers(g.id), yes=yesMembers(g.id);
 const insufficient=yes.length<Number(g.minPlayers);
 return `<div class="listItem ${insufficient?"deficit":"enough"}"><div class="dayHead">${esc(dayText(g.date))}</div><b>${esc(g.name)}</b>
 <div class="small">${esc(g.date)} ${esc(timeText(g))} / ${esc(g.place)}</div>
 <div><span class="badge ok">${t("yes")} ${yes.length}${t("people")}</span><span class="badge ${insufficient?"bad":"ok"}">${balanceText(g)}</span></div>
 ${statusPanels(g)}
 <div class="row"><button class="secondary" onclick="page='check';currentMemberId='';localStorage.setItem('soccer.currentMemberId','');render()">${t("check")}</button><button class="danger" onclick="delGame('${g.id}')">${t("delete")}</button></div></div>`;
}
function addGame(){
 const uniforms=[...document.querySelectorAll("input[name=uni]:checked")].map(x=>x.value), place=$("gp").value.trim();
 const g={id:uid("g"),date:$("gd").value,place,name:$("gn").value.trim(),startTime:$("gst").value,endTime:$("get").value,deadline:$("gdl").value||$("gd").value,minPlayers:Number($("gmin").value)||8,uniforms,items:$("gi").value.trim(),notes:$("gno").value.trim()};
 if(!g.date||!g.place||!g.name||!g.startTime||!g.endTime)return alert(lang==="ja"?"日付、場所、試合名、時間は必須です。":"Date, place, game name, and time are required.");
 if(!db.masters.locations.some(l=>l.name===place))db.masters.locations.push({id:uid("loc"),name:place});
 db.games.push(g);save();adminGames();
}
function delGame(id){if(!confirm(lang==="ja"?"試合を削除しますか？関連する招集・回答も消えます。":"Delete this game?"))return;db.games=db.games.filter(g=>g.id!==id);db.calls=db.calls.filter(c=>c.gameId!==id);db.responses=db.responses.filter(v=>v.gameId!==id);save();adminGames();}

function adminCall(){
 const options=db.games.map(g=>`<option value="${g.id}">${esc(gameLabel(g))}</option>`).join("");
 $("adminBody").innerHTML=`<div class="card"><h2>${t("call")}</h2>${flashMsg?`<div class="successMsg">${esc(flashMsg)}</div>`:""}
 <label>${t("gameName")}</label><select id="cg" onchange="initCallSelection();renderCallMembers()">${options}</select>
 <label>${t("gradeAdd")}</label><div class="grid3">${[1,2,3,4,5,6].map(g=>`<button class="secondary" onclick="addGrade(${g})">${g}${lang==="ja"?"年":"G"}</button>`).join("")}</div>
 <div class="row" style="margin-top:8px"><button class="secondary" onclick="selectAllMembers()">${lang==="ja"?"全員チェック":"All"}</button><button class="danger" onclick="clearAllMembers()">${t("clearAll")}</button></div>
 <div id="callMembers"></div><button onclick="saveCall()">${t("save")}</button></div>
 <div class="card"><h2>${t("call")}・${t("status")}</h2>${db.games.map(g=>callStatusRow(g)).join("")}</div>`;
 flashMsg="";
 initCallSelection();renderCallMembers();
}
function initCallSelection(){const gid=$("cg")?.value;if(!gid)return;callSelection=new Set(callFor(gid).memberIds);}
function addGrade(g){db.members.filter(m=>grade(m.entranceYear)===g).forEach(m=>callSelection.add(m.id));renderCallMembers();}
function selectAllMembers(){db.members.forEach(m=>callSelection.add(m.id));renderCallMembers();}
function clearAllMembers(){callSelection.clear();renderCallMembers();}
function toggleCallMember(id,checked){checked?callSelection.add(id):callSelection.delete(id);}
function renderCallMembers(){
 const box=$("callMembers"); if(!box)return;
 box.innerHTML=`<h3>${t("memberSelect")}（${callSelection.size}${t("people")}）</h3><div class="memberGrid">${db.members.map(m=>`<label class="memberChip"><input type="checkbox" value="${m.id}" ${callSelection.has(m.id)?"checked":""} onchange="toggleCallMember('${m.id}',this.checked)">${esc(m.nickname)}<span class="small">${grade(m.entranceYear)}</span></label>`).join("")}</div>`;
}
function saveCall(){
 const gid=$("cg").value;db.calls=db.calls.filter(c=>c.gameId!==gid);db.calls.push({gameId:gid,memberIds:[...callSelection]});save();
 flashMsg=lang==="ja"?"招集を保存しました。":"Call-up saved.";adminCall();
}
function callStatusRow(g){
 const yes=yesCount(g.id), diff=yes-Number(g.minPlayers);
 return `<div class="listItem ${diff<0?"deficit":"enough"}"><b>${esc(g.name)}</b><div class="small">${esc(g.date)} ${esc(timeText(g))} / ${balanceText(g)}</div>${statusPanels(g)}</div>`;
}
function statusPanels(g){
 const cm=calledMembers(g.id);
 return `<div class="statusGrid">${cm.map(m=>{
  const r=resFor(g.id,m.id); const ans=r?r.answer:"未回答";
  const cls=ans==="参加"?"yes":ans==="不参加"?"no":ans==="保留"?"hold":"un";
  const label=ans==="参加"?t("yes"):ans==="不参加"?t("no"):ans==="保留"?t("hold"):t("unanswered");
  const btn=ans==="未回答"?`<button class="secondary mini" onclick="noticeMsg('${g.id}','${m.id}')">${t("noticeMsg")}</button>`:"";
  return `<div><div class="namePanel ${cls}"><span>${esc(m.nickname)}</span><span class="small">${label}</span></div>${btn}</div>`;
 }).join("")||"<div class='small'>-</div>"}</div>`;
}
function noticeMsg(gid,mid){
 const g=db.games.find(x=>x.id===gid), m=db.members.find(x=>x.id===mid);
 const msg=lang==="ja"?`${m.nickname}さん、${g.date} ${timeText(g)}「${g.name}」（${g.place}）の招集回答が未回答です。参加・保留・不参加の回答をお願いします。`:`${m.nickname}, please reply to the call-up for "${g.name}" on ${g.date} ${timeText(g)} at ${g.place}.`;
 navigator.clipboard?.writeText(msg); alert((lang==="ja"?"LINEに貼れる文面をコピーしました：\n\n":"Message copied:\n\n")+msg);
}

function adminMembers(){
 $("adminBody").innerHTML=`<div class="card"><h2>${t("members")}</h2><label>${lang==="ja"?"ニックネーム":"Nickname"}</label><input id="mn" placeholder="例：太郎"><label>${lang==="ja"?"入学年":"Entrance year"}</label><input id="ey" type="number" value="${schoolYear()}"><button onclick="addMember()">${t("add")}</button></div>
 <div class="card"><h2>${lang==="ja"?"メンバ一覧":"Member list"}</h2>${db.members.map(m=>`<div class="listItem row"><div><b>${esc(m.nickname)}</b><div class="small">${m.entranceYear} / ${grade(m.entranceYear)}年</div></div><button class="danger fit" onclick="delMember('${m.id}')">${t("delete")}</button></div>`).join("")||"<div class='small'>-</div>"}</div>`;
}
function addMember(){const n=$("mn").value.trim(), y=Number($("ey").value); if(!n||!y)return alert(lang==="ja"?"ニックネームと入学年を入れてください。":"Enter nickname and entrance year.");db.members.push({id:uid("m"),nickname:n,entranceYear:y});save();adminMembers();}
function delMember(id){if(!confirm(lang==="ja"?"削除しますか？":"Delete?"))return;db.members=db.members.filter(m=>m.id!==id);db.calls.forEach(c=>c.memberIds=c.memberIds.filter(x=>x!==id));db.responses=db.responses.filter(r=>r.memberId!==id);save();adminMembers();}

function adminMaster(){
 $("adminBody").innerHTML=`<div class="card"><h2>${t("uniform")}</h2><label>${lang==="ja"?"候補（カンマ区切り）":"Options separated by comma"}</label><input id="mu" value="${esc(db.masters.uniforms.join(","))}"><button onclick="saveUniforms()">${t("save")}</button></div>
 <div class="card"><h2>${t("locationTpl")}</h2><label>${lang==="ja"?"場所名":"Location name"}</label><input id="ln" placeholder="例：第一小学校"><button onclick="addLoc()">${t("add")}</button>${db.masters.locations.map(l=>`<div class="listItem row"><div>${esc(l.name)}</div><button class="danger fit" onclick="delLoc('${l.id}')">${t("delete")}</button></div>`).join("")}</div>
 <div class="card"><h2>${t("items")}</h2><label>${lang==="ja"?"テンプレ名":"Template name"}</label><input id="itn"><label>${lang==="ja"?"内容":"Text"}</label><textarea id="itt"></textarea><button onclick="addTpl('item')">${t("add")}</button>${db.masters.itemTemplates.map(tpl=>tplRow("item",tpl)).join("")}</div>
 <div class="card"><h2>${t("notes")}</h2><label>${lang==="ja"?"テンプレ名":"Template name"}</label><input id="ntn"><label>${lang==="ja"?"内容":"Text"}</label><textarea id="ntt"></textarea><button onclick="addTpl('note')">${t("add")}</button>${db.masters.noteTemplates.map(tpl=>tplRow("note",tpl)).join("")}</div>
 <div class="card"><h2>${lang==="ja"?"データ操作":"Data"}</h2><button class="secondary" onclick="exportData()">${t("dataJson")}</button><br><br><button class="danger" onclick="resetData()">${t("sampleReset")}</button><br><br><button class="secondary" onclick="localStorage.removeItem('soccer.loggedIn');session=false;render()">${t("logout")}</button></div>`;
}
function saveUniforms(){db.masters.uniforms=$("mu").value.split(",").map(x=>x.trim()).filter(Boolean);save();adminMaster();}
function addLoc(){const name=$("ln").value.trim(); if(!name)return; db.masters.locations.push({id:uid("loc"),name});save();adminMaster();}
function delLoc(id){if(db.masters.locations.length<=1)return alert("最低1つ必要です。");db.masters.locations=db.masters.locations.filter(x=>x.id!==id);save();adminMaster();}
function tplRow(kind,tpl){return `<div class="listItem"><b>${esc(tpl.name)}</b><div class="lineText">${esc(tpl.text)}</div><button class="danger" onclick="delTpl('${kind}','${tpl.id}')">${t("delete")}</button></div>`;}
function addTpl(kind){const name=$(kind==="item"?"itn":"ntn").value.trim(), text=$(kind==="item"?"itt":"ntt").value.trim(); if(!name||!text)return alert(lang==="ja"?"テンプレ名と内容を入れてください。":"Enter template name and text."); const arr=kind==="item"?db.masters.itemTemplates:db.masters.noteTemplates; arr.push({id:uid(kind==="item"?"it":"nt"),name,text});save();adminMaster();}
function delTpl(kind,id){const arr=kind==="item"?db.masters.itemTemplates:db.masters.noteTemplates;if(arr.length<=1)return alert(lang==="ja"?"テンプレは最低1つ必要です。":"At least one template is required.");if(!confirm(lang==="ja"?"削除しますか？":"Delete?"))return;if(kind==="item")db.masters.itemTemplates=db.masters.itemTemplates.filter(tpl=>tpl.id!==id);else db.masters.noteTemplates=db.masters.noteTemplates.filter(tpl=>tpl.id!==id);save();adminMaster();}
function exportData(){const w=window.open("","_blank");w.document.write("<pre>"+esc(JSON.stringify(db,null,2))+"</pre>");}
function resetData(){if(!confirm(lang==="ja"?"保存済みデータをサンプルに戻しますか？":"Reset saved data to sample?"))return;db=structuredClone(sampleData);save();render();}
render();
