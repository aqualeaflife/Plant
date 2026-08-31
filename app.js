const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const today=()=>new Date().toISOString().slice(0,10);
const fmt=d=>d?new Date(d+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"No date";
const esc=(v="")=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const id=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
let state={plants:[],props:[],updates:[],propUpdates:[]}, activePropFilter="all";

const DB_NAME="plantgroove03",STORE="state";
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function save(){const db=await openDB();const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(state,"app");return new Promise(r=>tx.oncomplete=r)}
async function load(){const db=await openDB();const tx=db.transaction(STORE,"readonly");const req=tx.objectStore(STORE).get("app");return new Promise(r=>{req.onsuccess=()=>{if(req.result){state=req.result;if(!state.propUpdates)state.propUpdates=[];}r()};req.onerror=()=>r()})}
async function imageData(file){if(!file)return"";const img=await createImageBitmap(file);const max=1400,scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);return c.toDataURL("image/jpeg",.8)}
function downloadJSON(filename,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}


function switchView(view){
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===view));
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  if(view==="detailView") $$(".nav-item").forEach(b=>b.classList.remove("active"));
  scrollTo({top:0,behavior:"smooth"});
}
$$(".nav-item").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$$("[data-go]").forEach(b=>b.onclick=()=>switchView(b.dataset.go));

function plantCard(p){
  const latest=state.updates.filter(u=>u.plantId===p.id).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
  return `<article class="plant-card" data-plant="${p.id}">
    <div class="photo">${p.photo?`<img src="${p.photo}">`:"🌿"}<span class="photo-badge">☀</span></div>
    <div class="body"><h4>${esc(p.name)}</h4><div class="scientific">${esc(p.species||"Houseplant")}</div>
    <div class="card-meta"><span>▣ ${fmt(latest?.date||p.date)}</span><span>✦ ${esc(latest?.note||p.status||"Growing")}</span></div></div>
  </article>`;
}
function progressHTML(n){return `<div class="progress">${[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join("")}</div>`}
function propCard(p,preview=false){
  const parent=state.plants.find(x=>x.id===p.parentId), n=Number(p.progress||stageProgress(p.stage));
  if(preview)return `<article class="prop-preview" data-prop="${p.id}">
    <div class="thumb">${p.photo?`<img src="${p.photo}">`:"🌱"}</div>
    <div class="body"><h4>${esc(p.name)}</h4><div class="scientific">${esc(p.method)} • ${esc(p.stage)}</div>
    ${progressHTML(n)}<div class="progress-row"><span>Rooting progress</span><b>${n} of 5</b></div></div></article>`;
  return `<article class="prop-card" data-prop="${p.id}">
    <div class="thumb">${p.photo?`<img src="${p.photo}">`:"🌱"}</div>
    <div><h4>${esc(p.name)}</h4><div class="prop-info">
      <span>Parent<br><b>${esc(parent?.name||"Not tracked")}</b></span>
      <span>Stage<br><span class="stage">${esc(p.stage)}</span></span>
      <span>Method<br><b>${esc(p.method)}</b></span>
      <span>Started<br><b>${fmt(p.date)}</b></span>
    </div>${progressHTML(n)}<div class="progress-row"><span>Rooting progress</span><b>${n} of 5</b></div></div>
  </article>`;
}
function stageProgress(s){return {"New cutting":1,"Callusing":2,"Rooting":4,"Establishing":3,"Ready to pot":5,"Potted":5,"Complete":5}[s]||2}

