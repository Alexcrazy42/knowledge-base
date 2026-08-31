// SDUI kanban e2e: 9-шаговый сценарий клиента против http://localhost:5210
// (frontend через vite-proxy ходит на .NET backend http://localhost:7120).
//
// Запуск:  dotnet run        (в sdui/backend/Sdui.Api — отдельный терминал)
//          npm run dev       (в sdui/frontend — отдельный терминал)
//          npm run e2e       (здесь)
// Код выхода 0/1; все шаги логируются в консоль.
//
// Браузер: сначала пробуем штатный (кэш ms-playwright своей ревизии),
// при отсутствии - fallback на абсолютный путь автора репозитория.
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:5210/';
const API = 'http://localhost:7120/api/health';
const CHROME_FALLBACK = 'C:\\Users\\alexc\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe';
const TIMEOUT = 20000;

const results = [];
const step = name => results.push({ name });

async function waitCount(page, selector, n, msg) {
    await page.waitForFunction(
        ([sel, expected]) => document.querySelectorAll(sel).length === expected,
        [selector, n], { timeout: TIMEOUT });
    console.log(`  ok ${msg} (count=${n})`);
}

async function waitContains(page, selector, text, msg) {
    await page.waitForFunction(
        ([sel, needle]) => Array.from(document.querySelectorAll(sel))
            .map(e => e.textContent || '').join(' ').includes(needle),
        [selector, text], { timeout: TIMEOUT });
    console.log(`  ok ${msg}`);
}

