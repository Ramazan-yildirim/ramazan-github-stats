export const THEMES = {
  dark: {bg:'#0d1117',panel:'#161b22',line:'#30363d',text:'#e6edf3',muted:'#9ba8b7',accent:'#8bd49c',cyan:'#83d6e8',amber:'#e5c07b'},
  light: {bg:'#f6f8f5',panel:'#e9eee8',line:'#c8d2c5',text:'#24352a',muted:'#53685b',accent:'#246b39',cyan:'#176678',amber:'#805d14'},
};
export function escapeXml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
}
export function optionsFrom(request) {
  const params = new URL(request.url).searchParams;
  return {theme:params.get('theme') === 'light' ? 'light' : 'dark',compact:params.get('layout') === 'compact'};
}
const number = value => new Intl.NumberFormat('en-US').format(value);
function text(x,y,value,size=13,color='muted',weight=400,anchor='start',extra='') {
  return `<text x="${x}" y="${y}" class="${color}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" ${extra}>${escapeXml(value)}</text>`;
}
function shell(title,height,body,options={}) {
  const t=THEMES[options.theme] || THEMES.dark,width=options.compact?360:720;
  const command=title==='GITHUB OVERVIEW'?'gh stats':title==='LANGUAGES'?'gh languages':'gh status';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(title)} for Ramazan Yıldırım. Values and their scope are shown in the card.</desc>
