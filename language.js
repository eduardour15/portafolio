(() => {
    const requested = new URLSearchParams(location.search).get('lang');
    const explicit = requested === 'es' || requested === 'en' ? requested : null;
    let saved = null;
    try {
        if (explicit) localStorage.setItem('portfolio-language', explicit);
        else saved = localStorage.getItem('portfolio-language');
    } catch { /* The links still work when storage is unavailable. */ }

    const browser = (navigator.languages || [navigator.language || 'es'])
        .find(language => /^(es|en)(-|$)/i.test(language)) || 'es';
    const preferred = explicit || (saved === 'es' || saved === 'en' ? saved : null) ||
        (browser.toLowerCase().startsWith('en') ? 'en' : 'es');
    if (document.documentElement.lang === 'es' && preferred === 'en') {
        location.replace(`en.html${location.hash}`);
        return;
    }

    addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-language]').forEach(link => {
            link.addEventListener('click', () => { link.hash = location.hash; });
        });
    });
})();
