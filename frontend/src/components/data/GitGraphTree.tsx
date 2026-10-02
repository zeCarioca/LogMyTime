import React, { useEffect, useState } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { dataApi } from '../../api/data';
import { computeGitGraphLayout } from '../../utils/gitGraphLayout';

interface GitGraphTreeProps {
  repoId: number;
  repoName: string;
  refreshCount?: number;
}

const CommitNode = ({ data }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasTime = data.time_logged_seconds > 0;
  const mins = Math.round(data.time_logged_seconds / 60);

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--card-bg)',
        border: `2px solid ${data.color}`,
        padding: '0.4rem 0.8rem',
        borderRadius: '24px',
        width: '280px',
        boxShadow: hasTime ? `0 0 10px ${data.color}80` : 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.2s ease-out',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)'
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: data.color, border: 'none', width: '6px', height: '6px' }} />
      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: data.color }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{data.sha}</strong>
          {hasTime && (
             <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
               ⏱️ {mins}m
             </span>
          )}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.message}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: data.color, border: 'none', width: '6px', height: '6px' }} />

      {/* Custom Glassmorphism Tooltip */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '12px',
          background: 'rgba(20, 20, 25, 0.85)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${data.color}`,
          padding: '1rem',
          borderRadius: '8px',
          width: 'max-content',
          maxWidth: '300px',
          zIndex: 1000,
          color: 'white',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          pointerEvents: 'none'
        }}>
           <h5 style={{ margin: '0 0 0.5rem 0', color: data.color, fontSize: '0.9rem' }}>{data.sha}</h5>
           <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{data.message}</p>
           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
             <div style={{ marginBottom: '0.2rem' }}><strong>Author:</strong> {data.author || 'Unknown'}</div>
             <div><strong>Date:</strong> {data.date ? new Date(data.date).toLocaleString() : 'Unknown'}</div>
             {hasTime && (
               <div style={{ marginTop: '0.6rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                 ⏱️ Total Logged: {mins} minutes
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

const nodeTypes = { commit: CommitNode };

export const GitGraphTree: React.FC<GitGraphTreeProps> = ({ repoId, repoName, refreshCount = 0 }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await dataApi.getGitGraph(repoId);
        if (mounted) {
          if (res.status === 'success') {
            const rawNodes = res.nodes || [];
            const layout = computeGitGraphLayout(rawNodes);
            // Convert to smoothstep to make branch merges look cleaner
            const styledEdges = layout.edges.map(e => ({
               ...e,
               type: 'smoothstep',
               animated: false,
               style: { ...e.style, strokeWidth: 2 }
            }));
            setNodes(layout.nodes);
            setEdges(styledEdges);
          } else {
            setError(res.message || 'Failed to load git graph.');
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to fetch graph data.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchGraph();
    return () => { mounted = false; };
  }, [repoId, refreshCount]);

  if (loading) return <div className="loading-state">Loading graphical branch history...</div>;
  if (error) return <div className="empty-state">Unable to load graph: {error}</div>;
  if (nodes.length === 0) return <div className="empty-state">No branch history found.</div>;

  return (
    <div className="git-graph-container" style={{ marginTop: '1rem', padding: '1rem', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
      <h4 style={{ marginBottom: '1rem' }}>Branch History Graph ({repoName})</h4>
      <div style={{ height: '600px', width: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-right"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background color="var(--card-border)" gap={24} size={2} />
          <Controls style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', fill: 'var(--text-main)' }} />
        </ReactFlow>
      </div>
    </div>
  );
};