<style>text{font-family:'DejaVu Sans Mono',Consolas,'Liberation Mono',monospace}.text{fill:${t.text}}.muted{fill:${t.muted}}.accent{fill:${t.accent}}.cyan{fill:${t.cyan}}.amber{fill:${t.amber}}.panel{fill:${t.panel};stroke:${t.line}}.rule{stroke:${t.line}}</style>
<rect x=".5" y=".5" width="${width-1}" height="${height-1}" rx="6" fill="${t.bg}" stroke="${t.line}"/>
<path d="M6 .5H${width-6}q5.5 0 5.5 6V35.5H.5V6q0-5.5 5.5-5.5" fill="${t.panel}"/>
<path d="M1 35.5H${width-1}" class="rule"/>
<path d="M17 15h8m-4-4v8M34 15h8M52 11l8 8m0-8-8 8" class="rule" fill="none"/>
${text(width/2,23,'ramazan@linux: ~/github',options.compact?10:12,'muted',400,'middle')}
${text(24,65,`$ ${command}${options.compact?'':' --user Ramazan-yildirim'}`,options.compact?13:14,'accent')}
${body}
<path d="M24 ${height-41.5}H${width-24}" class="rule"/>
${text(24,height-17,'$',13,'accent')}<rect x="42" y="${height-29}" width="8" height="15" fill="${t.accent}"/>
${text(width-24,height-18,'[ RY / github ]',10,'muted',400,'end')}</svg>`;
}
export function createStatsSvg(stats,options={}) {
  const compact=options.compact;
  const labels=[['total_contributions',stats.totalContributions,'since 2023'],['this_year',stats.contributions,String(stats.year)],['current_streak',stats.streak,stats.streak===1?'consecutive day':'consecutive days']];
  let body=text(24,91,'// contribution calendar + repository metrics',compact?10:12);
  if(compact) {
    body+=`<rect x="24" y="110" width="312" height="104" rx="2" class="panel"/>`;
    body+=text(40,135,`this_year / ${stats.year}`,12,'cyan')+text(40,181,number(stats.contributions),35,'text',700);
    [labels[0],labels[2]].forEach(([label,value,meta],i)=>{
      const x=24+i*164;
      body+=text(x,243,label,11,'accent')+text(x,278,number(value),27,'text',700)+text(x,301,meta,11);
    });
  } else {
    body+=`<rect x="24" y="110" width="672" height="122" rx="2" class="panel"/>`;
    labels.forEach(([label,value,meta],i)=>{
      const x=42+i*224;
      if(i)body+=`<path d="M${x-18}128v86" class="rule"/>`;
      body+=text(x,137,label,12,'accent')+text(x,182,number(value),36,'text',700)+text(x,212,meta,12);
    });
  }
  const base=compact?327:264;
  const metrics=[['public_repos',stats.repositories],['stars_received',stats.stars],['followers',stats.followers],['forks_received',stats.forks]];
  metrics.forEach(([label,value],i)=>{
    const x=compact?24+(i%2)*164:24+i*172,y=base+(compact?Math.floor(i/2)*63:0);
    body+=text(x,y,label,compact?11:12)+text(x,y+28,number(value),24,'cyan',600);
  });
  const foot=compact?471:340;
  body+=text(24,foot,'# contributions: GitHub calendar totals',compact?10:11);
  body+=text(24,foot+19,compact?'# repos/stars/forks: owned public non-forks':'# repos/stars/forks: owned public non-fork repositories',compact?10:11);
  return shell('GITHUB OVERVIEW',compact?550:420,body,options);
}
export function createLanguagesSvg(data,options={}) {
  const compact=options.compact,width=compact?360:720;
  if(!data.totalBytes) return shell('LANGUAGES',230,text(24,111,'No language bytes reported by GitHub.',compact?12:14,'text')+text(24,144,'# owned public repos / forks excluded',compact?10:12),options);
  let body=text(24,91,'// share of repository language bytes',compact?10:12);
  const p=THEMES[options.theme]||THEMES.dark;
  const colors=options.theme==='light'?['#246b39','#176678','#805d14','#68509a','#966044','#53685b']:['#8bd49c','#83d6e8','#e5c07b','#bcabeb','#e8a87c','#9ba8b7'];
  const barWidth=width-48;
  let offset=24;
  data.languages.forEach((lang,i)=>{
    const w=lang.bytes/data.totalBytes*barWidth;
    body+=`<rect x="${offset}" y="113" width="${w}" height="8" fill="${colors[i%colors.length]}"/>`;
    offset+=w;
  });
  body+=text(24,149,'#',10)+text(50,149,'LANGUAGE',10)+text(width-24,149,'SHARE',10,'muted',400,'end');
  if(!compact)body+=text(282,149,'DISTRIBUTION',10);
  data.languages.forEach((lang,i)=>{
    const y=178+i*34,share=lang.bytes/data.totalBytes;
    body+=text(24,y,String(i+1).padStart(2,'0'),10)+text(50,y,lang.name,compact?12:13,'text',400,'start','textLength="'+Math.min(lang.name.length*(compact?7.2:7.8),compact?215:215)+'" lengthAdjust="spacingAndGlyphs"');
    if(!compact) {
      body+=`<rect x="282" y="${y-9}" width="292" height="7" fill="${p.panel}"/><rect x="282" y="${y-9}" width="${share*292}" height="7" fill="${colors[i%colors.length]}"/>`;
    }
    body+=text(width-24,y,`${(share*100).toFixed(1)}%`,13,'cyan',400,'end');
  });
  const foot=190+data.languages.length*34;
  body+=text(24,foot,`# ${data.repositoryCount} owned public repos / forks excluded`,compact?10:11);
  body+=text(24,foot+19,'# language bytes, not time or proficiency',compact?10:11);
  return shell('LANGUAGES',foot+80,body,options);
}
export function createErrorSvg(label,options={}) {
  const body=text(24,107,'[retry] Temporarily unavailable',options.compact?14:18,'amber',600)+text(24,139,options.compact?'GitHub data could not be loaded.':'GitHub data could not be loaded. Please try again shortly.',options.compact?11:12)+
    (options.compact?text(24,160,'Please try again shortly.',11):'');
  return shell(label.toUpperCase(),230,body,options);
}
export function svgResponse(svg,cacheSeconds=600) {
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate','Vercel-CDN-Cache-Control':`public, max-age=${cacheSeconds}`,'X-Content-Type-Options':'nosniff'}});
}
