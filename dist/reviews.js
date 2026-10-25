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
      for (const review of result.reviews) {
        const card = document.createElement('article'); card.className = 'review-card';
        const quote = document.createElement('blockquote'); quote.textContent = review.review;
        const author = document.createElement('p'); author.className = 'review-author'; author.textContent = review.name;
        card.append(quote, author);
        if (review.business) { const business = document.createElement('p'); business.textContent = review.business; card.append(business); }
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
loadReviews();
