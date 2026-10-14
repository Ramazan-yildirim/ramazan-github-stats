import { LOGO } from './logo.js';

export const THEMES = {
  dark: { bg:'#111720', panel:'#192330', line:'#344456', text:'#edf1f4', muted:'#a8b5c4', accent:'#a4c3de', colors:['#a4c3de','#c2afd9','#98c5b8','#d4bd95'], surfaces:['#1a2c3d','#29243a','#1b302e','#302a21'] },
  light: { bg:'#ffffff', panel:'#f1f5fa', line:'#d1dce7', text:'#202932', muted:'#566473', accent:'#426d91', colors:['#426d91','#795d99','#3b7667','#876a38'], surfaces:['#edf4fa','#f2edf7','#edf6f2','#f8f3e9'] },
};
export function escapeXml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
}
export function optionsFrom(request) {
  const params = new URL(request.url).searchParams;
  return {theme: params.get('theme') === 'light' ? 'light' : 'dark', compact:params.get('layout') === 'compact'};
}
const number = value => new Intl.NumberFormat('en-US').format(value);
function text(x,y,value,size=14,color='muted',weight=400,anchor='start') {
  return `<text x="${x}" y="${y}" class="${color}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}
function shell(title,height,body,{theme='dark',compact=false}={}) {
  const t=THEMES[theme] || THEMES.dark, width=compact?360:720;
  const accents=t.colors.map((color,i)=>`.tone-${i}{fill:${color}}.surface-${i}{fill:${t.surfaces[i]};stroke:${t.line}}`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(title)} for Ramazan Yıldırım. Values and their scope are shown in the card.</desc><style>text{font-family:'Segoe UI',Arial,sans-serif}.text{fill:${t.text}}.muted{fill:${t.muted}}.accent{fill:${t.accent}}.panel{fill:${t.panel};stroke:${t.line}}.rule{stroke:${t.line}}${accents}</style><rect x=".5" y=".5" width="${width-1}" height="${height-1}" rx="16" fill="${t.bg}" stroke="${t.line}"/><path d="M22 1h90" stroke="${t.accent}" stroke-opacity=".65" stroke-width="2"/><rect x="20" y="18" width="52" height="52" rx="10" fill="#172536"/><svg x="14" y="12" width="64" height="64" viewBox="0 0 512 512">${LOGO}</svg>${text(86,37,title,12,'accent',600)}${text(86,61,'Ramazan Yıldırım',compact?19:21,'text',600)}${body}</svg>`;
}
export function createStatsSvg(stats,options={}) {
  const compact=options.compact;
  const labels=[['Total contributions',stats.totalContributions,'Since 2023'],['This year',stats.contributions,String(stats.year)],['Current streak',stats.streak,stats.streak===1?'Consecutive day':'Consecutive days']];
  let body='';
  if (compact) {
    body += `<rect x="20" y="88" width="320" height="114" rx="12" class="panel"/>`;
    body += text(36,114,`${stats.year} contributions`,14,'tone-1',600)+text(36,166,number(stats.contributions),44,'tone-1',650);
    for(const [i,[label,value,meta]] of [labels[0],labels[2]].entries()) {
      const x=20+i*168;
      body+=text(x,236,label,13)+text(x,274,number(value),29,`tone-${i*2}`,600)+text(x,297,meta,12);
    }
  } else {
    body += text(696,40,'@Ramazan-yildirim',13,'muted',400,'end');
    body += `<rect x="20" y="88" width="680" height="124" rx="12" class="panel"/>`;
    labels.forEach(([label,value,meta],i)=>{
      const x=40+i*228;
      if(i)body+=`<path d="M${x-16}108v84" class="rule"/>`;
      body+=text(x,115,label,14,`tone-${i}`,600)+text(x,164,number(value),38,`tone-${i}`,650)+text(x,192,meta,13);
    });
  }
  const metrics=[['Public repos',stats.repositories],['Stars received',stats.stars],['Followers',stats.followers],['Forks received',stats.forks]];
  const base=compact?320:232;
  metrics.forEach(([label,value],i)=>{
    const x=compact?20+(i%2)*168:20+i*174, y=base+(compact?Math.floor(i/2)*76:0), w=compact?152:158;
    body+=`<rect x="${x}" y="${y}" width="${w}" height="64" rx="10" class="surface-${i}"/>`+text(x+14,y+23,label,13)+text(x+14,y+49,number(value),23,`tone-${i}`,600);
  });
  const foot=compact?484:322;
  body+=text(20,foot,'Contributions: GitHub calendar totals',12)+text(20,foot+20,'Repos, stars & forks: owned public non-forks',12);
  return shell('GITHUB OVERVIEW',compact?526:364,body,options);
}
export function createLanguagesSvg(data,options={}) {
  const compact=options.compact, width=compact?360:720;
  if (!data.totalBytes) return shell('LANGUAGES',174,text(20,108,'No language bytes reported by GitHub.',14)+text(20,140,'Owned public repositories · forks excluded',12),options);
  let body=text(20,98,'Share of repository language bytes',14);
  const colors=options.theme==='light'?['#a4774e','#5880a1','#8772a5','#639b90','#aa8853','#8c99a6']:['#c6a17b','#83a9ca','#ad97c8','#7faf9f','#c4b084','#8695a6'];
  let offset=20;
  const barWidth=width-40;
  body+='<defs><clipPath id="bar"><rect x="20" y="116" width="'+barWidth+'" height="10" rx="5"/></clipPath></defs>';
  data.languages.forEach((lang,i)=>{
    const w=lang.bytes/data.totalBytes*barWidth;
    body+=`<rect x="${offset}" y="116" width="${w}" height="10" fill="${colors[i%colors.length]}" clip-path="url(#bar)"/>`;offset+=w;
    const x=compact?20:20+(i%2)*350,y=compact?160+i*32:160+Math.floor(i/2)*34;
    body+=`<circle cx="${x+4}" cy="${y-5}" r="4" fill="${colors[i%colors.length]}"/>`+text(x+18,y,lang.name,14,'text')+text(x+(compact?320:330),y,`${(lang.bytes/data.totalBytes*100).toFixed(1)}%`,14,'muted',400,'end');
  });
  const footer=compact?164+data.languages.length*32:164+Math.ceil(data.languages.length/2)*34;
  body+=text(20,footer,`${data.repositoryCount} owned public repos · forks excluded`,12)+text(20,footer+21,'Language bytes, not time spent or proficiency.',12);
  return shell('LANGUAGES',footer+42,body,options);
}
export function createErrorSvg(label,options={}) {
  return shell(label.toUpperCase(),174,text(20,109,'Temporarily unavailable',18,'text',600)+text(20,141,options.compact?'Please try again shortly.':'GitHub data could not be loaded. Please try again shortly.',13),options);
}
export function svgResponse(svg,cacheSeconds=600) {
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate','Vercel-CDN-Cache-Control':`public, max-age=${cacheSeconds}`,'X-Content-Type-Options':'nosniff'}});
}
