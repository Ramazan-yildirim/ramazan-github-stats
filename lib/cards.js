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
function fittedText(x,y,value,size,maxWidth,color='text',weight=400,anchor='start') {
  const fit=String(value).length*size*.61>maxWidth?`textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"`:'';
  return text(x,y,value,size,color,weight,anchor,fit);
}
function shell(title,height,body,options={},description=title,meta='') {
  const t=THEMES[options.theme] || THEMES.dark,width=options.compact?360:720;
  const path=title==='GitHub activity'?'activity':title==='Language mix'?'languages':'status';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(description)}</desc>
<style>text{font-family:'DejaVu Sans Mono',Consolas,'Liberation Mono',monospace;font-variant-numeric:tabular-nums}.text{fill:${t.text}}.muted{fill:${t.muted}}.accent{fill:${t.accent}}.cyan{fill:${t.cyan}}.amber{fill:${t.amber}}.rule{stroke:${t.line}}</style>
<rect x=".5" y=".5" width="${width-1}" height="${height-1}" rx="10" fill="${t.bg}" stroke="${t.line}"/>
<path d="M10 .5H${width-10}q9.5 0 9.5 10V33.5H.5V10q0-9.5 9.5-9.5" fill="${t.panel}"/>
<path d="M1 33.5H${width-1}" class="rule"/>
<g aria-hidden="true"><circle cx="20" cy="17" r="5.5" fill="#ff5f57"/><circle cx="38" cy="17" r="5.5" fill="#febc2e"/><circle cx="56" cy="17" r="5.5" fill="#28c840"/></g>
${text(width/2,22,`~/github / ${path}`,options.compact?10:11,'muted',400,'middle')}
${text(24,65,title,16,'accent',600)}
${meta?text(width-24,65,meta,10,'muted',400,'end'):''}
${body}</svg>`;
}
const ACTIVITY_THEMES={
  dark:{bg:'#0b1520',panel:'#0f1b27',raised:'#1a2b3b',line:'#2c4359',text:'#f5f8fc',muted:'#a4b9df',soft:'#718aaa',green:'#40d8bb',cyan:'#58cae8',amber:'#ffc15b',blue:'#8aa5ff',violet:'#ac82ef'},
  light:{bg:'#f3f7fc',panel:'#ffffff',raised:'#e9f0f9',line:'#c9d7e8',text:'#17283e',muted:'#50698b',soft:'#657e9c',green:'#087f6b',cyan:'#087b9d',amber:'#a36a09',blue:'#4d6ebc',violet:'#7850b6'},
};
function activityIcon(name,x,y,color,radius=17) {
  const shapes={
    branch:'<path d="M6 6v12m0-6h8a4 4 0 0 0 4-4"/><circle cx="6" cy="3" r="2.5"/><circle cx="6" cy="21" r="2.5"/><circle cx="18" cy="5" r="2.5"/>',
    calendar:'<rect x="2" y="4" width="20" height="18" rx="2"/><path d="M7 1v6m10-6v6M2 10h20M7 14h1m4 0h1m4 0h1M7 18h1m4 0h1m4 0h1"/>',
    repo:'<path d="M4 2h14a2 2 0 0 1 2 2v17H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Zm2 0v14m0 0h14M3 18h4"/>',
    star:'<path d="m12 1 3.4 6.8 7.5 1.1-5.4 5.3 1.3 7.5-6.8-3.6-6.8 3.6 1.3-7.5-5.4-5.3 7.5-1.1Z" fill="currentColor" stroke="none"/>',
    users:'<circle cx="8" cy="7" r="4"/><path d="M1 22v-3a7 7 0 0 1 14 0v3m3-19a4 4 0 0 1 0 8m1 4a6 6 0 0 1 4 6"/>',
  };
  const scale=radius/25;
  return `<g aria-hidden="true"><circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" fill-opacity=".07" stroke="${color}" stroke-width=".8"/><g transform="translate(${x-12*scale} ${y-12*scale}) scale(${scale})" fill="none" stroke="${color}" color="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${shapes[name]}</g></g>`;
}
function panelDots(x,y,color) {
  return `<g aria-hidden="true" fill="${color}"><circle cx="${x}" cy="${y}" r="1.2"/><circle cx="${x+5}" cy="${y}" r="1.2"/><circle cx="${x+10}" cy="${y}" r="1.2"/></g>`;
}
export function createStatsSvg(stats,options={}) {
  const compact=options.compact,width=compact?360:720,height=compact?414:398;
  const t=ACTIVITY_THEMES[options.theme]||ACTIVITY_THEMES.dark;
  const padding=compact?14:26,gap=compact?8:10,cardWidth=(width-padding*2-gap*2)/3;
  const top=compact?118:124,panelHeight=compact?166:150,centerY=compact?194:201;
  const statsCards=[{key:'contributions',value:stats.totalContributions,label:'Contributions',scope:'since 2023',color:t.green,icon:'branch'},
    {key:'streak',value:stats.streak,label:'day streak',scope:'',color:t.cyan},
    {key:'year',value:stats.contributions,label:'This year',scope:String(stats.year),color:t.amber,icon:'calendar'}];
  const summary=[{key:'repos',value:stats.repositories,label:'Public repos',color:t.blue,icon:'repo'},
    {key:'stars',value:stats.stars,label:'Stars',color:t.amber,icon:'star'},
    {key:'followers',value:stats.followers,label:'Followers',color:t.violet,icon:'users'}];
  const gradients=[...statsCards,...summary].map(card=>`<linearGradient id="${card.key}-ring" x1="0" y1="1" x2="1" y2="0"><stop stop-color="${card.color}" stop-opacity=".18"/><stop offset=".55" stop-color="${card.color}" stop-opacity=".65"/><stop offset="1" stop-color="${card.color}"/></linearGradient><linearGradient id="${card.key}-wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${card.color}" stop-opacity="0"/><stop offset="1" stop-color="${card.color}" stop-opacity=".2"/></linearGradient>`).join('');
  let body='';
  statsCards.forEach((card,i)=>{
    const x=padding+i*(cardWidth+gap),cx=x+cardWidth/2,streak=i===1;
    const radius=streak?(compact?40:64):(compact?34:56);
    body+=`<g class="activity-primary"><rect x="${x}" y="${top}" width="${cardWidth}" height="${panelHeight}" rx="9" fill="url(#activity-panel)" stroke="${t.line}" stroke-width=".7"/>`;
    body+=panelDots(x+cardWidth-(compact?20:25),top+(compact?14:18),t.soft);
    if(card.icon)body+=activityIcon(card.icon,x+(compact?17:27),top+(compact?20:30),card.color,compact?11:17);
    // Full gradient outlines are decorative: there is no goal or fake percentage.
    body+=`<circle class="${streak?'streak-ring':'metric-ring'}" cx="${cx}" cy="${centerY}" r="${radius}" fill="none" stroke="${t.line}" stroke-width="${compact?4:5.5}"/><circle cx="${cx}" cy="${centerY}" r="${radius}" fill="none" stroke="url(#${card.key}-ring)" stroke-width="${compact?4:5.5}"/>`;
    if(streak)body+=`<g class="streak-flame" aria-hidden="true" transform="translate(${cx} ${centerY-radius})"><circle r="${compact?10:13}" fill="${t.panel}"/><path transform="scale(${compact?.85:1}) translate(-8 -11)" d="M10 0c1 6 6 7 6 12a8 8 0 0 1-16 0c0-4 3-6 5-9-1 5 2 7 4 5 2-2 1-5 1-8Z" fill="${t.amber}"/></g>`;
    body+=fittedText(cx,centerY+(streak?(compact?9:13):(compact?1:6)),number(card.value),streak?(compact?32:46):(compact?21:36),radius*(compact?1.7:1.72),'text',700,'middle');
    body+=text(cx,centerY+(streak?(compact?24:35):(compact?18:28)),card.label,compact?(streak?9:8.3):13,streak?'muted':'text',streak?600:500,'middle');
    if(card.scope)body+=text(cx,compact?252:246,card.scope,compact?8:8.5,'soft',500,'middle','style="font-family:Consolas,monospace" letter-spacing=".8"');
    body+='</g>';
  });
  summary.forEach((card,i)=>{
    const x=padding+i*(cardWidth+gap),y=compact?296:285,h=compact?96:85,cx=x+cardWidth/2;
    body+=`<g class="activity-summary"><defs><clipPath id="clip-${card.key}"><rect x="${x}" y="${y}" width="${cardWidth}" height="${h}" rx="9"/></clipPath></defs><rect x="${x}" y="${y}" width="${cardWidth}" height="${h}" rx="9" fill="url(#activity-panel)" stroke="${t.line}" stroke-width=".7"/>`;
    const wave=`M${x+cardWidth*.2} ${y+h} C${x+cardWidth*.5} ${y+h-15} ${x+cardWidth*.58} ${y+h-5} ${x+cardWidth*.73} ${y+h-23} S${x+cardWidth*.88} ${y+h-37} ${x+cardWidth} ${y+h-39}`;
    body+=`<g aria-hidden="true" clip-path="url(#clip-${card.key})"><path d="${wave} L${x+cardWidth} ${y+h}Z" fill="url(#${card.key}-wash)"/><path d="${wave}" fill="none" stroke="${card.color}" stroke-opacity=".7" stroke-width=".7"/></g>`;
    body+=panelDots(x+cardWidth-(compact?20:25),y+16,t.soft);
    body+=activityIcon(card.icon,compact?cx:x+28,y+(compact?22:30),card.color,compact?11:17);
    body+=fittedText(compact?cx:x+62,y+(compact?55:38),number(card.value),compact?23:27,compact?cardWidth-22:cardWidth-80,'text',700,compact?'middle':'start');
    body+=text(compact?cx:x+62,y+(compact?75:59),card.label,compact?9:12,'muted',500,compact?'middle':'start');
    body+='</g>';
  });
  const description=`GitHub activity for Ramazan Yıldırım. ${number(stats.totalContributions)} contributions since 2023; ${number(stats.contributions)} in ${stats.year}; current streak ${stats.streak} days. ${stats.repositories} owned public non-fork repositories, ${stats.stars} stars received, ${stats.followers} followers. Contributions are GitHub calendar totals. The contribution and year rings are slightly smaller than the streak ring. Gradient outlines and background curves are decorative, not progress percentages or time-series data.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">GitHub activity</title><desc id="desc">${escapeXml(description)}</desc>
