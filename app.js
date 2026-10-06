'use strict';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const clock=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date());
const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('el-GR',{day:'numeric',month:'long',year:'numeric'});
const defaults={school_name:'Το νηπιαγωγείο μας',year_start:'2026-09-01',year_end:'2027-06-30',opens:'07:45',closes:'08:30'};
let schoolId=null,isAdmin=false;
let db,user=null,children=[],records=[],settings={...defaults},view='attendance',day=today(),search='',group='',filter='',busy=false;
function icon(name){const paths={"calendar":"<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2M8 18h2\"/>","children":"<circle cx=\"9\" cy=\"7\" r=\"3\"/><path d=\"M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5\"/>","stats":"<path d=\"M4 3v18h17M8 16v-4M13 16V7M18 16V4\"/>","settings":"<path d=\"m9 3-.5 3-2 1-3-.5-1.5 3 2 2v2l-2 2 1.5 3 3-.5 2 1 .5 3h4l.5-3 2-1 3 .5 1.5-3-2-2v-2l2-2-1.5-3-3 .5-2-1L13 3Z\"/><circle cx=\"11\" cy=\"12\" r=\"3\"/>","check":"<path d=\"m5 12 4 4L19 6\"/>","x":"<path d=\"m6 6 12 12M6 18 18 6\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>","user":"<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21v-2a8 8 0 0 1 16 0v2\"/>","lock":"<rect x=\"5\" y=\"10\" width=\"14\" height=\"11\" rx=\"2\"/><path d=\"M8 10V6a4 4 0 0 1 8 0v4M12 14v3\"/>","plus":"<path d=\"M12 5v14M5 12h14\"/>","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2\"/>"};return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.children)+'</svg>'}let toastTimer;
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3500)}
function labels(c){return c.gender==='girl'?['Παρούσα','Απούσα']:['Παρών','Απών']}
function entry(c){return records.find(r=>r.child_id===c.id&&r.day===day)}
function avatar(c){return c.photo?`<img class="avatar" src="${esc(c.photo)}" alt="Φωτογραφία ${esc(c.name)}">`:`<span class="avatar" aria-hidden="true">${esc(c.name.split(' ').map(n=>n[0]).slice(0,2).join(''))}</span>`}
function login(mode='login',message=''){
 user=null;schoolId=null;isAdmin=false;children=[];records=[];view='attendance';
 const signup=mode==='signup';document.body.classList.add('login-page');$('#title').textContent='Καλώς ήρθατε';
 $('#content').innerHTML=`<section class="login-card"><div class="login-welcome"><span class="login-sun">☀️</span><div class="rainbow-title"><span>Το</span> <span>Νηπιαγωγείο</span> <span>μας</span></div><p>Παρουσιολόγιο Πρωινής Υποδοχής</p><div class="login-colors"><i></i><i></i><i></i><i></i><i></i></div></div><form id="loginform"><h2>${signup?'Δημιουργία λογαριασμού':'Καλημέρα! Καλώς ήρθατε.'}</h2><p class="login-caption">${signup?'Γράψτε το email και έναν δικό σας κωδικό. Ο διαχειριστής θα εγκρίνει την πρόσβασή σας.':'Μια όμορφη σχολική μέρα ξεκινά εδώ.'}</p>
 <label>Email<div class="input-icon">${icon('user')}<input name="email" type="email" placeholder="Το email σας" autocomplete="username" required></div></label>
 <label>Κωδικός πρόσβασης<div class="input-icon">${icon('lock')}<input name="password" type="password" ${signup?'minlength="8"':''} placeholder="${signup?'Τουλάχιστον 8 χαρακτήρες':'Ο κωδικός σας'}" autocomplete="${signup?'new-password':'current-password'}" required></div></label>
 ${signup?'<label>Επανάληψη κωδικού<input name="repeat_password" type="password" minlength="8" autocomplete="new-password" required></label>':''}
 <p id="loginerror" class="error" role="alert"></p><p id="loginmessage" class="hint" role="status">${esc(message)}</p><button class="primary">${signup?'Δημιουργία λογαριασμού':'Είσοδος'} ${icon('check')}</button>
 <button type="button" class="auth-switch" id="authswitch">${signup?'Έχω λογαριασμό · Είσοδος':'Νέος εκπαιδευτικός; Δημιουργία λογαριασμού'}</button><p class="login-footnote">${icon('lock')} Η πρόσβαση εγκρίνεται από τον διαχειριστή</p></form></section>`;
 $('#authswitch').onclick=()=>login(signup?'login':'signup');
 $('#loginform').onsubmit=async e=>{
  e.preventDefault();const f=e.target,b=f.querySelector('.primary');b.disabled=true;$('#loginerror').textContent='';$('#loginmessage').textContent='';
  try{
   if(!db)throw Error('Η υπηρεσία σύνδεσης δεν φορτώθηκε. Ανανεώστε τη σελίδα.');
   const email=f.email.value.trim(),password=f.password.value;
   if(signup){
    if(password!==f.repeat_password.value)throw Error('Οι δύο κωδικοί δεν είναι ίδιοι.');
    const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:'https://danal8.github.io/to-nipiagogeio-mas/'}});
    if(error)throw error;
    if(data.session)await db.auth.signOut();
    login('login',data.session?'Η εγγραφή ολοκληρώθηκε. Περιμένετε την έγκριση του διαχειριστή για να συνδεθείτε.':'Ελέγξτε το email σας για επιβεβαίωση λογαριασμού. Μετά την επιβεβαίωση και την έγκριση του διαχειριστή, συνδεθείτε εδώ.');
   }else{
    const {data,error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
    user=data.user;try{await load();render()}catch(err){user=null;schoolId=null;isAdmin=false;await db.auth.signOut();throw err}
   }
  }catch(err){const errors={'Invalid login credentials':'Το email ή ο κωδικός δεν είναι σωστός.','Email not confirmed':'Επιβεβαιώστε πρώτα το email σας από το μήνυμα εγγραφής.','User already registered':'Υπάρχει ήδη λογαριασμός με αυτό το email. Επιλέξτε Είσοδος.','Signups not allowed for this instance':'Η εγγραφή δεν είναι διαθέσιμη αυτή τη στιγμή.','email rate limit exceeded':'Η αποστολή email έφτασε το όριο. Δοκιμάστε αργότερα.'};$('#loginerror').textContent=errors[err.message]||err.message}
  finally{b.disabled=false}
 };
}
async function load(){const membership=await db.from('proini_members').select('school_owner_id,role').eq('user_id',user.id).maybeSingle();if(membership.error)throw membership.error;if(!membership.data)throw Error('Το email σας δεν έχει ακόμη εγκριθεί για αυτό το νηπιαγωγείο.');schoolId=membership.data.school_owner_id;isAdmin=membership.data.role==='admin';const responses=await Promise.all([db.from('proini_children').select('*').order('name'),db.from('proini_settings').select('*').maybeSingle()]);for(const r of responses)if(r.error)throw r.error;children=responses[0].data;settings={...defaults,...responses[1].data};records=[];for(let from=0;;from+=500){const {data,error}=await db.from('proini_attendance').select('*').gte('day',settings.year_start).lte('day',settings.year_end).order('day').order('child_id').range(from,from+499);if(error)throw error;records.push(...data);if(data.length<500)break}if(day<settings.year_start||day>settings.year_end)day=settings.year_start}
function render(){if(!user)return login();$('#title').textContent=({attendance:'Παρουσιολόγιο',children:'Τα παιδιά',stats:'Στατιστικά',settings:'Ρυθμίσεις'})[view];$('.eyebrow').textContent=settings.school_name;$('#schoolyear').textContent=`${settings.year_start.slice(0,4)} – ${settings.year_end.slice(0,4)}`;document.body.classList.remove('login-page');$('#footer').textContent='Το Νηπιαγωγείο μας · Καλή σχολική μέρα!';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='settings')return renderSettings();if(view==='stats')return renderStats();renderCards()}
function metrics(){const present=children.filter(c=>entry(c)?.status==='present').length,absent=children.filter(c=>entry(c)?.status==='absent').length;return `<div class="summary">${[[children.length,'Παιδιά','♧',''],[present,'Παρουσίες','✓','green'],[absent,'Απουσίες','−','pink'],[children.length-present-absent,'Χωρίς καταχώρηση','◷','yellow']].map(([n,t,i,c])=>`<div class="metric ${c}"><span class="icon">${icon(({'♧':'children','✓':'check','−':'x','◷':'clock'})[i])}</span><div><b>${n}</b><small>${t}</small></div></div>`).join('')}</div>`}
function toolbar(){const groups=[...new Set(children.map(c=>c.classroom).filter(Boolean))].sort();return `<div class="toolbar">${view==='attendance'?`<input id="day" type="date" aria-label="Ημερομηνία παρουσιολογίου" value="${day}" min="${settings.year_start}" max="${settings.year_end}">`:''}<input id="search" class="search" type="search" placeholder="Αναζήτηση παιδιού…" aria-label="Αναζήτηση παιδιού" value="${esc(search)}"><select id="group" aria-label="Τμήμα"><option value="">Όλα τα τμήματα</option>${groups.map(g=>`<option ${g===group?'selected':''}>${esc(g)}</option>`).join('')}</select>${view==='attendance'?`<select id="filter" aria-label="Κατάσταση"><option value="">Όλες οι καταστάσεις</option>${[['present','Παρουσία'],['absent','Απουσία'],['none','Δεν καταχωρήθηκε']].map(([v,t])=>`<option value="${v}" ${filter===v?'selected':''}>${t}</option>`).join('')}</select>`:''}<button class="primary" id="add">${icon('plus')} Προσθήκη παιδιού</button></div>`}
function renderCards(){const current=day===today();$('#content').innerHTML=`${view==='attendance'?`<div class="welcome"><div><h2>${current?'Καλημέρα, μικρή μας παρέα!':'Παρουσιολόγιο ημέρας'}</h2><div class="date-highlight">${icon('calendar')}<strong>${fmt(day)}</strong></div><p class="reception-hours">Υποδοχή ${settings.opens.slice(0,5)} – ${settings.closes.slice(0,5)}</p></div><span class="sun" aria-hidden="true">☀️</span></div>${metrics()}`:''}${toolbar()}<div class="sectionline"><h2>${view==='attendance'?'Η παρέα μας':'Παιδιά & τμήματα'}</h2><span class="muted" id="count"></span></div><div class="cards" id="cards"></div>`;drawCards();$('#search').oninput=e=>{search=e.target.value;drawCards()};$('#group').onchange=e=>{group=e.target.value;drawCards()};$('#add').onclick=()=>editChild();if(view==='attendance'){$('#day').onchange=e=>{day=e.target.value||today();render()};$('#filter').onchange=e=>{filter=e.target.value;drawCards()}}}
function drawCards(){
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el');
 const visible=children.filter(c=>(!group||c.classroom===group)&&normalize(c.name).includes(normalize(search))&&(view!=='attendance'||!filter||(entry(c)?.status||'none')===filter));
 $('#count').textContent=`${visible.length} παιδιά`;
 $('#cards').innerHTML=visible.map(c=>{
  const r=entry(c),[p,a]=labels(c);
  return `<article class="card"><div class="child-top">${avatar(c)}<div><h3><button class="namebutton" data-history="${c.id}">${esc(c.name)}</button></h3>${c.classroom?'<p>'+esc(c.classroom)+'</p>':''}</div></div>
  ${view==='attendance'?(r?`<div class="attendance-result ${r.status}" role="status">${icon(r.status==='present'?'check':'x')}<strong>${r.status==='present'?p:a}</strong>${r.arrival?'<span class="arrival-time">'+icon('clock')+' '+r.arrival.slice(0,5)+'</span>':''}</div>`:`<p class="pending-status">Δεν καταχωρήθηκε</p><div class="actions"><button data-mark="present" data-id="${c.id}">${icon('check')} ${p}</button><button data-mark="absent" data-id="${c.id}" class="absent">${icon('x')} ${a}</button></div>`):`<p class="muted">Γέννηση: ${c.birth_date?fmt(c.birth_date):'—'}</p>`}
  <div class="card-bottom"><button class="textbutton" data-history="${c.id}">Ιστορικό</button><button class="textbutton" data-edit="${c.id}">Επεξεργασία</button>${r&&view==='attendance'?`<button class="textbutton" data-clear="${c.id}">Αναίρεση</button>`:''}</div></article>`;
 }).join('')||`<div class="panel empty">${children.length?'Δεν βρέθηκαν παιδιά με αυτά τα φίλτρα.':'Προσθέστε το πρώτο παιδί για να ξεκινήσετε το παρουσιολόγιο.'}</div>`;
 $('#cards').querySelectorAll('[data-mark]').forEach(b=>b.onclick=()=>mark(b.dataset.id,b.dataset.mark));
 $('#cards').querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>history(b.dataset.history));
 $('#cards').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editChild(b.dataset.edit));
 $('#cards').querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>mark(b.dataset.clear,null));
}
async function mark(id,status,arrivalOverride){if(!navigator.onLine){toast('Χρειάζεται σύνδεση στο Internet για αποθήκευση παρουσιών.');return}if(busy)return;const old=entry({id});if(status===old?.status&&arrivalOverride===undefined)return;let arrival=status==='present'?old?.arrival||clock():null;if(status==='present'&&day!==today()&&!old?.arrival&&arrivalOverride===undefined){$('#modal').innerHTML=`<h2>Ώρα άφιξης</h2><p class="hint">Για προηγούμενη ή επόμενη ημέρα επιλέξτε την πραγματική ώρα άφιξης.</p><form id="arrivalform"><label>Ώρα<input type="time" name="arrival" required value="${settings.opens.slice(0,5)}"></label><div class="formactions"><button type="button" class="secondary" data-close>Ακύρωση</button><button class="primary">Καταχώρηση</button></div></form>`;openModal();$('#arrivalform').onsubmit=e=>{e.preventDefault();const t=e.target.arrival.value;$('#modal').close();mark(id,status,t+':00')};return}if(arrivalOverride)arrival=arrivalOverride;busy=true;const row={child_id:id,day,status,arrival};try{if(user){const r=status?await db.from('proini_attendance').upsert({...row,owner_id:schoolId},{onConflict:'child_id,day'}):await db.from('proini_attendance').delete().eq('child_id',id).eq('day',day);if(r.error)throw r.error}records=records.filter(r=>!(r.child_id===id&&r.day===day));if(status)records.push(row);render();toast(status?'Η καταχώρηση αποθηκεύτηκε':'Η καταχώρηση αναιρέθηκε')}catch{toast('Δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.')}finally{busy=false}}
function openModal(){document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#modal').close());if(!$('#modal').open)$('#modal').showModal()}
function editChild(id){
 const c=children.find(c=>c.id===id)||{name:'',gender:'boy',classroom:'',birth_date:'',photo:null};
 let photo=c.photo,processing=false,cropImage=null,cropX=0,cropY=0,zoom=1,drag=null,request=0;
 const modal=$('#modal');
 modal.innerHTML=`<h2>${id?'Επεξεργασία παιδιού':'Ένα νέο μέλος στην παρέα'}</h2><form id="childform">
 <div class="photoedit"><div id="photopreview">${avatar(c)}</div><div><label>Φωτογραφία<input id="photo" type="file" accept="image/*"></label><div class="photo-tools"><button type="button" id="adjustphoto" class="textbutton" ${photo?'':'hidden'}>Προσαρμογή φωτογραφίας</button><button type="button" id="removephoto" class="textbutton">Αφαίρεση</button></div></div></div>
 <section id="cropeditor" class="cropeditor" hidden><h3>Φέρτε το πρόσωπο στο κέντρο</h3><p class="hint">Σύρετε τη φωτογραφία και ρυθμίστε το ζουμ. Μπορείτε επίσης να χρησιμοποιήσετε τα βελάκια του πληκτρολογίου.</p><canvas id="cropcanvas" width="320" height="320" tabindex="0" aria-label="Μετακίνηση φωτογραφίας με σύρσιμο ή βελάκια"></canvas><label>Ζουμ<input id="cropzoom" type="range" min="1" max="4" step="0.01" value="1"></label><div class="formactions"><button type="button" id="cancelcrop" class="secondary">Ακύρωση crop</button><button type="button" id="applycrop" class="secondary">Εφαρμογή φωτογραφίας</button></div></section>
 <div class="formgrid"><label class="full">Ονοματεπώνυμο<input name="name" maxlength="100" required value="${esc(c.name)}" autocomplete="off"></label><label>Φύλο<select name="gender"><option value="boy" ${c.gender==='boy'?'selected':''}>Αγόρι</option><option value="girl" ${c.gender==='girl'?'selected':''}>Κορίτσι</option></select></label><label>Τμήμα <span class="muted">(προαιρετικό)</span><input name="classroom" maxlength="80" list="classrooms" value="${esc(c.classroom)}"><datalist id="classrooms">${[...new Set(children.map(x=>x.classroom).filter(Boolean))].map(g=>`<option value="${esc(g)}">`).join('')}</datalist></label><label class="full">Ημερομηνία γέννησης<input type="date" name="birth_date" max="${today()}" value="${esc(c.birth_date)}"></label></div>
 <p class="error" id="formerror" role="alert"></p><div class="formactions"><button type="button" class="secondary" data-close>Ακύρωση</button><button id="savechild" class="primary">Αποθήκευση</button></div>
 ${id?'<div class="delete-area"><button type="button" id="deletechild" class="danger-outline">Διαγραφή παιδιού</button></div>':''}</form>`;
 openModal();
 const canvas=$('#cropcanvas'),ctx=canvas.getContext('2d'),editor=$('#cropeditor');
 function releaseCrop(){cropImage?.close();cropImage=null;drag=null;editor.hidden=true}
 function drawCrop(){if(!cropImage)return;const scale=320/Math.min(cropImage.width,cropImage.height)*zoom;
  cropX=Math.max(320-cropImage.width*scale,Math.min(0,cropX));cropY=Math.max(320-cropImage.height*scale,Math.min(0,cropY));
  ctx.fillStyle='#fff';ctx.fillRect(0,0,320,320);ctx.drawImage(cropImage,cropX,cropY,cropImage.width*scale,cropImage.height*scale);
 }
 async function startCrop(blob){
  const ticket=++request;processing=true;$('#savechild').disabled=true;
  try{
   if(blob.size>15*1024*1024)throw Error('Επιλέξτε φωτογραφία μικρότερη από 15 MB.');
   const image=await createImageBitmap(blob);
   if(ticket!==request||!modal.open||!canvas.isConnected){image.close();return}
   releaseCrop();cropImage=image;zoom=1;$('#cropzoom').value='1';
   const scale=320/Math.min(image.width,image.height);cropX=(320-image.width*scale)/2;cropY=(320-image.height*scale)/2;
   editor.hidden=false;drawCrop();$('#formerror').textContent='';
  }catch(err){if(ticket===request&&canvas.isConnected)$('#formerror').textContent=err.message||'Η φωτογραφία δεν μπορεί να φορτωθεί.'}
  finally{if(ticket===request){processing=false;$('#savechild').disabled=false}}
 }
 function applyCrop(){if(!cropImage)return;photo=canvas.toDataURL('image/jpeg',.8);$('#photopreview').innerHTML=avatar({...c,photo});$('#adjustphoto').hidden=false;releaseCrop()}
 modal.addEventListener('close',()=>{request++;releaseCrop()},{once:true});
 $('#photo').onchange=e=>{const file=e.target.files[0];if(file)startCrop(file)};
 $('#adjustphoto').onclick=()=>{if(photo)startCrop(dataURLBlob(photo))};
 $('#removephoto').onclick=()=>{request++;processing=false;$('#savechild').disabled=false;releaseCrop();photo=null;$('#photopreview').innerHTML=avatar({...c,photo:null});$('#photo').value='';$('#adjustphoto').hidden=true};
 $('#cancelcrop').onclick=()=>{releaseCrop();$('#photo').value=''};
 $('#applycrop').onclick=applyCrop;
 $('#cropzoom').oninput=e=>{const previous=zoom;zoom=Number(e.target.value);cropX=160+(cropX-160)*zoom/previous;cropY=160+(cropY-160)*zoom/previous;drawCrop()};
 canvas.onpointerdown=e=>{if(!cropImage)return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId)};
 canvas.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const scale=320/canvas.getBoundingClientRect().width;cropX+=(e.clientX-drag.x)*scale;cropY+=(e.clientY-drag.y)*scale;drag.x=e.clientX;drag.y=e.clientY;drawCrop()};
 canvas.onpointerup=canvas.onpointercancel=()=>{drag=null};
 canvas.onkeydown=e=>{const move={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]}[e.key];if(move){e.preventDefault();cropX+=move[0];cropY+=move[1];drawCrop()}};
 if(id)$('#deletechild').onclick=()=>confirmDeleteChild(c);
 $('#childform').onsubmit=async e=>{
  e.preventDefault();if(processing)return;applyCrop();
  const f=e.target,data={name:f.elements.name.value.trim(),gender:f.gender.value,classroom:f.classroom.value.trim(),birth_date:f.birth_date.value||null,photo};
  if(!data.name){$('#formerror').textContent='Συμπληρώστε το όνομα.';return}
  const button=$('#savechild');button.disabled=true;
  try{let row={...data,id:id||crypto.randomUUID()};
   if(user){const r=id?await db.from('proini_children').update(data).eq('id',id).select().single():await db.from('proini_children').insert({...data,owner_id:schoolId}).select().single();if(r.error)throw r.error;row=r.data}
   children=children.filter(x=>x.id!==id);children.push(row);children.sort((a,b)=>a.name.localeCompare(b.name,'el'));modal.close();render();toast('Τα στοιχεία του παιδιού αποθηκεύτηκαν');
  }catch{$('#formerror').textContent='Δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.'}finally{button.disabled=false}
 };
}
function dataURLBlob(url){const [header,data]=url.split(',');const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));return new Blob([bytes],{type:header.split(':')[1].split(';')[0]})}
function confirmDeleteChild(c){
 $('#modal').close();
 $('#modal').innerHTML=`<h2>Διαγραφή παιδιού;</h2><p>Θα διαγραφεί το παιδί <strong>${esc(c.name)}</strong> μαζί με το ιστορικό παρουσιών του. Η διαγραφή είναι οριστική.</p><p class="error" id="deleteerror" role="alert"></p><div class="formactions"><button type="button" class="secondary" id="canceldelete">Ακύρωση</button><button type="button" class="danger" id="confirmdelete">Διαγραφή</button></div>`;
 openModal();
 $('#canceldelete').onclick=()=>{$('#modal').close();editChild(c.id)};
 $('#confirmdelete').onclick=async e=>{
  const b=e.currentTarget;b.disabled=true;$('#canceldelete').disabled=true;
  try{
   if(!navigator.onLine)throw Error('Χρειάζεται σύνδεση στο Internet.');
   const {data,error}=await db.from('proini_children').delete().eq('id',c.id).eq('owner_id',schoolId).select('id');
   if(error)throw error;if(!data.length)throw Error('Το παιδί δεν βρέθηκε ή δεν έχετε πρόσβαση.');
   children=children.filter(x=>x.id!==c.id);records=records.filter(x=>x.child_id!==c.id);
   if(group&&!children.some(x=>x.classroom===group))group='';
   $('#modal').close();render();toast('Το παιδί διαγράφηκε');
  }catch(err){$('#deleteerror').textContent=err.message||'Δεν έγινε διαγραφή. Δοκιμάστε ξανά.'}
  finally{b.disabled=false;$('#canceldelete').disabled=false}
 };
}
function history(id){const c=children.find(x=>x.id===id),rs=records.filter(r=>r.child_id===id).sort((a,b)=>b.day.localeCompare(a.day)),[p,a]=labels(c);$('#modal').innerHTML=`<div class="historyhead">${avatar(c)}<div><h2 style="margin:0 0 5px">${esc(c.name)}</h2><span class="muted">${esc(c.classroom)}</span></div></div><p class="hint">Σχολική χρονιά ${fmt(settings.year_start)} – ${fmt(settings.year_end)}</p><p>${rs.filter(r=>r.status==='present').length} παρουσίες · ${rs.filter(r=>r.status==='absent').length} απουσίες</p><div class="tablewrap"><table><thead><tr><th>Ημερομηνία</th><th>Κατάσταση</th><th>Άφιξη</th></tr></thead><tbody>${rs.map(r=>`<tr><td>${fmt(r.day)}</td><td><span class="badge ${r.status}">${r.status==='present'?p:a}</span></td><td>${r.arrival?.slice(0,5)||'—'}</td></tr>`).join('')||'<tr><td colspan="3">Δεν υπάρχουν καταχωρήσεις για αυτή τη χρονιά.</td></tr>'}</tbody></table></div><div class="formactions"><button class="secondary" data-close>Κλείσιμο</button></div>`;openModal()}
function renderStats(){const rs=records.filter(r=>r.day>=settings.year_start&&r.day<=settings.year_end&&(!group||children.find(c=>c.id===r.child_id)?.classroom===group)),ps=rs.filter(r=>r.status==='present').length,as=rs.length-ps;$('#content').innerHTML=`<div class="welcome"><div><h2>Η σχολική χρονιά με μια ματιά</h2><p>${fmt(settings.year_start)} – ${fmt(settings.year_end)}</p></div></div><div class="summary"><div class="metric green"><div><b>${ps}</b><small>Καταχωρήσεις παρουσίας</small></div></div><div class="metric pink"><div><b>${as}</b><small>Καταχωρήσεις απουσίας</small></div></div><div class="metric"><div><b>${rs.length?Math.round(ps/rs.length*100):0}%</b><small>Παρουσία στις καταχωρήσεις</small></div></div><div class="metric yellow"><div><b>${new Set(rs.map(r=>r.day)).size}</b><small>Ημέρες με καταχωρήσεις</small></div></div></div><div class="panel"><h2>Παρουσία ανά παιδί</h2><label>Τμήμα<select id="statsgroup"><option value="">Όλα τα τμήματα</option>${[...new Set(children.map(c=>c.classroom).filter(Boolean))].map(g=>`<option ${g===group?'selected':''}>${esc(g)}</option>`).join('')}</select></label><p class="hint">Το ποσοστό υπολογίζεται στις καταχωρημένες παρουσίες και απουσίες. Οι ημέρες χωρίς καταχώρηση δεν μετρούν ως απουσία.</p>${children.filter(c=>!group||c.classroom===group).map(c=>{const cr=rs.filter(r=>r.child_id===c.id),n=cr.filter(r=>r.status==='present').length,pct=cr.length?Math.round(n/cr.length*100):0;return `<div class="barrow"><button class="namebutton" data-history="${c.id}">${esc(c.name)}</button><div class="bar"><i style="width:${pct}%"></i></div><span>${cr.length?pct+'%':'—'}</span></div>`}).join('')||'<p class="empty">Προσθέστε παιδιά για να δείτε στατιστικά.</p>'}</div>`;$('#statsgroup').onchange=e=>{group=e.target.value;renderStats()};document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>history(b.dataset.history))}
function renderSettings(){$('#content').innerHTML=`<div class="panel settings"><h2>Το σχολείο & το ωράριό μας</h2><form id="settingsform"><div class="formgrid"><label class="full">Όνομα νηπιαγωγείου<input name="school_name" required maxlength="100" value="${esc(settings.school_name)}"></label><label>Αρχή σχολικής χρονιάς<input type="date" name="year_start" required value="${settings.year_start}"></label><label>Τέλος σχολικής χρονιάς<input type="date" name="year_end" required value="${settings.year_end}"></label><label>Έναρξη υποδοχής<input type="time" name="opens" required value="${settings.opens.slice(0,5)}"></label><label>Λήξη υποδοχής<input type="time" name="closes" required value="${settings.closes.slice(0,5)}"></label></div><p class="error" id="settingerror" role="alert"></p><div class="formactions"><button class="primary">Αποθήκευση ρυθμίσεων</button></div></form></div><div class="panel settings"><h2>Ο λογαριασμός σας</h2><p class="muted">${esc(user.email)}</p><button id="logout" class="secondary">Αποσύνδεση</button></div>`;$('#logout').onclick=async()=>{if(user){const {error}=await db.auth.signOut();if(error){toast('Δεν έγινε αποσύνδεση. Δοκιμάστε ξανά.');return}}user=null;children=[];records=[];settings={...defaults};group='';search='';filter='';login()};$('#settingsform').onsubmit=async e=>{e.preventDefault();if(!isAdmin){toast('Οι ρυθμίσεις αλλάζουν από τον διαχειριστή.');return}const f=e.target,data=Object.fromEntries(new FormData(f));if(data.year_end<=data.year_start||data.closes<=data.opens){$('#settingerror').textContent='Η λήξη πρέπει να είναι μετά την έναρξη.';return}const b=f.querySelector('button');b.disabled=true;try{if(user){const {error}=await db.from('proini_settings').upsert({...data,owner_id:schoolId});if(error)throw error}settings=data;if(day<data.year_start||day>data.year_end)day=data.year_start;await load();render();toast('Οι ρυθμίσεις αποθηκεύτηκαν')}catch{$('#settingerror').textContent='Δεν αποθηκεύτηκε. Δοκιμάστε ξανά.'}finally{b.disabled=false}}}
const originalSettings=renderSettings;
renderSettings=function(){originalSettings();const form=$('#settingsform');if(!isAdmin){form.querySelectorAll('input,button').forEach(e=>e.disabled=true);$('#settingerror').textContent='Οι ρυθμίσεις του σχολείου αλλάζουν από τον διαχειριστή.'}if(isAdmin){$('#content').insertAdjacentHTML('beforeend',`<section class="panel settings"><h2>Πρόσβαση εκπαιδευτικών</h2><p class="hint">Ο εκπαιδευτικός δημιουργεί μόνος του λογαριασμό από την οθόνη εισόδου. Η αίτησή του εμφανίζεται παρακάτω και εσείς πατάτε Έγκριση.</p><form id="teacherform"><label>Email εκπαιδευτικού<input type="email" name="teacher_email" required placeholder="name@example.com"></label><div class="formactions"><button class="primary">Έγκριση email</button></div><p id="teacherresult" class="hint" role="status"></p></form><div id="teacherlist"></div><p class="hint">Στείλτε στον εκπαιδευτικό το link της εφαρμογής. Επιλέγει Δημιουργία λογαριασμού, επιβεβαιώνει το email του και περιμένει τη δική σας έγκριση. Μπορείτε επίσης να εγκρίνετε το email του πριν εγγραφεί.</p></section>`);loadTeachers();$('#teacherform').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const {data,error}=await db.rpc('proini_approve_teacher',{teacher_email:e.target.teacher_email.value.trim()});if(error)throw error;$('#teacherresult').textContent=data.active?'Το email εγκρίθηκε. Ο εκπαιδευτικός μπορεί να συνδεθεί.':'Το email εγκρίθηκε. Ο εκπαιδευτικός μπορεί να δημιουργήσει και να επιβεβαιώσει τον λογαριασμό του από την οθόνη εισόδου.';e.target.reset();await loadTeachers()}catch{$('#teacherresult').textContent='Δεν έγινε έγκριση. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.'}finally{b.disabled=false}}}};
async function loadTeachers(){
 const list=$('#teacherlist');if(!list)return;
 const [members,requests]=await Promise.all([db.from('proini_members').select('email,role,user_id').eq('school_owner_id',schoolId).order('role'),db.from('proini_access_requests').select('email,user_id,created_at').eq('school_owner_id',schoolId).order('created_at')]);
 if(members.error||requests.error){list.textContent='Δεν φορτώθηκε η λίστα. Δοκιμάστε ξανά.';return}
 const pending=requests.data.filter(r=>!members.data.some(m=>m.email===r.email));
 list.innerHTML=`<h3>Αιτήσεις πρόσβασης</h3>${pending.length?'<div class="tablewrap"><table><thead><tr><th>Email</th><th>Ενέργεια</th></tr></thead><tbody>'+pending.map(r=>'<tr><td>'+esc(r.email)+'</td><td><button class="secondary" data-approve-email="'+esc(r.email)+'">Έγκριση</button> <button class="textbutton danger-text" data-remove-email="'+esc(r.email)+'" data-user-id="'+r.user_id+'">Διαγραφή</button></td></tr>').join('')+'</tbody></table></div>':'<p class="hint">Δεν υπάρχουν νέες αιτήσεις.</p>'}
 <h3>Χρήστες του σχολείου</h3><div class="tablewrap"><table><thead><tr><th>Email</th><th>Πρόσβαση</th><th></th></tr></thead><tbody>${members.data.map(m=>'<tr><td>'+esc(m.email)+'</td><td>'+(m.role==='admin'?'Διαχειριστής':m.user_id?'Εκπαιδευτικός · ενεργός':'Εγκεκριμένο · περιμένει εγγραφή ή επιβεβαίωση')+'</td><td>'+(m.role==='admin'?'':`<button class="textbutton danger-text" data-remove-email="${esc(m.email)}" data-user-id="${m.user_id||''}">Διαγραφή χρήστη</button>`)+'</td></tr>').join('')}</tbody></table></div>`;
 list.querySelectorAll('[data-approve-email]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const {error}=await db.rpc('proini_approve_teacher',{teacher_email:b.dataset.approveEmail});if(error)throw error;await loadTeachers();toast('Η πρόσβαση εγκρίθηκε')}catch{toast('Δεν έγινε έγκριση. Δοκιμάστε ξανά.')}finally{b.disabled=false}});
 list.querySelectorAll('[data-remove-email]').forEach(b=>b.onclick=()=>confirmDeleteTeacher(b.dataset.removeEmail,b.dataset.userId));
}
function confirmDeleteTeacher(email,id){
 $('#modal').innerHTML=`<h2>Διαγραφή χρήστη;</h2><p>Θα αφαιρεθεί ο λογαριασμός <strong>${esc(email)}</strong> και η πρόσβασή του. Τα παιδιά και οι παρουσίες του σχολείου θα παραμείνουν. Η ενέργεια είναι οριστική.</p><p id="userdeleteerror" class="error" role="alert"></p><div class="formactions"><button class="secondary" type="button" data-close>Ακύρωση</button><button class="danger" type="button" id="deleteuserconfirm">Διαγραφή χρήστη</button></div>`;
 openModal();$('#deleteuserconfirm').onclick=async e=>{
  const b=e.currentTarget;b.disabled=true;
  try{const {data,error}=await db.functions.invoke('proini-delete-teacher',{body:{email,user_id:id||null}});if(error)throw error;if(!data?.success)throw Error(data?.error||'Η διαγραφή δεν ολοκληρώθηκε.');$('#modal').close();await loadTeachers();toast('Ο χρήστης διαγράφηκε')}
  catch{$('#userdeleteerror').textContent='Δεν έγινε διαγραφή. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.'}finally{b.disabled=false}
 };
}

document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});
async function init(){try{if(!window.supabase)throw Error('Η υπηρεσία σύνδεσης δεν φορτώθηκε.');db=window.supabase.createClient('https://htlifrjwigbeqijsqzxn.supabase.co','sb_publishable_gHcyF5k8vii7E8iZdO1fHg_a32hkByH',{auth:{storageKey:'proini-auth'}});const {data,error}=await db.auth.getSession();if(error)throw error;if(data.session){user=data.session.user;await load();render()}else login()}catch(err){login();toast(err.message)}}
init();


if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>console.warn('Η εγκατάσταση PWA δεν είναι διαθέσιμη αυτή τη στιγμή.')));
function networkNotice(){document.querySelector('#network-notice').hidden=navigator.onLine}
window.addEventListener('offline',networkNotice);window.addEventListener('online',networkNotice);networkNotice();

