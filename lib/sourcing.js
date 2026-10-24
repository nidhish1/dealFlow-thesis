const API = 'https://api.akta.pro/api/v1/list/generate/companies/';
const cache = new Map();
const pending = new Map();
const activity = new Map();
const TTL = 10 * 60 * 1000;
const text = (v, max=4000) => typeof v === 'string' ? v.trim().slice(0,max) : '';
const label = v => typeof v === 'string' ? v : (v?.label || v?.name || v?.code || '');
const normalize = v => text(v).toLowerCase().replace(/[^a-z0-9]+/g,'');
const stages = s => text(s).split(',').map(normalize).filter(Boolean);
const safeUrl = value => {try {const u=new URL(/^https?:\/\//i.test(value)?value:`https://${value}`);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:null;}catch{return null;}};
const stop = new Set('the and for with that this from into through their which your companies company business invest investing backing support supporting build building next more less new our are who where when what they has have its an as at by in of on or to we a is be it us'.split(' '));
export function validateThesis(input) {
  if (!input || typeof input !== 'object') throw new Error('Choose a valid thesis.');
  const t={};for(const key of ['id','title','vertical','summary','stages','geography','criteria','whyNow','risks'])t[key]=text(input[key],key==='criteria'?2000:1000);
  if (['title','vertical','summary','stages','geography'].some(k=>!t[k])) throw new Error('Complete the title, vertical, thesis, stages, and geography before sourcing.');
  t.checkMin=Number(input.checkMin);t.checkMax=Number(input.checkMax);
  if(!Number.isFinite(t.checkMin)||!Number.isFinite(t.checkMax)||t.checkMin<0||t.checkMax<t.checkMin)throw new Error('The thesis needs a valid check-size range.');
  return t;
}
export function buildQuery(t, focus='') {
  return `Find privately held operating companies in ${t.vertical}. Investment focus: ${t.summary}. Target funding stages: ${t.stages}. Headquarters geography: ${t.geography}. ${t.criteria?`Screening priorities: ${t.criteria.slice(0,700)}. `:''}${focus?`Additional focus: ${text(focus,300)}.`:''}`;
}
function countryMatch(country, geography) {
  const wanted=text(geography).toLowerCase();const c=normalize(country);
  if (/\bglobal\b|worldwide|anywhere/.test(wanted))return true;
  const groups=[[/north america/,['usa','us','unitedstates','unitedstatesofamerica','can','canada','mex','mexico']], [/europe/,['europe','gbr','uk','unitedkingdom','fra','france','deu','germany','irl','ireland','nld','netherlands','esp','spain','ita','italy','swe','sweden','dnk','denmark','fin','finland','nor','norway','che','switzerland','aut','austria','bel','belgium','pol','poland','prt','portugal','est','estonia']], [/united states|\busa\b|\bu\.s\./,['usa','us','unitedstates','unitedstatesofamerica']], [/united kingdom|\buk\b/,['gbr','uk','unitedkingdom']], [/\bindia\b/,['ind','india']], [/\bcanada\b/,['can','canada']], [/\baustralia\b/,['aus','australia']]];
  const targets=groups.filter(([pattern])=>pattern.test(wanted));
  if(targets.length)return targets.some(([,members])=>members.includes(c));
  if(c&&wanted.split(',').some(v=>normalize(v)===c))return true;
  return null;
}
export function assessCompany(company,t) {
  const evidence=[];const companyText=[company.category,company.description].join(' ').toLowerCase();
  const tokens=[...new Set((`${t.vertical} ${t.summary} ${t.criteria}`).toLowerCase().match(/[a-z][a-z0-9-]*/g)||[])].filter(v=>!stop.has(v)&&(v.length>3||v==='ai'));
  const overlap=tokens.filter(v=>new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(companyText)).slice(0,5);
  evidence.push({criterion:'Theme',state:overlap.length?'match':'unknown',detail:overlap.length?`Text overlaps on ${overlap.join(', ')}. This is keyword evidence, not a semantic fit guarantee.`:'No explicit theme evidence in the returned fields.'});
  const country=company.country;const countryResult=country?countryMatch(country,t.geography):null;
  evidence.push({criterion:'Geography',state:countryResult===true?'match':countryResult===false?'conflict':'unknown',detail:country?`Reported headquarters: ${company.city?company.city+', ':''}${country}. Target: ${t.geography}.`:`Headquarters not supplied. Target: ${t.geography}.`});
  const stage=normalize(company.stage);const target=stages(t.stages);
  evidence.push({criterion:'Funding stage',state:stage?(target.includes(stage)?'match':'conflict'):'unknown',detail:company.stage?`Reported stage: ${company.stage}. Target: ${t.stages}.`:`Funding stage not supplied. Target: ${t.stages}.`});
  const type=normalize(company.companyType);
  evidence.push({criterion:'Company type',state:type==='private'?'match':type&&type!=='unknown'?'conflict':'unknown',detail:company.companyType?`Akta reports ${company.companyType}. Seeking privately held companies.`:'Company type not supplied.'});
  const matched=evidence.filter(e=>e.state==='match').length;const conflicts=evidence.filter(e=>e.state==='conflict').length;
  return {evidence,matched,conflicts,unknown:evidence.filter(e=>e.state==='unknown').length,label:conflicts?'Outside criteria':matched===4?'Criteria signals align':'Potential fit',note:'Check-size suitability, founder quality, traction, moat, risks, and qualitative thesis claims still need diligence. Your check range is not treated as a company funding-round size.'};
}
export function normalizeCompany(raw,t) {
  if(!raw||typeof raw!=='object')return null;
  const f=raw.firmographic||{};const hq=raw.location?.hq||{};const funding=raw.funding_detail?.funding_overview||{};
  const c={id:text(raw.uuid,150),name:text(raw.name||f.name,200),website:safeUrl(text(raw.website||f.website,500)),category:text(raw.product_category||f.product_category,400),description:text(f.company_description_short||f.company_description,3000),companyType:label(raw.company_type||f.company_type),country:label(hq.country),region:label(hq.region),city:text(hq.city,150),stage:label(funding.funding_stage),headcount:text(f.headcount_range,100),foundedYear:Number.isInteger(f.founded_year)?f.founded_year:null,source:'Akta',retrievedAt:new Date().toISOString()};
  if(!c.id||!c.name)return null;c.assessment=assessCompany(c,t);return c;
}
function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function badStatus(status) {return {401:'Akta rejected the API key. Update the server-side Akta secret.',402:'Akta credits are insufficient. Check your Akta balance.',403:'Akta denied access. Check your API permissions or plan; enrichment requires Subscription or Enterprise.',429:'Akta is rate-limiting requests. Wait a moment before retrying.'}[status]||'Akta could not complete this search. Please retry later.';}
function messages(values,key) {return (Array.isArray(values)?values:[]).slice(0,15).map(v=>{const msg=typeof v==='string'?v:JSON.stringify(v);return msg.split(key).join('[redacted]').slice(0,800);});}
export async function handleSourcing(request,env,fetcher=fetch) {
  const path=new URL(request.url).pathname;
  if(path==='/api/sourcing/status'&&request.method==='GET')return json({configured:!!env.AKTA_API_KEY,provider:'Akta'});
  if(path!=='/api/sourcing/discover')return json({error:'Not found.'},404);
  if(request.method!=='POST')return json({error:'Use POST to discover companies.'},405);
  // This endpoint is deployed on the existing owner-private Site. Sites dispatch
  // enforces its access policy for visitors and authorized service callers.
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return json({error:'Cross-origin requests are not allowed.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Send a JSON request.'},415);
  if(!env.AKTA_API_KEY)return json({error:'Akta is not connected. Configure the server-side AKTA_API_KEY secret.'},503);
  let payload,t;
  try{const body=await request.text();if(body.length>22000)return json({error:'The sourcing request is too large.'},413);payload=JSON.parse(body);t=validateThesis(payload.thesis);}catch(e){return json({error:e instanceof SyntaxError?'Invalid JSON request.':e.message},400);}
  const limit=payload.limit??20,offset=payload.offset??0;
  if(!Number.isInteger(limit)||limit<1||limit>20||!Number.isInteger(offset)||offset<0||offset>480)return json({error:'Request 1–20 companies with an offset between 0 and 480.'},400);
  const enriched=payload.enriched===true;const query=buildQuery(t,text(payload.focus,300));
  const actor=request.headers.get('oai-authenticated-user-id')||'owner-private-service';
  const cacheKey=JSON.stringify([actor,t,query,limit,offset,enriched]);
  const cached=cache.get(cacheKey);
  if(cached&&Date.now()-cached.at<TTL)return json({...cached.value,cacheHit:true,creditsConsumed:0});
  if(pending.has(cacheKey)){try{return json({...await pending.get(cacheKey),cacheHit:true,creditsConsumed:0});}catch(e){return json({error:e.status?e.message:'The Akta connection failed. Please retry.'},e.status||502);}}
  const recent=(activity.get(actor)||[]).filter(at=>Date.now()-at<60000);
  if(recent.length>=10)return json({error:'Please wait a minute before starting more discovery requests.'},429);
  recent.push(Date.now());activity.set(actor,recent);
  if(activity.size>100)activity.delete(activity.keys().next().value);
  const task=(async()=>{
    const body={query,limit,offset,sort_by:'relevance',sort_order:'desc',...(enriched?{sections:['firmographic','location','funding_detail']}:{})};
    const response=await fetcher(API,{method:'POST',headers:{'x-api-key':env.AKTA_API_KEY,'Content-Type':'application/json','Accept':'application/json','User-Agent':'ThesisWorkspace/1.0'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000),redirect:'manual'});
    if(!response.ok){const e=new Error(badStatus(response.status));e.status=response.status>=400&&response.status<500?response.status:502;throw e;}
    const result=await response.json();
    if(!Array.isArray(result.data)){const e=new Error('Akta returned an unexpected company-list response. Please retry later.');e.status=502;throw e;}
    const seen=new Set();const companies=result.data.slice(0,20).map(raw=>normalizeCompany(raw,t)).filter(c=>c&&!seen.has(c.id)&&seen.add(c.id));
    companies.sort((a,b)=>a.assessment.conflicts-b.assessment.conflicts||b.assessment.matched-a.assessment.matched);
    const value={companies,totalCount:Number.isFinite(result.total_count)?Math.min(500,result.total_count):companies.length,offset,limit,query,filters:result.filters&&typeof result.filters==='object'?result.filters:{},warnings:messages(result.warnings,env.AKTA_API_KEY),skippedSections:messages(result.skipped_sections,env.AKTA_API_KEY),creditsConsumed:Number.isFinite(result.credits_consumed)?result.credits_consumed:null,cacheHit:false,enriched,retrievedAt:new Date().toISOString(),thesisId:t.id};
    if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(cacheKey,{at:Date.now(),value});return value;
  })();pending.set(cacheKey,task);
  try{return json(await task);}catch(e){if(!e.status)console.error('Akta request failed',String(e.name),String(e.message).split(env.AKTA_API_KEY).join('[redacted]').slice(0,500));return json({error:e.name==='TimeoutError'?'Akta took too long to respond. Please retry.':e.status?e.message:'The Akta connection failed. Please retry.',},e.status||502);}finally{pending.delete(cacheKey);}
}