function render(){
  $("#statPlants").textContent=state.plants.length;
  $("#statProps").textContent=state.props.filter(p=>p.stage!=="Complete").length;
  $("#statRooted").textContent=state.props.filter(p=>Number(p.progress||stageProgress(p.stage))>=4).length;
  $("#recentPlants").innerHTML=state.plants.length?state.plants.slice().sort((a,b)=>b.created-a.created).slice(0,4).map(plantCard).join(""):`<div class="empty-box">Add your first plant to start your collection.</div>`;
  $("#recentProps").innerHTML=state.props.length?propCard(state.props.slice().sort((a,b)=>b.created-a.created)[0],true):`<div class="empty-box">Start a propagation and track its roots here.</div>`;
  renderPlants();renderProps();renderTimeline();fillParents();bindCards();
}
function renderPlants(){
  const q=$("#plantSearch").value.trim().toLowerCase();
  const arr=state.plants.filter(p=>[p.name,p.species,p.room,p.status].join(" ").toLowerCase().includes(q)).sort((a,b)=>b.created-a.created);
  $("#plantList").innerHTML=arr.length?arr.map(plantCard).join(""):`<div class="empty-box" style="grid-column:1/-1">No plants found.</div>`;
}
function renderProps(){
  const arr=state.props.filter(p=>activePropFilter==="all"||p.method===activePropFilter||p.stage===activePropFilter).sort((a,b)=>b.created-a.created);
  $("#propList").innerHTML=arr.length?arr.map(p=>propCard(p)).join(""):`<div class="empty-box">No propagations in this filter.</div>`;
}
function renderTimeline(){
  const arr=state.updates.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  $("#timelineList").innerHTML=arr.length?arr.map(u=>{
    const p=state.plants.find(x=>x.id===u.plantId); if(!p)return"";
    return `<article class="timeline-item"><div class="timeline-card">
      <div class="photo">${u.photo?`<img src="${u.photo}">`:p.photo?`<img src="${p.photo}">`:"🌿"}</div>
      <div><div class="timeline-date">${fmt(u.date)}</div><h4>${esc(p.name)}</h4><p>✦ ${esc(u.note||"Growth update")}</p></div>
    </div></article>`;
  }).join(""):`<div class="empty-box">Add photo updates to your plants and they’ll appear here.</div>`;
}
function fillParents(){
  const s=$("#propParent"),val=s.value;
  s.innerHTML='<option value="">Not tracked</option>'+state.plants.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  s.value=val;
}
function bindCards(){
  $$("[data-plant]").forEach(el=>el.onclick=()=>showPlant(el.dataset.plant));
  $$("[data-prop]").forEach(el=>el.onclick=()=>showProp(el.dataset.prop));
}
$("#plantSearch").oninput=()=>{renderPlants();bindCards()};
$$("[data-filter]").forEach(b=>b.onclick=()=>{$$("[data-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");activePropFilter=b.dataset.filter;renderProps();bindCards()});

$("#addPlantBtn").onclick=()=>openPlantForm();
function openPlantForm(p){
  $("#plantForm").reset();$("#plantId").value=p?.id||"";$("#plantFormTitle").textContent=p?"Edit plant":"Add plant";
  $("#plantName").value=p?.name||"";$("#plantSpecies").value=p?.species||"";$("#plantRoom").value=p?.room||"";
  $("#plantDate").value=p?.date||today();$("#plantLight").value=p?.light||"Bright indirect";$("#plantStatus").value=p?.status||"Thriving";$("#plantNotes").value=p?.notes||"";
  $("#plantDialog").showModal();
}
$("#plantForm").onsubmit=async e=>{
  e.preventDefault();
  const ex=state.plants.find(x=>x.id===$("#plantId").value);
  const photo=await imageData($("#plantPhoto").files[0])||ex?.photo||"";
  const p={id:ex?.id||id(),name:$("#plantName").value.trim(),species:$("#plantSpecies").value.trim(),room:$("#plantRoom").value.trim(),date:$("#plantDate").value,light:$("#plantLight").value,status:$("#plantStatus").value,notes:$("#plantNotes").value.trim(),photo,created:ex?.created||Date.now(),lastWatered:ex?.lastWatered||""};
  if(ex)Object.assign(ex,p);else{state.plants.push(p);state.updates.push({id:id(),plantId:p.id,date:p.date||today(),note:"Added to collection",photo})}
  await save();$("#plantDialog").close();render();
};

