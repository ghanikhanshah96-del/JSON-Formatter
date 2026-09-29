import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidEmail,
  isValidPersonName,
  personNameError,
  validateContactInput
} from "./contact-validation.ts";

describe("personNameError / isValidPersonName", () => {
  const valid = [
    "Alex",
    "Mary-Jane",
    "O'Brien",
    "Anne Marie",
    "Jean-Luc Picard",
    "José",
    "Dr. Smith",
    "J.K. Rowling",
    "John F. Kennedy",
    "John Jr.",
    "Mary Jane-Smith",
    "  Alex  ",
    "Anne\u2019Marie"
  ];

  for (const name of valid) {
    it(`accepts ${JSON.stringify(name)}`, () => {
      assert.equal(personNameError(name), undefined, personNameError(name));
      assert.equal(isValidPersonName(name), true);
    });
  }

  it("rejects empty and too-short names", () => {
    assert.match(personNameError("") ?? "", /enter your name/i);
    assert.match(personNameError("A") ?? "", /at least 2 (characters|letters)/i);
  });

  it("rejects numbers and symbols", () => {
    assert.match(personNameError("12345") ?? "", /numbers/i);
    assert.match(personNameError("John@x") ?? "", /letters, spaces, hyphens/i);
    assert.match(personNameError("Jane_Doe") ?? "", /letters, spaces, hyphens/i);
  });

  it("rejects dangling or spaced hyphens/apostrophes like test- k'", () => {
    assert.match(personNameError("test- k'") ?? "", /hyphens and apostrophes between letters/i);
    assert.match(personNameError("test- k") ?? "", /hyphens and apostrophes between letters/i);
    assert.match(personNameError("Mary- Jane") ?? "", /hyphens and apostrophes between letters/i);
    assert.match(personNameError("test-") ?? "", /hyphens and apostrophes between letters|end with a letter/i);
    assert.match(personNameError("k'") ?? "", /at least 2 letters|hyphens and apostrophes/i);
  });

  it("rejects repeated punctuation", () => {
    assert.match(personNameError("Anne--Marie") ?? "", /repeated punctuation/i);
    assert.match(personNameError("O''Brien") ?? "", /repeated punctuation/i);
  });
});

describe("isValidEmail", () => {
  it("accepts common addresses", () => {
    assert.equal(isValidEmail("you@example.com"), true);
    assert.equal(isValidEmail("qa.tester+tag@example.co.uk"), true);
  });

  it("rejects invalid addresses", () => {
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail("not-an-email"), false);
    assert.equal(isValidEmail("a@b"), false);
    assert.equal(isValidEmail("you@example"), false);
    assert.equal(isValidEmail("you@.com"), false);
  });
});

describe("validateContactInput", () => {
  it("returns field errors for the highlighted malformed name case", () => {
    const result = validateContactInput({
      name: "test- k'",
      email: "",
      topic: "other",
      message: ""
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.errors.name ?? "", /hyphens and apostrophes between letters/i);
    assert.match(result.errors.email ?? "", /enter your email/i);
    assert.match(result.errors.message ?? "", /enter a message/i);
  });

  it("accepts a complete valid payload", () => {
    const result = validateContactInput({
      name: "O'Brien",
      email: "alex@example.com",
      topic: "bug",
      message: "The formatter failed on nested arrays in my file."
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.name, "O'Brien");
    assert.equal(result.data.email, "alex@example.com");
  });
});
