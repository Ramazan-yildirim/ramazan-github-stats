import test from 'node:test';
import assert from 'node:assert/strict';
import { createStatsSvg, createLanguagesSvg, createErrorSvg } from '../lib/cards.js';

const activity={totalContributions:1200,contributions:600,year:2026,streak:12,repositories:19,stars:7,followers:20,forks:3};
const languages={repositoryCount:19,totalBytes:1000,languages:[{name:'Python',bytes:600},{name:'JavaScript',bytes:250},{name:'Other',bytes:150}]};
const arcs=svg=>[...svg.matchAll(/class="language-segment"[^>]*stroke-dasharray="([\d.e+-]+) ([\d.e+-]+)"[^>]*stroke-dashoffset="([\d.e+-]+)"/g)].map(match=>match.slice(1).map(Number));

test('donut arc lengths and offsets represent the complete byte distribution',()=>{
  for(const theme of ['dark','light'])for(const compact of [false,true]) {
    const svg=createLanguagesSvg(languages,{theme,compact});
    const segments=arcs(svg);
    assert.deepEqual(segments,[[60,40,0],[25,75,-60],[15,85,-85]]);
    assert.equal(segments.reduce((sum,[length])=>sum+length,0),100);
    assert.match(svg,/60\.0%/);
    assert.doesNotMatch(svg,/NaN|Infinity/);
  }
});
test('a single language fills the ring; small languages retain their byte share',()=>{
  assert.deepEqual(arcs(createLanguagesSvg({...languages,totalBytes:10,languages:[{name:'Python',bytes:10}]})),[[100,0,0]]);
  const tiny=createLanguagesSvg({...languages,totalBytes:10000,languages:[{name:'Python',bytes:9999},{name:'Other',bytes:1}]});
  assert.match(tiny,/&lt;0\.1%/);
  assert.equal(arcs(tiny)[1][0],.01);
});
test('empty and unavailable data never create a fake distribution',()=>{
  for(const compact of [false,true]) {
    const empty=createLanguagesSvg({repositoryCount:0,totalBytes:0,languages:[]},{compact});
    assert.match(empty,/No language data yet/);
    assert.equal(arcs(empty).length,0);
    assert.doesNotMatch(empty,/NaN|Infinity|0\.0%/);
    assert.match(createErrorSvg('Languages',{compact}),/Temporarily unavailable/);
  }
});
test('zero and large activity counts stay numeric and have explicit scopes',()=>{
  for(const compact of [false,true]) {
    const svg=createStatsSvg({...activity,totalContributions:123456789,contributions:0,streak:0},{compact});
    assert.match(svg,/123,456,789/);
    assert.match(svg,/since 2023/);
    assert.match(svg,/2026/);
    assert.match(svg,/Public repos/);
    assert.doesNotMatch(svg,/NaN|Infinity|stroke-dasharray|rank_icon/);
  }
});
test('chart labels and accessible descriptions escape markup',()=>{
  const svg=createLanguagesSvg({...languages,languages:[{name:'A&B<script>',bytes:1000}]});
  assert.match(svg,/A&amp;B&lt;script&gt;/);
  assert.doesNotMatch(svg,/<script>/);
});
