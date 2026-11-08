// Only server-verified Supabase identities may reach this check.
const TEAM_EMAILS = new Set(['matvej.kosenko@gmail.com']);
module.exports = function isAdmin(user, ownerId) {
  return Boolean(user && ((ownerId && user.id === ownerId) ||
    (user.email_confirmed_at && TEAM_EMAILS.has(String(user.email || '').trim().toLowerCase()))));
};
