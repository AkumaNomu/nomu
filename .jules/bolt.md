## 2025-05-15 - [CSS Redundancy and Content Loading Parallelization]
**Learning:** Found extreme redundancy in the stylesheet where identical component styles were repeated multiple times, likely due to a poor build or copy-paste process. Consolidating these into a single class-based system reduced the CSS volume by ~93%. Additionally, sequential `await` calls for markdown content fetching created a linear bottleneck that scaled poorly with the number of posts.
**Action:** Always check for repeated CSS blocks using `grep` or pattern matching before assuming the CSS is "already optimized". For data fetching, prioritize `Promise.all` for independent resources to maximize network concurrency.

## 2025-05-15 - [Hidden Element Click Blocking]
**Learning:** A visually hidden page loader (`opacity: 0`) still occupied the top z-index layer and blocked all user interactions because it lacked `pointer-events: none`.
**Action:** Ensure that any global "loader" or "overlay" element explicitly disables pointer events when transition to a hidden state to prevent "dead" UI bugs.
