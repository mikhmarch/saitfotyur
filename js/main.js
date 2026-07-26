// ==========================================
// Юрекс — скрипты сайта
// ==========================================

// URL веб-приложения Google Apps Script, которое принимает заявки,
// записывает их в Google-таблицу и шлёт уведомление в Telegram.
// Как получить этот URL — см. backend/google-apps-script/README.md.
// Пока строка пустая, форма работает в демо-режиме: заявки просто
// выводятся в консоль браузера и никуда не отправляются.
const LEADS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbylKFyCkw8Ux29QkYS-n6D4p2Cqf4UQIa0sCSDU6Dk3GZnmd5vsYR1SHN1xKvQvZ1EA/exec';

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  initRevealAnimations();
  initReviewsCarousel();
  initForm();
  initYear();
});

/* ---------- Header background on scroll ---------- */
function initHeaderScroll() {
  const header = document.getElementById('header');
  if (!header) return;

  const toggle = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
}

/* ---------- Mobile burger menu ---------- */
function initMobileMenu() {
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (!burger || !nav) return;

  burger.addEventListener('click', () => {
    burger.classList.toggle('is-open');
    nav.classList.toggle('is-open');
  });

  nav.querySelectorAll('.nav__link').forEach((link) => {
    link.addEventListener('click', () => {
      burger.classList.remove('is-open');
      nav.classList.remove('is-open');
    });
  });
}

/* ---------- Fade-in on scroll ---------- */
function initRevealAnimations() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('is-visible'), (index % 4) * 80);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el) => observer.observe(el));
}

/* ---------- Reviews carousel ---------- */
function initReviewsCarousel() {
  const track = document.getElementById('reviewsTrack');
  const prevBtn = document.getElementById('reviewsPrev');
  const nextBtn = document.getElementById('reviewsNext');
  const dotsWrap = document.getElementById('reviewsDots');
  if (!track || !prevBtn || !nextBtn) return;

  const cards = Array.from(track.children);
  if (!cards.length) return;

  let perView = getPerView();
  let index = 0;

  function getPerView() {
    if (window.innerWidth <= 640) return 1;
    if (window.innerWidth <= 900) return 2;
    return 3;
  }

  function maxIndex() {
    return Math.max(cards.length - perView, 0);
  }

  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    const dotsCount = maxIndex() + 1;
    if (dotsCount <= 1) return;
    for (let i = 0; i < dotsCount; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'reviews-carousel__dot';
      dot.setAttribute('aria-label', `Отзыв ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
    updateDots();
  }

  function updateDots() {
    if (!dotsWrap) return;
    Array.from(dotsWrap.children).forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
    });
  }

  function update() {
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap || '0');
    track.style.transform = `translateX(-${index * (cardWidth + gap)}px)`;
    updateDots();
  }

  function goTo(i) {
    index = Math.min(Math.max(i, 0), maxIndex());
    update();
  }

  prevBtn.addEventListener('click', () => {
    index = index <= 0 ? maxIndex() : index - 1;
    update();
  });

  nextBtn.addEventListener('click', () => {
    index = index >= maxIndex() ? 0 : index + 1;
    update();
  });

  window.addEventListener('resize', () => {
    perView = getPerView();
    index = Math.min(index, maxIndex());
    buildDots();
    update();
  });

  buildDots();
  update();
}

/* ---------- Footer year ---------- */
function initYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ---------- Consultation form ---------- */
function initForm() {
  const form = document.getElementById('consultForm');
  const status = document.getElementById('formStatus');
  if (!form || !status) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Anti-spam: honeypot field must stay empty
    const honeypot = form.querySelector('input[name="website"]');
    if (honeypot && honeypot.value) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const requiredFields = ['full_name', 'phone', 'location', 'employment_type', 'probation', 'work_format', 'situation'];
    const hasAllRequired = requiredFields.every((field) => data[field]);

    if (!hasAllRequired || !data.consent) {
      showStatus(status, 'Пожалуйста, заполните обязательные поля и дайте согласие на обработку данных.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';

    try {
      if (isWebhookConfigured(LEADS_WEBHOOK_URL)) {
        await sendToWebhook(LEADS_WEBHOOK_URL, data);
      } else {
        if (LEADS_WEBHOOK_URL) {
          // LEADS_WEBHOOK_URL заполнен, но не похож на настоящий URL —
          // скорее всего, там случайно осталась заглушка/плейсхолдер.
          console.warn('LEADS_WEBHOOK_URL задан, но не похож на настоящий URL Apps Script. Форма работает в демо-режиме. Проверьте значение в js/main.js.', LEADS_WEBHOOK_URL);
        }
        await fakeSubmit(data);
      }

      form.reset();
      showStatus(status, 'Спасибо! Заявка отправлена, мы свяжемся с вами в ближайшее время.', 'success');
    } catch (err) {
      console.error('Ошибка отправки заявки:', err);
      showStatus(status, 'Не удалось отправить заявку. Попробуйте позвонить нам напрямую.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
    }
  });
}

/**
 * Проверяет, что LEADS_WEBHOOK_URL действительно похож на URL
 * веб-приложения Apps Script, а не на пустую строку или забытую заглушку
 * вида "ВСТАВЬТЕ_СЮДА_...".
 */
function isWebhookConfigured(url) {
  return typeof url === 'string' && /^https:\/\//.test(url.trim());
}

/**
 * Отправляет данные формы в веб-приложение Google Apps Script.
 *
 * Используется режим "no-cors": браузер не позволяет читать ответ
 * стороннего сайта без специальных CORS-заголовков, а Apps Script их
 * не отдаёт. Поэтому запрос уходит "вслепую" — если он не завершился
 * сетевой ошибкой, считаем заявку отправленной. Чтобы убедиться, что
 * заявки реально доходят, проверьте Google-таблицу и Telegram-чат
 * после тестовой отправки (см. backend/google-apps-script/README.md).
 */
function sendToWebhook(url, data) {
  return fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data).toString(),
  });
}

function fakeSubmit(data) {
  // Демо-режим: LEADS_WEBHOOK_URL ещё не настроен, заявка выводится
  // только в консоль браузера и никуда не отправляется.
  console.log('Демо-режим (LEADS_WEBHOOK_URL не задан). Заявка:', data);
  return new Promise((resolve) => setTimeout(resolve, 600));
}

function showStatus(el, message, type) {
  el.textContent = message;
  el.classList.remove('is-success', 'is-error');
  el.classList.add(type === 'success' ? 'is-success' : 'is-error');
}
