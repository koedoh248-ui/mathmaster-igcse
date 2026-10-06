import test from "node:test";
import assert from "node:assert/strict";
import { guideSteps, guideState, guideMarkup, updateGuide } from "../src/student-guide.js";

test("first-use guide advances through every step, resumes and finishes", () => {
  const profile = {};
  assert.deepEqual(guideState(profile), { step: 0, completed: false, skipped: false });
  assert.match(guideMarkup(profile), /Welcome to MathMaster/);
  for (let i = 0; i < guideSteps.length; i++) {
    assert.equal(guideState(profile).step, i);
    assert.ok(guideMarkup(profile).includes(guideSteps[i].title));
    assert.match(guideMarkup(profile), /Skip guide/);
    if (i === guideSteps.length - 1) assert.match(guideMarkup(profile), /Finish guide/);
    updateGuide(profile, "next");
    assert.deepEqual(guideState(JSON.parse(JSON.stringify(profile))), guideState(profile));
  }
  assert.equal(guideState(profile).completed, true);
  assert.equal(guideState(profile).skipped, false);
  assert.equal(guideMarkup(profile), "");
});

test("skip ends all remaining guides and only an explicit restart reopens them", () => {
  const profile = {};
  updateGuide(profile, "next");
  updateGuide(profile, "next");
  updateGuide(profile, "back");
  assert.equal(guideState(profile).step, 1);
  updateGuide(profile, "skip");
  assert.equal(guideMarkup(profile), "");
  updateGuide(profile, "next");
  assert.equal(guideMarkup(profile), "");
  const reloaded = JSON.parse(JSON.stringify(profile));
  assert.equal(guideState(reloaded).skipped, true);
  updateGuide(reloaded, "restart");
  assert.deepEqual(guideState(reloaded), { step: 0, completed: false, skipped: false });
  updateGuide(reloaded, "back");
  assert.equal(guideState(reloaded).step, 0);
});

test("guide tolerates older or invalid saved progress and explains the real workflows", () => {
  assert.equal(guideState({ studentGuide: { step: -3 } }).step, 0);
  assert.equal(guideState({ studentGuide: { step: 999 } }).step, guideSteps.length - 1);
  assert.equal(guideState({ studentGuide: { step: "3" } }).step, 0);
  const content = guideSteps.map(step => step.paragraphs.join(" ")).join(" ");
  for (const phrase of ["Change goals", "Formula Reference", "Question Bank", "Daily Challenge", "Cambridge mark scheme", "does not read it automatically", "do not automatically sync", "clearing site data", "Mistakes", "Study Plan", "Achievements"]) assert.ok(content.includes(phrase), phrase);
});
