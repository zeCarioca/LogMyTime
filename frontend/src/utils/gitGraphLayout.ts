import { Edge, Node } from '@xyflow/react';

export interface GitCommitNode {
  sha: string;
  parents: string[];
  refs: string[];
  message: string;
  time_logged_seconds: number;
  author?: string;
  date?: string;
}

const TRACK_COLORS = [
  'var(--primary)',
  'var(--success)',
  'var(--warning)',
  'var(--danger)',
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316'  // orange
];

export function computeGitGraphLayout(commits: GitCommitNode[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const activeTracks: (string | null)[] = [];

  const ROW_HEIGHT = 100;
  const COL_WIDTH = 320;

  commits.forEach((commit, rowIndex) => {
    // 1. Find column for this commit
    let colIndex = activeTracks.indexOf(commit.sha);
    
    if (colIndex === -1) {
      // Not expected by any active track. Must be a branch head.
      const emptyIdx = activeTracks.indexOf(null);
      if (emptyIdx !== -1) {
        colIndex = emptyIdx;
      } else {
        colIndex = activeTracks.length;
      }
    }

    const color = TRACK_COLORS[colIndex % TRACK_COLORS.length];

    // Create React Flow node
    nodes.push({
      id: commit.sha,
      type: 'commit', // We will build a custom node type for this
      position: { x: colIndex * COL_WIDTH, y: rowIndex * ROW_HEIGHT },
      data: {
        ...commit,
        color,
      },
    });

    // 2. Update active tracks
    if (commit.parents.length > 0) {
      // Replace current commit with its first parent (continuing the track)
      activeTracks[colIndex] = commit.parents[0];
      
      // For additional parents (merges), add them to new tracks
      for (let i = 1; i < commit.parents.length; i++) {
        const parentSha = commit.parents[i];
        if (!activeTracks.includes(parentSha)) {
          const emptyIdx = activeTracks.indexOf(null);
          if (emptyIdx !== -1) {
            activeTracks[emptyIdx] = parentSha;
          } else {
            activeTracks.push(parentSha);
          }
        }
      }
    } else {
      // This track ends here (root commit)
      activeTracks[colIndex] = null;
    }

    // Clean up trailing nulls to keep tracks compact
    while (activeTracks.length > 0 && activeTracks[activeTracks.length - 1] === null) {
      activeTracks.pop();
    }
  });

  // 3. Generate Edges (Lines between commits)
  commits.forEach((commit) => {
    commit.parents.forEach((parentSha) => {
      // Find the parent's color if it exists in our layout
      const parentNode = nodes.find(n => n.id === parentSha);
      const childNode = nodes.find(n => n.id === commit.sha);
      
      if (parentNode && childNode) {
        // Line color follows the child track for direct descent, 
        // or parent track for merges. We'll use child track color to show where it was merged into.
        const edgeColor = childNode.data.color as string;
        
        edges.push({
          id: `e-${commit.sha}-${parentSha}`,
          source: commit.sha,
          target: parentSha,
          type: 'bezier',
          style: {
            stroke: edgeColor,
            strokeWidth: 2,
          },
        });
      }
    });
  });

  return { nodes, edges };
}
