let runner = require('chrome-runner'),
  CDP = require('chrome-remote-interface'),
  express = require('express'),
  app = express();

app.use(express.static(__dirname + '/application'));

app.listen(9223);

(async function() {
  chrome = await runner.launch({ port: 9222 });
  var client = await CDP();

  // extract domains
  const { Network, Page } = client;

  // setup handlers
  Network.requestWillBeSent(params => {
    //console.log(params.request.url.white);
  });

  await Promise.all([Network.enable(), Page.enable()]);
  await Page.navigate({ url: 'http://localhost:9223' });
  await Page.loadEventFired();
})();