$("#addPropBtn").onclick=()=>openPropForm();
function editPropById(pid){const p=state.props.find(x=>x.id===pid);if(p)openPropForm(p)}
function openPropForm(p){
  $("#propForm").reset();fillParents();$("#propId").value=p?.id||"";$("#propFormTitle").textContent=p?"Update propagation":"Start propagation";
  $("#propName").value=p?.name||"";$("#propParent").value=p?.parentId||"";$("#propMethod").value=p?.method||"Water";$("#propDate").value=p?.date||today();$("#propStage").value=p?.stage||"New cutting";$("#propProgress").value=String(p?.progress||1);$("#propNotes").value=p?.notes||"";
  $("#propDialog").showModal();
}
$("#propForm").onsubmit=async e=>{
  e.preventDefault();const ex=state.props.find(x=>x.id===$("#propId").value);const photo=await imageData($("#propPhoto").files[0])||ex?.photo||"";
  const p={id:ex?.id||id(),name:$("#propName").value.trim(),parentId:$("#propParent").value,method:$("#propMethod").value,date:$("#propDate").value,stage:$("#propStage").value,progress:Number($("#propProgress").value),notes:$("#propNotes").value.trim(),photo,created:ex?.created||Date.now()};
  if(ex)Object.assign(ex,p);else state.props.push(p);
  if($("#propPhoto").files[0] || !ex){state.propUpdates.push({id:id(),propId:p.id,date:today(),stage:p.stage,progress:p.progress,note:p.notes||"",photo:photo||""});}
  await save();$("#propDialog").close();render();
};


