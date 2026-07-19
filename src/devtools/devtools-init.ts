import browser from 'webextension-polyfill';

browser.devtools.panels.create(
  'QA Finder',
  '',
  'devtools/index.html'
).then((panel: any) => {
  console.log('QA Finder DevTools panel created');
});
