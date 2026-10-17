import { CONTENT_CONFIG, escapeHtml, isAuthorizedAdmin, visibleItems, contentStats, initialsFromName, hasUnsavedChanges, normalizeEditableText, validateContent, getImageCrop, moveImageCrop, isImageSizeAllowed, isCompressedImageAllowed } from "./src/core.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, doc, query, where, onSnapshot, setDoc, deleteDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const app=initializeApp({apiKey:"AIzaSyAacPZBD_EhHfbPjhaU9vIRJVFzv7ZSu7U",authDomain:"candice-morel.firebaseapp.com",projectId:"candice-morel",storageBucket:"candice-morel.firebasestorage.app",messagingSenderId:"755634623005",appId:"1:755634623005:web:e516ad21721b16569fecf4"});
const auth=getAuth(app),db=getFirestore(app);
const admins=new Set(["9VuRSJuuEKc7fOQAjywrSIVB8Ql2","DcTMZFM3YhO5os0GSnVs1FIFW272"]);
const state={user:null,projects:[],workshops:[],unsubs:[],loaded:false};
const $=id=>document.getElementById(id);
const mobileMenu=$('mobile-navigation');
const mobileMenuToggle=document.querySelector('.mobile-menu-toggle');
function setMobileMenu(open){
 if(!mobileMenu||!mobileMenuToggle)return;
 mobileMenu.classList.toggle('is-open',open);
 mobileMenuToggle.classList.toggle('is-open',open);
 mobileMenuToggle.setAttribute('aria-expanded',String(open));
 mobileMenuToggle.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');
 mobileMenu.setAttribute('aria-hidden',String(!open));
 mobileMenu.inert=!open;
 document.body.classList.toggle('mobile-menu-open',open);
}
mobileMenuToggle?.addEventListener('click',()=>setMobileMenu(!mobileMenu.classList.contains('is-open')));
mobileMenu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMobileMenu(false)));
window.addEventListener('keydown',event=>{if(event.key==='Escape')setMobileMenu(false)});
window.addEventListener('resize',()=>{if(window.innerWidth>740)setMobileMenu(false)});

