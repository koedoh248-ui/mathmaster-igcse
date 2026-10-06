import test from 'node:test';
import assert from 'node:assert/strict';
import { localDateKey, calendarDayNumber, dayGap, currentStreak, clockLabel } from '../src/local-time.js';
import { emptyProfile, recordActivity } from '../src/storage.js';

test('local dates and streaks follow real calendar days across midnight, daylight saving and year boundaries',()=>{
 const previousTZ=process.env.TZ;
 try {
  process.env.TZ='America/New_York';
  assert.equal(localDateKey(new Date('2026-11-02T04:30:00Z')),'2026-11-01');
  assert.equal(localDateKey(new Date('2026-11-02T05:30:00Z')),'2026-11-02');
  assert.equal(dayGap('2026-11-01','2026-11-02'),1);
  assert.equal(dayGap('2026-12-31','2027-01-01'),1);
  assert.ok(Number.isNaN(calendarDayNumber('2026-02-30')));
  const profile={lastActive:'2026-11-01',streak:15};
  assert.equal(currentStreak(profile,new Date(2026,10,1,23)),15);
  assert.equal(currentStreak(profile,new Date(2026,10,2,23)),15);
  assert.equal(currentStreak(profile,new Date(2026,10,3,0)),0);
  assert.equal(currentStreak(profile,new Date(2026,9,31)),0);
  assert.match(clockLabel(new Date(2026,10,2,16,17,18)),/16:17:18/);
  process.env.TZ='Asia/Ho_Chi_Minh';
  assert.equal(localDateKey(new Date('2026-10-06T17:01:00Z')),'2026-10-07');
 } finally {if(previousTZ===undefined)delete process.env.TZ;else process.env.TZ=previousTZ;}
});

test('learning activity increases a streak once per local day, resets after a missed day and never gains days on page visits',()=>{
 const RealDate=Date;
 let instant=new RealDate(2026,9,6,23,59).getTime();
 globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[instant]));}static now(){return instant;}};
 try {
  const account={profile:emptyProfile('Learner','test@local')};
  assert.equal(currentStreak(account.profile),0);
  recordActivity(account,5); assert.equal(account.profile.streak,1);
  recordActivity(account,5); assert.equal(account.profile.streak,1);
  instant=new RealDate(2026,9,7,0,1).getTime();
  assert.equal(currentStreak(account.profile),1);
  recordActivity(account,5);assert.equal(account.profile.streak,2);
  instant=new RealDate(2026,9,9,0,1).getTime();
  assert.equal(currentStreak(account.profile),0);
  assert.equal(account.profile.streak,2,'displaying expiry does not invent or erase activity history');
  recordActivity(account,5);assert.equal(account.profile.streak,1);
  assert.equal(account.profile.xp,20);
 } finally {globalThis.Date=RealDate;}
});
