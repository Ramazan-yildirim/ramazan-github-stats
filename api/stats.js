import { getOverview } from '../lib/github.js';
import { createStatsSvg, createErrorSvg, optionsFrom, svgResponse } from '../lib/cards.js';

export default {
  async fetch(request = new Request('http://localhost/api/stats')) {
    const options = optionsFrom(request);
    try {
      return svgResponse(createStatsSvg(await getOverview(), options), 600);
    } catch {
      console.error('GitHub overview unavailable');
      return svgResponse(createErrorSvg('GitHub overview', options), 60);
    }
  },
};
