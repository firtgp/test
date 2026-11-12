import {expect, test, type Page} from '@playwright/test';

const OWNER = {email: 'owner@example.org', password: 'demo-owner-pass'};
const PASSWORD = 'correct-horse-42';

async function register(page: Page, nick: string, email: string, password = PASSWORD) {
  await page.goto('/register');
  await page.getByLabel('Ник в игре').fill(nick);
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', {name: 'Создать аккаунт'}).click();
}
async function confirmFromMail(page: Page) {
  await page.getByRole('link', {name: 'открыть ссылку из письма'}).first().click();
  await expect(page.getByText('Почта подтверждена').first()).toBeVisible();
}
async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Почта').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', {name: 'Войти', exact: true}).click();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}
const png = (rgb: [number, number, number]) => {
  // Несжатый BMP-подобный PNG собирать долго; берём готовые 1×1 PNG разных цветов.
  const red = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  const blue = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';
  const green = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(rgb[0] ? red : rgb[2] ? blue : green, 'base64');
};

test.describe('витрина', () => {
  test('первый экран: оффер, главное действие, честные статусы, дисклеймер', async ({page}) => {
    await page.goto('/');
    await expect(page.getByRole('heading', {level: 1})).toHaveText('Три мира на модах. Один аккаунт.');
    await expect(page.getByText('Демо-режим.')).toBeVisible();
    // Три разных состояния мониторинга: текст, а не только цвет.
    await expect(page.getByText('Онлайн').first()).toBeVisible();
    await expect(page.getByText('Офлайн').first()).toBeVisible();
    await expect(page.getByText(/Нет данных с \d\d:\d\d МСК/).first()).toBeVisible();
    // Суммарный онлайн считает только живой сервер: устаревшие 12 игроков не прибавляются.
    await expect(page.getByText('Сейчас играют: 37')).toBeVisible();
    await expect(page.getByText('NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.')).toBeVisible();
    await noOverflow(page);
    await page.getByRole('link', {name: 'Начать играть'}).first().click();
    await expect(page).toHaveURL(/\/start$/);
    await expect(page.getByRole('heading', {level: 1})).toHaveText('Как начать играть');
  });

  test('кнопка на карточке предвыбирает сервер в инструкции', async ({page}) => {
    await page.goto('/');
    await page.getByRole('link', {name: 'Играть на «Магия»'}).first().click();
    await expect(page).toHaveURL(/\/start\?server=magic$/);
    await expect(page.getByText('Вы выбрали сервер «Магия»')).toBeVisible();
    await expect(page.getByRole('combobox', {name: 'Сервер'})).toContainText('Магия');
    await expect(page.getByText('magic.example.org')).toBeVisible();
  });

  test('страница сервера: сборка, моды со ссылками, время вайпа в поясе проекта', async ({page}) => {
    await page.goto('/servers/techno');
    await expect(page.getByRole('heading', {level: 1})).toHaveText('Техно');
    await expect(page.getByText('5 декабря 2026, 18:00 МСК')).toBeVisible();
    await expect(page.getByRole('link', {name: 'Create'})).toHaveAttribute('href', 'https://modrinth.com/mod/create');
    await expect(page.getByText('Уточняется').first()).toBeVisible();
    await page.goto('/servers/nope');
    await expect(page.getByRole('heading', {name: 'Сервер не найдена'})).toBeVisible();
  });

  test('копирование адреса: успех только после записи в буфер', async ({page, context}) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/servers/techno');
    await page.getByRole('button', {name: 'Скопировать адрес'}).click();
    await expect(page.getByText('Адрес techno.example.org скопирован').first()).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('techno.example.org');
  });

  test('копирование адреса: при отказе браузера показывается поле, а не «успех»', async ({page}) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {value: {writeText: () => Promise.reject(new Error('denied'))}});
    });
    await page.goto('/servers/techno');
    await page.getByRole('button', {name: 'Скопировать адрес'}).click();
    await expect(page.getByLabel(/Не удалось скопировать автоматически/)).toHaveValue('techno.example.org');
    await expect(page.getByText('скопирован', {exact: false})).toHaveCount(0);
  });

  test('неизвестный адрес — понятная страница', async ({page}) => {
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', {name: 'Страница не найдена'})).toBeVisible();
    await page.getByRole('link', {name: 'На главную'}).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('офлайн: сайт сообщает о потере связи', async ({page, context}) => {
    await page.goto('/');
    await context.setOffline(true);
    await expect(page.getByText('Нет соединения с интернетом')).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText('Нет соединения с интернетом')).toHaveCount(0);
  });
});

