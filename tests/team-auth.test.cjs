
const test=require('node:test');const assert=require('node:assert/strict');const isAdmin=require('../api/_admin');
test('team access requires owner ID or verified invited email',()=>{
 assert.equal(isAdmin({id:'owner'},'owner'),true);
 assert.equal(isAdmin({id:'other',email:'matvej.kosenko@gmail.com'},'owner'),false);
 assert.equal(isAdmin({id:'other',email:'matvej.kosenko@gmail.com',email_confirmed_at:'2026-11-08'},'owner'),true);
 assert.equal(isAdmin({id:'other',email:'stranger@gmail.com',email_confirmed_at:'2026-11-08'},'owner'),false);
 assert.equal(isAdmin(null,'owner'),false);
});
