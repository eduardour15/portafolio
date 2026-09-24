const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const localPage = (file, query = '') => `${pathToFileURL(path.join(root, file)).href}${query}`;

const widths = [
    ...Array.from({ length: 51 }, (_, i) => 320 + i * 32),
    360, 375, 390, 414, 430, 580, 599, 600, 601, 699, 700, 701,
    767, 768, 799, 800, 801, 1024, 1049, 1050, 1051, 1280, 1440, 1920
].filter((width, index, all) => all.indexOf(width) === index).sort((a, b) => a - b);

function collectErrors(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
    });
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    return errors;
}

test('la página y sus recursos cargan sin errores', async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto(localPage('index.html', '?lang=es'));
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    expect(await page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);

    const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => {
        const url = new URL(anchor.href);
        return url.protocol === 'file:' ? url.href : null;
    }).filter(Boolean));
    for (const link of new Set(links)) {
        expect(fs.existsSync(fileURLToPath(link)), `enlace local ${link}`).toBe(true);
    }

    expect(errors).toEqual([]);
});

test('el diseño fluye entre anchos móviles, puntos de quiebre y escritorio', async ({ page }) => {
    await page.goto(localPage('index.html', '?lang=es'));
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(242, 240, 233)');

    for (const width of widths) {
        await page.setViewportSize({ width, height: 844 });
        const layout = await page.evaluate(() => {
            const heading = document.querySelector('.hero h1');
            const lede = document.querySelector('.hero-lede');
            const box = heading.getBoundingClientRect();
            const style = getComputedStyle(heading);
            return {
                viewport: innerWidth,
                document: document.documentElement.scrollWidth,
                headingRight: box.right,
                headingBottom: box.bottom,
                ledeTop: lede.getBoundingClientRect().top,
                fontSize: parseFloat(style.fontSize),
                lineHeight: parseFloat(style.lineHeight)
            };
        });

        expect(layout.document, `desbordamiento horizontal a ${width}px`).toBeLessThanOrEqual(layout.viewport);
        expect(layout.headingRight, `titular fuera de pantalla a ${width}px`).toBeLessThanOrEqual(layout.viewport);
        expect(layout.headingBottom, `titular invade el texto a ${width}px`).toBeLessThanOrEqual(layout.ledeTop + 1);
        if (width <= 700) {
            expect(layout.lineHeight, `líneas del titular superpuestas a ${width}px`).toBeGreaterThanOrEqual(layout.fontSize);
        }
    }
});

test('el menú móvil, los enlaces de idioma y los casos se pueden usar', async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(localPage('index.html', '?lang=es#contacto'));

    const toggle = page.getByRole('button', { name: /Menú/ });
    const dialog = page.getByRole('dialog', { name: 'Navegación móvil' });
    await expect(toggle).toBeVisible();
    expect(await toggle.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await toggle.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('link', { name: 'Proyectos', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/#proyectos$/);

    await page.goto(localPage('index.html', '?lang=es#contacto'));
    await toggle.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/en\.html\?lang=en#contacto$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.setViewportSize({ width: 1280, height: 900 });
    const details = page.locator('.case-detail').first();
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await expect(details.locator('.case-detail-body')).toBeVisible();
    await details.locator('summary').click();
    await expect(details).not.toHaveAttribute('open', '');
    expect(errors).toEqual([]);
});

test('el menú sigue accesible en móvil apaisado y con movimiento reducido', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(localPage('index.html', '?lang=es'));
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => ({
        onControl: document.activeElement.matches('.skip-link, .menu-toggle'),
        visible: document.activeElement.matches(':focus-visible'),
        outline: getComputedStyle(document.activeElement).outlineWidth
    }));
    expect(focus.onControl).toBe(true);
    expect(focus.visible).toBe(true);
    expect(focus.outline).toBe('3px');

    await page.setViewportSize({ width: 320, height: 568 });
    await page.getByRole('button', { name: /Menú/ }).click();
    const shortDialog = page.getByRole('dialog', { name: 'Navegación móvil' });
    await expect(shortDialog).toBeVisible();
    await shortDialog.getByRole('button', { name: /Cerrar/ }).click();
    await expect(shortDialog).not.toBeVisible();

    await page.setViewportSize({ width: 844, height: 390 });
    await page.getByRole('button', { name: /Menú/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Navegación móvil' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Contacto', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Cerrar/ }).click();
    await expect(dialog).not.toBeVisible();

    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    const preferences = await page.locator('html').evaluate(el => ({
        scrollBehavior: getComputedStyle(el).scrollBehavior,
        background: getComputedStyle(document.body).backgroundColor
    }));
    expect(preferences.scrollBehavior).toBe('auto');
    expect(preferences.background).toBe('rgb(242, 240, 233)');
});