test.describe('аккаунт', () => {
  test('регистрация → подтверждение почты → вход → выбор сервера', async ({page}) => {
    await page.goto('/start?server=survival');
    await page.getByRole('link', {name: 'Создать аккаунт'}).click();
    await expect(page.getByText('После регистрации вернёмся к серверу «Выживание»')).toBeVisible();
    await register(page, 'Steve_2026', 'steve@example.org');
    await expect(page.getByRole('heading', {name: 'Подтвердите почту'})).toBeVisible();

    // До подтверждения вход закрыт.
    await login(page, 'steve@example.org');
    await expect(page.getByRole('alert').filter({hasText: 'Почта ещё не подтверждена'}).first()).toBeVisible();
    await confirmFromMail(page);

    await login(page, 'steve@example.org');
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('heading', {level: 1})).toHaveText('Привет, Steve_2026');
    await page.getByRole('navigation', {name: 'Разделы кабинета'}).getByRole('link', {name: 'Настройки'}).click();
    await expect(page).toHaveURL(/\/account\/settings$/);
    await expect(page.getByText('(подтверждена)')).toBeVisible();

    await page.getByRole('combobox', {name: 'Сервер по умолчанию'}).click();
    await page.getByRole('option', {name: /Выживание/}).click();
    await expect(page.getByText('Сервер сохранён').first()).toBeVisible();
    await page.getByRole('link', {name: 'Играть на «Выживание»'}).click();
    await expect(page.getByText('Вы вошли как')).toBeVisible();
    await expect(page.getByText('survival.example.org')).toBeVisible();

    // Сессия переживает перезагрузку; выход её закрывает.
    await page.reload();
    await expect(page.getByRole('link', {name: 'Steve_2026'})).toBeVisible();
    await page.goto('/account');
    await page.getByRole('button', {name: 'Выйти', exact: true}).click();
    await expect(page.getByRole('link', {name: 'Войти'})).toBeVisible();
  });

  test('ник занят без учёта регистра: понятная ошибка, ввод сохранён', async ({page}) => {
    await register(page, 'Player_One', 'one@example.org');
    await expect(page.getByRole('heading', {name: 'Подтвердите почту'})).toBeVisible();
    await register(page, 'player_one', 'two@example.org');
    await expect(page.getByRole('alert').filter({hasText: 'Этот ник уже занят'}).first()).toBeVisible();
    await expect(page.getByLabel('Почта')).toHaveValue('two@example.org');
    await expect(page.getByLabel('Пароль')).toHaveValue(PASSWORD);
    // Исправляем только ник — регистрация проходит.
    await page.getByLabel('Ник в игре').fill('Player_Two');
    await expect(page.getByText('Ник свободен').first()).toBeVisible();
    await page.getByRole('button', {name: 'Создать аккаунт'}).click();
    await expect(page.getByRole('heading', {name: 'Подтвердите почту'})).toBeVisible();
  });

  test('валидация формы регистрации', async ({page}) => {
    await register(page, 'ab', 'not-an-email', 'short');
    await expect(page.getByText('Ник: от 3 до 16 символов').first()).toBeVisible();
    await expect(page.getByText('Укажите почту в формате name@example.com').first()).toBeVisible();
    await expect(page.getByText('Пароль не короче 10 символов').first()).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Создать аккаунт'})).toBeVisible();
  });

  test('сброс пароля: ссылка одноразовая, старый пароль перестаёт работать', async ({page}) => {
    await register(page, 'Resetter', 'reset@example.org');
    await confirmFromMail(page);
    await page.goto('/forgot');
    await page.getByLabel('Почта').fill('reset@example.org');
    await page.getByRole('button', {name: 'Прислать ссылку'}).click();
    await expect(page.getByText('Если такой аккаунт есть, письмо отправлено')).toBeVisible();
    const link = await page.getByRole('link', {name: 'открыть ссылку из письма'}).first().getAttribute('href');
    await page.goto(link!);
    await page.getByLabel('Новый пароль').fill('brand-new-pass-77');
    await page.getByRole('button', {name: 'Сохранить пароль'}).click();
    await expect(page.getByText('Новый пароль сохранён')).toBeVisible();

    // Повторное использование той же ссылки.
    await page.goto(link!);
    await page.getByLabel('Новый пароль').fill('attacker-pass-000');
    await page.getByRole('button', {name: 'Сохранить пароль'}).click();
    await expect(page.getByRole('alert').filter({hasText: 'Ссылка устарела или уже использована'}).first()).toBeVisible();

    await login(page, 'reset@example.org', PASSWORD);
    await expect(page.getByRole('alert').filter({hasText: 'Неверная почта или пароль'}).first()).toBeVisible();
    await login(page, 'reset@example.org', 'brand-new-pass-77');
    await expect(page).toHaveURL(/\/account$/);
  });

  test('неизвестная почта при сбросе не раскрывается', async ({page}) => {
    await page.goto('/forgot');
    await page.getByLabel('Почта').fill('nobody@example.org');
    await page.getByRole('button', {name: 'Прислать ссылку'}).click();
    await expect(page.getByText('Если такой аккаунт есть, письмо отправлено')).toBeVisible();
    await expect(page.getByText('Писем пока нет.')).toBeVisible();
  });

  test('перебор пароля блокируется', async ({page}) => {
    for (let i = 0; i < 5; i++) {
      await login(page, OWNER.email, `wrong-password-${i}`);
      await expect(page.getByRole('alert').filter({hasText: 'Неверная почта или пароль'}).first()).toBeVisible();
    }
    await login(page, OWNER.email, OWNER.password);
    await expect(page.getByRole('alert').filter({hasText: 'Слишком много попыток'}).first()).toBeVisible();
  });

  test('смена ника сохраняет UUID и ограничена по времени', async ({page}) => {
    await register(page, 'OldNick', 'nick@example.org');
    await confirmFromMail(page);
    await login(page, 'nick@example.org');
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/account/settings');
    const uuid = await page.locator('.mc-mono').first().textContent();
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
    await page.getByLabel('Ник в игре').fill('NewNick_1');
    await page.getByRole('button', {name: 'Сменить ник'}).click();
    await page.getByRole('alertdialog').getByRole('button', {name: 'Сменить ник'}).click();
    await expect(page.getByText('Ник изменён на NewNick_1').first()).toBeVisible();
    await expect(page.locator('.mc-mono').first()).toHaveText(uuid!);
    await page.getByLabel('Ник в игре').fill('Third_Nick');
    await page.getByRole('button', {name: 'Сменить ник'}).click();
    await page.getByRole('alertdialog').getByRole('button', {name: 'Сменить ник'}).click();
    await expect(page.getByText('Ник можно менять не чаще одного раза в 30 дней').first()).toBeVisible();
  });

  test('смена пароля требует текущий', async ({page}) => {
    await register(page, 'PassChanger', 'pc@example.org');
    await confirmFromMail(page);
    await login(page, 'pc@example.org');
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/account/settings');
    await page.getByLabel('Текущий пароль').fill('not-the-password');
    await page.getByLabel('Новый пароль').fill('another-good-pass-1');
    await page.getByRole('button', {name: 'Сменить пароль'}).click();
    await expect(page.getByRole('alert').filter({hasText: 'Текущий пароль указан неверно'}).first()).toBeVisible();
    await page.getByLabel('Текущий пароль').fill(PASSWORD);
    await page.getByRole('button', {name: 'Сменить пароль'}).click();
    await expect(page.getByText('Пароль изменён').first()).toBeVisible();
  });

  test('кабинет закрыт без входа', async ({page}) => {
    // Гостя отправляют на вход и запоминают, в какой раздел он шёл.
    await page.goto('/account/shop');
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fshop$/);
  });
});

