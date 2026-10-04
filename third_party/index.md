# Third-party material inventory

## Retained Trellis material

| Component | Version / license | Retained paths | Exact notice |
| --- | --- | --- | --- |
| `@mindfoldhq/trellis` | 0.6.14 / AGPL-3.0-only | `.trellis/workflow.md`, scripts, agents, config, generated metadata; AGENTS managed block and `.gitattributes` | [trellis/LICENSE](trellis/LICENSE) |

Source: installed `@mindfoldhq/trellis` 0.6.14 package metadata and LICENSE, matching `.trellis/.version`; upstream project `https://github.com/mindfold-ai/trellis`. Prior provenance also appears in root `readme.md`. On 2026-10-01 the retained LICENSE was byte-identical to the installed package: SHA-256 `d8a6cc31abc16b6748c7a21f21611f5a1ec33f67d22ca23d7da1c19b95496bee`. No separate top-level NOTICE or COPYRIGHT was found in that distribution. Status: `present` for the collected license; this inventory does not replace original headers or assert all redistribution requirements are met. The root project `license` does not override these notices.

## Local generated integrations

Trellis platform files in `.agents/` and `.codex/` remain ignored/local. UI/UX Pro Max in `.codex/skills/ui-ux-pro-max/` has its entry point, scripts and CSV data, but exact installed source revision/version and matching LICENSE/NOTICE are not established: `unknown`, `license-notice-needed` before sharing that material or raw generated artifacts. No generic substitute notice was fabricated and no local tool files were staged. Other local design skills are not promoted into shared material by this change.

## Maintenance

When retaining a new third-party source/template/asset/font or changing its version, identify source/version and affected paths, obtain verbatim LICENSE plus applicable NOTICE/COPYRIGHT from that exact distribution, and add one inventory entry. Reuse this directory; preserve original inline notices and notices needed by other retained versions. Unknown provenance stays explicit and blocks sharing only the affected material. Ordinary package dependencies retain package notices; this is not a transitive-dependency vendoring project.

The Trellis Plus specs and mainline are independently authored project data. They contain no copied tool implementation; copied notices remain third-party text. Before staging inspect every exact candidate, exclude protected runtime and local/secret files, and run `git diff --check`.

## Local asset comparison during policy reconciliation

The retained search.py, core.py, design_system.py and ux-guidelines.csv are
byte-identical to the corresponding installed ui-ux-pro-max-cli 2.10.2 assets.
This narrows their package source but does not establish the entire platform
template version or supply an exact applicable LICENSE/NOTICE. Keep the
license-notice-needed status before sharing affected material; no local
integration files or new raw UUPM output are added by this reconciliation.
