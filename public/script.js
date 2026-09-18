const OPEN_HOUR = 12;
const CLOSE_HOUR = 22;
const STEP_MINUTES = 30;
const $ = (id) => document.getElementById(id);

const prices = {30: 40, 60: 70, 90: 100, 120: 140};
let publicBookings = [];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function toMinutes(t) { const [h,m] = t.split(':').map(Number); return h*60+m; }
function fromMinutes(n) { return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }
function overlaps(startA, durationA, startB, durationB) {
  const a = toMinutes(startA), b = toMinutes(startB);
  return a < b + Number(durationB) && b < a + Number(durationA);
}

function fillTimes() {
  const duration = Number($('duration').value);
  const select = $('time');
  const current = select.value;
  select.innerHTML = '';
  const latest = CLOSE_HOUR*60 - duration;
  for (let t=OPEN_HOUR*60; t<=latest; t+=STEP_MINUTES) {
    const option = document.createElement('option');
    option.value = fromMinutes(t); option.textContent = option.value;
    select.appendChild(option);
  }
  if ([...select.options].some(o=>o.value===current)) select.value=current;
}

async function loadAvailability() {
  const date = $('date').value;
  $('selectedDateLabel').textContent = date ? new Date(date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'}) : '—';
  if (!date) return;
  try {
    const r = await fetch(`/api/availability?date=${encodeURIComponent(date)}`, {cache:'no-store'});
    publicBookings = r.ok ? await r.json() : [];
  } catch { publicBookings = []; }
  renderSlots();
}

function renderSlots() {
  const date = $('date').value;
  const duration = Number($('duration').value);
  const list = $('slotList');
  if (!date) { list.innerHTML=''; return; }
  const latest = CLOSE_HOUR*60-duration;
  const items=[];
  for (let t=OPEN_HOUR*60; t<=latest; t+=STEP_MINUTES) {
    const time=fromMinutes(t);
    const busy=publicBookings.some(b=>overlaps(time,duration,b.time,b.duration));
    items.push(`<button type="button" class="slot ${busy?'busy':''}" ${busy?'disabled':''} data-time="${time}"><span>${time}</span><small>${busy?'BOOKED':'AVAILABLE'}</small></button>`);
  }
  list.innerHTML=items.join('');
  list.querySelectorAll('.slot:not(.busy)').forEach(btn=>btn.addEventListener('click',()=>{$('time').value=btn.dataset.time; renderSlots();}));
}

$('date').min = todayISO();
$('date').value = todayISO();
$('duration').addEventListener('change',()=>{ fillTimes(); renderSlots(); $('total').textContent='₹'+prices[$('duration').value]; });
$('date').addEventListener('change',loadAvailability);
$('time').addEventListener('change',renderSlots);
fillTimes();
loadAvailability();

$('bookingForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload={
    date:$('date').value, time:$('time').value, duration:Number($('duration').value), players:Number($('players').value),
    name:$('name').value.trim(), phone:$('phone').value.trim(), notes:$('notes').value.trim(), amount:prices[$('duration').value]
  };
  const result=$('bookingResult'); result.className='result'; result.textContent='Checking slot…';
  try {
    const r=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||'Booking failed');
    result.textContent=`Booking confirmed! ID: ${data.id}. Please call 7870075241 if you need to change it.`;
    result.className='result success';
    $('name').value=''; $('phone').value=''; $('notes').value='';
    await loadAvailability();
  } catch(err) {
    result.textContent=err.message;
    result.className='result error';
    await loadAvailability();
  }
});
