import test from 'node:test';
import assert from 'node:assert/strict';
import {handleSourcing,normalizeCompany,buildQuery,validateThesis} from '../lib/sourcing.js';
const thesis={id:'unit-test',title:'AI enterprise workflows',vertical:'AI & Machine Learning',summary:'AI automation for enterprise workflows',stages:'Pre-seed, Seed',geography:'North America, Europe',checkMin:250000,checkMax:2000000,criteria:'Proprietary data and recurring usage'};
const request=(body={thesis},headers={})=>new Request('https://thesis.test/api/sourcing/discover',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const fixture={uuid:'fixture',name:'Workflow Robotics',website:'workflow.example',product_category:'AI enterprise workflow software',company_type:{label:'Private'},firmographic:{company_description_short:'AI automation for enterprise workflow teams',headcount_range:'11-50',founded_year:2024},location:{hq:{country:'USA',city:'Boston'}},funding_detail:{funding_overview:{funding_stage:{label:'Seed'}}}};
test('match evidence comes only from returned facts; check size never becomes round funding',()=>{
 const c=normalizeCompany(fixture,thesis);assert.equal(c.assessment.matched,4);assert.equal(c.assessment.conflicts,0);assert.equal(c.website,'https://workflow.example/');
 const minimal=normalizeCompany({uuid:'min',name:'Minimal',website:'javascript:alert(1)',product_category:'AI software'},thesis);assert.equal(minimal.website,null);assert.equal(minimal.assessment.evidence.find(e=>e.criterion==='Funding stage').state,'unknown');assert.equal(minimal.assessment.evidence.find(e=>e.criterion==='Geography').state,'unknown');
 assert.ok(!buildQuery(validateThesis(thesis)).includes('250000'));
});
test('reported stage and HQ conflicts are explicit',()=>{
 const c=normalizeCompany({...fixture,location:{hq:{country:'AUS'}},funding_detail:{funding_overview:{funding_stage:{label:'Series C'}}}},thesis);assert.equal(c.assessment.conflicts,2);assert.equal(c.assessment.label,'Outside criteria');
});
test('configuration, origin, input, and pagination checks make no upstream calls',async()=>{
 const never=()=>{throw new Error('Unexpected upstream call')};
 assert.equal((await handleSourcing(request(),{},never)).status,503);
 assert.equal((await handleSourcing(request({}, {Origin:'https://evil.example'}),{AKTA_API_KEY:'test'},never)).status,403);
 assert.equal((await handleSourcing(request({thesis:{title:'Missing fields'}}),{AKTA_API_KEY:'test'},never)).status,400);
 assert.equal((await handleSourcing(request({thesis,limit:500}),{AKTA_API_KEY:'test'},never)).status,400);
 const status=await (await handleSourcing(new Request('https://thesis.test/api/sourcing/status'),{AKTA_API_KEY:'test'},never)).json();assert.deepEqual(status,{configured:true,provider:'Akta'});assert.ok(!JSON.stringify(status).includes('test'));
});
test('proxy authenticates server-side, preserves provider warnings, deduplicates, and caches',async()=>{
 let calls=0;const mock=async(url,options)=>{calls++;assert.equal(url,'https://api.akta.pro/api/v1/list/generate/companies/');assert.equal(options.headers['x-api-key'],'test-secret');const body=JSON.parse(options.body);assert.equal(body.limit,5);assert.equal(body.offset,0);assert.ok(!body.sections);assert.equal(options.redirect,'error');return Response.json({data:[fixture,fixture],total_count:100,credits_consumed:4.6,filters:{'location.hq.country':['USA']},warnings:['Requested fields may be incomplete'],skipped_sections:[]});};
 const first=await (await handleSourcing(request({thesis,limit:5}),{AKTA_API_KEY:'test-secret'},mock)).json();assert.equal(first.companies.length,1);assert.equal(first.creditsConsumed,4.6);assert.equal(first.warnings.length,1);assert.ok(!JSON.stringify(first).includes('test-secret'));
 const second=await (await handleSourcing(request({thesis,limit:5}),{AKTA_API_KEY:'test-secret'},mock)).json();assert.equal(calls,1);assert.equal(second.cacheHit,true);assert.equal(second.creditsConsumed,0);
});
test('enrichment is explicit and provider permission errors expose no upstream body',async()=>{
 let requested;const response=await handleSourcing(request({thesis:{...thesis,id:'enrichment'},limit:5,enriched:true}),{AKTA_API_KEY:'sensitive'},async(_,options)=>{requested=JSON.parse(options.body);return new Response('sensitive upstream secret error',{status:403});});
 assert.deepEqual(requested.sections,['firmographic','location','funding_detail']);assert.equal(response.status,403);const body=await response.text();assert.match(body,/permissions or plan/);assert.ok(!body.includes('sensitive'));
});
test('timeout/network errors and malformed provider responses are handled',async()=>{
 const bad=await handleSourcing(request({thesis:{...thesis,id:'bad-shape'}}),{AKTA_API_KEY:'test'},async()=>Response.json({oops:true}));assert.equal(bad.status,502);
 const network=await handleSourcing(request({thesis:{...thesis,id:'network'}}),{AKTA_API_KEY:'test'},async()=>{throw new Error('network with private details')});assert.equal(network.status,502);assert.ok(!(await network.text()).includes('private details'));
});
