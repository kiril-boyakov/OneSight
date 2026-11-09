const reviewForm = document.getElementById('review-form');
const reviewStatus = document.getElementById('review-status');
const reviewFields = document.getElementById('review-fields');
const reviewList = document.getElementById('approved-reviews');
async function loadReviews() {
  try {
    const response = await fetch('/api/reviews');
    const result = await response.json();
    if (!response.ok) throw new Error();
    reviewFields.disabled = false;
    reviewStatus.textContent = 'Reviews are checked before publication.';
    if (result.reviews.length) {
      document.getElementById('review-empty').hidden = true;
      reviewList.replaceChildren();
      for (const [index, review] of result.reviews.entries()) {
        const card = document.createElement('article'); card.className = 'review-card';
        const top = document.createElement('div'); top.className = 'review-card-top';
        const label = document.createElement('span'); label.textContent = 'CLIENT REVIEW';
        const mark = document.createElement('span'); mark.className = 'review-quote-mark'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = '“';
        top.append(label, mark);
        const logos = {'krainis digital':'/assets/krainis-digital-logo.svg', 'osti':'/assets/osti-logo.webp'};
        const logoSource = logos[(review.business || '').trim().toLowerCase()];
        if (logoSource) {
          top.classList.add('has-client-logo');
          const logo = document.createElement('img'); logo.className = 'review-client-logo'; logo.src = logoSource;
          logo.alt = review.business; logo.width = 90; logo.height = 34; logo.loading = 'lazy'; logo.decoding = 'async';
          top.append(logo);
        }
        const quote = document.createElement('blockquote'); quote.textContent = review.review;
        const footer = document.createElement('div'); footer.className = 'review-card-footer';
        const avatar = document.createElement('span'); avatar.className = 'review-avatar'; avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = review.name.trim().split(/\s+/u).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase();
        const identity = document.createElement('div'); identity.className = 'review-identity';
        const author = document.createElement('p'); author.className = 'review-author'; author.textContent = review.name;
        identity.append(author);
        if (review.business) { const business = document.createElement('p'); business.className = 'review-business'; business.textContent = review.business; identity.append(business); }
        footer.append(avatar, identity);
        card.append(top, quote, footer);
        if (review.review.length > 330) {
          quote.id = `client-review-${index}`;
          quote.classList.add('review-truncated');
          const expand = document.createElement('button'); expand.type = 'button'; expand.className = 'review-expand';
          expand.textContent = 'Read full review'; expand.setAttribute('aria-expanded', 'false'); expand.setAttribute('aria-controls', quote.id);
          expand.addEventListener('click', () => {
            const collapsed = quote.classList.toggle('review-truncated');
            expand.textContent = collapsed ? 'Read full review' : 'Show less';
            expand.setAttribute('aria-expanded', String(!collapsed));
            document.dispatchEvent(new CustomEvent('onesight:reviews', {detail: []}));
          });
          card.insertBefore(expand, footer);
        }
        reviewList.append(card);
      }
      setupReviewNavigation();
      document.dispatchEvent(new CustomEvent('onesight:reviews', {detail: [...reviewList.children]}));
    }
  } catch { reviewStatus.textContent = 'Unable to load reviews right now. Please try again shortly.'; }
}
reviewForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!reviewForm.reportValidity()) return;
  const data = new FormData(reviewForm);
  reviewFields.disabled = true;
  reviewStatus.textContent = 'Sending your review…';
  try {
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), business: data.get('business'), review: data.get('review'), website: data.get('website'), consent: data.get('consent') === 'on' }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your review could not be sent. Please try again.');
    reviewForm.reset();
    reviewStatus.textContent = result.message;
  } catch (error) { reviewStatus.textContent = error.message || 'Your review could not be sent. Please try again.'; }
  finally { reviewFields.disabled = false; }
});
document.querySelector('[data-open-review]')?.addEventListener('click', event => {
  event.preventDefault();
  const entry = document.getElementById('review-entry');
  entry.open = true;
  entry.querySelector('summary').focus({preventScroll:true});
  entry.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
});
if (typeof IntersectionObserver === 'function') {
  const availability = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    availability.disconnect(); loadReviews();
  }, {rootMargin:'600px 0px'});
  availability.observe(document.getElementById('reviews'));
} else loadReviews();

function setupReviewNavigation() {
  const cards = [...reviewList.children];
  if (cards.length < 2) return;
  const navigation = document.createElement('div'); navigation.className = 'review-navigation';
  const position = document.createElement('span'); position.className = 'review-position'; position.setAttribute('aria-live', 'polite');
  const previous = document.createElement('button'), next = document.createElement('button');
  const arrow = direction => `<svg class="ui-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${direction < 0 ? 'M20 12H4m6-6-6 6 6 6' : 'M4 12h16m-6-6 6 6-6 6'}"/></svg>`;
  previous.type = next.type = 'button';
  previous.setAttribute('aria-label', 'Previous review'); next.setAttribute('aria-label', 'Next review');
  previous.innerHTML = arrow(-1); next.innerHTML = arrow(1);
  let current = 0, frame = 0;
  const update = () => {
    frame = 0;
    current = Math.max(0, Math.min(cards.length - 1, Math.round(reviewList.scrollLeft / (cards[0].offsetWidth + 16))));
    position.textContent = `${String(current + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    previous.disabled = current === 0; next.disabled = current === cards.length - 1;
  };
  const go = direction => {
    const index = Math.max(0, Math.min(cards.length - 1, current + direction));
    reviewList.scrollTo({left: index * (cards[0].offsetWidth + 16), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  };
  previous.addEventListener('click', () => go(-1)); next.addEventListener('click', () => go(1));
  reviewList.addEventListener('scroll', () => {if (!frame) frame = requestAnimationFrame(update);}, {passive:true});
  navigation.append(position, previous, next); reviewList.after(navigation); update();
}
