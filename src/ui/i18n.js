// i18n.js
// Minimal localization. Yandex requires automatic language detection via the SDK
// at launch (requirement 2.14): the platform adapter reads ysdk.environment.i18n.lang
// (or navigator.language elsewhere) and calls setLang() before the menu is shown,
// so every UI string is routed through t() in the detected language at startup.
// English is the source/fallback language; Russian is fully translated (the
// dominant Playhop/Yandex audience).

const STRINGS = {
  en: {
    'menu.title': 'Arrowzen',
    'menu.msg': 'Tap arrows to clear the board. An arrow leaves when its path to the edge is free.',
    'menu.play': 'Play',
    'level': 'Level',
    'hint.title': 'Free Hint',
    'hint.msg': 'Watch a short video to reveal an arrow you can safely clear.',
    'ad.watch': 'Watch Ad',
    'ad.no': 'No Thanks',
    'win.title': 'Cleared!',
    'win.time': 'Time',
    'win.lives': 'Lives left',
    'win.next': 'Next Level',
    'win.finish': 'Finish',
    'lose.title': 'Out of lives',
    'lose.msg': 'Watch a short video to get 3 lives and keep your progress — or start the level over.',
    'lose.watch': 'Watch Ad  ·  +3 Lives',
    'lose.restart': 'Restart Level',
    'done.title': 'All Levels Complete!',
    'done.msg': 'You cleared every board. A calm, focused mind — well done.',
    'done.again': 'Play Again',
    'support': '\u2615 Enjoying Arrowzen? Support the developer',
    'diff.Normal': 'Normal',
    'diff.Hard': 'Hard',
    'diff.Expert': 'Expert',
  },
  ru: {
    'menu.title': 'Arrowzen',
    'menu.msg': 'Нажимайте на стрелки, чтобы очистить поле. Стрелка уходит, когда её путь к краю свободен.',
    'menu.play': 'Играть',
    'level': 'Уровень',
    'hint.title': 'Подсказка',
    'hint.msg': 'Посмотрите короткое видео, чтобы открыть стрелку, которую можно безопасно убрать.',
    'ad.watch': 'Смотреть',
    'ad.no': 'Нет, спасибо',
    'win.title': 'Готово!',
    'win.time': 'Время',
    'win.lives': 'Осталось жизней',
    'win.next': 'Следующий уровень',
    'win.finish': 'Завершить',
    'lose.title': 'Жизни закончились',
    'lose.msg': 'Посмотрите короткое видео, чтобы получить 3 жизни и сохранить прогресс — или начните уровень заново.',
    'lose.watch': 'Смотреть  ·  +3 жизни',
    'lose.restart': 'Начать заново',
    'done.title': 'Все уровни пройдены!',
    'done.msg': 'Вы очистили все поля. Спокойный, сосредоточенный ум — отличная работа.',
    'done.again': 'Играть снова',
    'support': '\u2615 Нравится Arrowzen? Поддержите разработчика',
    'diff.Normal': 'Норма',
    'diff.Hard': 'Сложно',
    'diff.Expert': 'Эксперт',
  },
};

let _lang = 'en';

// Set the active language from any locale string ('en', 'ru', 'ru-RU', ...).
// Falls back to English for unsupported languages. Returns the resolved code.
export function setLang(lang) {
  const code = String(lang || 'en').slice(0, 2).toLowerCase();
  _lang = STRINGS[code] ? code : 'en';
  return _lang;
}

export function getLang() { return _lang; }

export function t(key) {
  const dict = STRINGS[_lang] || STRINGS.en;
  if (key in dict) return dict[key];
  return key in STRINGS.en ? STRINGS.en[key] : key;
}
