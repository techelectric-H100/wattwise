import { firebaseConfig } from './firebase-config.js';
import { energyKwh, deviceCost, totals, simulateDevice } from './calculations.mjs';

// Firebase dimuat saat konfigurasi lengkap. Mode Demo tetap dapat dipakai tanpanya.
const SDK = 'https://www.gstatic.com/firebasejs/12.19.0';
const $ = (id) => document.getElementById(id);
const categories = ['Pendingin', 'Penerangan', 'Dapur', 'Elektronik', 'Lainnya'];
const catColors = {Pendingin:'#6d5bed',Penerangan:'#f4b05d',Dapur:'#48b99b',Elektronik:'#69a4ee',Lainnya:'#af9fcf'};
const defaults = {displayName:'Pengguna WattWise',tariff:1500,budget:250000};
const sampleDevices = [
  {id:'demo-ac',name:'AC Kamar',category:'Pendingin',watt:500,hoursPerDay:8,daysPerMonth:30,quantity:1},
  {id:'demo-led',name:'Lampu LED',category:'Penerangan',watt:12,hoursPerDay:6,daysPerMonth:30,quantity:4},
  {id:'demo-laptop',name:'Laptop',category:'Elektronik',watt:65,hoursPerDay:5,daysPerMonth:25,quantity:1},
  {id:'demo-kipas',name:'Kipas Angin',category:'Pendingin',watt:45,hoursPerDay:10,daysPerMonth:30,quantity:1},
  {id:'demo-rice',name:'Rice Cooker',category:'Dapur',watt:300,hoursPerDay:2,daysPerMonth:30,quantity:1}
];
const state = {mode:null,user:null,profile:{...defaults},devices:[],page:'dashboard',search:'',editingId:null,simId:null,simHours:null,authTab:'login',unsubProfile:null,unsubDevices:null,pendingRegistrationName:null};
let firebase = null;

