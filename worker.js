const OPEN_HOUR = 12;
const CLOSE_HOUR = 22;
const ALLOWED_DURATIONS = new Set([30,60,90,120]);
const PRICES = {30:40,60:70,90:100,120:140};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'}})}
function mins(t){const m=/^(\d{2}):(\d{2})$/.exec(t||''); if(!m)return NaN; const h=+m[1],mi=+m[2]; return h*60+mi;}
function time(n){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)}
function validPhone(s){return /^\d{10}$/.test(s)}
function slots(start,duration){const out=[]; for(let x=start;x<start+duration;x+=30) out.push(time(x)); return out;}
function id(){return 'VXP-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().slice(0,4).toUpperCase()}
async function adminOk(request,env){return env.ADMIN_KEY && request.headers.get('x-admin-key')===env.ADMIN_KEY}

export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(request.method==='OPTIONS') return new Response(null,{headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','access-control-allow-headers':'content-type,x-admin-key'}});
  try{
   if(u.pathname==='/api/availability' && request.method==='GET'){
    const date=u.searchParams.get('date'); if(!validDate(date)) return json({error:'Invalid date'},400);
    const q=await env.DB.prepare("SELECT time,duration FROM bookings WHERE date=? AND status='confirmed' ORDER BY time").bind(date).all();
    return json(q.results||[]);
   }
   if(u.pathname==='/api/bookings' && request.method==='POST'){
    const b=await request.json();
    const date=String(b.date||''), start=mins(b.time), duration=Number(b.duration), players=Number(b.players);
    const name=String(b.name||'').trim(), phone=String(b.phone||'').trim(), notes=String(b.notes||'').trim();
    if(!validDate(date)||!Number.isFinite(start)||start%30!==0||start<OPEN_HOUR*60||start+duration>CLOSE_HOUR*60||!ALLOWED_DURATIONS.has(duration)||!validPhone(phone)||!name||players<1||players>4) return json({error:'Please check your booking details.'},400);
    const amount=PRICES[duration], bookingId=id(), end=time(start+duration), wanted=slots(start,duration);
    const placeholders=wanted.map(()=>'?').join(',');
    const existing=await env.DB.prepare(`SELECT slot_time FROM booking_slots WHERE date=? AND slot_time IN (${placeholders})`).bind(date,...wanted).all();
    if((existing.results||[]).length) return json({error:'That time overlaps an existing booking. Please choose another slot.'},409);
    const statements=[env.DB.prepare('INSERT INTO bookings (id,created_at,date,time,duration,end_time,players,name,phone,notes,amount,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(bookingId,new Date().toISOString(),date,b.time,duration,end,players,name,phone,notes,amount,'confirmed')];
    for(const s of wanted) statements.push(env.DB.prepare('INSERT INTO booking_slots (date,slot_time,booking_id) VALUES (?,?,?)').bind(date,s,bookingId));
    try { await env.DB.batch(statements); } catch(e) { return json({error:'That slot was just booked by someone else. Please choose another time.'},409); }
    return json({ok:true,id:bookingId,amount});
   }
   if(u.pathname==='/api/admin/bookings' && request.method==='GET'){
    if(!(await adminOk(request,env))) return json({error:'Invalid admin key.'},401);
    const date=u.searchParams.get('date');
    let q;if(validDate(date)) q=await env.DB.prepare('SELECT * FROM bookings WHERE date=? ORDER BY time').bind(date).all();
    else q=await env.DB.prepare('SELECT * FROM bookings ORDER BY date DESC,time DESC LIMIT 200').all();
    return json(q.results||[]);
   }
   if(u.pathname.startsWith('/api/admin/bookings/') && request.method==='PATCH'){
    if(!(await adminOk(request,env))) return json({error:'Invalid admin key.'},401);
    const bookingId=decodeURIComponent(u.pathname.split('/').pop()); const b=await request.json();
    if(!['confirmed','cancelled'].includes(b.status)) return json({error:'Invalid status.'},400);
    await env.DB.prepare('UPDATE bookings SET status=? WHERE id=?').bind(b.status,bookingId).run();
    if(b.status==='cancelled') await env.DB.prepare('DELETE FROM booking_slots WHERE booking_id=?').bind(bookingId).run();
    return json({ok:true});
   }
   return env.ASSETS.fetch(request);
  }catch(e){return json({error:'Server error.'},500)}
 }
}