test.describe('админка', () => {
  test('закрыта для гостя и обычного игрока', async ({page}) => {
    await page.goto('/admin');
    await expect(page.getByText('Войдите, чтобы открыть админку')).toBeVisible();
    await register(page, 'JustPlayer', 'justplayer@example.org');
    await confirmFromMail(page);
    await login(page, 'justplayer@example.org');
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/admin');
    await expect(page.getByText('Недостаточно прав')).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);
  });

  test('владелец меняет сервер без деплоя; техработы видны на витрине', async ({page}) => {
    await login(page, OWNER.email, OWNER.password);
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/admin');
    await page.getByRole('row', {name: /Техно/}).getByRole('button', {name: 'Изменить'}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Название').fill('');
    await dialog.getByRole('button', {name: 'Сохранить'}).click();
    await expect(dialog.getByRole('alert').filter({hasText: 'Проверьте отмеченные поля'}).first()).toBeVisible();
    await dialog.getByLabel('Название').fill('Техно Сезон 2 с очень длинным названием сервера для проверки');
    await dialog.getByRole('combobox', {name: 'Режим статуса'}).click();
    await page.getByRole('option', {name: 'Техработы'}).click();
    await dialog.getByLabel('Пояснение к техработам').fill('до 20:00');
    await dialog.getByLabel('Ближайший вайп').fill('2026-12-31 21:30');
    await dialog.getByRole('button', {name: 'Сохранить'}).click();
    await expect(page.getByText('Сохранено').first()).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('heading', {name: 'Техно Сезон 2 с очень длинным названием сервера для проверки'}).first()).toBeVisible();
    await expect(page.getByText('Техработы').first()).toBeVisible();
    await expect(page.getByText('до 20:00').first()).toBeVisible();
    await expect(page.getByText('31 декабря 2026, 21:30 МСК').first()).toBeVisible();
    // Сервер на техработах не входит в «сейчас играют».
    await expect(page.getByText('Сейчас играют')).toHaveCount(0);
    await noOverflow(page);

    await page.goto('/admin');
    await page.getByRole('tab', {name: 'Журнал'}).click();
    await expect(page.getByRole('cell', {name: 'update:servers'}).first()).toBeVisible();
  });

  test('галерея: замена одного изображения не трогает остальные', async ({page}) => {
    await login(page, OWNER.email, OWNER.password);
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/admin');
    await page.getByRole('tab', {name: 'Галерея'}).click();
    const add = page.locator('input[type=file]').first();
    await add.setInputFiles({name: 'a.png', mimeType: 'image/png', buffer: png([1, 0, 0])});
    await expect(page.getByRole('article')).toHaveCount(1);
    await page.locator('input[type=file]').first().setInputFiles({name: 'b.png', mimeType: 'image/png', buffer: png([0, 0, 1])});
    await expect(page.getByRole('article')).toHaveCount(2);

    const imgs = page.getByRole('article').locator('img');
    const [firstBefore, secondBefore] = [await imgs.nth(0).getAttribute('src'), await imgs.nth(1).getAttribute('src')];
    expect(firstBefore).not.toBe(secondBefore);
    await page.getByRole('article').nth(0).locator('input[type=file]').setInputFiles({name: 'c.png', mimeType: 'image/png', buffer: png([0, 1, 0])});
    await expect(page.getByText('Изображение заменено').first()).toBeVisible();
    expect(await imgs.nth(0).getAttribute('src')).not.toBe(firstBefore);
    expect(await imgs.nth(1).getAttribute('src')).toBe(secondBefore);

    // Неподходящий файл отклоняется.
    await page.locator('input[type=file]').first().setInputFiles({name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('hi')});
    await expect(page.getByRole('article')).toHaveCount(2);

    await page.getByRole('article').nth(1).getByRole('button', {name: 'Удалить'}).click();
    await page.getByRole('alertdialog').getByRole('button', {name: 'Удалить'}).click();
    await expect(page.getByRole('article')).toHaveCount(1);
    expect(await imgs.nth(0).getAttribute('src')).not.toBe(secondBefore);
  });

  test('правила: новая редакция получает следующий номер', async ({page}) => {
    await login(page, OWNER.email, OWNER.password);
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/admin');
    await page.getByRole('tab', {name: 'Правила'}).click();
    await page.getByLabel('Текст правил (Markdown)').fill('## 1. Новое правило\n\nБудьте вежливы.');
    await page.getByLabel('Что изменилось').fill('переписан раздел 1');
    await page.getByRole('button', {name: 'Опубликовать новую редакцию'}).click();
    await page.getByRole('alertdialog').getByRole('button', {name: 'Опубликовать'}).click();
    await expect(page.getByText('Новая редакция правил опубликована').first()).toBeVisible();
    await page.goto('/rules');
    await expect(page.getByText(/Редакция 2 от/)).toBeVisible();
    await expect(page.getByText('Будьте вежливы.')).toBeVisible();
  });

  test('роли: выдача модератора на один сервер; единственного владельца снять нельзя', async ({page}) => {
    await register(page, 'FutureMod', 'mod@example.org');
    await confirmFromMail(page);
    await login(page, OWNER.email, OWNER.password);
    await expect(page).toHaveURL(/\/account$/);
    await page.goto('/admin');
    await page.getByRole('tab', {name: 'Персонал'}).click();
    await page.getByLabel('Ник игрока').fill('nobody_here');
    await page.getByRole('button', {name: 'Выдать роль'}).click();
    await expect(page.getByRole('alert').filter({hasText: 'Игрок с таким ником не найден'}).first()).toBeVisible();
    await page.getByLabel('Ник игрока').fill('futuremod');
    await page.getByRole('combobox', {name: 'Сервер'}).click();
    await page.getByRole('option', {name: 'Магия'}).click();
    await page.getByRole('button', {name: 'Выдать роль'}).click();
    await expect(page.getByRole('row', {name: /FutureMod.*Модератор.*Магия/})).toBeVisible();
    await page.getByRole('row', {name: /DemoOwner/}).getByRole('button', {name: 'Снять роль'}).click();
    await page.getByRole('alertdialog').getByRole('button', {name: 'Снять роль'}).click();
    await expect(page.getByText('Нельзя снять роль с единственного владельца').first()).toBeVisible();
    await expect(page.getByRole('row', {name: /DemoOwner/})).toBeVisible();
  });
});

