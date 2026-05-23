# Qwantzle Checker

A web tool to test candidate solutions to [the Qwantzle](https://qwantz.com/index.php?comic=1663) — the unsolved cryptoanagram embedded in Dinosaur Comics #1663 (2010).

Live: **https://qwantzle.pages.dev**

## What it does

Paste a candidate sentence and the checker tells you:

- Whether the letters match the target bag (with surplus / deficit breakdown)
- Whether all 9 known constraints pass (starts with "I", ends in "w!!", `:,!!` punctuation, 11+8 adjacent words, 3 capital I's, all words in the Dinosaur Comics vocabulary, etc.)

All validation runs entirely in your browser — your sentence isn't sent to a server unless you let us log it (see Privacy).

## Privacy

If you leave the "Don't log this attempt" box unchecked, we anonymously log each submitted sentence to study patterns across solvers. We collect:

- the sentence
- the 11-letter word, 8-letter word, and ending word it used
- the letter diff
- a random per-tab session ID (so we can group your attempts together — not tied to your identity in any way)

No IP, no name, no email, no fingerprint. **Check "Don't log this attempt"** to opt out entirely. There's also a small "I'm Ryan North" escape hatch that disables all logging for your session.

## Architecture

- **Static frontend** (HTML / vanilla JS) on Cloudflare Pages
- **Validation** runs entirely client-side; the Dinosaur Comics vocab (~13.5k words) ships as a static `vocab.json`
- **Logging endpoints** are Pages Functions writing to Cloudflare D1 (SQLite)

```
cf/
├── public/              # static site
│   ├── index.html
│   ├── validate.js      # client-side constraint checker
│   └── vocab.json       # Dinosaur Comics word list (Jadrian's corpus)
├── functions/api/       # Cloudflare Pages Functions
│   ├── log.js           # POST /api/log → D1
│   ├── ryan-event.js    # POST /api/ryan-event → D1
│   └── count.js         # GET /api/count → D1
├── schema.sql           # D1 schema (attempts + ryan_events tables)
└── wrangler.toml
```

## Local dev

```bash
# Static-only preview (Python, with in-memory log stubs):
python3 dev_preview.py
# → http://localhost:3456

# Full preview with real D1 bindings (requires wrangler):
wrangler pages dev public
# → http://localhost:8788
```

## Deploy

```bash
wrangler login
wrangler d1 create qwantzle-db          # paste id into wrangler.toml
wrangler d1 execute qwantzle-db --remote --file=schema.sql
wrangler pages deploy public --project-name=qwantzle
```

## The puzzle

Posted by Ryan North in 2010, the Qwantzle is a single T-Rex sentence whose 98 letters (`ttttttttttttooooooooooeeeeeeeeaaaaaaallllllnnnnnnuuuuuuiiiiisssssdddddhhhhhyyyyyIIIrrrfffbbwwkcmvg:,!!`) rearrange into a "natural-sounding" anagram. After 16+ years it remains unsolved. Joel Watson maintained a public checker for years; this is a spiritual successor.

Confirmed clues from Ryan North across multiple comics and posts:

- Starts with "I"
- Ends in a word ending in "w" followed by "!!"
- Punctuation `:` `,` `!` `!` appears in that order
- Longest word is 11 letters; second-longest is 8 letters, and they're adjacent
- No 9- or 10-letter words
- Three capital "I" pronouns
- Every word is from [Jadrian's verified Dinosaur Comics vocabulary](https://qwantz.com/index.php?comic=1665)
- Would make a good epitaph

## Contributing

Issues and PRs welcome. Especially:

- additional constraints we missed
- improvements to the constraint detection
- bug reports / UI feedback

## License

MIT — see [LICENSE](LICENSE).
