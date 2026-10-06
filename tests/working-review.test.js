import { memoryIndexedDB } from "./support/memory-indexeddb.js";
import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkingRubric, reviewWorking, summariseWorkingReviews } from "../src/working-review.js";
import { validateWorkFile, maxUploadBytes, saveWorkFiles, readWorkFile, deleteWorkFile } from "../src/work-uploads.js";
import { renderMethodCriteria, renderUploadPanel } from "../src/working-ui.js";
const question = { topic: "Number", subtopic: "Percentages", marks: 3, answer: "80", unit: "$", markScheme: ["Apply the percentage multiplier to the original price.", "Calculate the reduction and subtract it.", "Final price = 80."] };

test("valid methods earn partial credit when the final accuracy mark is not earned", () => {
  const result = reviewWorking(question, { decisions: { c0: "earned", c1: "earned", c2: "not-earned" } });
  assert.equal(result.earned, 2); assert.equal(result.total, 3); assert.ok(result.complete);
  assert.match(result.feedback.join(" "), /partial credit/);
  assert.match(result.feedback.join(" "), /Correct final result/);
});

test("accuracy marks require the associated method; independent marks remain independent", () => {
  const result = reviewWorking(question, { decisions: { c0: "not-earned", c1: "earned", c2: "earned" } });
  assert.equal(result.earned, 1);
  assert.match(result.feedback.join(" "), /associated method/);
  const independent = { ...question, subtopic: "Vectors" };
  assert.ok(buildWorkingRubric(independent).every(criterion => criterion.code === "B"));
  assert.equal(reviewWorking(independent, { decisions: { c0: "not-earned", c1: "earned", c2: "earned" } }).earned, 2);
});

test("pending or invalid review decisions cannot turn an unread upload into a final score", () => {
  const item = { question, files: [{ id: "photo" }], methodReviews: {} };
  const pending = summariseWorkingReviews([item]);
  assert.equal(pending.percentage, null); assert.equal(pending.complete, false);
  item.methodReviews[0] = { decisions: { c0: "earned", c1: "earned", c2: "unexpected" } };
  assert.equal(summariseWorkingReviews([item]).percentage, null);
  item.methodReviews[0].decisions.c2 = "not-earned";
  const complete = summariseWorkingReviews([item]);
  assert.equal(complete.percentage, 67); assert.equal(complete.topicScores.Number, 67);
});

test("review rendering escapes uploaded names and notes", () => {
  const html = renderUploadPanel([{ id: "file", type: "image/png", name: '<script>alert("x")</script>', size: 30 }]);
  assert.doesNotMatch(html, /<script>/);
  const review = renderMethodCriteria(question, { note: "</textarea><script>bad()</script>" }, 0, 0);
  assert.doesNotMatch(review, /<script>/);
  assert.match(review, /&lt;script&gt;/);
});

const file = (bytes, type, name = "working") => Object.assign(new Blob([bytes], { type }), { name });
const png = file(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]), "image/png", "working.png");
test("uploads validate type, content signature, size and question attachment limit", async () => {
  assert.ok(await validateWorkFile(png));
  assert.ok(await validateWorkFile(file("%PDF-1.7\n", "application/pdf")));
  await assert.rejects(validateWorkFile(file("not png", "image/png")), /contents/);
  await assert.rejects(validateWorkFile(file("<script>", "text/html")), /Choose a JPG/);
  await assert.rejects(validateWorkFile(file("", "image/png")), /non-empty/);
  await assert.rejects(validateWorkFile(file(new Uint8Array(maxUploadBytes + 1), "image/png")), /10 MB/);
  await assert.rejects(saveWorkFiles("learner", [png, png], 4), /up to 5/);
  await assert.rejects(saveWorkFiles("", [png]), /Sign in/);
});


test("attachments stay local, survive rereads, and cannot be read or deleted by another account", async () => {
  globalThis.indexedDB = memoryIndexedDB();
  const [metadata] = await saveWorkFiles("learner-a", [png]);
  assert.equal(metadata.name, "working.png"); assert.equal(metadata.blob, undefined);
  assert.equal(await readWorkFile("learner-b", metadata.id), null);
  await deleteWorkFile("learner-b", metadata.id);
  assert.equal((await readWorkFile("learner-a", metadata.id)).size, png.size);
  await deleteWorkFile("learner-a", metadata.id);
  assert.equal(await readWorkFile("learner-a", metadata.id), null);
});