const photo='https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80';
const textNodes=[...document.querySelectorAll('[data-site-text]')];
for(const kind of ['projects','workshops']){const el=$(kind+'-intro');if(el)el.dataset.siteText=kind}
const textDefaults=Object.fromEntries([...document.querySelectorAll('[data-site-text]')].map(el=>[el.dataset.siteText,el.textContent.trim()]));
let textValues={...textDefaults};
let editingNode=null;
function mirrorText(key,value){document.querySelectorAll('[data-site-mirror="'+key+'"]').forEach(el=>{el.textContent=value})}
function syncSiteCopy(data){textValues={...textDefaults,...data};document.querySelectorAll('[data-site-text]').forEach(el=>{if(el===editingNode)return;const key=el.dataset.siteText;const value=textValues[key];if(typeof value==='string'&&el.textContent!==value)el.textContent=value});for(const key of ['hero-role','hero-first','hero-last'])mirrorText(key,textValues[key])}
function subscribeIntros(){return onSnapshot(doc(db,'siteContent','introductions'),snapshot=>syncSiteCopy(snapshot.exists()?snapshot.data():{}),error=>console.error('Site text loading:',error))}
function updateEditableIntros(){const editable=!!state.user;document.querySelectorAll('[data-site-text]').forEach(el=>{el.classList.toggle('site-inline-edit',editable);el.title=editable?'Cliquer pour modifier le texte':'';el.tabIndex=editable?0:-1})}
function beginTextEdit(el){if(!state.user||editingNode||el.isContentEditable)return;editingNode=el;const key=el.dataset.siteText;const original=el.textContent;el.contentEditable='true';el.spellcheck=true;el.focus();const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(el);selection.removeAllRanges();selection.addRange(range);let finished=false;
async function finish(save){if(finished)return;finished=true;el.removeEventListener('blur',onBlur);el.removeEventListener('keydown',onKey);el.contentEditable='false';editingNode=null;const value=normalizeEditableText(el.textContent);if(!save||!value||value===original){el.textContent=original;if(save&&!value)message('Le texte ne peut pas être vide.');return}el.textContent=value;mirrorText(key,value);try{await setDoc(doc(db,'siteContent','introductions'),{[key]:value},{merge:true});textValues[key]=value;message('Texte enregistré.')}catch(error){el.textContent=original;mirrorText(key,original);message('Erreur lors de l’enregistrement : '+error.message)}}
const onBlur=()=>finish(true);
const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(false)}else if(e.key==='Enter'){e.preventDefault();finish(true)}};
el.addEventListener('blur',onBlur);el.addEventListener('keydown',onKey)}
document.addEventListener('click',event=>{const el=event.target.closest('[data-site-text]');if(el&&state.user&&!editingNode)beginTextEdit(el)});
document.addEventListener('keydown',event=>{const el=event.target.closest?.('[data-site-text]');if(el&&state.user&&!editingNode&&(event.key==='Enter'||event.key===' ')){event.preventDefault();beginTextEdit(el)}});
const configs=CONTENT_CONFIG;
function message(text){if(!text)return;const stack=$('toast-stack');if(!stack)return;const toast=document.createElement('div');toast.className='site-toast'+(/erreur|impossible|refus|échec/i.test(text)?' toast-error':'');const content=document.createElement('span');content.textContent=text;const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Fermer la notification');toast.append(content,close);stack.append(toast);const remove=()=>{if(!toast.isConnected)return;toast.classList.add('toast-out');setTimeout(()=>toast.remove(),230)};close.onclick=remove;setTimeout(remove,4600);while(stack.children.length>4)stack.firstElementChild.remove()}
let bookPreviouslyOpen=false;
let bookReturnHash='#home';
function showRoute(){
  const studio=['#studio','#admin'].includes(location.hash);
  const book=location.hash==='#book';
  const logged=!!state.user;
  const overlay=$('book-page');
  if(book&&!bookPreviouslyOpen){
    const previous=sessionStorage.getItem('book-return-hash');
    bookReturnHash=previous&&previous!=='#book'?previous:bookReturnHash;
    overlay.scrollTop=0;
    overlay.querySelector('.book-scroll').scrollTop=0;
  }
  if(!book&&bookPreviouslyOpen)closeBookImage();
  if(book&&!bookPreviouslyOpen){requestAnimationFrame(()=>overlay.querySelector('.book-close').focus({preventScroll:true}));}
  bookPreviouslyOpen=book;
  overlay.classList.toggle('book-open',book);
  overlay.setAttribute('aria-hidden',String(!book));
  overlay.inert=!book;
  document.body.classList.toggle('book-active',book);
  document.querySelector('main')?.toggleAttribute('inert',book);
  $('site').classList.toggle('hidden',studio);
  $('studio-login').classList.toggle('hidden',!studio||logged);
  $('admin').classList.toggle('hidden',!studio||!logged);
  document.querySelector('header').classList.toggle('header-studio',studio);
  if(studio)window.scrollTo(0,0);
  else if(!book&&(!location.hash||location.hash==='#home'))window.scrollTo(0,0);
  else if(!book&&location.hash&&$(location.hash.slice(1)))requestAnimationFrame(()=>$(location.hash.slice(1)).scrollIntoView({block:'start',behavior:'smooth'}));
}

// Book: keyboard-accessible image viewer with history-friendly hash routing.
const bookImages=[...document.querySelectorAll('.book-tile img')];
let bookIndex=0;
const bookLightbox=$('book-lightbox');
function openBookImage(index){
  bookIndex=(index+bookImages.length)%bookImages.length;
  const source=bookImages[bookIndex];
  $('book-lightbox-image').src=source.currentSrc||source.src;
  $('book-lightbox-image').alt=source.alt;
  $('book-lightbox-count').textContent=String(bookIndex+1).padStart(2,'0')+' / '+String(bookImages.length).padStart(2,'0');
  bookLightbox.classList.remove('hidden');
  document.body.style.overflow='hidden';
  bookLightbox.querySelector('.book-lightbox-close').focus();
}
function closeBookImage(){
  bookLightbox.classList.add('hidden');
  document.body.style.overflow='';
}
document.querySelectorAll('.book-tile').forEach((tile,index)=>tile.addEventListener('click',()=>openBookImage(index)));
bookLightbox.querySelector('.book-lightbox-close').onclick=closeBookImage;
bookLightbox.querySelector('.book-lightbox-prev').onclick=()=>openBookImage(bookIndex-1);
bookLightbox.querySelector('.book-lightbox-next').onclick=()=>openBookImage(bookIndex+1);
bookLightbox.addEventListener('click',event=>{if(event.target===bookLightbox)closeBookImage()});
document.addEventListener('keydown',event=>{
  if(bookLightbox.classList.contains('hidden'))return;
  if(event.key==='Escape'){event.preventDefault();closeBookImage()}
  if(event.key==='ArrowLeft'){event.preventDefault();openBookImage(bookIndex-1)}
  if(event.key==='ArrowRight'){event.preventDefault();openBookImage(bookIndex+1)}
});
document.addEventListener('keydown',event=>{
  if(location.hash!=='#book'||!bookLightbox.classList.contains('hidden'))return;
  if(event.key==='Escape'){event.preventDefault();location.hash='#home'}
  if(event.key==='Tab'){
    const focusable=[...$('book-page').querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  }
});
window.addEventListener('hashchange',closeBookImage);
document.querySelectorAll('a[href="#book"]').forEach(link=>link.addEventListener('click',()=>{
  if(location.hash!=='#book'){
    bookReturnHash=location.hash&&location.hash!=='#book'?location.hash:'#home';
    sessionStorage.setItem('book-return-hash',bookReturnHash);
  }
}));
$('book-page').querySelector('.book-close').addEventListener('click',()=>{
  location.hash='#home';
});


function startSubscriptions(){state.unsubs.forEach(f=>f());state.unsubs=[];for(const kind of Object.keys(configs)){const ref=collection(db,kind);const q=state.user?ref:query(ref,where("published","==",true));state.unsubs.push(onSnapshot(q,snapshot=>{state[kind]=snapshot.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(Number.isFinite(a.sortOrder)?a.sortOrder:Number.MAX_SAFE_INTEGER)-(Number.isFinite(b.sortOrder)?b.sortOrder:Number.MAX_SAFE_INTEGER));render()},e=>{console.error(e);message("Erreur de chargement Firestore : "+e.message)}))}}
async function signIn(fn){$('login-error').textContent='';try{const result=await fn();if(!isAuthorizedAdmin(result.user,admins)){await signOut(auth);throw new Error("Ce compte n'est pas autorisé à accéder au Studio.")}}catch(e){$('login-error').textContent=e.code==='auth/unauthorized-domain'?"Ajoutez vchaillo.github.io aux domaines autorisés dans Firebase.":e.message||"Connexion impossible."}}
$('login-form').onsubmit=e=>{e.preventDefault();signIn(()=>signInWithEmailAndPassword(auth,$('login-email').value,$('login-password').value))};
$('google-login').onclick=()=>signIn(()=>signInWithPopup(auth,new GoogleAuthProvider()));
$('toggle-password').onclick=()=>{const field=$('login-password');field.type=field.type==='password'?'text':'password';$('toggle-password').setAttribute('aria-label',field.type==='password'?'Afficher le mot de passe':'Masquer le mot de passe');$('toggle-password').classList.toggle('password-visible',field.type==='text')};
$('logout').onclick=()=>signOut(auth);
$('open-profile').onclick=()=>openProfile();
function openProfile(){const user=state.user;if(!user)return;const providerIds=user.providerData.map(p=>p.providerId),google=providerIds.includes('google.com'),password=providerIds.includes('password'),name=user.displayName||user.email?.split('@')[0]||'Administrateur',initials=initialsFromName(name,user.email),avatar=user.photoURL?'<img src="'+escapeHtml(user.photoURL)+'" alt="Photo de profil">':escapeHtml(initials);modal('<div class="studio-profile"><div class="studio-profile-header"><div class="eyebrow">STUDIO · COMPTE</div><div class="profile-summary"><div class="profile-avatar">'+avatar+'</div><div class="profile-identity"><h2>'+escapeHtml(name)+'</h2><p>'+escapeHtml(user.email||'')+'</p></div></div><span class="profile-status"><span class="profile-status-dot"></span>Administrateur autorisé</span></div><div class="studio-profile-body"><div class="profile-section-label">INFORMATIONS DU COMPTE</div><dl class="profile-details"><dt>Connexion</dt><dd>'+escapeHtml([google?'Google':null,password?'Email et mot de passe':null].filter(Boolean).join(' · ')||'Autre fournisseur')+'</dd><dt>Adresse e-mail</dt><dd>'+escapeHtml(user.email||'Non renseigné')+'</dd></dl><div class="profile-actions"><button type="button" class="btn alt" id="profile-password">Changer mon mot de passe <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button><p class="profile-password-note">Démonstration uniquement : aucune modification réelle du mot de passe.</p></div></div></div>');modalClose=dismiss;$('profile-password').onclick=()=>{modal('<div class="eyebrow">STUDIO · COMPTE</div><h2>Changer le mot de passe</h2><p>Cette fonctionnalité est une simulation. Aucun mot de passe ne sera modifié.</p><form id="password-demo"><label>Nouveau mot de passe<input type="password" minlength="8" required autocomplete="new-password"></label><label>Confirmer le mot de passe<input type="password" minlength="8" required autocomplete="new-password"></label><div class="form-actions"><button type="button" class="btn alt" id="password-back">Retour</button><button type="submit" class="btn">Simuler</button></div></form>');modalClose=dismiss;$('password-back').onclick=openProfile;$('password-demo').onsubmit=e=>{e.preventDefault();const inputs=[...e.currentTarget.querySelectorAll('input')];if(inputs[0].value!==inputs[1].value){message('Les mots de passe ne correspondent pas.');return}dismiss();message('Simulation terminée : aucun mot de passe n’a été modifié.')};}}
onAuthStateChanged(auth,async user=>{try{if(user&&!isAuthorizedAdmin(user,admins)){await signOut(auth);return}state.user=user;startSubscriptions();updateEditableIntros();showRoute()}finally{document.documentElement.classList.remove('app-loading');const loader=$('app-loader');if(loader){loader.classList.add('done');setTimeout(()=>loader.remove(),450)}}},error=>{console.error('Firebase Auth initialization:',error);document.documentElement.classList.remove('app-loading');$('app-loader')?.remove();$('login-error').textContent='Impossible d’initialiser Firebase. Réessayez.'});
window.addEventListener('hashchange',showRoute);
window.addEventListener('popstate',showRoute);
// Enter the Studio without the browser's native anchor jump.
document.querySelectorAll('a[href="#studio"],a[href="#admin"]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  if(location.hash==='#studio'||location.hash==='#admin')return;
  const destination=link.getAttribute('href');
  history.pushState(null,'',destination);
  if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.startViewTransition(()=>showRoute());
  }else showRoute();
}));
document.querySelectorAll('nav a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{if(location.hash===a.getAttribute('href'))showRoute()}));document.querySelectorAll('a[href="#book"]').forEach(a=>a.addEventListener('click',()=>{requestAnimationFrame(()=>{if(location.hash==='#book')showRoute()})}));
$('year').textContent=new Date().getFullYear();
$('contact-form').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target);location.href='mailto:candicemorelpro@gmail.com?subject='+encodeURIComponent('Contact professionnel — '+d.get('name'))+'&body='+encodeURIComponent('De : '+d.get('name')+' ('+d.get('email')+')\n\n'+d.get('message'))};
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.05});document.querySelectorAll('.section').forEach(el=>{el.classList.add('reveal');observer.observe(el)});
const visibilityIcon="<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>";const hiddenIcon="<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m3 3 18 18M10.6 6.1c.5-.1.9-.1 1.4-.1 6.4 0 10 6 10 6a17 17 0 0 1-3.1 3.6M6.2 6.9C3.5 8.8 2 12 2 12s3.6 6 10 6c1.3 0 2.5-.3 3.6-.7\"/><path d=\"M10 10a3 3 0 0 0 4 4\"/></svg>";const pencilIcon="<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m4 20 4.3-1 11-11a2.2 2.2 0 0 0-3.1-3.1l-11 11L4 20Z\"/><path d=\"m14.5 6.5 3 3\"/></svg>";
const trashIcon='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';// Pointer + keyboard sorting, persisted atomically in Firestore.
async function persistOrder(container,kind){
 const ids=[...container.querySelectorAll('[data-row-id]')].map(el=>el.dataset.rowId);
 const before=state[kind].map(el=>el.id);
 if(ids.every((id,i)=>id===before[i]))return;
 const previous=[...state[kind]];
 state[kind]=ids.map(id=>previous.find(el=>el.id===id));
 const batch=writeBatch(db);
 ids.forEach((id,i)=>batch.update(doc(db,kind,id),{sortOrder:i}));
 try{await batch.commit();message('Nouvel ordre enregistré.')}
 catch(error){state[kind]=previous;render();message('Impossible de modifier l’ordre : '+error.message)}
}
function animateReorder(container,change){
 const rows=[...container.querySelectorAll('.admin-row:not(.admin-drag-ghost)')];
 const before=new Map(rows.map(row=>[row,row.getBoundingClientRect().top]));
 change();
 for(const row of rows){
   const delta=before.get(row)-row.getBoundingClientRect().top;
   if(Math.abs(delta)>1){row.animate([{transform:'translateY('+delta+'px)'},{transform:'translateY(0)'}],{duration:230,easing:'cubic-bezier(.2,.8,.2,1)'})}
 }
}
function bindSortable(container,kind){
 const rows=[...container.querySelectorAll('.admin-row')];
 for(const row of rows){
  row.tabIndex=0;
  row.setAttribute('aria-label','Réorganiser '+(row.querySelector('strong')?.textContent||'cet élément')+' avec les flèches haut et bas');
  row.addEventListener('keydown',event=>{
   if(event.target!==row||!['ArrowUp','ArrowDown'].includes(event.key))return;
   event.preventDefault();
   const sibling=event.key==='ArrowUp'?row.previousElementSibling:row.nextElementSibling;
   if(!sibling?.classList.contains('admin-row'))return;
   animateReorder(container,()=>event.key==='ArrowUp'?container.insertBefore(row,sibling):container.insertBefore(sibling,row));
   row.focus({preventScroll:true});
   persistOrder(container,kind);
  });
  row.addEventListener('pointerdown',event=>{
   if(event.button!==0||event.target.closest('button,a,input,textarea,select,[contenteditable]'))return;
   const startX=event.clientX,startY=event.clientY;
   let active=false,finished=false,placeholder=null,ghost=null,offsetY=0,offsetX=0;
   const originalNext=row.nextElementSibling;
   const originalParent=row.parentElement;
   const onMove=e=>{
    if(!active&&Math.hypot(e.clientX-startX,e.clientY-startY)<6)return;
    if(!active){
     active=true;
     const rect=row.getBoundingClientRect();
     offsetY=startY-rect.top;offsetX=startX-rect.left;
     placeholder=document.createElement('div');
     placeholder.className='admin-drop-placeholder';
     placeholder.style.height=rect.height+'px';
     row.replaceWith(placeholder);
     ghost=row.cloneNode(true);
     ghost.classList.add('admin-drag-ghost');
     ghost.removeAttribute('data-row-id');
     Object.assign(ghost.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',margin:'0',zIndex:'9999',pointerEvents:'none'});
     container.append(ghost);
     row.classList.add('admin-drag-source');
     container.classList.add('is-sorting');
    }
    e.preventDefault();
    ghost.style.transform='translate3d('+(e.clientX-startX)+'px,'+(e.clientY-startY)+'px,0)';
    const others=[...container.querySelectorAll('.admin-row:not(.admin-drag-source):not(.admin-drag-ghost)')];
    let before=null;
    for(const other of others){const rect=other.getBoundingClientRect();if(e.clientY<rect.top+rect.height/2){before=other;break}}
    if(before!==placeholder.nextElementSibling)animateReorder(container,()=>container.insertBefore(placeholder,before));
    const margin=75,scrollSpeed=13;
    const bounds=container.getBoundingClientRect();
    if(e.clientY<Math.max(bounds.top,margin))window.scrollBy(0,-scrollSpeed);
    else if(e.clientY>Math.min(bounds.bottom,innerHeight-margin))window.scrollBy(0,scrollSpeed);
   };
   const cleanup=()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onCancel);row.classList.remove('admin-drag-source');container.classList.remove('is-sorting');ghost?.remove()};
   const onUp=()=>{
    if(finished)return;finished=true;
    if(active){placeholder.replaceWith(row);cleanup();persistOrder(container,kind)}
    else cleanup();
   };
   const onCancel=()=>{
    if(finished)return;finished=true;
    if(active){if(originalNext?.parentElement===originalParent)originalParent.insertBefore(row,originalNext);else originalParent.append(row);placeholder?.remove()}
    cleanup();
   };
   window.addEventListener('pointermove',onMove,{passive:false});
   window.addEventListener('pointerup',onUp,{once:true});
   window.addEventListener('pointercancel',onCancel,{once:true});
  });
 }
}
const adminViews={projects:'list',workshops:'list'};
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
 const [kind,view]=button.dataset.view.split(':');
 if(!['projects','workshops'].includes(kind)||!['list','cards'].includes(view))return;
 adminViews[kind]=view;
 const container=$(kind+'-list');
 container.classList.toggle('admin-view-cards',view==='cards');
 document.querySelectorAll('[data-view^="'+kind+':"]').forEach(control=>{
  const active=control.dataset.view===kind+':'+view;
  control.classList.toggle('is-active',active);
  control.setAttribute('aria-pressed',String(active));
 });
}));
function render(){
for(const kind of Object.keys(configs)){const list=state[kind],published=visibleItems(list);const grid=$(kind==='projects'?'project-grid':'workshop-grid');grid.innerHTML=published.length?published.map(p=>'<article><div class="image"><img loading="lazy" src="'+escapeHtml(p.image||photo)+'" alt="'+escapeHtml(p.title)+'"></div><h3>'+escapeHtml(p.title)+'</h3><p>'+escapeHtml(kind==='projects'?(p.category||'Projet')+' · '+(p.year||''):(p.audience||'')+' · '+(p.format||''))+'</p><div class="item-description">'+escapeHtml(p.description||'')+'</div></article>').join(''):'<p>Aucun contenu publié pour le moment.</p>';
const stats=$(kind+'-stats');const counts=contentStats(list);stats.innerHTML=[['Total',counts.total],['Publiés',counts.published],['Brouillons',counts.drafts]].map(([label,n])=>'<div class="stat"><b>'+n+'</b><span>'+label+'</span></div>').join('');
const container=$(kind+'-list');container.classList.add('admin-sortable');container.classList.toggle('admin-view-cards',adminViews[kind]==='cards');container.dataset.kind=kind;container.innerHTML=list.length?list.map(p=>'<div class="admin-row" data-row-id="'+escapeHtml(p.id)+'"><img class="admin-row-image" src="'+escapeHtml(p.image||photo)+'" alt="" loading="lazy"><div class="admin-row-content"><strong>'+escapeHtml(p.title)+'</strong><small>'+escapeHtml(p.description||'Aucune description')+'</small><div class="admin-row-meta">'+(kind==='projects'?'<span>'+escapeHtml(p.category||'Projet')+'</span><span>'+escapeHtml(p.year||'Année non renseignée')+'</span>':'<span>'+escapeHtml(p.audience||'Tous publics')+'</span><span>'+escapeHtml(p.format||'Atelier')+'</span>')+'</div></div><div class="admin-actions"><button type="button" data-toggle="'+kind+':'+escapeHtml(p.id)+'" aria-label="'+(p.published?'Dépublier':'Publier')+'" title="'+(p.published?'Publié — masquer':'Brouillon — publier')+'">'+(p.published?visibilityIcon:hiddenIcon)+'</button><button type="button" data-edit="'+kind+':'+escapeHtml(p.id)+'" aria-label="Modifier" title="Modifier">'+pencilIcon+'</button><button data-delete="'+kind+':'+escapeHtml(p.id)+'" aria-label="Supprimer">'+trashIcon+'</button></div></div>').join(''):'<p class="empty-admin">Aucun élément pour le moment. Créez votre première fiche.</p>';
bindSortable(container,kind);
}
document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>{const [kind,id]=el.dataset.edit.split(':');editor(kind,id)});
document.querySelectorAll('[data-delete]').forEach(el=>el.onclick=()=>{const [kind,id]=el.dataset.delete.split(':');confirmDialog('Supprimer cet élément ?','Cette action est définitive.',async()=>{await deleteDoc(doc(db,kind,id))})});
document.querySelectorAll('[data-toggle]').forEach(el=>el.onclick=()=>{const [kind,id]=el.dataset.toggle.split(':');const item=state[kind].find(p=>p.id===id);if(!item)return;const target=!item.published;confirmDialog(target?'Publier cet élément ?':'Dépublier cet élément ?',target?'Il sera visible sur le site public.':'Il ne sera plus visible sur le site public.',async()=>{await setDoc(doc(db,kind,id),{published:target,updatedAt:serverTimestamp()},{merge:true});message(target?'Publication confirmée.':'Élément dépublié.')},'Annuler',target?'Publier':'Dépublier')});
}
$('add').onclick=()=>editor('projects');$('add-workshop').onclick=()=>editor('workshops');
let modalClose=null;
function modal(html){document.body.classList.add('studio-modal-active');$('modal-root').innerHTML='<div class="modal custom-modal"><div class="dialog-shell"><button type="button" class="modal-close" aria-label="Fermer"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg></button>'+html+'</div></div>';$('modal-root').querySelector('.modal-close').onclick=()=>modalClose?.();const overlay=$('modal-root').firstElementChild;if(html.includes('class="studio-profile"')){overlay.classList.add('is-profile');requestAnimationFrame(()=>overlay.classList.add('profile-entered'))}overlay.onclick=e=>{if(e.target===overlay)modalClose?.()};}
function dismiss(){modalClose=null;$('modal-root').replaceChildren();document.body.classList.remove('studio-modal-active')}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalClose){e.preventDefault();modalClose()}});
function confirmDialog(title,description,onConfirm,negative='Annuler',positive='Confirmer'){const old=modalClose;modal('<div class="confirm-icon">!</div><h2>'+escapeHtml(title)+'</h2><p>'+escapeHtml(description)+'</p><div class="form-actions"><button type="button" class="btn alt" id="confirm-no">'+negative+'</button><button type="button" class="btn" id="confirm-yes">'+positive+'</button></div>');$('modal-root').firstElementChild.classList.add('is-confirmation');modalClose=()=>{dismiss();};$('confirm-no').onclick=()=>{dismiss()};$('confirm-yes').onclick=async()=>{try{await onConfirm();dismiss()}catch(e){$('confirm-yes').textContent='Erreur : '+e.message}};return old}
function editor(kind,id){
const cfg=configs[kind],current=state[kind].find(p=>p.id===id),item=current||{title:'',description:'',image:'',published:false,year:new Date().getFullYear().toString(),category:'Théâtre',audience:'Adultes',format:'Atelier'};
const fields=cfg.fields.map(([name,label,options])=>options?'<fieldset class="choice-field"><legend>'+label+' <span class="required-star" title="Obligatoire">*</span></legend><div class="choice-list">'+options.map(opt=>'<label class="choice-chip"><input type="radio" name="'+name+'" value="'+escapeHtml(opt)+'" required '+(item[name]===opt?'checked':'')+'><span>'+escapeHtml(opt)+'</span></label>').join('')+'</div></fieldset>':'<label class="editor-field">'+label+(kind==='projects'&&name==='year'?' <span class="required-star" title="Obligatoire">*</span>':'')+'<input name="'+name+'" '+(kind==='projects'&&name==='year'?'required inputmode="numeric" pattern="[0-9]{4}"':'')+' value="'+escapeHtml(item[name]||'')+'"></label>').join('');
modal('<form id="content-editor" class="compact-editor"><div class="eyebrow">STUDIO · '+escapeHtml(cfg.label)+'</div><h2>'+(id?'Modifier':'Créer')+' '+(kind==='projects'?'un projet':'un atelier')+'</h2><label class="editor-field">Titre <span class="required-star" title="Obligatoire">*</span><input name="title" required maxlength="100" value="'+escapeHtml(item.title)+'"></label>'+fields+'<label class="editor-field editor-description">Description <span class="required-star" title="Obligatoire">*</span><textarea name="description" rows="3" required>'+escapeHtml(item.description)+'</textarea></label><div class="editor-media"><div class="photo-controls"><label class="upload-label" for="image-file"><span id="photo-choose-label">'+(item.image?'Remplacer la photo':'Choisir une photo')+'</span><input type="file" id="image-file" accept="image/jpeg,image/png,image/webp"></label><button type="button" id="photo-remove" class="photo-action photo-remove '+(item.image?'':'hidden')+'">Supprimer</button></div><div id="image-crop" class="'+(item.image?'':'hidden')+'"><canvas id="crop-canvas" width="480" height="300" aria-label="Déplacer l’image pour la recadrer"></canvas><label class="zoom-control">Zoom <input id="crop-zoom" type="range" min="100" max="300" step="1" value="100"></label><p class="small-note">Glissez la photo pour ajuster le cadrage.</p></div></div><label class="publish-toggle editor-published"><input type="checkbox" name="published" '+(item.published?'checked':'')+'><span class="publish-eye" aria-hidden="true"><svg class="eye-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eye-hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 3 18 18M10.6 6.1A12 12 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.1 3.6M6.2 6.9C3.5 8.8 2 12 2 12s3.6 6 10 6c1.3 0 2.5-.3 3.6-.7"/></svg></span><span>Publier sur le site</span></label><div class="form-actions"><button type="button" class="btn alt" id="cancel-editor">Annuler</button><button type="submit" class="btn">Enregistrer</button></div></form>');
const form=$('content-editor');let imageData=null;let imageRemoved=false;let initial=JSON.stringify([...new FormData(form)]);let saving=false;
const isDirty=()=>hasUnsavedChanges(JSON.parse(initial),[...new FormData(form)],imageData!==null||imageRemoved);
const closeEditor=()=>{if(saving)return;if(!isDirty()){dismiss();return}const originalNode=$('modal-root').firstElementChild;originalNode.remove();confirmDialog('Modifications non enregistrées','Voulez-vous abandonner vos modifications ?',()=>dismiss(),'Rester','Abandonner');$('confirm-no').onclick=()=>{$('modal-root').replaceChildren(originalNode);modalClose=closeEditor};};modalClose=closeEditor;
$('cancel-editor').onclick=()=>modalClose();
let img=null,offsetX=.5,offsetY=.5,drag=null;const canvas=$('crop-canvas');const zoomInput=$('crop-zoom');
const configureZoom=()=>{
 if(!img)return;
 // The left stop is always the exact cover-fit (no unnecessary zoom).
 // The right stop is the largest useful magnification supported by the source image.
 const cover=Math.max(canvas.width/img.width,canvas.height/img.height);
 const maxUseful=Math.max(1,Math.min(6,1/cover));
 zoomInput.min='100';zoomInput.max=String(Math.max(100,Math.round(maxUseful*100)));
 zoomInput.value='100';
 zoomInput.disabled=Number(zoomInput.max)===100;
};
const refreshPhotoActions=()=>{const hasPhoto=!!img;$('photo-remove').classList.toggle('hidden',!hasPhoto);$('photo-choose-label').textContent=hasPhoto?'Remplacer la photo':'Choisir une photo';};$('photo-remove').onclick=()=>{img=null;imageData=null;imageRemoved=true;$('image-file').value='';$('image-crop').classList.add('hidden');refreshPhotoActions()};if(item.image){img=new Image();img.onload=()=>{$('image-crop').classList.remove('hidden');configureZoom();drawCrop();refreshPhotoActions()};img.src=item.image}
$('image-file').onchange=e=>{const file=e.target.files[0];if(!file)return;if(!isImageSizeAllowed(file.size)){message('Image trop volumineuse (15 Mo max).');return}const url=URL.createObjectURL(file);img=new Image();img.onload=()=>{URL.revokeObjectURL(url);offsetX=.5;offsetY=.5;configureZoom();$('image-crop').classList.remove('hidden');drawCrop();updateCrop();imageRemoved=false;refreshPhotoActions()};img.onerror=()=>{URL.revokeObjectURL(url);message('Impossible de lire cette image.')};img.src=url};
function drawCrop(){if(!img)return;const canvas=$('crop-canvas'),ctx=canvas.getContext('2d'),zoom=Number($('crop-zoom').value)/100,{x,y,width,height}=getImageCrop(img.width,img.height,canvas.width,canvas.height,zoom,offsetX,offsetY);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,x,y,width,height)}
$('crop-zoom').oninput=()=>{drawCrop();updateCrop()};canvas.style.touchAction='none';
canvas.onpointerdown=e=>{if(!img)return;drag={x:e.clientX,y:e.clientY,ox:offsetX,oy:offsetY};canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(!drag||!img)return;const rect=canvas.getBoundingClientRect(),zoom=Number($('crop-zoom').value)/100,base=Math.max(canvas.width/img.width,canvas.height/img.height)*zoom,w=img.width*base,h=img.height*base,dx=(e.clientX-drag.x)*canvas.width/rect.width,dy=(e.clientY-drag.y)*canvas.height/rect.height;offsetX=moveImageCrop(drag.ox,dx,w,canvas.width);offsetY=moveImageCrop(drag.oy,dy,h,canvas.height);drawCrop()};
canvas.onpointerup=()=>{if(drag){drag=null;updateCrop()}};canvas.onpointercancel=()=>{drag=null};
function updateCrop(){if(!img)return;let quality=.8;do{imageData=canvas.toDataURL('image/jpeg',quality);quality-=.1}while(imageData.length>500000&&quality>.25);if(imageData.length>500000){message('Image trop volumineuse après compression.');imageData=null;return}imageRemoved=false;};
form.onsubmit=async e=>{e.preventDefault();if(!state.user)return;const d=new FormData(form);const data={title:String(d.get('title')).trim(),description:String(d.get('description')),published:d.has('published'),image:imageRemoved?'':(imageData||item.image||''),sortOrder:Number.isFinite(item.sortOrder)?item.sortOrder:state[kind].length,updatedAt:Date.now()};for(const [name] of cfg.fields)data[name]=String(d.get(name)||'');const validation=validateContent(kind,data);if(!validation.valid){message(validation.errors.join(' '));return}saving=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;submit.textContent='Enregistrement…';try{await setDoc(doc(db,kind,id||crypto.randomUUID()),{...data,updatedAt:serverTimestamp()},{merge:true});dismiss();message('Modifications enregistrées sur Firebase.')}catch(err){saving=false;submit.disabled=false;submit.textContent='Enregistrer';message('Erreur Firestore : '+err.message)}};
}
subscribeIntros();render();updateEditableIntros();showRoute();
