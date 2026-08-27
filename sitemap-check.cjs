const { accessToken, SCOPES } = require('../SiteFactory/sitekit/google-auth.js');
const config = require('./site.config.json');

(async () => {
  const token = await accessToken(SCOPES.searchConsoleRead, config.secrets.searchConsoleSAEmail);
  const siteUrl = encodeURIComponent(`sc-domain:${config.host}`);
  const feedpath = encodeURIComponent('https://perccheck.com/sitemap.xml');
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/sitemaps/${feedpath}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
})();
