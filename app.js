const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginSubmit = document.getElementById('login-submit');

function showLoginError(msg){
  loginError.textContent = msg;
  loginError.className = 'status-banner show error';
}
function clearLoginError(){
  loginError.className = 'status-banner';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearLoginError();
  loginSubmit.disabled = true;
  loginSubmit.textContent = 'Signing in…';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  loginSubmit.disabled = false;
  loginSubmit.textContent = 'Sign in';
  if(error){
    showLoginError(error.message || 'Could not sign in. Check your email and password.');
  }
  // On success, onAuthStateChange (below) flips the screens over.
});

async function handleSession(session){
  if(session && session.user){
    loginScreen.style.display = 'none';
    appShell.style.display = 'grid';
    const emailLabel = document.getElementById('signed-in-email');
    if(emailLabel) emailLabel.textContent = session.user.email;
    initAppOnce();
  } else {
    appShell.style.display = 'none';
    loginScreen.style.display = 'flex';
  }
}

db.auth.onAuthStateChange((_event, session) => { handleSession(session); });
db.auth.getSession().then(({ data }) => handleSession(data.session));

let appInitialized = false;
function initAppOnce(){
  if(appInitialized) return;
  appInitialized = true;
  el('doc-date').value = new Date().toISOString().slice(0,10);
  renderItemsEditor();
  setDocType('invoice');
  refreshSavedList();
  const logoutBtn = document.getElementById('logout-btn');
  if(logoutBtn){
    logoutBtn.addEventListener('click', async () => {
      await db.auth.signOut();
    });
  }
}

let docType = 'invoice';
let items = [
  { desc:'', qty:1, price:0 },
  { desc:'', qty:1, price:0 }
];

const el = id => document.getElementById(id);

function showStatus(msg, kind){
  const b = el('status-banner');
  b.textContent = msg;
  b.className = 'status-banner show ' + (kind || '');
  if(kind === 'ok'){
    setTimeout(() => { b.className = 'status-banner'; }, 2500);
  }
}

