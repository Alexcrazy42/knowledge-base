// FSD kanban e2e: 9-шаговый gherkin-lite сценарий против http://localhost:5197
//
// Запуск:  npm run dev     (в отдельном терминале)
//          npm run e2e     (здесь)
// Код выхода 0/1; все шаги логируются в консоль.
//
// Браузер: сначала пробуем штатный (кэш ms-playwright своей ревизии),
// при отсутствии - fallback на абсолютный путь автора репозитория.
// Установить браузер: npx playwright-core install chromium
const { chromium } = require('playwright-core');

const BASE = 'http://localhost:5197/';
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

async function waitCardHas(page, cardText, dimText, msg) {
    await page.waitForFunction(
        ([needle, dim]) => {
            const card = Array.from(document.querySelectorAll('.task-card'))
                .find(c => (c.textContent || '').includes(needle));
            return !!card && (card.textContent || '').includes(dim);
        },
        [cardText, dimText], { timeout: TIMEOUT });
    console.log(`  ok ${msg}`);
}

async function waitEmpty(page, msg) {
    await waitContains(page, 'main .empty', 'Создайте первую доску', msg);
}

(async () => {
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
        await page.goto(BASE, { timeout: 30000 });

        // ---- старт с чистого листа ----
        await page.evaluate(() => localStorage.clear());
        await page.reload({ timeout: 30000 });

        // 1. Создать доску B1
        step('1. create board B1');
        await page.getByRole('button', { name: '+ Доска' }).click();
        await page.getByRole('textbox').first().fill('B1');
        await page.getByRole('textbox').first().press('Enter');
        await waitContains(page, '.column h3', 'К выполнению (0)');
        await waitContains(page, '.status-bar', 'Доска «B1» создана');

        // 2. Пользователи: Анна и Борис
        step('2. add users Anna+Boris');
        await page.getByRole('button', { name: 'Пользователи' }).click();
        await page.getByPlaceholder('Имя нового пользователя').fill('Анна');
        await page.getByPlaceholder('Имя нового пользователя').press('Enter');
        await page.getByPlaceholder('Имя нового пользователя').fill('Борис');
        await page.getByPlaceholder('Имя нового пользователя').press('Enter');
        await waitCount(page, '.user-list li', 2, 'users list = 2');
        await page.getByRole('button', { name: 'Закрыть' }).click();

        // 3. Сид эпика EPIC-1 (5 задач TASK-1..5)
        step('3. seed EPIC-1 with TASK-1..5');
        await page.getByRole('button', { name: 'Тест-эпик 🧪' }).click();
        await waitContains(page, '.epic-row', 'EPIC-1 · Тестовый эпик (2/5)');
        await waitContains(page, '.task-card', 'TASK-1');
        await waitCount(page, '.task-card', 5, 'seed tasks = 5');

        // 4. Ручная задача «Задача 1» на Анну
        step('4. add manual task TASK-6 (Anna)');
        await page.locator('.column').first().getByRole('button', { name: '+ Задача' }).click();
        await page.getByRole('textbox').first().fill('Задача 1');
        await page.locator('.modal select').nth(3).selectOption({ label: 'Анна' }); // исполнитель
        await page.getByRole('button', { name: 'Сохранить' }).click();
        await waitContains(page, '.status-bar', 'TASK-6 создана');
        await waitCardHas(page, 'Задача 1', 'Анна', 'manual card on Anna');

        // 5. Фильтр поиска «Задача 1» -> только ручная задача; сброс фильтров
        step('5. search filter isolates TASK-6, clear filters');
        await page.locator('input.search').fill('Задача 1');
        await waitCount(page, '.task-card', 1, 'filtered cards = 1');
        await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
        await waitCount(page, '.task-card', 6, 'cards = 6 after reset');

        // 6. Каскадное удаление EPIC-1
        step('6. cascade delete EPIC-1');
        await page.locator('.epic-row').first().click();
        await page.getByRole('button', { name: 'Удалить выбранный эпик' }).click();
        await waitContains(page, '.modal', 'Удаление EPIC-1');
        await page.getByRole('button', { name: /Удалить эпик и 5 задач\(и\)/ }).click();
        await waitContains(page, '.status-bar', 'EPIC-1 удалён вместе с задачами');
        await waitCount(page, '.epic-row', 0, 'epics = 0');
        await waitCount(page, '.task-card', 1, 'tasks = 1');

        // 7. Удаление Анны с переносом задач Борису
        step('7. delete Anna, reassign task to Boris');
        await page.getByRole('button', { name: 'Пользователи' }).click();
        await page.locator('.user-list li button').first().click();   // корзина Анны
        await waitContains(page, '.modal', 'Перенос задач');
        await page.getByRole('button', { name: 'Перенести и удалить' }).click();
        await waitCount(page, '.user-list li', 1, 'users = 1');
        await page.getByRole('button', { name: 'Закрыть' }).click();
        await waitCardHas(page, 'TASK-6', 'Борис', 'task reassigned to Boris');

        // 8. Полный сброс по слову СБРОС
        step('8. reset all by word СБРОС');
        await page.getByRole('button', { name: 'Сброс всего' }).click();
        await page.getByRole('textbox').first().fill('СБРОС');
        await page.getByRole('button', { name: 'OK' }).click();
        await waitContains(page, '.status-bar', 'Все данные удалены');
        await waitEmpty(page, 'empty state shown');
        await waitCount(page, '.board-select option', 0, 'no boards');
        const stored = await page.evaluate(() => localStorage.getItem('fsd-kanban.v1'));
        if (stored !== null) throw new Error('localStorage key not removed after reset');

        // 9. Перезагрузка: мир пуст (персистентность соблюдена)
        step('9. reload keeps empty world');
        await page.reload({ timeout: 30000 });
        await waitEmpty(page, 'empty state after reload');

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
})().catch(e => { console.log('FATAL:', e.message); process.exit(1); });