<defs><linearGradient id="activity-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${t.raised}"/><stop offset=".45" stop-color="${t.bg}"/><stop offset="1" stop-color="${t.panel}"/></linearGradient><linearGradient id="activity-panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${t.raised}"/><stop offset=".7" stop-color="${t.panel}"/></linearGradient><linearGradient id="activity-title" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${t.cyan}"/><stop offset="1" stop-color="${t.blue}"/></linearGradient>${gradients}</defs>
<style>text{font-family:'Segoe UI',Arial,sans-serif;font-variant-numeric:tabular-nums}.mono{font-family:Consolas,'Liberation Mono',monospace}.text{fill:${t.text}}.muted{fill:${t.muted}}.soft{fill:${t.soft}}</style>
<rect x=".7" y=".7" width="${width-1.4}" height="${height-1.4}" rx="13" fill="url(#activity-bg)" stroke="${t.line}" stroke-width=".8"/>
<path d="M1 ${compact?38:46}H${width-1}" stroke="${t.line}" stroke-width=".7"/>
<g aria-hidden="true"><circle cx="${compact?22:31}" cy="${compact?20:24}" r="5" fill="#ff5f57"/><circle cx="${compact?38:47}" cy="${compact?20:24}" r="5" fill="#febc2e"/><circle cx="${compact?54:63}" cy="${compact?20:24}" r="5" fill="#28c840"/></g>
<text x="${compact?79:94}" y="${compact?24:29}" class="mono" font-size="${compact?10:12}" font-weight="600"><tspan fill="${t.cyan}">~ / github</tspan><tspan fill="${t.soft}"> / activity</tspan></text>
<g transform="translate(${width-34} ${compact?13:16}) scale(.65)" fill="${t.muted}" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.4-5.5-6A4.7 4.7 0 0 1 5.5 8c-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.2 4.5 18.2 4.8 18.2 4.8c.6 1.7.2 2.9.1 3.2a4.7 4.7 0 0 1 1.3 3.3c0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.8c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"/></g>
<text x="${compact?20:28}" y="${compact?78:91}" font-size="${compact?28:34}" font-weight="750" letter-spacing="-.7"><tspan fill="${t.text}">GitHub </tspan><tspan fill="url(#activity-title)">activity</tspan></text>
${text(compact?21:29,compact?99:110,'CODE / BUILD / CONTRIBUTE / GROW',compact?7:8,'soft',500,'start','letter-spacing="1.4"')}
${compact?'':text(width-30,78,'SMALL COMMITS',8,'soft',500,'end','letter-spacing="1.5"')+text(width-30,93,'BIG PROGRESS',8,'soft',500,'end','letter-spacing="1.5"')}
${body}</svg>`;
}
function percentage(share) {
  return share>0&&share<.001?'<0.1%':`${(share*100).toFixed(1)}%`;
}
export function createLanguagesSvg(data,options={}) {
  const compact=options.compact,width=compact?360:720,t=THEMES[options.theme]||THEMES.dark;
  if(!data.totalBytes||!data.languages.length) {
    const body=`<circle cx="${width/2}" cy="139" r="35" fill="none" stroke="${t.line}" stroke-width="12"/>`+
      text(width/2,146,'—',25,'muted',400,'middle')+text(width/2,210,'No language data yet',compact?13:15,'text',400,'middle')+
      text(width/2,236,'Owned public repos · forks excluded',compact?10:11,'muted',400,'middle');
    return shell('Language mix',264,body,options,'No language bytes reported by GitHub for owned public non-fork repositories.');
  }
  const colors=options.theme==='light'?['#246b39','#176678','#805d14','#68509a','#966044','#53685b']:['#8bd49c','#83d6e8','#e5c07b','#bcabeb','#e8a87c','#9ba8b7'];
  const x=compact?180:156,y=compact?156:177,radius=compact?64:74;
  const rowY=compact?258:115,rowHeight=compact?26:30;
  const height=compact?Math.max(318,rowY+(data.languages.length-1)*rowHeight+52):Math.max(294,rowY+(data.languages.length-1)*rowHeight+55);
  let body=`<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${t.line}" stroke-width="18"/>`;
  let offset=0;
  data.languages.forEach((lang,i)=>{
    const share=lang.bytes/data.totalBytes,portion=share*100;
    body+=`<circle class="language-segment" cx="${x}" cy="${y}" r="${radius}" fill="none" pathLength="100" stroke="${colors[i%colors.length]}" stroke-width="18" stroke-dasharray="${portion} ${100-portion}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${x} ${y})"><title>${escapeXml(`${lang.name}: ${percentage(share)}`)}</title></circle>`;
    offset+=portion;
    const baseline=rowY+i*rowHeight,nameX=compact?52:316;
    body+=`<circle cx="${compact?30:294}" cy="${baseline-4}" r="4" fill="${colors[i%colors.length]}"/>`;
    body+=fittedText(nameX,baseline,lang.name,compact?12:13,compact?212:268,'text');
    body+=text(width-28,baseline,percentage(share),12,'muted',400,'end');
  });
  const leading=data.languages[0];
  body+=text(x,y+2,percentage(leading.bytes/data.totalBytes),compact?27:30,'text',600,'middle');
  body+=fittedText(x,y+25,leading.name,11,100,'muted',400,'middle');
  body+=text(width/2,height-20,'Code bytes · forks excluded',10,'muted',400,'middle');
  const description=`Language byte distribution across ${data.repositoryCount} owned public non-fork repositories, including archived repositories. ${data.languages.map(lang=>`${lang.name}: ${percentage(lang.bytes/data.totalBytes)}`).join('; ')}. This measures code bytes, not proficiency or time spent. Other groups languages outside the top five.`;
  return shell('Language mix',height,body,options,description,`${number(data.repositoryCount)} public repos`);
}
export function createErrorSvg(label,options={}) {
  const width=options.compact?360:720;
  const body=text(width/2,120,'Temporarily unavailable',options.compact?15:18,'amber',600,'middle')+
    text(width/2,153,'Please try again shortly.',options.compact?11:12,'muted',400,'middle');
  return shell(label,194,body,options,`${label} for Ramazan Yıldırım could not be loaded. No estimated statistics are shown.`);
}
export function svgResponse(svg,cacheSeconds=600) {
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate','Vercel-CDN-Cache-Control':`public, max-age=${cacheSeconds}`,'X-Content-Type-Options':'nosniff'}});
}
