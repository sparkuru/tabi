# Research: OCR source for initial lists

- Query: What can `archive/ocr.md` safely seed for 北京美食 and 周末游玩?
- Scope: internal
- Date: 2026-09-29

## Findings

### Files found

- `archive/ocr.md` — 207-line combined OCR Markdown; three source sections, with no original JPGs in this inspected file.
- `.trellis/spec/product/requirements.md` — DATA-01–03 requires review, same-list deduplication, coordinate checks, provenance, missing-field labels, and dated treatment of changing facts (line 43).
- `.trellis/tasks/09-29-checklist-mvp/prd.md` — two themes must share the same check-in flow; imported data keeps provenance (lines 24, 39).
- `backend/app/schemas/catalog.py` — `ItemWrite` has source, verification time, missing fields, place/area, and paired reference text/date (lines 52–89).
- `backend/app/schemas/imports.py` — batch source/review time plus per-row transcription/coordinate flags (lines 10–23).
- `backend/app/api/routes/admin.py` — import requires `transcription_reviewed`, checks coordinate flag when coordinates exist, and rejects exact normalized duplicate name/address pairs within the batch (lines 290–340).
- `backend/app/services/imports.py` — duplicate key is NFKC/casefold whitespace-normalized name plus address (lines 6–10); brand or nearby-location matches need human review.

### Source sections and counts

| OCR section | Lines | Rows | Fields and proposed item shape |
| --- | --- | ---: | --- |
| 北京《Delicious》刊 | 5–80; table 9–78 | 70 | Number, restaurant name, address, remark. Seed 北京美食 items; retain number as `sort_order`, name, address/area, remark as clearly attributed source description or recommendation. No coordinates appear. |
| 周末逃离北京计划 | 82–163; table 88–163 | 76 | Number, destination, high-speed rail duration, reference fare, specialty foods, attractions. Seed 周末游玩 items as destinations (`place_kind=area`), with attractions/specialties as source-attributed recommendation text. No coordinates appear. |
| 北京有什么好吃的了？ | 165–207; district lists 169–205 | 26 | Name with optional branch plus district heading. Additional 北京美食 candidates; district is `area`, but street address is absent. Screenshot attribution is at line 207. |

The weekend table has rows numbered 1–24 (24 rows), 55–75 (21 rows), and 76–106 (31 rows). Its own note says original rows 25–54 are missing (line 84). Exactly 50 of the 76 rows contain attractions: 19 of rows 1–24 and all 31 appended rows; rows 55–75 and five others (14, 18, 22–24) show `—` (lines 101, 105, 109–132). Do not generate rows for 25–54 or convert `—` into an invented attraction. The line-84 phrase “原美食表” describes the weekend table and appears editorially inconsistent; preserve the raw source and do not infer a different data set.

### Duplicate and relationship review

- `四季民福烤鸭店` appears twice within the first table at different addresses, 前门大街30号 and 大栅栏街1号 (lines 10, 53). Treat as separate branch candidates pending address/branch review, not an automatic merge.
- `南门涮肉` in the first table (line 45) and `南门涮肉（天坛南门店）` in the district list (line 173) may be the same branch; district list has no street address. `门框胡同百年卤煮` appears at 门框胡同26号 (line 28) and as 新街口店 (line 184), probably different branch candidates. `巴州金丝特餐厅` at 皂君庙2号 (line 62) and `新疆巴州金丝特餐厅（大钟寺店）` (line 202) may be related; confirm before deduplication. The current exact-key dedupe will not catch these near matches.
- Weekend destination names have no exact repeats. `秦皇岛` includes 北戴河 among attractions (line 93), while `北戴河` is its own destination (line 163), explicitly requested by the source note (line 84). `石家庄` includes 正定古城 while `正定` is separate (lines 91, 137); `太原` includes 平遥古城 while `平遥` is separate (lines 158–159). Keep destination items distinct and consider same-list relations only after place review.

### Safe extraction and review procedure

1. Parse the three sections as separate source groups, retaining source line number and table number in an intermediate review sheet. Avoid combining a district-only name with a first-table address without a branch match. Review all 172 transcribed rows (70 + 76 + 26) for malformed names, duplicate candidates, and missing fields.
2. For 北京美食, use first-table address text as an unverified address, preserving vague area-only entries such as `悦仙美食`, `小荣酒家`, `煲煲好`, and `北京清真房记小吃店` (lines 20–22, 52) as area rather than complete street address. The district-list 26 rows lack street addresses (lines 169–205). Set missing-field markers for street address and coordinates as appropriate.
3. For 周末游玩, use destination as an area rather than a single physical point. Suggested attractions are recommendations, not verified coordinates or proof they are within city boundaries. For example `张家口` lists 八达岭长城 (line 95), `太原` lists 平遥古城 (line 158); manually verify geographic relevance before presenting as a local attraction.
4. Retain provenance such as `archive/ocr.md:9-78`, `archive/ocr.md:88-163`, or `archive/ocr.md:169-205` in each import batch. A review timestamp is evidence of review of the transcription; it is **not** a date for fares, travel times, prices, opening hours, awards, or address accuracy. Leave `verified_at` and `reference_as_of` empty until those facts are separately verified with dated evidence.
5. Exclude unverified changing numeric claims from stable summary text: food prices occur in lines 22, 32, 35, 39, 46, 53, 56; all weekend rows give fares and durations (lines 88–163). These values may be shown later only as explicitly dated, source-attributed reference material. Commercial claims and superlatives in the remarks likewise need review before promotion to current facts.
6. Never invent coordinates, URLs, photos, street addresses, missing weekend rows, or verification dates. Import candidates as draft items; publish only rows whose names/branches and displayed factual claims have been reviewed sufficiently for the public list. The app's import endpoint requires a true `transcription_reviewed` flag (admin route lines 301–308), so mark it true only for individually inspected rows.

## Caveats / Not Found

- User clarification: `archive/ocr.md` is the complete record for this task and should be the primary source. The absence of JPGs does not block importing or publishing clearly labeled OCR reference entries; it only limits independent image-to-text and current-fact verification.
- `archive/ocr.md` is already processed Markdown, not the original JPG images. Text-to-image OCR fidelity cannot be independently checked from this file alone. A review can establish internal transcription consistency, but it cannot certify the original photograph or present-day business facts.
- The OCR does not supply capture dates, source URLs, station pairs for high-speed rail, fare basis, coordinate systems, or verified hours. No `reference_as_of` value can be assigned honestly from the file.
- No external sources were consulted; no restaurant, route, fare, or attraction claim is independently verified here.
- The product architecture document still says the OCR source is absent (`.trellis/spec/product/architecture.md:41`), and the task PRD repeats this (`.trellis/tasks/09-29-checklist-mvp/prd.md:14`). These statements predate the user pointing to `archive/ocr.md` and should be corrected through the appropriate spec/task update path by the main session.
