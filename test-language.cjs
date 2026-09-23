const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync(__dirname + '/language.js', 'utf8');

function check({ page = 'es', search = '', hash = '', browser = 'es-NI', saved = null, storageWorks = true }) {
    let redirect = null;
    let stored = saved;
    const link = { hash: '', addEventListener(_event, handler) { this.click = handler; } };
    const context = {
        URLSearchParams,
        location: { search, hash, replace(url) { redirect = url; } },
        navigator: { languages: Array.isArray(browser) ? browser : [browser] },
        document: { documentElement: { lang: page }, querySelectorAll() { return [link]; } },
        localStorage: {
            getItem() { if (!storageWorks) throw Error('storage blocked'); return stored; },
            setItem(_key, value) { if (!storageWorks) throw Error('storage blocked'); stored = value; }
        },
        addEventListener(_event, handler) { handler(); }
    };
    vm.runInNewContext(script, context);
    if (link.click) link.click();
    return { redirect, stored, linkHash: link.hash };
}

assert.equal(check({ browser: 'en-US', hash: '#proyectos' }).redirect, 'en.html#proyectos');
assert.equal(check({ browser: 'es-NI' }).redirect, null);
assert.equal(check({ browser: ['fr-FR', 'en-US'] }).redirect, 'en.html');
assert.equal(check({ browser: ['es-NI', 'en-US'] }).redirect, null);
assert.equal(check({ browser: 'en-US', search: '?lang=es' }).stored, 'es');
assert.equal(check({ browser: 'en-US', saved: 'es' }).redirect, null);
assert.equal(check({ browser: 'es-NI', saved: 'en' }).redirect, 'en.html');
assert.equal(check({ page: 'en', browser: 'es-NI', search: '?lang=en' }).stored, 'en');
assert.equal(check({ browser: 'en-US', search: '?lang=es', storageWorks: false }).redirect, null);
assert.equal(check({ page: 'en', hash: '#contacto' }).linkHash, '#contacto');
console.log('Language detection, manual choice and section preservation: OK');
