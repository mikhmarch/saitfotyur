/**
 * Юрекс — приём заявок с сайта.
 *
 * Этот файл нужно целиком вставить в редактор Google Apps Script,
 * привязанный к вашей Google-таблице. Подробная пошаговая инструкция —
 * в файле backend/google-apps-script/README.md рядом с этим файлом.
 *
 * Что делает скрипт при поступлении заявки с сайта:
 * 1. Дописывает новую строку в лист "Заявки" (ФИО, телефон, трудоустройство,
 *    испытательный срок, формат работы, доход, ситуация и т.д.).
 * 2. Отправляет уведомление о новой заявке в Telegram-чат.
 */

// ====== НАСТРОЙКИ — заполните перед использованием ======
const TELEGRAM_BOT_TOKEN = 'ВАШ_ТОКЕН_БОТА';
const TELEGRAM_CHAT_ID = 'ВАШ_CHAT_ID';
const SHEET_NAME = 'Заявки';

// Список ответственных для выпадающего списка в таблице.
// Впишите сюда реальные имена партнёров.
const ASSIGNEE_OPTIONS = ['Партнёр 1', 'Партнёр 2'];

// Список статусов для выпадающего списка в таблице.
const STATUS_OPTIONS = ['Новая', 'В работе', 'Консультация проведена', 'Закрыта', 'Отказ'];
// ==========================================================

/**
 * Точка входа: сайт отправляет сюда POST-запрос с данными формы.
 */
function doPost(e) {
  try {
    const data = (e && e.parameter) || {};
    const sheet = getOrCreateSheet_();
    const timestamp = Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM.yyyy HH:mm');

    sheet.appendRow([
      timestamp,
      data.full_name || '',
      data.telegram_tag || '',
      data.phone || '',
      data.employment_type || '',
      data.probation || '',
      data.work_format || '',
      data.location || '',
      data.income || '',
      data.offered_conditions || '',
      data.situation || '',
      'Новая', // Статус по умолчанию
      '',      // Ответственный — заполняется вручную
      ''       // Заметки — заполняется вручную
    ]);

    notifyTelegram_(data, timestamp);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Отправляет сообщение о новой заявке в Telegram.
 */
function notifyTelegram_(data, timestamp) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.indexOf('ВАШ_') === 0) {
    return; // Telegram не настроен — просто пропускаем уведомление
  }

  const lines = [
    'Новая заявка с сайта',
    '',
    'Фамилия Имя: ' + (data.full_name || '-'),
    'Telegram: ' + (data.telegram_tag || '-'),
    'Телефон: ' + (data.phone || '-'),
    'Где находится: ' + (data.location || '-'),
    'Трудоустройство: ' + (data.employment_type || '-'),
    'Испытательный срок: ' + (data.probation || '-'),
    'Формат работы: ' + (data.work_format || '-'),
    'Доход в месяц, ₽: ' + (data.income || '-'),
    'Предлагаемые условия: ' + (data.offered_conditions || '-'),
    'Ситуация: ' + (data.situation || '-'),
    'Время: ' + timestamp
  ];

  const url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: lines.join('\n') }),
    muteHttpExceptions: true
  });
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

/**
 * Разовая настройка таблицы: заголовки, закреплённая строка,
 * выпадающие списки для статуса и ответственного.
 *
 * Запустите эту функцию ОДИН РАЗ вручную из редактора Apps Script
 * (кнопка "Выполнить" / Run), выбрав функцию setupSheet.
 */
function setupSheet() {
  const sheet = getOrCreateSheet_();
  sheet.clear();

  const headers = [
    'Дата и время',
    'Фамилия Имя',
    'Telegram',
    'Телефон',
    'Трудоустройство',
    'Испытательный срок',
    'Формат работы',
    'Город / страна',
    'Доход в месяц, ₽',
    'Предлагаемые условия',
    'Ситуация',
    'Статус',
    'Ответственный',
    'Заметки'
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  const numRows = 500;
  const STATUS_COLUMN = 12;
  const ASSIGNEE_COLUMN = 13;

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, STATUS_COLUMN, numRows).setDataValidation(statusRule);

  const assigneeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ASSIGNEE_OPTIONS, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, ASSIGNEE_COLUMN, numRows).setDataValidation(assigneeRule);

  sheet.autoResizeColumns(1, headers.length);
}

/**
 * Вспомогательная функция для проверки Telegram-уведомлений.
 * Запустите её вручную из редактора Apps Script, чтобы убедиться,
 * что бот и chat_id настроены верно — в чат должно прийти тестовое сообщение.
 */
function testTelegramNotification() {
  notifyTelegram_(
    {
      full_name: 'Тестов Тест',
      telegram_tag: '@test_user',
      phone: '+7 900 000-00-00',
      location: 'Москва, Россия',
      employment_type: 'Трудовой договор',
      probation: 'Нет',
      work_format: 'Офис',
      income: '120000',
      offered_conditions: 'Предложили расчёт частями без документов',
      situation: 'Это тестовое сообщение для проверки настройки.'
    },
    Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM.yyyy HH:mm')
  );
}
