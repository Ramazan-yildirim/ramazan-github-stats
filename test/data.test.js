import test from 'node:test';
import assert from 'node:assert/strict';
import { getDateRange, calculateCurrentStreak, getOverview } from '../lib/github.js';
import { summarizeLanguages, getLanguages } from '../lib/languages.js';
import { createStatsSvg, createLanguagesSvg, optionsFrom } from '../lib/cards.js';
import statsHandler from '../api/stats.js';

test('year ranges end before the next year and the streak window stays within one year',()=>{
  const range=getDateRange(new Date('2024-02-29T12:00:00Z'));
  assert.deepEqual(range.years,[2023,2024]);
  assert.equal(range.commitVariables.commits2023To,'2023-12-31T23:59:59.999Z');
  assert.equal(range.commitVariables.commits2024To,range.now);
  assert.ok((Date.parse(range.now)-Date.parse(range.streakStart))/86400000<=366);
});
test('streak allows an unfinished today but stops at an earlier empty day',()=>{
  const weeks=[{contributionDays:[{date:'2026-10-11',contributionCount:0},{date:'2026-10-12',contributionCount:2},{date:'2026-10-13',contributionCount:1},{date:'2026-10-14',contributionCount:0}]}];
  assert.equal(calculateCurrentStreak(weeks),2);
  assert.equal(calculateCurrentStreak([]),0);
  weeks[0].contributionDays[2].contributionCount=0;
  assert.equal(calculateCurrentStreak(weeks),0);
});
test('language shares aggregate bytes and retain the remainder as Other',()=>{
  const data=summarizeLanguages([{},{}],[{Python:50,A:10,B:10,C:10,D:10,E:10},{Python:50,F:50}]);
  assert.equal(data.totalBytes,200);
  assert.equal(data.languages[0].bytes,100);
  assert.equal(data.languages.at(-1).name,'Other');
  assert.equal(data.languages.reduce((sum,x)=>sum+x.bytes,0),200);
  assert.throws(()=>summarizeLanguages([],[{Python:-1}]));
});
test('language endpoint paginates and excludes forks and private repositories',async()=>{
  const repo={name:'mine',fork:false,private:false,owner:{login:'Ramazan-yildirim'}};
  const paths=[];
  const fake=async url=>{
    paths.push(url);
    if(new URL(url).searchParams.get('page')==='1')return Response.json([repo,...Array.from({length:99},(_,i)=>({...repo,name:`fork-${i}`,fork:true}))]);
    if(new URL(url).searchParams.get('page')==='2')return Response.json([{...repo,name:'secret',private:true}]);
    return Response.json({Python:10});
  };
  const data=await getLanguages(fake);
  assert.equal(data.repositoryCount,1);
  assert.equal(data.totalBytes,10);
  assert.equal(paths.filter(x=>x.endsWith('/languages')).length,1);
  await assert.rejects(getLanguages(async()=>new Response('',{status:403})));
});
test('overview uses calendar totals once and paginates repository metrics',async()=>{
  const oldFetch=globalThis.fetch, oldToken=process.env.GH_TOKEN;
  process.env.GH_TOKEN='unit-test-only';
  let calls=0;
  globalThis.fetch=async()=>{
    calls++;
    if(calls>1)return Response.json({data:{user:{repositories:{nodes:[{stargazerCount:3,forkCount:2}],pageInfo:{hasNextPage:false}}}}});
    const viewer={login:'Ramazan-yildirim',streakWindow:{contributionCalendar:{weeks:[]}}};
    for(const year of getDateRange().years)viewer[`commits${year}`]={contributionCalendar:{totalContributions:10},restrictedContributionsCount:4};
    return Response.json({data:{viewer,user:{name:'Ramazan',followers:{totalCount:2},repositories:{totalCount:2,nodes:[{stargazerCount:1,forkCount:0}],pageInfo:{hasNextPage:true,endCursor:'next'}}}}});
  };
  try {
    const result=await getOverview();
    assert.equal(result.totalContributions,getDateRange().years.length*10);
    assert.equal(result.stars,4);
    assert.equal(result.forks,2);
    assert.equal(calls,2);
  } finally {globalThis.fetch=oldFetch;if(oldToken===undefined)delete process.env.GH_TOKEN;else process.env.GH_TOKEN=oldToken;}
});
test('missing credentials return a themed SVG with a short error cache',async()=>{
  const token=process.env.GH_TOKEN; delete process.env.GH_TOKEN;
  try {
    const response=await statsHandler.fetch(new Request('http://localhost/api/stats?theme=light&layout=compact'));
    assert.match(response.headers.get('Content-Type'),/image\/svg/);
    assert.equal(response.headers.get('Vercel-CDN-Cache-Control'),'public, max-age=60');
    const svg=await response.text();
    assert.match(svg,/Temporarily unavailable/);
    assert.match(svg,/width="360"/);
    assert.doesNotMatch(svg,/GH_TOKEN|unit-test-only/);
  } finally {if(token!==undefined)process.env.GH_TOKEN=token;}
});
test('query options are allowlisted and every theme/layout has valid output',()=>{
  assert.deepEqual(optionsFrom(new Request('http://localhost/?theme=%22%3E&layout=other')),{theme:'dark',compact:false});
  const stats={totalContributions:1200,contributions:600,year:2026,streak:2,repositories:19,stars:1,followers:20,forks:0};
  for(const theme of ['light','dark'])for(const compact of [true,false]) {
    assert.match(createStatsSvg(stats,{theme,compact}),/1,200/);
    const svg=createLanguagesSvg({totalBytes:10,repositoryCount:1,languages:[{name:'A&B<script>',bytes:10}]},{theme,compact});
    assert.match(svg,/A&amp;B&lt;script&gt;/);
    assert.doesNotMatch(svg,/<script>/);
  }
});
