// Every link to the repository lives here, so moving the repo is a one-line change.
//
// Plain constants and no imports: scripts/gen-ai.mjs loads this file straight
// from Node (type stripping) and passes it to src/lib/aiPage.ts.

export const REPO_URL = "https://github.com/JaeUngJang/oddly-satisfying-motion";

/** A new issue, opened on the unit-request template. */
export const ISSUES_URL = `${REPO_URL}/issues/new?template=unit-request.md`;

export const CONTRIBUTING_URL = `${REPO_URL}/blob/main/CONTRIBUTING.md`;

export const RELEASES_URL = `${REPO_URL}/releases`;