function showProp(pid){
  const p=state.props.find(x=>x.id===pid);if(!p)return;
  const parent=state.plants.find(x=>x.id===p.parentId);
  const hist=state.propUpdates.filter(u=>u.propId===pid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  $("#detailView").innerHTML=`<div class="detail-top">
    <button class="circle-btn" id="detailBack">←</button><div class="logo" style="font-size:27px">PlantGroove <span class="logo-flower">✿</span></div><button class="circle-btn orange" id="editPropBtn">•••</button>
  </div>
  <div class="detail-photo">${p.photo?`<img src="${p.photo}">`:"🌱"}</div>
  <div class="detail-wave"><h2>${esc(p.name)}</h2><div class="scientific" style="font-size:14px">${esc(parent?.name||"Propagation")} • ${esc(p.method)}</div>
  <div class="detail-meta">
    <div class="meta-box"><div class="meta-icon">🌱</div><b>Stage</b><br>${esc(p.stage)}</div>
    <div class="meta-box"><div class="meta-icon">▦</div><b>Started</b><br>${fmt(p.date)}</div>
    <div class="meta-box"><div class="meta-icon">⌁</div><b>Progress</b><br>${Number(p.progress||stageProgress(p.stage))} of 5</div>
  </div>
  <div class="callout"><h3>Rooting progress</h3>${progressHTML(Number(p.progress||stageProgress(p.stage)))}<div class="progress-row"><span>${esc(p.notes||"Keep adding photos as roots develop.")}</span><b>${Number(p.progress||stageProgress(p.stage))} / 5</b></div></div>
  <div class="action-row"><button class="action" id="editPropMain">✎ Update</button><button class="action" id="addPropPhoto">📷 Add photo</button><button class="action" id="viewParent">🌿 Parent</button></div>
  <div class="prop-history"><h3>Propagation photo history</h3><div class="prop-history-list">
  ${hist.length?hist.map(u=>`<div class="prop-history-item"><div class="date">${fmt(u.date)} • ${esc(u.stage||"Update")} • ${u.progress||1}/5</div>${u.note?`<div>${esc(u.note)}</div>`:""}${u.photo?`<img src="${u.photo}">`:""}</div>`).join(""):`<div class="empty-box">No propagation photo history yet.</div>`}
  </div></div></div>`;
  switchView("detailView");
  $("#detailBack").onclick=()=>switchView("propsView");
  $("#editPropBtn").onclick=$("#editPropMain").onclick=()=>openPropForm(p);
  $("#addPropPhoto").onclick=()=>openPropForm(p);
  $("#viewParent").onclick=()=>parent?showPlant(parent.id):alert("No parent plant is linked.");
}

function showPlant(pid){
  const p=state.plants.find(x=>x.id===pid);if(!p)return;
  const ups=state.updates.filter(u=>u.plantId===pid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const first=ups.slice().sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
  const latest=ups[0];
  $("#detailView").innerHTML=`<div class="detail-top">
    <button class="circle-btn" id="detailBack">←</button><div class="logo" style="font-size:27px">PlantGroove <span class="logo-flower">✿</span></div><button class="circle-btn orange" id="editPlant">•••</button>
  </div>
  <div class="detail-photo">${p.photo?`<img src="${p.photo}">`:"🌿"}</div>
  <div class="detail-wave">
    <h2>${esc(p.name)}</h2><div class="scientific" style="font-size:14px">${esc(p.species||"Houseplant")}</div>
    <div class="detail-meta">
      <div class="meta-box"><div class="meta-icon">⌂</div><b>Room</b><br>${esc(p.room||"—")}</div>
      <div class="meta-box"><div class="meta-icon">💧</div><b>Acquired</b><br>${fmt(p.date)}</div>
      <div class="meta-box"><div class="meta-icon">☀</div><b>Light</b><br>${esc(p.light||"—")}</div>
    </div>
    <div class="callout"><h3>${esc(latest?.note||p.status||"Growing well")}</h3><div class="muted">${esc(p.notes||"Keep adding updates to build a growth story.")}</div></div>
    <div class="section-head"><h3>Growth timeline</h3><button class="text-btn" id="goGrowth">See all ›</button></div>
    ${ups.length?`<div class="before-after">
      <div class="shot">${first?.photo?`<img src="${first.photo}">`:"🌱"}<span>${fmt(first?.date)}</span></div>
      <div class="shot">${latest?.photo?`<img src="${latest.photo}">`:p.photo?`<img src="${p.photo}">`:"🌿"}<span>${fmt(latest?.date)}</span></div>
    </div>`:`<div class="empty-box">No growth photos yet.</div>`}
    ${ups.filter(u=>u.photo).length>=2?`<div class="compare-panel">
      <div class="compare-head"><h3>Before / after</h3><span class="scientific">Drag to compare</span></div>
      <div class="compare-selects">
        <select id="compareA">${ups.filter(u=>u.photo).map((u,i,a)=>`<option value="${u.id}" ${i===a.length-1?"selected":""}>${fmt(u.date)}</option>`).join("")}</select>
        <select id="compareB">${ups.filter(u=>u.photo).map((u,i)=>`<option value="${u.id}" ${i===0?"selected":""}>${fmt(u.date)}</option>`).join("")}</select>
      </div>
      <div class="compare-stage" id="compareStage"></div>
      <input class="compare-range" id="compareRange" type="range" min="0" max="100" value="50">
    </div>`:""}
    <div class="action-row"><button class="action" id="addUpdate">✎ Add update</button><button class="action" id="editPlant2">☰ Care notes</button><button class="action" id="startProp">🌱 Propagation</button></div>
  </div>`;
  switchView("detailView");
  $("#detailBack").onclick=()=>switchView("plantsView");
  $("#editPlant").onclick=$("#editPlant2").onclick=()=>openPlantForm(p);
  $("#goGrowth").onclick=()=>switchView("growthView");
  $("#addUpdate").onclick=()=>openUpdate(p.id);
  $("#startProp").onclick=()=>{openPropForm();$("#propParent").value=p.id;$("#propName").value=p.name+" cutting"};
  if($("#compareStage")){
    const photoUpdates=ups.filter(u=>u.photo);
    const setCompare=v=>{const pct=v+"%";$("#afterWrap").style.width=pct;$("#compareDivider").style.left=pct;$("#compareHandle").style.left=pct;};
    const drawCompare=()=>{const a=photoUpdates.find(u=>u.id===$("#compareA").value),b=photoUpdates.find(u=>u.id===$("#compareB").value);if(!a||!b)return;$("#compareStage").innerHTML=`<img src="${a.photo}"><div class="after-wrap" id="afterWrap"><img src="${b.photo}"></div><div class="compare-divider" id="compareDivider"></div><div class="compare-handle" id="compareHandle">↔</div>`;setCompare($("#compareRange").value);};
    $("#compareA").onchange=drawCompare;$("#compareB").onchange=drawCompare;$("#compareRange").oninput=e=>setCompare(e.target.value);drawCompare();
  }
}
function openUpdate(pid){$("#updateForm").reset();$("#updatePlantId").value=pid;$("#updateDate").value=today();$("#updateDialog").showModal()}
$("#updateForm").onsubmit=async e=>{
  e.preventDefault();const pid=$("#updatePlantId").value,photo=await imageData($("#updatePhoto").files[0]),note=$("#updateNote").value.trim(),date=$("#updateDate").value||today();
  state.updates.push({id:id(),plantId:pid,date,note,photo});const p=state.plants.find(x=>x.id===pid);if(p&&photo)p.photo=photo;
  await save();$("#updateDialog").close();render();showPlant(pid);
};


$("#exportBackup").onclick=()=>{const stamp=new Date().toISOString().slice(0,10);downloadJSON(`PlantGroove-backup-${stamp}.json`,{version:"0.4",exportedAt:new Date().toISOString(),state})};
$("#importBackup").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text()),incoming=data.state||data;if(!incoming.plants||!incoming.props||!incoming.updates)throw new Error("invalid");state={plants:incoming.plants||[],props:incoming.props||[],updates:incoming.updates||[],propUpdates:incoming.propUpdates||[]};await save();render();alert("PlantGroove backup restored.")}catch(err){alert("That file doesn’t look like a valid PlantGroove backup.")}e.target.value=""};
$("#seedDemo").onclick=async()=>{
  if(state.plants.length){switchView("homeView");return}
  const plants=[
    ["Golden Pothos","Epipremnum aureum","Kitchen","Bright indirect","Thriving"],
    ["Pink Princess","Philodendron erubescens","Living room","Bright indirect","Happy"],
    ["Monstera Deliciosa","Monstera deliciosa","Living room","Bright indirect","Thriving"],
    ["ZZ Plant","Zamioculcas zamiifolia","Office","Medium indirect","Hardy"],
    ["Hoya Krimson Queen","Hoya carnosa 'Krimson Queen'","Bedroom","Bright indirect","Happy"],
    ["String of Pearls","Curio rowleyanus","Sunroom","Direct sun","Thriving"]
  ].map((x,i)=>({id:id(),name:x[0],species:x[1],room:x[2],light:x[3],status:x[4],date:today(),notes:"",photo:"",created:Date.now()-i*1000,lastWatered:""}));
  state.plants.push(...plants);
  state.props.push(
    {id:id(),name:"Brazil Philodendron",parentId:"",method:"Water",date:today(),stage:"Rooting",progress:4,notes:"",photo:"",created:Date.now()},
    {id:id(),name:"Pothos node cutting",parentId:plants[0].id,method:"Water",date:today(),stage:"Rooting",progress:5,notes:"",photo:"",created:Date.now()-1},
    {id:id(),name:"Monstera top cutting",parentId:plants[2].id,method:"Water",date:today(),stage:"Establishing",progress:3,notes:"",photo:"",created:Date.now()-2}
  );
  state.updates.push(
    {id:id(),plantId:plants[2].id,date:today(),note:"New leaf unfurling",photo:""},
    {id:id(),plantId:plants[1].id,date:today(),note:"Repotted today",photo:""},
    {id:id(),plantId:plants[0].id,date:today(),note:"Two new leaves this month",photo:""}
  );
  await save();render();
};
load().then(render);

if ("serviceWorker" in navigator) { window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js")); }