function fmtMoney(n){
  const c = el('currency').value;
  const val = (isNaN(n) ? 0 : n);
  return c + ' ' + val.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function fmtDate(str){
  if(!str) return '';
  const d = new Date(str + 'T00:00:00');
  if(isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}

function escapeAttr(s){ return (s||'').replace(/"/g,'&quot;'); }
function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderItemsEditor(){
  const wrap = el('items-editor');
  wrap.innerHTML = '';
  items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <input type="text" value="${escapeAttr(item.desc)}" placeholder="Item or service" data-i="${i}" data-f="desc">
      <input type="number" min="0" step="1" class="num-input" value="${item.qty}" data-i="${i}" data-f="qty">
      <input type="number" min="0" step="0.01" class="num-input" value="${item.price}" data-i="${i}" data-f="price">
      <button class="remove-row" data-i="${i}" title="Remove">×</button>
    `;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = +e.target.dataset.i, f = e.target.dataset.f;
      items[i][f] = (f === 'desc') ? e.target.value : parseFloat(e.target.value) || 0;
      renderPreview();
    });
  });
  wrap.querySelectorAll('.remove-row').forEach(btn => {
    btn.addEventListener('click', e => {
      const i = +e.target.dataset.i;
      if(items.length > 1){ items.splice(i,1); renderItemsEditor(); renderPreview(); }
    });
  });
}

function calcTotals(){
  const subtotal = items.reduce((sum, it) => sum + (it.qty * it.price), 0);
  const discountPct = parseFloat(el('discount-pct').value) || 0;
  const taxPct = parseFloat(el('tax-pct').value) || 0;
  const discountAmt = subtotal * (discountPct/100);
  const taxable = subtotal - discountAmt;
  const taxAmt = taxable * (taxPct/100);
  const grand = taxable + taxAmt;
  return { subtotal, discountPct, discountAmt, taxPct, taxAmt, grand };
}

function renderPreview(){
  el('p-biz-name').textContent = el('biz-name').value || 'Your Business Name';
  el('p-biz-meta').innerHTML = escapeHtml(el('biz-meta').value || 'Address line\nPhone / email').replace(/\n/g,'<br>');
  el('p-client-name').textContent = el('client-name').value || 'Client name';
  el('p-client-addr').innerHTML = escapeHtml(el('client-addr').value).replace(/\n/g,'<br>');
  el('p-kind').textContent = docType.toUpperCase();
  el('p-num').textContent = el('doc-number').value || (docType === 'invoice' ? 'INV-0001' : 'RCT-0001');

  let dateHtml = 'Issued ' + (fmtDate(el('doc-date').value) || '—');
  if(docType === 'invoice'){
    dateHtml += '<br>Due ' + (fmtDate(el('due-date').value) || '—');
  }
  el('p-dates').innerHTML = dateHtml;

  el('p-paid-stamp').innerHTML = docType === 'receipt' ? '<span class="paid-stamp">PAID</span>' : '';

  const tbody = el('p-items');
  tbody.innerHTML = '';
  items.forEach(it => {
    const tr = document.createElement('tr');
    const total = it.qty * it.price;
    tr.innerHTML = `<td>${escapeHtml(it.desc) || '<span style="color:var(--ink-soft)">—</span>'}</td>
      <td class="num">${it.qty}</td>
      <td class="num">${fmtMoney(it.price)}</td>
      <td class="num">${fmtMoney(total)}</td>`;
    tbody.appendChild(tr);
  });

  const t = calcTotals();
  let totalsHtml = `<div class="line"><span>Subtotal</span><span class="val">${fmtMoney(t.subtotal)}</span></div>`;
  if(t.discountPct > 0){
    totalsHtml += `<div class="line muted"><span>Discount (${t.discountPct}%)</span><span class="val">−${fmtMoney(t.discountAmt)}</span></div>`;
  }
  if(t.taxPct > 0){
    totalsHtml += `<div class="line muted"><span>Tax / VAT (${t.taxPct}%)</span><span class="val">+${fmtMoney(t.taxAmt)}</span></div>`;
  }
  totalsHtml += `<div class="line grand"><span>${docType === 'invoice' ? 'Amount due' : 'Total paid'}</span><span class="val">${fmtMoney(t.grand)}</span></div>`;
  el('p-totals').innerHTML = totalsHtml;

  if(docType === 'receipt'){
    const method = el('pay-method').value;
    const paidDate = fmtDate(el('paid-date').value);
    let extra = '';
    if(method) extra += `Payment method: ${escapeHtml(method)}\n`;
    if(paidDate) extra += `Date paid: ${paidDate}\n`;
    const userNotes = el('notes').value;
    const combined = (extra + (userNotes||'')).trim();
    if(combined){ el('p-notes-wrap').style.display='block'; el('p-notes').innerHTML = escapeHtml(combined).replace(/\n/g,'<br>'); }
    else { el('p-notes-wrap').style.display='none'; }
  } else {
    const userNotes = el('notes').value;
    if(userNotes.trim()){ el('p-notes-wrap').style.display='block'; el('p-notes').innerHTML = escapeHtml(userNotes).replace(/\n/g,'<br>'); }
    else { el('p-notes-wrap').style.display='none'; }
  }
}

function setDocType(type){
  docType = type;
  el('tab-invoice').classList.toggle('active', type==='invoice');
  el('tab-receipt').classList.toggle('active', type==='receipt');
  el('numlabel').textContent = type==='invoice' ? 'Invoice #' : 'Receipt #';
  el('due-row').style.display = type==='invoice' ? 'grid' : 'none';
  el('paid-row').style.display = type==='receipt' ? 'grid' : 'none';
  if(!el('doc-number').value){
    el('doc-number').value = type==='invoice' ? 'INV-0001' : 'RCT-0001';
  }
  renderPreview();
}

['biz-name','biz-meta','client-name','client-addr','doc-number','doc-date','due-date',
 'currency','pay-method','paid-date','discount-pct','tax-pct','notes'].forEach(id => {
  el(id).addEventListener('input', renderPreview);
  el(id).addEventListener('change', renderPreview);
});

el('tab-invoice').addEventListener('click', () => setDocType('invoice'));
el('tab-receipt').addEventListener('click', () => setDocType('receipt'));

el('add-item').addEventListener('click', () => {
  items.push({ desc:'', qty:1, price:0 });
  renderItemsEditor();
  renderPreview();
});

el('print-btn').addEventListener('click', () => window.print());

function collectRow(){
  return {
    doc_type: docType,
    doc_number: el('doc-number').value,
    biz_name: el('biz-name').value,
    biz_meta: el('biz-meta').value,
    client_name: el('client-name').value,
    client_addr: el('client-addr').value,
    doc_date: el('doc-date').value || null,
    due_date: el('due-date').value || null,
    currency: el('currency').value,
    pay_method: el('pay-method').value,
    paid_date: el('paid-date').value || null,
    discount_pct: parseFloat(el('discount-pct').value) || 0,
    tax_pct: parseFloat(el('tax-pct').value) || 0,
    notes: el('notes').value,
    items: items
  };
}

function applyRow(row){
  docType = row.doc_type || 'invoice';
  items = (row.items && row.items.length) ? row.items : [{desc:'',qty:1,price:0}];
  el('biz-name').value = row.biz_name || '';
  el('biz-meta').value = row.biz_meta || '';
  el('client-name').value = row.client_name || '';
  el('client-addr').value = row.client_addr || '';
  el('doc-number').value = row.doc_number || '';
  el('doc-date').value = row.doc_date || '';
  el('due-date').value = row.due_date || '';
  el('currency').value = row.currency || 'GH₵';
  el('pay-method').value = row.pay_method || '';
  el('paid-date').value = row.paid_date || '';
  el('discount-pct').value = row.discount_pct || 0;
  el('tax-pct').value = row.tax_pct || 0;
  el('notes').value = row.notes || '';
  renderItemsEditor();
  setDocType(docType);
}

async function saveDocument(){
  const btn = el('save-btn');
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Saving…';
  try{
    const row = collectRow();
    const { error } = await db.from('documents').insert(row);
    if(error) throw error;
    showStatus('Saved to database.', 'ok');
    await refreshSavedList();
  } catch(err){
    console.error(err);
    showStatus('Could not save: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function refreshSavedList(){
  const listEl = el('saved-list');
  try{
    const { data, error } = await db
      .from('documents')
      .select('*')
      .order('created_at', { ascending:false })
      .limit(20);
    if(error) throw error;
    if(!data || data.length === 0){
      listEl.innerHTML = '<div class="saved-empty">No saved documents yet.</div>';
      return;
    }
    listEl.innerHTML = '';
    data.forEach(row => {
      const item = document.createElement('div');
      item.className = 'saved-item';
      const label = (row.doc_number || 'Untitled') + ' — ' + (row.client_name || 'no client');
      item.innerHTML = `<span>${escapeHtml(label)}</span>
        <span class="links">
          <button class="load-btn" data-id="${row.id}">Load</button>
          <button class="del" data-id="${row.id}">Delete</button>
        </span>`;
      listEl.appendChild(item);
    });
    listEl.querySelectorAll('.load-btn').forEach(b => {
      b.addEventListener('click', async e => {
        const { data, error } = await db.from('documents').select('*').eq('id', e.target.dataset.id).single();
        if(!error && data) applyRow(data);
      });
    });
    listEl.querySelectorAll('.del').forEach(b => {
      b.addEventListener('click', async e => {
        if(!confirm('Delete this document permanently?')) return;
        const { error } = await db.from('documents').delete().eq('id', e.target.dataset.id);
        if(error){ showStatus('Could not delete: ' + error.message, 'error'); }
        else { await refreshSavedList(); }
      });
    });
  } catch(err){
    console.error(err);
    listEl.innerHTML = '<div class="saved-error">Could not load saved documents. Check your Supabase config in config.js.</div>';
  }
}

el('save-btn').addEventListener('click', saveDocument);
