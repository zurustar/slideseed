const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const context = vm.createContext({});
vm.runInContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1], context);
module.exports = {html, context, parse: context.parseMarkdown};