(async () => {
    // 0. Бэкенд поднят? Данные in-memory - откатываем к сиду, чтобы прогон
    //    был идемпотентным.
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
    } catch {
        browser = await chromium.launch({ executablePath: CHROME_FALLBACK, headless: true });
    }
    const page = await browser.newPage();
    page.setDefaultTimeout(TIMEOUT);

    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    try {
        const health = await (await fetch(API)).json();
        if (health.status !== 'ok') throw new Error('backend down');
        const reset = await (await fetch('http://localhost:7120/api/runtime/reset', { method: 'POST' })).json();
        if (!reset.ok) throw new Error('backend reset failed');
        console.log('backend api OK (store reseeded)');

        await page.goto(BASE, { timeout: 30000 });

        // 1. Каталог: заголовок, hint, 9 строк, чипы категорий, кнопки в шапке
        step('1. catalog screen loads');
        await waitContains(page, '.topbar h1', 'Склад — каталог товаров');
        await waitContains(page, '.topbar .hint', '9 позиций');
        await waitCount(page, '.row', 9, 'rows = 9');
        await page.waitForFunction(() => {
            const group = Array.from(document.querySelectorAll('.chips'))
                .find(g => (g.querySelector('.chips-label')?.textContent || '').trim() === 'Категория');
            return !!group && group.querySelectorAll(':scope .chip').length === 5;
        }, undefined, { timeout: TIMEOUT });
        console.log('  ok chips (Категория: Все + 4) = 5');
        await waitContains(page, 'nav.actions', 'Добавить товар');

        // 2. Фильтр по категории: чип «Напитки» -> 2 строки, чип selected
        step('2. filter by category');
        await page.locator('.chip').filter({ hasText: 'Напитки' }).click();
        await waitCount(page, '.row', 2, 'rows = 2 after filter');
        await page.waitForFunction(() =>
            document.querySelector('.chip.selected')?.textContent === 'Напитки');
        console.log('  ok chip selected = Напитки');

        // 3. Открытие товара: карточка деталей, кнопки Изменить/Удалить/Назад
        step('3. open product detail');
        await page.locator('.row').filter({ hasText: 'Вода минеральная' }).click();
        await waitContains(page, '.topbar h1', 'Вода минеральная');
        await waitContains(page, '.card', 'Напитки');
        await waitContains(page, '.card', '120');
        console.log('  ok detail title/fields');

        // 4. Редактирование: форма предзаполнена значениями
        step('4. edit form prefilled');
        await page.locator('.buttons-row .btn').filter({ hasText: 'Изменить' }).click();
        await waitContains(page, '.topbar h1', 'Редактирование: Вода минеральная');
        const nameVal = await page.locator('input[name="name"]').inputValue();
        if (nameVal !== 'Вода минеральная') throw new Error(`expected prefill, got "${nameVal}"`);
        console.log('  ok prefill name');

        // 5. Валидация СЕРВЕРА: короткое имя + цена 0 -> ошибки полей от бэкенда
        step('5. server-side field validation');
        await page.locator('input[name="name"]').fill('А');
        await page.locator('input[name="price"]').fill('0');
        await page.locator('button[type="submit"]').click();
        await waitContains(page, 'form', 'слишком короткое');
        await waitContains(page, 'form', 'Цена от 1 до 100000');
        console.log('  ok server field errors shown');

        // 6. Исправляем и сохраняем: тост + возврат в каталог, имя изменено
        step('6. save edited product');
        await page.locator('input[name="name"]').fill('Вода минеральная газированная');
        await page.locator('input[name="price"]').fill('95');
        await page.locator('button[type="submit"]').click();
        await waitContains(page, '.toast', 'обновлён');
        await waitContains(page, '.topbar h1', 'Склад — каталог товаров');
        await waitContains(page, '.row', 'Вода минеральная газированная');
        console.log('  ok edited + toast + back to catalog');

        // 7. Создание нового товара через форму
        step('7. create new product');
        await page.locator('nav.actions .btn').filter({ hasText: 'Добавить товар' }).click();
        await waitContains(page, '.topbar h1', 'Новый товар');
        await page.locator('input[name="name"]').fill('Печенье овсяное');
        await page.locator('select[name="category"]').selectOption('Продукты');
        await page.locator('input[name="price"]').fill('45');
        await page.locator('input[name="stock"]').fill('10');
        await page.locator('textarea[name="description"]').fill('к чаю');
        await page.locator('button[type="submit"]').click();
        await waitContains(page, '.toast', 'добавлен');
        await waitContains(page, '.row', 'Печенье овсяное');
        console.log('  ok created in catalog');

        // 8. Удаление с подтверждением
        step('8. cascading confirm-delete');
        await page.locator('.row').filter({ hasText: 'Печенье овсяное' }).click();
        await waitContains(page, '.card', 'к чаю');
        await page.locator('.buttons-row .btn').filter({ hasText: 'Удалить' }).click();
        await waitContains(page, '.modal p', 'Удалить товар «Печенье овсяное»?');
        await page.getByRole('button', { name: 'Удалить', exact: true }).click();
        await waitContains(page, '.toast', 'удалён');
        await waitContains(page, '.topbar h1', 'Склад — каталог товаров');
        await page.waitForFunction(() => !Array.from(document.querySelectorAll('.row'))
            .some(r => r.textContent.includes('Печенье овсяное')));
        console.log('  ok deleted, gone from catalog');

        // 9. Схема экрана (SDUI) видна в инспекторе; reload сохраняет состояние
        step('9. schema inspector + reload');
        await page.locator('.inspector summary').click();
        await page.waitForFunction(() =>
            document.querySelector('.inspector pre')?.textContent.includes('"view"'));
        console.log('  ok inspector shows raw screen JSON');
        await page.reload({ timeout: 30000 });
        await waitContains(page, '.topbar h1', 'Склад — каталог товаров');
        await waitCount(page, '.row', 9, 'rows = 9 after reload');

        const realErrors = errors.filter(e => !e.includes('favicon'));
        console.log('CONSOLE_ERRORS:', realErrors.length);
        if (realErrors.length) console.log(realErrors.join('\n'));
        console.log(`ALL STEPS PASSED: ${results.length}`);
        process.exitCode = 0;
    } catch (err) {
        const failedName = results[results.length - 1]?.name ?? '?';
        console.log('FAILED step:', failedName, '->', err.message.split('\n')[0]);
        console.log(`ALL STEPS PASSED: 0/${results.length} (failed at ${failedName})`);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})().catch(e => { console.log('FATAL:', e.message.split('\n')[0]); process.exit(1); });