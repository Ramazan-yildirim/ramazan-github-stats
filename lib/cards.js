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
function numberRing(x,y,radius,value,color,options,size) {
  const t=THEMES[options.theme]||THEMES.dark;
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${t.line}" stroke-width="4"/>
<circle class="metric-ring" cx="${x}" cy="${y}" r="${radius}" fill="none" stroke="${color}" stroke-width="2"/>`+
    fittedText(x,y+(size>22?9:7),number(value),size,radius*1.65,'text',600,'middle');
}
function metric(x,y,value,label,scope,compact,options,color) {
  return numberRing(x,y,compact?36:44,value,color,options,compact?22:27)+
    text(x,y+66,label,compact?10:12,'muted',400,'middle')+
    text(x,y+82,scope,compact?9:10,'muted',400,'middle');
}
function streakRing(x,y,streak,options) {
  const t=THEMES[options.theme]||THEMES.dark;
  // A complete decorative outline, not a progress gauge or a made-up rank.
  return `<circle cx="${x}" cy="${y}" r="60" fill="none" stroke="${t.line}" stroke-width="5"/>
<circle class="streak-ring" cx="${x}" cy="${y}" r="60" fill="none" stroke="${t.cyan}" stroke-width="3"/>
<g class="streak-flame" aria-hidden="true" transform="translate(${x} ${y-60})"><circle r="14" fill="${t.bg}"/><path transform="translate(-8 -11)" d="M10 0c1 6 6 7 6 12a8 8 0 0 1-16 0c0-4 3-6 5-9-1 5 2 7 4 5 2-2 1-5 1-8Z" fill="none" stroke="${t.amber}" stroke-width="1.6" stroke-linejoin="round"/></g>
${fittedText(x,y+10,number(streak),34,100,'text',600,'middle')}
${text(x,y+34,'day streak',11,'muted',400,'middle')}`;
}
export function createStatsSvg(stats,options={}) {
  const compact=options.compact,width=compact?360:720,t=THEMES[options.theme]||THEMES.dark;
  let body=streakRing(width/2,147,stats.streak,options);
  body+=metric(compact?72:132,147,stats.totalContributions,'Contributions','since 2023',compact,options,t.accent);
  body+=metric(compact?288:588,147,stats.contributions,'This year',String(stats.year),compact,options,t.amber);
  body+=`<path d="M24 249H${width-24}" class="rule"/>`;
  const summary=[['Public repos',stats.repositories,options.theme==='light'?'#68509a':'#bcabeb'],['Stars',stats.stars,t.amber],['Followers',stats.followers,options.theme==='light'?'#9a455c':'#d88c9a']];
  summary.forEach(([label,value,color],i)=>{
    const x=compact?72+i*108:132+i*228;
    body+=numberRing(x,290,26,value,color,options,19)+text(x,337,label,compact?10:11,'muted',400,'middle');
  });
  const description=`GitHub activity for Ramazan Yıldırım. ${number(stats.totalContributions)} contributions since 2023; ${number(stats.contributions)} in ${stats.year}; current streak ${stats.streak} days. ${stats.repositories} owned public non-fork repositories, ${stats.stars} stars received, ${stats.followers} followers. Contributions are GitHub calendar totals. Colored outlines highlight the counts, with the largest circle for the streak; they are not progress percentages.`;
  return shell('GitHub activity',358,body,options,description);
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