test.describe('адаптация и доступность', () => {
  test('телефон: честно про ПК, меню открывается, нет горизонтальной прокрутки', async ({browser}) => {
    const context = await browser.newContext({viewport: {width: 360, height: 740}, hasTouch: true, isMobile: true});
    const page = await context.newPage();
    for (const path of ['/', '/servers', '/servers/techno', '/start?server=techno', '/news', '/rules', '/register', '/login']) {
      await page.goto(path);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await noOverflow(page);
    }
    await page.goto('/start');
    await expect(page.getByText('Играть можно только с компьютера')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Отправить ссылку себе'})).toBeVisible();
    await page.goto('/');
    // Главное действие видно на первом экране без прокрутки.
    await expect(page.getByRole('link', {name: 'Начать играть'}).first()).toBeInViewport();
    await context.close();
  });

  test('клавиатура: фокус виден на главной кнопке, форма отправляется по Enter', async ({page}) => {
    // Обход клавишей Tab идёт по одному шагу; в среде без видеокарты три живые сцены замедляют каждый шаг.
    test.setTimeout(90_000);
    await page.goto('/');
    const cta = page.getByRole('link', {name: 'Начать играть'}).first();
    for (let i = 0; i < 30 && !(await cta.evaluate(el => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(cta).toBeFocused();
    const outline = await cta.evaluate(el => getComputedStyle(el).outlineStyle + ' ' + getComputedStyle(el).outlineWidth);
    expect(outline).toBe('solid 3px');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/start$/);

    await page.goto('/login');
    await page.getByLabel('Почта').fill(OWNER.email);
    await page.getByLabel('Пароль').fill(OWNER.password);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/account$/);
  });

  test('reduced motion: сцена неподвижна, проход света на кнопке отключён', async ({browser}) => {
    const context = await browser.newContext({reducedMotion: 'reduce', viewport: {width: 1280, height: 800}});
    const page = await context.newPage();
    await page.goto('/');
    const scene = page.locator('.mc-scene--ready').first();
    await expect(scene).toBeVisible();
    const before = await scene.screenshot();
    await page.waitForTimeout(1500);
    expect((await scene.screenshot()).equals(before)).toBe(true);
    const cta = page.getByRole('link', {name: 'Начать играть'}).first();
    await cta.hover();
    expect(await cta.evaluate(el => getComputedStyle(el, '::after').animationName)).toBe('none');
    await context.close();
  });

  test('обычный режим: сцены трёх миров рисуются и движутся', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await page.goto('/');
    await expect(page.locator('.mc-scene--ready')).toHaveCount(3);
    const scene = page.locator('.mc-scene--ready').first();
    const before = await scene.screenshot();
    await page.waitForTimeout(1500);
    expect((await scene.screenshot()).equals(before)).toBe(false);
  });

  test('панель сервера кликабельна целиком и ведёт к его инструкции', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await page.goto('/');
    const panel = page.locator('.mc-world').nth(1);
    const box = (await panel.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.25);
    await expect(page).toHaveURL(/\/start\?server=magic$/);
  });
  test('живые блоки главной: отсчёт до вайпа идёт, шаги переключаются, вопросы раскрываются', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await page.goto('/');
    const timer = page.getByRole('timer');
    await timer.scrollIntoViewIfNeeded();
    const before = await timer.getAttribute('aria-label');
    expect(before).toMatch(/^До вайпа: \d+ дн \d+ ч \d+ мин \d+ сек$/);
    await expect.poll(() => timer.getAttribute('aria-label'), {timeout: 4000}).not.toBe(before);
    // Точная дата продублирована текстом.
    await expect(page.getByText('До вайпа · 5 декабря 2026, 18:00 МСК')).toBeVisible();

    await page.getByRole('button', {name: /Войдите в лаунчер/}).click();
    await expect(page.getByRole('button', {name: /Войдите в лаунчер/})).toHaveAttribute('aria-current', 'step');
    // В окне — экран входа в лаунчер; подпись прямо говорит, что это схема.
    await expect(page.locator('.mc-win .mc-login')).toBeVisible();
    await expect(page.getByText('Схема шагов. Экран вашего лаунчера может выглядеть иначе.')).toBeVisible();

    const question = page.getByRole('button', {name: 'Потеряю ли я вещи, если сменю ник?'});
    await expect(question).toHaveAttribute('aria-expanded', 'false');
    await question.click();
    await expect(question).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('привязаны к постоянному UUID игрока')).toBeVisible();
    // Открыт один ответ: первый вопрос закрылся.
    await expect(page.getByRole('button', {name: 'Можно ли играть с телефона?'})).toHaveAttribute('aria-expanded', 'false');
  });

  test('телефон: закреплённая кнопка появляется после первого экрана', async ({browser}) => {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
    const page = await context.newPage();
    await page.goto('/');
    const sticky = page.locator('.mc-sticky');
    await expect(sticky).not.toHaveClass(/mc-sticky--on/);
    await page.locator('.mc-start').scrollIntoViewIfNeeded();
    await expect(sticky).toHaveClass(/mc-sticky--on/);
    await sticky.getByRole('link', {name: 'Начать играть'}).click();
    await expect(page).toHaveURL(/\/start$/);
    await context.close();
  });
  test('постеры миров рисуются в блоках ниже первого экрана', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await page.goto('/');
    // Блоки ниже первого экрана грузятся отдельным файлом — ждём их, затем листаем страницу, как человек:
    // постеры рисуются по мере приближения к экрану.
    await expect(page.locator('.mc-final')).toBeAttached({timeout: 15000});
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate(v => window.scrollTo(0, v), y);
      await page.waitForTimeout(150);
    }
    // Куб аккаунта, персонаж кабинета, три карточки серверов, новости, лис и финальная панорама.
    await expect.poll(() => page.locator('.mc-poster--ready').count(), {timeout: 30000}).toBeGreaterThanOrEqual(8);
    const img = page.locator('.mc-final__art.mc-poster--ready img');
    await expect(img).toBeVisible({timeout: 30000});
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(2000);
  });
  test('сбой загрузки блоков не роняет сайт: первый экран работает, есть «Повторить»', async ({page}) => {
    await page.route('**/assets/HomeSections-*.js', route => route.abort());
    await page.goto('/');
    await expect(page.getByRole('heading', {level: 1})).toHaveText('Три мира на модах. Один аккаунт.');
    await expect(page.getByText('Эта часть страницы не загрузилась')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Повторить'})).toBeVisible();
    await page.getByRole('link', {name: 'Начать играть'}).first().click();
    await expect(page).toHaveURL(/\/start$/);
  });
});

