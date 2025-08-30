// Elements
const exprEl = document.getElementById('expr');
const resultEl = document.getElementById('result');
const historyEl = document.getElementById('history');
const themeToggle = document.getElementById('themeToggle');
const clearHistoryBtn = document.getElementById('clearHistory');

// State
let expression = "";
let lastResult = null;

// Storage keys
const STORAGE_KEY = 'colorCalc.history';
const THEME_KEY = 'colorCalc.theme';

// -------- Theme --------
function setTheme(mode){
  if(mode === 'light'){
    document.body.classList.add('light');
    themeToggle?.setAttribute('aria-pressed','true');
  }else{
    document.body.classList.remove('light');
    themeToggle?.setAttribute('aria-pressed','false');
  }
  localStorage.setItem(THEME_KEY, mode);
}
function getTheme(){
  return localStorage.getItem(THEME_KEY) || 'dark';
}

// -------- History --------
function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch{ return []; }
}
function saveHistory(exp,res){
  const list = loadHistory();
  list.unshift({exp,res,time:Date.now()});
  while(list.length > 50) list.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  renderHistory();
}
function renderHistory(){
  const list = loadHistory();
  historyEl.innerHTML = '';
  if(!list.length){
    const div = document.createElement('div');
    div.className = 'empty';
    div.textContent = 'Not Even Calculate.';
    historyEl.appendChild(div);
    return;
  }
  list.forEach(it=>{
    const row = document.createElement('div');
    row.className = 'item';
    row.setAttribute('role','listitem');
    row.title = new Date(it.time).toLocaleString();
    row.innerHTML = `
      <div style="flex:1">
        <div class="expr">${escapeHTML(it.exp)}</div>
        <div class="res">${escapeHTML(it.res)}</div>
      </div>`;
    row.onclick = ()=>{
      expression = it.exp;
      exprEl.textContent = expression;
      resultEl.textContent = it.res;
    };
    historyEl.appendChild(row);
  });
}
function clearHistory(){
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}
function escapeHTML(s){
  return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// -------- Calculator core --------
function insert(val){
  const ops = /[+\-*/%]/;
  const last = expression.slice(-1);

  // block two operators in a row (allow negative start or after '(')
  if (ops.test(val) && (!expression || ops.test(last))){
    const allowNeg = (val === '-' && (expression === '' || last === '('));
    if(!allowNeg) return;
  }
  // block multiple decimals in current number segment
  if (val === '.') {
    const seg = currentNumberSegment();
    if (seg.includes('.')) return;
  }

  expression += val;
  exprEl.textContent = expression;
  livePreview();
}
function currentNumberSegment(){
  const parts = expression.split(/[+\-*/()%]/);
  return parts[parts.length-1] || '';
}
function toPercent(){
  const seg = currentNumberSegment();
  if(!seg) return;
  const start = expression.lastIndexOf(seg);
  const num = parseFloat(seg);
  if (isFinite(num)){
    const asPct = (num/100).toString();
    expression = expression.slice(0,start) + asPct + expression.slice(start + seg.length);
    exprEl.textContent = expression;
    livePreview();
  }
}
function clearAll(){
  expression = "";
  lastResult = null;
  exprEl.textContent = "";
  resultEl.textContent = "0";
}
function delOne(){
  expression = expression.slice(0,-1);
  exprEl.textContent = expression;
  if(!expression) resultEl.textContent = "0"; else livePreview();
}

function sanitize(str){
  // allow digits/operators/parentheses/decimal/spaces only
  return /^[0-9+\-*/().%\s]*$/.test(str) ? str : null;
}

function evaluateExpression(){
  if(!expression) return;
  // auto-close parenthesis
  const bal = (expression.match(/\(/g)||[]).length - (expression.match(/\)/g)||[]).length;
  let exp = expression + (bal > 0 ? ')'.repeat(bal) : '');
  exp = exp.replace(/×/g,'*').replace(/÷/g,'/');

  const safe = sanitize(exp);
  if(!safe){ resultEl.textContent = 'Error'; return; }

  try{
    const res = Function('"use strict"; return ('+safe+')')();
    const out = formatNumber(res);
    resultEl.textContent = out;
    saveHistory(expression, out);
    expression = ''+res; // chain calc
    exprEl.textContent = expression;
    lastResult = out;
  }catch{
    resultEl.textContent = 'Error';
  }
}
function livePreview(){
  try{
    const safe = sanitize(expression);
    if(!safe) return;
    const preview = Function('"use strict"; try{return ('+safe+')}catch(e){return null}')();
    if(preview === null || preview === undefined || Number.isNaN(preview)) return;
    resultEl.textContent = formatNumber(preview);
  }catch{}
}
function formatNumber(n){
  if(!isFinite(n)) return 'Error';
  const str = Number(n.toFixed(10)).toString();
  const [a,b] = str.split('.');
  return b ? Number(a).toLocaleString('id-ID') + ',' + b : Number(a).toLocaleString('id-ID');
}

// -------- Bind buttons --------
document.querySelectorAll('.key').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const val = btn.dataset.val;
    const action = btn.dataset.action;
    if(action==='clear') return clearAll();
    if(action==='del') return delOne();
    if(action==='equals') return evaluateExpression();
    if(val==='%') return toPercent();
    insert(val);
  });
});

// Keyboard support
window.addEventListener('keydown', (e)=>{
  const k = e.key;
  if (/\d/.test(k)) { insert(k); return; }
  if (k === '.' || k === ','){ insert('.'); e.preventDefault(); return; }
  if (k === '+' || k === '-' || k === '*' || k === '/'){ insert(k); return; }
  if (k === '(' || k === ')'){ insert(k); return; }
  if (k === '%'){ toPercent(); return; }
  if (k === 'Enter' || k === '='){ evaluateExpression(); e.preventDefault(); return; }
  if (k === 'Backspace'){ delOne(); return; }
  if (k === 'Escape'){ clearAll(); return; }
});

// Toggle theme + clear history
themeToggle.addEventListener('click', ()=>{
  setTheme(document.body.classList.contains('light') ? 'dark':'light');
});
clearHistoryBtn.addEventListener('click', clearHistory);

// -------- Init --------
setTheme(getTheme());
renderHistory();