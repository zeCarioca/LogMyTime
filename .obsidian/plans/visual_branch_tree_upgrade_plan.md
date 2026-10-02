# Visual Branch History Tree: Upgrade Plan

## Objective
Upgrade the existing CSS-timeline `<GitGraphTree />` into a fully graphical, topological tree graph that accurately renders branches, merges, and tracks visually.

## Phase 1: Track Computation Engine
A true git graph requires calculating "tracks" (columns) for each commit to handle parallel branching.
1. **Algorithm Implementation**: Build a client-side algorithm (or rely on a graph library) that assigns an `x, y` coordinate to each commit node based on its parent SHAs.
2. **Color Assignment**: Assign a unique Oklch theme color to each track so branches are visually distinct.

## Phase 2: Graphical Rendering Layer
1. **SVG or Canvas Integration**: Replace the current DOM `<div>` stack with an `<svg>` or `<canvas>` drawing surface.
2. **Node Drawing**: Render commits as interactive circles (`cx`, `cy`).
3. **Path Drawing**: Draw SVG `<path>` Bezier curves connecting a child commit to its parent(s) (merges).

## Decisions Made
Based on our discussion, we have finalized the following design decisions:
1. **Rendering Approach**: We will use an **external library** (e.g., vis-network, react-d3-tree, or gitgraph.js) to accelerate development while wiring up our custom CSS variables for styling.
2. **Graph Density**: We will render **all branches exactly as they are** in the git history to provide a complete topology, avoiding complex filtering logic.
3. **Interactivity**: We will implement a **hover tooltip** on the nodes to provide immediate, lightweight context (commit message, time logged, author) without disrupting the UI flow.
