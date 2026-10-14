import { getLanguages } from '../lib/languages.js';
import { createLanguagesSvg, createErrorSvg, optionsFrom, svgResponse } from '../lib/cards.js';

export default {
  async fetch(request = new Request('http://localhost/api/languages')) {
    const options=optionsFrom(request);
    try {
      return svgResponse(createLanguagesSvg(await getLanguages(),options),21600);
    } catch {
      console.error('GitHub languages unavailable');
      return svgResponse(createErrorSvg('Languages',options),60);
    }
  },
};
