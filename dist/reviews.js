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
        const label = document.createElement('span'); label.textContent = `${String(index + 1).padStart(2, '0')} / CLIENT PERSPECTIVE`;
        const mark = document.createElement('span'); mark.className = 'review-quote-mark'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = '“';
        top.append(label, mark);
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
        reviewList.append(card);
      }
    }
  } catch { reviewStatus.textContent = 'Review submissions are not available yet. Please check back soon.'; }
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
loadReviews();