function configured() {
  return ['apiKey','authDomain','projectId','appId'].every(k=>typeof firebaseConfig[k]==='string' && !!firebaseConfig[k] && !firebaseConfig[k].includes('GANTI_'));
}
function icon(name){return `<svg class="icon"><use href="#i-${name}"/></svg>`;}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function numberFormat(value,max=1){return new Intl.NumberFormat('id-ID',{maximumFractionDigits:max}).format(Number(value)||0);}
function money(value){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value)||0).replace(/\s/g,'');}
function toast(message,error=false){const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;$('toast-container').append(el);setTimeout(()=>el.remove(),4200);}
function friendlyError(error){const code=error?.code||'';const messages={
  'auth/invalid-email':'Alamat email tidak valid.',
  'auth/email-already-in-use':'Email sudah terdaftar. Silakan masuk.',
  'auth/weak-password':'Password terlalu lemah. Gunakan minimal 6 karakter.',
  'auth/invalid-credential':'Email atau password salah.',
  'auth/wrong-password':'Password salah.',
  'auth/user-not-found':'Akun tidak ditemukan.',
  'auth/too-many-requests':'Terlalu banyak percobaan. Coba lagi nanti.',
  'auth/operation-not-allowed':'Login email/password belum diaktifkan di Firebase Authentication.',
  'auth/unauthorized-domain':'Domain belum diizinkan. Tambahkan domain GitHub Pages di Authentication > Settings > Authorized domains.',
  'permission-denied':'Akses ditolak Firestore. Pastikan Security Rules sudah dipublikasikan.',
  'unavailable':'Layanan tidak tersedia. Periksa internet dan coba lagi.'
};return messages[code]||error?.message||'Terjadi kesalahan yang tidak diketahui.';}
function stopListeners(){for(const key of ['unsubProfile','unsubDevices']){if(state[key]){state[key]();state[key]=null;}}}
function saveDemo(){try{localStorage.setItem('wattwise-demo-v1',JSON.stringify({profile:state.profile,devices:state.devices}));}catch{toast('Browser tidak mengizinkan penyimpanan demo.',true);}}
function startDemo(){
  stopListeners();state.mode='demo';state.user={uid:'demo-user',email:'demo@wattwise.local'};
  let data=null;try{data=JSON.parse(localStorage.getItem('wattwise-demo-v1')||'null');}catch{}
  state.profile=(data?.profile&&typeof data.profile==='object')?{...defaults,...data.profile}:{...defaults,displayName:'Pengguna Demo'};
  state.devices=Array.isArray(data?.devices)?data.devices:sampleDevices.map(d=>({...d}));
  if(!data)saveDemo();state.page='dashboard';state.simId=null;state.simHours=null;
  showSession();toast('Mode Demo aktif — data contoh, tersimpan di browser ini.');
}
function leaveSession(){stopListeners();state.mode=null;state.user=null;state.devices=[];state.page='dashboard';state.simId=null;state.simHours=null;showAuth();}
function showAuth(){closeModal();$('app-view').hidden=true;$('auth-view').hidden=false;renderAuthTab();}
function showSession(){
  $('auth-view').hidden=true;$('app-view').hidden=false;state.search='';$('device-search').value='';navigate('dashboard');renderAll();
}
function renderAuthTab(){
  const tab=state.authTab;
  $('auth-title').textContent=tab==='login'?'Masuk ke WattWise':tab==='register'?'Buat akun WattWise':'Reset password';
  $('auth-description').textContent=tab==='login'?'Kelola pemakaian listrikmu dengan lebih cerdas.':tab==='register'?'Buat akun gratis untuk menyimpan data secara online.':'Kami akan mengirimkan tautan reset ke emailmu.';
  $('auth-name-wrap').hidden=tab!=='register';$('auth-password-wrap').hidden=tab==='reset';
  $('auth-password').required=tab!=='reset';$('auth-password').autocomplete=tab==='register'?'new-password':'current-password';
  $('auth-name').required=tab==='register';$('forgot-password').hidden=tab!=='login';
  $('auth-submit').innerHTML=(tab==='login'?'Masuk':tab==='register'?'Daftar':'Kirim tautan reset')+' '+icon('arrow');
  $('auth-switch-wrap').firstChild.textContent=tab==='register'?'Sudah punya akun? ':tab==='login'?'Belum punya akun? ':'Kembali ke halaman masuk? ';
  $('auth-toggle').textContent=tab==='register'||tab==='reset'?'Masuk':'Daftar sekarang';
  $('auth-error').hidden=true;
}
async function initFirebase(){
  $('config-hint').hidden=configured();
  if(!configured())return;
  try{
    const [appSDK,authSDK,dbSDK]=await Promise.all([
      import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-auth.js`),import(`${SDK}/firebase-firestore.js`)
    ]);
    const app=appSDK.initializeApp(firebaseConfig);
    firebase={auth:authSDK.getAuth(app),db:dbSDK.getFirestore(app),...authSDK,...dbSDK};
    authSDK.onAuthStateChanged(firebase.auth,async user=>{
      stopListeners();if(!user){if(state.mode==='firebase')leaveSession();return;}
      state.mode='firebase';state.user=user;state.devices=[];state.profile={...defaults,displayName:state.pendingRegistrationName||user.displayName||user.email?.split('@')[0]||'Pengguna'};
      showSession();
      await startCloudListeners(user);
    },error=>toast(friendlyError(error),true));
  }catch(err){toast('Gagal memuat Firebase. Periksa koneksi internet atau konfigurasi.',true);console.error('Firebase init:',err);}
}
async function startCloudListeners(user){
  const uid=user.uid;
  const userRef=firebase.doc(firebase.db,'users',uid);
  try{
    const existing=await firebase.getDoc(userRef);
    if(state.mode!=='firebase'||state.user?.uid!==uid)return;
    if(!existing.exists()){
      await firebase.setDoc(userRef,{...state.profile,createdAt:firebase.serverTimestamp(),updatedAt:firebase.serverTimestamp()});
    }
    if(state.mode!=='firebase'||state.user?.uid!==uid)return;
    state.pendingRegistrationName=null;
    state.unsubProfile=firebase.onSnapshot(userRef,snap=>{
      if(state.mode!=='firebase'||state.user?.uid!==uid)return;
      if(snap.exists())state.profile={...defaults,...snap.data()};
      renderAll();
    },err=>toast('Gagal membaca profil: '+friendlyError(err),true));
    const devicesRef=firebase.collection(firebase.db,'users',uid,'devices');
    state.unsubDevices=firebase.onSnapshot(devicesRef,snapshot=>{
      if(state.mode!=='firebase'||state.user?.uid!==uid)return;
      state.devices=snapshot.docs.map(d=>({id:d.id,...d.data()}));
      renderAll();
    },err=>toast('Gagal membaca perangkat: '+friendlyError(err),true));
  }catch(err){toast('Gagal membuka data Firebase: '+friendlyError(err),true);}
}
async function doAuth(event){
  event.preventDefault();$('auth-error').hidden=true;
  if(!firebase){$('auth-error').textContent='Firebase belum siap. Isi firebase-config.js dan pastikan koneksi internet aktif, atau gunakan Mode Demo.';$('auth-error').hidden=false;return;}
  const email=$('auth-email').value.trim(),password=$('auth-password').value,name=$('auth-name').value.trim(),tab=state.authTab;
  const submit=$('auth-submit');submit.disabled=true;
  try{
    if(tab==='login')await firebase.signInWithEmailAndPassword(firebase.auth,email,password);
    else if(tab==='register'){
      if(!name)throw new Error('Nama tidak boleh kosong.');
      state.pendingRegistrationName=name;
      const credential=await firebase.createUserWithEmailAndPassword(firebase.auth,email,password);
      // Observer auth membuat profil Firestore menggunakan pendingRegistrationName.
      await firebase.updateProfile(credential.user,{displayName:name});
      toast('Akun berhasil dibuat!');
    }else{
      await firebase.sendPasswordResetEmail(firebase.auth,email);toast('Jika akun tersedia, email reset password akan dikirim.');
      state.authTab='login';renderAuthTab();
    }
  }catch(err){state.pendingRegistrationName=null;$('auth-error').textContent=friendlyError(err);$('auth-error').hidden=false;}
  finally{submit.disabled=false;}
}
function navigate(page){
  if(!['dashboard','devices','simulator','settings'].includes(page))page='dashboard';
  state.page=page;
  document.querySelectorAll('.page-section').forEach(el=>el.hidden=el.id!==`page-${page}`);
  document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===page));
  const info={dashboard:['Ringkasan','OVERVIEW','Ringkasan energi','Pantau estimasi konsumsi dan biaya listrik bulananmu.'],devices:['Perangkat listrik','MANAGE DEVICES','Perangkat listrik','Kelola semua peralatan yang ingin kamu pantau.'],simulator:['Simulasi hemat','ENERGY SIMULATOR','Simulasi hemat listrik','Eksplorasi perubahan biaya dari kebiasaan penggunaan.'],settings:['Pengaturan','PREFERENCES','Pengaturan akun','Atur profil, tarif simulasi, dan anggaran bulanan.']}[page];
  $('breadcrumb-page').textContent=info[0];$('page-overline').textContent=info[1];$('page-title').textContent=info[2];$('page-subtitle').textContent=info[3];
  $('header-action').hidden=page==='settings'||page==='simulator';
  $('sidebar').classList.remove('open');$('mobile-overlay').hidden=true;
  if(page==='simulator')renderSimulator();
  if(page==='settings')renderSettings();
  window.scrollTo({top:0,behavior:'instant'});
}
function renderAll(){
  if(!state.mode)return;
  $('mode-badge').textContent=state.mode==='demo'?'MODE DEMO':'by.HAIKAL';
  $('mode-badge').classList.toggle('is-online',state.mode==='firebase');
  const name=state.profile.displayName||'Pengguna';
  $('top-user-name').textContent=name;$('top-user-caption').textContent=state.mode==='demo'?'Data lokal':'Data Firebase';
  $('user-avatar').textContent=name.slice(0,1).toUpperCase();
  renderDashboard();renderDevices();renderSimulator();if(state.page==='settings')renderSettings();
}
function renderDashboard(){
  const data=totals(state.devices,state.profile.tariff),budget=Number(state.profile.budget)||0;
  $('stat-kwh').innerHTML=`${numberFormat(data.kwh)} <small>kWh</small>`;
  $('stat-cost').textContent=money(data.cost);$('stat-devices').textContent=String(state.devices.length);
  $('stat-unit-foot').textContent=`${numberFormat(data.units,0)} unit perangkat`;
  $('stat-budget').textContent=money(budget-data.cost);
  $('stat-budget-foot').textContent=budget<data.cost?'Estimasi biaya melewati anggaran':budget?'Masih dalam batas anggaran':'Atur anggaran di Pengaturan';
  $('budget-used').textContent='Terpakai '+money(data.cost);$('budget-limit').textContent='Anggaran '+money(budget);
  const ratio=budget>0?(data.cost/budget)*100:0;
  $('budget-ratio').textContent=budget>0?numberFormat(ratio,0)+'%':'—';
  $('budget-progress').style.width=Math.max(0,Math.min(100,ratio))+'%';
  $('budget-progress').classList.toggle('over',ratio>100);
  const sorted=[...state.devices].sort((a,b)=>energyKwh(b)-energyKwh(a)).slice(0,5);
  const max=Math.max(1,...sorted.map(energyKwh));
  $('device-bars').innerHTML=sorted.length?sorted.map(d=>`<div class="bar-line"><div class="bar-meta"><span title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</span><strong>${numberFormat(energyKwh(d))} kWh</strong></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,Math.min(100,energyKwh(d)/max*100))}%"></div></div></div>`).join(''):'<p class="empty-inline">Belum ada data perangkat.<br>Tambahkan perangkat agar grafik muncul.</p>';
  const values=categories.map(c=>({name:c,kwh:state.devices.filter(d=>d.category===c).reduce((sum,d)=>sum+energyKwh(d),0)})).filter(d=>d.kwh>0);
  $('donut-total').textContent=numberFormat(data.kwh);
  let progress=0;
  const gradient=values.map(d=>{const start=progress;progress+=data.kwh>0?(d.kwh/data.kwh)*100:0;return `${catColors[d.name]} ${start}% ${progress}%`;}).join(',');
  $('category-donut').style.background=values.length?`conic-gradient(${gradient})`:'#eff0f6';
  $('category-legend').innerHTML=values.length?values.map(d=>`<div class="legend-row"><i class="legend-dot" style="background:${catColors[d.name]}"></i><span class="legend-name">${d.name}</span><strong>${numberFormat(d.kwh/data.kwh*100,0)}%</strong></div>`).join(''):'<p class="empty-inline">Belum ada kategori</p>';
}
function renderDevices(){
  const query=state.search.toLocaleLowerCase('id-ID');
  const filtered=[...state.devices].filter(d=>d.name.toLocaleLowerCase('id-ID').includes(query)||d.category.toLocaleLowerCase('id-ID').includes(query)).sort((a,b)=>a.name.localeCompare(b.name,'id'));
  $('device-tbody').innerHTML=filtered.map(d=>`<tr><td><span class="device-name">${escapeHtml(d.name)}</span><span class="device-category">${escapeHtml(d.category)}</span></td><td>${numberFormat(d.watt)} W</td><td>${numberFormat(d.hoursPerDay)} jam</td><td>${numberFormat(d.daysPerMonth,0)}</td><td>${numberFormat(d.quantity,0)}</td><td class="strong-cell">${numberFormat(energyKwh(d))}</td><td>${money(deviceCost(d,state.profile.tariff))}</td><td class="right"><div class="action-buttons"><button class="table-action" data-edit-id="${escapeHtml(d.id)}" title="Edit perangkat" aria-label="Edit ${escapeHtml(d.name)}">${icon('edit')}</button><button class="table-action delete" data-delete-id="${escapeHtml(d.id)}" title="Hapus perangkat" aria-label="Hapus ${escapeHtml(d.name)}">${icon('trash')}</button></div></td></tr>`).join('');
  $('device-empty').hidden=state.devices.length>0||!!state.search;
  if(state.devices.length===0||filtered.length===0){$('device-tbody').innerHTML=`<tr><td colspan="8" style="text-align:center;color:#9da5b8;padding:35px">${state.devices.length===0?'Tidak ada data perangkat.':'Tidak ada perangkat yang cocok.'}</td></tr>`;}
}
function renderSimulator(){
  const select=$('sim-device');
  const known=state.devices.some(d=>d.id===state.simId);
  if(!known){state.simId=state.devices[0]?.id||null;state.simHours=null;}
  select.innerHTML=state.devices.length?state.devices.map(d=>`<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join(''):'<option value="">Tambahkan perangkat dahulu</option>';
  select.disabled=!state.devices.length;
  if(!state.devices.length){
    $('sim-old-hours').textContent='—';$('sim-new-hours').textContent='0 jam/hari';$('sim-hours').value=0;$('sim-hours').disabled=true;
    $('sim-saving').textContent='Rp0';$('sim-before').textContent='Rp0';$('sim-after').textContent='Rp0';$('sim-result-title').textContent='Potensi hemat per bulan';$('sim-result-subtitle').textContent='Tambahkan perangkat untuk mulai simulasi.';return;
  }
  select.value=state.simId;
  const device=state.devices.find(d=>d.id===state.simId);
  if(state.simHours===null)state.simHours=Number(device.hoursPerDay);
  const hours=Math.max(0,Math.min(24,Number(state.simHours)));
  $('sim-hours').disabled=false;$('sim-hours').value=hours;
  $('sim-old-hours').textContent=numberFormat(device.hoursPerDay)+' jam/hari';
  $('sim-new-hours').textContent=numberFormat(hours)+' jam/hari';
  const data=simulateDevice(device,hours,state.profile.tariff);
  $('sim-result-title').textContent=data.saving>=0?'Potensi hemat per bulan':'Tambahan biaya per bulan';
  $('sim-saving').textContent=money(Math.abs(data.saving));
  $('sim-result-subtitle').textContent=data.saving>0?`Mengurangi penggunaan ${device.name} dapat menekan estimasi biaya.`:data.saving<0?`Menambah durasi ${device.name} meningkatkan estimasi biaya.`:'Belum ada perbedaan dibanding durasi saat ini.';
  $('sim-before').textContent=money(data.before);$('sim-after').textContent=money(data.after);
}
function renderSettings(){
  $('settings-name').value=state.profile.displayName||'';
  $('settings-tariff').value=state.profile.tariff;
  $('settings-budget').value=state.profile.budget;
  $('account-email').textContent=state.mode==='demo'?'Tidak menggunakan akun (demo)':state.user?.email||'—';
  $('account-description').textContent=state.mode==='demo'?'Mode Demo menyimpan data di localStorage browser, bukan Firebase.':'Setiap akun mengakses profil dan perangkatnya sendiri melalui Cloud Firestore dengan Security Rules.';
}
function modalPreview(){const fields=readDeviceForm(false);$('modal-preview').textContent=numberFormat(energyKwh(fields))+' kWh/bulan';}
function readDeviceForm(validate=true){
  const d={name:$('device-name').value.trim(),category:$('device-category').value,watt:Number($('device-watt').value),hoursPerDay:Number($('device-hours').value),daysPerMonth:Number($('device-days').value),quantity:Number($('device-qty').value)};
  if(validate){
    if(d.name.length<1||d.name.length>60)throw new Error('Nama perangkat harus 1–60 karakter.');
    if(!categories.includes(d.category))throw new Error('Kategori tidak dikenal.');
    if(!Number.isFinite(d.watt)||d.watt<=0||d.watt>50000)throw new Error('Daya harus lebih dari 0 dan maksimal 50.000 Watt.');
    if(!Number.isFinite(d.hoursPerDay)||d.hoursPerDay<0||d.hoursPerDay>24)throw new Error('Jam per hari harus 0–24.');
    if(!Number.isInteger(d.daysPerMonth)||d.daysPerMonth<1||d.daysPerMonth>31)throw new Error('Hari per bulan harus 1–31.');
    if(!Number.isInteger(d.quantity)||d.quantity<1||d.quantity>100)throw new Error('Jumlah unit harus bilangan bulat 1–100.');
  }
  return d;
}
function openModal(id=null){
  state.editingId=id;const device=state.devices.find(d=>d.id===id);
  $('device-form').reset();$('device-category').value=device?.category||'Pendingin';
  $('device-name').value=device?.name||'';$('device-watt').value=device?.watt||'';$('device-hours').value=device?.hoursPerDay??'';
  $('device-days').value=device?.daysPerMonth||30;$('device-qty').value=device?.quantity||1;
  $('modal-title').textContent=device?'Edit perangkat':'Tambah perangkat';$('device-submit').textContent=device?'Simpan perubahan':'Simpan perangkat';
  modalPreview();$('device-modal').hidden=false;document.body.style.overflow='hidden';$('device-name').focus();
}
function closeModal(){$('device-modal').hidden=true;document.body.style.overflow='';state.editingId=null;}
async function saveDevice(event){
  event.preventDefault();const button=$('device-submit');let device;
  try{device=readDeviceForm();}catch(err){toast(err.message,true);return;}
  button.disabled=true;
  try{
    if(state.mode==='demo'){
      if(state.editingId)state.devices=state.devices.map(d=>d.id===state.editingId?{...d,...device}:d);
      else state.devices.push({...device,id:(globalThis.crypto?.randomUUID?.()||'dev-'+Date.now())});
      saveDemo();
    }else{
      const uid=state.user.uid,ref=state.editingId?firebase.doc(firebase.db,'users',uid,'devices',state.editingId):firebase.doc(firebase.collection(firebase.db,'users',uid,'devices'));
      if(state.editingId)await firebase.updateDoc(ref,{...device,updatedAt:firebase.serverTimestamp()});
      else await firebase.setDoc(ref,{...device,createdAt:firebase.serverTimestamp(),updatedAt:firebase.serverTimestamp()});
    }
    const edited=!!state.editingId;closeModal();renderAll();toast(edited?'Perangkat berhasil diperbarui.':'Perangkat berhasil ditambahkan.');
  }catch(err){toast('Gagal menyimpan perangkat: '+friendlyError(err),true);}finally{button.disabled=false;}
}
async function deleteDevice(id){
  const device=state.devices.find(d=>d.id===id);if(!device)return;
  if(!window.confirm(`Hapus perangkat "${device.name}"? Tindakan ini tidak dapat dibatalkan.`))return;
  try{
    if(state.mode==='demo'){state.devices=state.devices.filter(d=>d.id!==id);saveDemo();}
    else await firebase.deleteDoc(firebase.doc(firebase.db,'users',state.user.uid,'devices',id));
    renderAll();toast('Perangkat berhasil dihapus.');
  }catch(err){toast('Gagal menghapus perangkat: '+friendlyError(err),true);}
}
async function saveSettings(event){
  event.preventDefault();const button=$('settings-save');
  const displayName=$('settings-name').value.trim(),tariff=Number($('settings-tariff').value),budget=Number($('settings-budget').value);
  if(!displayName||displayName.length>60){toast('Nama harus 1–60 karakter.',true);return;}
  if(!Number.isFinite(tariff)||tariff<=0||tariff>100000){toast('Tarif harus lebih dari 0 sampai Rp100.000/kWh.',true);return;}
  if(!Number.isInteger(budget)||budget<0||budget>1e9){toast('Anggaran harus bilangan bulat Rp0–Rp1 miliar.',true);return;}
  button.disabled=true;
  try{
    if(state.mode==='demo'){state.profile={...state.profile,displayName,tariff,budget};saveDemo();}
    else await firebase.updateDoc(firebase.doc(firebase.db,'users',state.user.uid),{displayName,tariff,budget,updatedAt:firebase.serverTimestamp()});
    renderAll();toast('Pengaturan berhasil disimpan.');
  }catch(err){toast('Gagal menyimpan pengaturan: '+friendlyError(err),true);}finally{button.disabled=false;}
}
function exportCSV(){
  const columns=['Nama','Kategori','Watt','Jam per Hari','Hari per Bulan','Jumlah','kWh per Bulan','Biaya per Bulan (Rp)'];
  const rows=state.devices.map(d=>[d.name,d.category,d.watt,d.hoursPerDay,d.daysPerMonth,d.quantity,energyKwh(d).toFixed(3),deviceCost(d,state.profile.tariff).toFixed(2)]);
  const quote=s=>{const value=String(s??'');const safe=/^[\s]*[=+@-]/.test(value)?'\''+value:value;return '"'+safe.replaceAll('"','""')+'"';};
  const csv='\uFEFF'+[columns,...rows].map(row=>row.map(quote).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');a.href=url;a.download='wattwise-perangkat.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('CSV berhasil diekspor.');
}
function attachEvents(){
  $('auth-form').addEventListener('submit',doAuth);
  $('auth-toggle').addEventListener('click',()=>{state.authTab=state.authTab==='login'?'register':'login';renderAuthTab();});
  $('forgot-password').addEventListener('click',()=>{state.authTab='reset';renderAuthTab();});
  $('demo-button').addEventListener('click',startDemo);
  $('menu-button').addEventListener('click',()=>{$('sidebar').classList.add('open');$('mobile-overlay').hidden=false;});
  $('mobile-overlay').addEventListener('click',()=>{$('sidebar').classList.remove('open');$('mobile-overlay').hidden=true;});
  document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.nav)));
  document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();navigate(el.dataset.go);}));
  document.querySelectorAll('[data-add-device]').forEach(el=>el.addEventListener('click',()=>openModal()));
  document.querySelectorAll('[data-close-modal]').forEach(el=>el.addEventListener('click',closeModal));
  $('device-modal').addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  $('device-form').addEventListener('submit',saveDevice);
  for(const id of ['device-watt','device-hours','device-days','device-qty'])$(id).addEventListener('input',modalPreview);
  $('device-search').addEventListener('input',e=>{state.search=e.target.value;renderDevices();});
  $('device-tbody').addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-id]'),del=e.target.closest('[data-delete-id]');
    if(edit)openModal(edit.dataset.editId);else if(del)deleteDevice(del.dataset.deleteId);
  });
  $('export-button').addEventListener('click',exportCSV);
  $('sim-device').addEventListener('change',e=>{state.simId=e.target.value;state.simHours=null;renderSimulator();});
  $('sim-hours').addEventListener('input',e=>{state.simHours=Number(e.target.value);renderSimulator();});
  $('settings-form').addEventListener('submit',saveSettings);
  $('logout-button').addEventListener('click',async()=>{
    if(state.mode==='demo'){leaveSession();toast('Keluar dari Mode Demo.');return;}
    try{await firebase.signOut(firebase.auth);leaveSession();toast('Berhasil keluar.');}catch(err){toast(friendlyError(err),true);}
  });
}
attachEvents();renderAuthTab();initFirebase();
