// Qwantzle constraint validation — runs entirely client-side.
// Ported from check_sentence.py.

const C1663_LETTERS =
  "ttttttttttttooooooooooeeeeeeeeaaaaaaallllllnnnnnnuuuuuuiiiiisssssdddddhhhhhyyyyyIIIrrrfffbbwwkcmvg:,!!";

let _vocab = null;
let _targetBank = null;

export async function loadVocab(url = "/vocab.json") {
  if (_vocab) return _vocab;
  const res = await fetch(url);
  const words = await res.json();
  _vocab = new Set(words);
  _vocab.add("I");
  return _vocab;
}

function buildBank(letters) {
  const bank = new Map();
  for (const ch of letters) {
    bank.set(ch, (bank.get(ch) || 0) + 1);
  }
  return bank;
}

function letterDiff(sentence, target) {
  const placed = new Map();
  for (const ch of sentence) {
    if (ch === " ") continue;
    placed.set(ch, (placed.get(ch) || 0) + 1);
  }
  const surplus = new Map();
  const deficit = new Map();
  const allChars = new Set([...placed.keys(), ...target.keys()]);
  for (const ch of allChars) {
    if (ch === " ") continue;
    const d = (placed.get(ch) || 0) - (target.get(ch) || 0);
    if (d > 0) surplus.set(ch, d);
    else if (d < 0) deficit.set(ch, -d);
  }
  let total = 0;
  for (const v of surplus.values()) total += v;
  for (const v of deficit.values()) total += v;
  return { total, surplus, deficit };
}

function bankToString(bank) {
  if (bank.size === 0) return "(none)";
  const chars = [];
  for (const [ch, count] of bank) {
    for (let i = 0; i < count; i++) chars.push(ch);
  }
  return chars.sort().join("");
}

function extractWords(sentence) {
  const words = [];
  let current = "";
  for (const ch of sentence) {
    if (/[a-zA-Z'\-]/.test(ch)) {
      current += ch;
    } else {
      if (current) words.push(current);
      current = "";
    }
  }
  if (current) words.push(current);
  return words;
}

export function checkSentence(sentence, vocab) {
  if (!_targetBank) _targetBank = buildBank(C1663_LETTERS);
  const { total, surplus, deficit } = letterDiff(sentence, _targetBank);
  const words = extractWords(sentence);
  const letterCount = [...sentence].filter((c) => /[a-zA-Z]/.test(c)).length;

  const constraints = [];

  // 1. Starts with I
  const startsI = sentence.startsWith("I ");
  constraints.push({
    label: 'Starts with "I"',
    pass: startsI,
    detail: startsI ? null : `Starts with "${sentence.slice(0, 10)}..."`,
  });

  // 2. Last word ends in w
  let lastAlpha = "";
  for (let i = words.length - 1; i >= 0; i--) {
    if (/^[a-zA-Z]+$/.test(words[i])) {
      lastAlpha = words[i];
      break;
    }
  }
  constraints.push({
    label: 'Last word ends in "w" (before "!!")',
    pass: lastAlpha.endsWith("w"),
    detail: `Last word: "${lastAlpha}"`,
  });

  // 3. Punctuation order
  const punct = [...sentence].filter((c) => ":,!".includes(c)).join("");
  constraints.push({
    label: "Punctuation :,!! in order",
    pass: punct === ":,!!",
    detail: punct === ":,!!" ? punct : `Found: ${punct || "(none)"}`,
  });

  // 4. 3 capital I
  const capI = words.filter((w) => w === "I").length;
  constraints.push({
    label: 'Exactly 3 capital "I" pronouns',
    pass: capI === 3,
    detail: `Found ${capI}`,
  });

  // 5. 11 + 8 adjacent
  let adjacent = null;
  for (let i = 0; i < words.length - 1; i++) {
    const l1 = words[i].length,
      l2 = words[i + 1].length;
    if ((l1 === 11 && l2 === 8) || (l1 === 8 && l2 === 11)) {
      adjacent = `${words[i]} + ${words[i + 1]}`;
      break;
    }
  }
  const has11 = words.some((w) => w.length === 11);
  const has8 = words.some((w) => w.length === 8);
  constraints.push({
    label: "11-letter word adjacent to 8-letter word",
    pass: adjacent !== null,
    detail:
      adjacent ||
      (has11 || has8
        ? `Has 11-letter: ${has11}, has 8-letter: ${has8}`
        : "No 11 or 8 letter words found"),
  });

  // 6. No 9 or 10 letter words
  const nineTen = words.filter((w) => w.length === 9 || w.length === 10);
  constraints.push({
    label: "No 9 or 10 letter words",
    pass: nineTen.length === 0,
    detail: nineTen.length ? `Found: ${nineTen.join(", ")}` : null,
  });

  // 7. No word > 11
  const tooLong = words.filter((w) => w.length > 11);
  constraints.push({
    label: "No word longer than 11 letters",
    pass: tooLong.length === 0,
    detail: tooLong.length ? `Found: ${tooLong.join(", ")}` : null,
  });

  // 8. All words in vocab
  const bad = words.filter(
    (w) => w !== "I" && !vocab.has(w.toLowerCase()) && !vocab.has(w),
  );
  constraints.push({
    label: "All words in Dinosaur Comics vocabulary",
    pass: bad.length === 0,
    detail: bad.length
      ? `Not in corpus: ${bad.join(", ")}`
      : `All ${words.length} words valid`,
  });

  // 9. Longest word is 11
  if (words.length) {
    const maxLen = Math.max(...words.map((w) => w.length));
    const longest = words.find((w) => w.length === maxLen);
    constraints.push({
      label: "Longest word is 11 letters",
      pass: maxLen === 11,
      warning: maxLen < 11,
      detail: `Longest: "${longest}" (${maxLen} letters)`,
    });
  }

  const allPass = constraints.every((c) => c.pass);

  return {
    letter_diff: total,
    surplus: bankToString(surplus),
    deficit: bankToString(deficit),
    char_count: sentence.length,
    word_count: words.length,
    letter_count: letterCount,
    constraints,
    all_constraints_pass: allPass,
    words,
    eleven: words.find((w) => w.length === 11) || null,
    eight: words.find((w) => w.length === 8) || null,
    ending: words.length ? words[words.length - 1] : null,
  };
}