test.describe('кабинет игрока (демо)', () => {
  async function demoPlayer(page: Page) {
    await page.goto('/login');
    await page.getByRole('button', {name: 'Войти как демо-игрок'}).click();
    await expect(page).toHaveURL(/\/account$/);
  }

  test('обзор: персонаж, образ, баланс и разделы', async ({page}) => {
    await demoPlayer(page);
    await expect(page.getByRole('heading', {level: 1})).toHaveText('Привет, DemoPlayer');
    // Сцена персонажа управляется и мышью, и клавиатурой.
    await expect(page.getByRole('img', {name: /Трёхмерная модель персонажа/})).toBeVisible();
    const nav = page.getByRole('navigation', {name: 'Разделы кабинета'});
    for (const name of ['Обзор', 'Магазин', 'Ранги', 'Баланс', 'Настройки']) {
      await expect(nav.getByRole('link', {name})).toBeVisible();
    }
    await expect(page.getByLabel('Баланс').first()).toContainText(/1\s200/);
    // Образ переключается и сохраняется.
    const mage = page.getByRole('radio', {name: /Маг/});
    await mage.click();
    await expect(mage).toHaveAttribute('aria-checked', 'true');
    await page.reload();
    await expect(page.getByRole('radio', {name: /Маг/})).toHaveAttribute('aria-checked', 'true');
  });

  test('магазин: покупка списывает цену каталога один раз и честно показывает статус', async ({page}) => {
    await demoPlayer(page);
    await page.goto('/account/shop');
    await expect(page.getByText('Демо-режим: оплаты и выдачи нет')).toBeVisible();
    // Фильтр по серверу оставляет только его товары.
    await page.getByRole('button', {name: 'Магия', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Книга ученика'})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Набор механика'})).toHaveCount(0);
    await page.getByRole('button', {name: 'Все', exact: true}).click();

    await page.getByRole('button', {name: 'Купить «Набор механика»'}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Баланс после покупки')).toBeVisible();
    await dialog.getByRole('button', {name: /Купить за 120/}).click();
    await expect(dialog.locator('.mc-buy__done')).toContainText('оплачено, ждёт выдачи');
    await expect(dialog.getByText('игровой сервер не подключён')).toBeVisible();
    await dialog.getByRole('button', {name: 'Мои заказы'}).click();
    await expect(page).toHaveURL(/\/account\/wallet$/);
    await expect(page.locator('.mc-wallet__value')).toHaveText(/1\s080/);
    await expect(page.getByRole('cell', {name: 'Оплачено, ждёт выдачи'})).toBeVisible();
    await expect(page.getByRole('cell', {name: 'Покупка: Набор механика'})).toBeVisible();
  });

  test('баланс: нехватка средств не даёт купить; демо-пополнение помечено и работает', async ({page}) => {
    await demoPlayer(page);
    await page.goto('/account/ranks');
    await page.getByRole('button', {name: 'Оформить ранг «Легенда»'}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/не хватает 300/)).toBeVisible();
    await expect(dialog.getByRole('button', {name: /Купить за/})).toHaveCount(0);
    await dialog.getByRole('button', {name: 'Пополнить баланс'}).click();
    await expect(page).toHaveURL(/\/account\/wallet$/);
    await page.getByRole('button', {name: '+500'}).click();
    await page.getByRole('button', {name: 'Пополнить (демо)'}).click();
    await expect(page.locator('.mc-wallet__value')).toHaveText(/1\s700/);

    // Теперь ранг оформляется; персонаж в кабинете получает его.
    await page.goto('/account/ranks');
    await page.getByRole('button', {name: 'Оформить ранг «Легенда»'}).click();
    await page.getByRole('dialog').getByRole('button', {name: /Купить за 1\s500/}).click();
    await expect(page.getByRole('dialog').locator('.mc-buy__done')).toContainText(/Списано 1\s500/);
    await page.getByRole('dialog').getByRole('button', {name: 'Готово'}).click();
    await expect(page.getByText('Ваш ранг')).toBeVisible();
    // Ранг ниже действующего оформить нельзя.
    await expect(page.getByRole('button', {name: '«Искатель» ниже вашего ранга'})).toHaveAttribute('aria-disabled', 'true');
    await page.goto('/account');
    await expect(page.getByText('Ранг «Легенда»').first()).toBeVisible();
  });

  test('телефон: разделы — панель снизу, нет горизонтальной прокрутки', async ({browser}) => {
    const context = await browser.newContext({viewport: {width: 360, height: 740}, hasTouch: true, isMobile: true});
    const page = await context.newPage();
    await demoPlayer(page);
    for (const path of ['/account', '/account/shop', '/account/ranks', '/account/wallet', '/account/settings']) {
      await page.goto(path);
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await noOverflow(page);
    }
    const nav = page.getByRole('navigation', {name: 'Разделы кабинета'});
    const box = await nav.boundingBox();
    // Панель закреплена у нижнего края экрана.
    expect(box!.y + box!.height).toBeGreaterThan(740 - 40);
    expect(box!.y + box!.height).toBeLessThanOrEqual(740);
    await nav.getByRole('link', {name: 'Магазин'}).click();
    await expect(page).toHaveURL(/\/account\/shop$/);
    await context.close();
  });
});
