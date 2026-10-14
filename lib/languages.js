import { USERNAME } from './github.js';

async function githubRest(path,fetcher) {
  const headers={Accept:'application/vnd.github+json','User-Agent':'ramazan-github-stats','X-GitHub-Api-Version':'2022-11-28'};
  if(process.env.GH_TOKEN) headers.Authorization=`Bearer ${process.env.GH_TOKEN}`;
  const response=await fetcher(`https://api.github.com${path}`,{headers,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`GitHub REST request failed (${response.status})`);
  return response.json();
}
export function summarizeLanguages(repositories,languageMaps) {
  const totals=new Map();
  for(const map of languageMaps)for(const [name,bytes] of Object.entries(map)) {
    if(!Number.isFinite(bytes)||bytes<0)throw new Error('Invalid language byte count');
    totals.set(name,(totals.get(name)||0)+bytes);
  }
  const all=[...totals].map(([name,bytes])=>({name,bytes})).filter(x=>x.bytes>0).sort((a,b)=>b.bytes-a.bytes||a.name.localeCompare(b.name));
  const languages=all.slice(0,5), other=all.slice(5).reduce((sum,x)=>sum+x.bytes,0);
  if(other)languages.push({name:'Other',bytes:other});
  return {repositoryCount:repositories.length,totalBytes:all.reduce((sum,x)=>sum+x.bytes,0),languages};
}
export async function getLanguages(fetcher=fetch) {
  const repositories=[];
  for(let page=1;;page++) {
    const batch=await githubRest(`/users/${USERNAME}/repos?type=owner&per_page=100&page=${page}`,fetcher);
    if(!Array.isArray(batch))throw new Error('Invalid repository response');
    repositories.push(...batch.filter(repo=>!repo.fork&&!repo.private&&repo.owner?.login?.toLowerCase()===USERNAME.toLowerCase()));
    if(batch.length<100)break;
  }
  const languageMaps=[];
  // Bound concurrency; never publish a misleading partial distribution.
  for(let i=0;i<repositories.length;i+=4) {
    languageMaps.push(...await Promise.all(repositories.slice(i,i+4).map(repo=>githubRest(`/repos/${USERNAME}/${encodeURIComponent(repo.name)}/languages`,fetcher))));
  }
  return summarizeLanguages(repositories,languageMaps);
}
