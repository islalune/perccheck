const { accessToken, SCOPES } = require('../SiteFactory/sitekit/google-auth.js');
const config = require('./site.config.json');

async function inspect(url) {
  const token = await accessToken(SCOPES.searchConsoleRead, config.secrets.searchConsoleSAEmail);
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: `sc-domain:${config.host}` })
  });
  const data = await res.json();
  return data;
}

(async () => {
  const urls = [
    `https://${config.host}/`,
    `https://${config.host}/browse/ak`,
    `https://${config.host}/browse/tx`,
    `https://${config.host}/guides`,
  ];
  for (const u of urls) {
    try {
      const r = await inspect(u);
      const idx = r.inspectionResult?.indexStatusResult;
      console.log(u, '=>', idx?.coverageState, '| lastCrawl:', idx?.lastCrawlTime, '| referringUrls:', idx?.referringUrls);
    } catch (e) {
      console.log(u, 'ERROR', e.message);
    }
  }
})();
