import React, { useEffect, useState } from 'react';
import { dataApi } from '../../api/data';

interface GitGraphTreeProps {
  repoId: number;
  repoName: string;
}

interface GitNode {
  sha: string;
  parents: string[];
  refs: string[];
  message: string;
  time_logged_seconds: number;
}

export const GitGraphTree: React.FC<GitGraphTreeProps> = ({ repoId, repoName }) => {
  const [nodes, setNodes] = useState<GitNode[]>([]);
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
            setNodes(res.nodes || []);
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
  }, [repoId]);

  if (loading) return <div className="loading-state">Loading branch history...</div>;
  if (error) return <div className="empty-state">Unable to load graph: {error}</div>;
  if (nodes.length === 0) return <div className="empty-state">No branch history found.</div>;

  return (
    <div className="git-graph-container" style={{ position: 'relative', marginTop: '1rem', padding: '1rem', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
      <h4 style={{ marginBottom: '1rem' }}>Branch History Tree ({repoName})</h4>
      <div className="git-graph-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {nodes.map((node, i) => {
          const hasTime = node.time_logged_seconds > 0;
          const mins = Math.round(node.time_logged_seconds / 60);
          
          return (
            <div key={node.sha} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.5rem', borderRadius: '4px', background: hasTime ? 'rgba(16, 185, 129, 0.05)' : 'transparent', borderLeft: hasTime ? '2px solid var(--primary)' : '2px solid transparent' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
                <div style={{ 
                  width: '12px', height: '12px', borderRadius: '50%', 
                  background: node.parents.length > 1 ? 'var(--primary)' : 'var(--text-muted)',
                  border: '2px solid var(--card-bg)', zIndex: 2 
                }} />
                {i < nodes.length - 1 && <div style={{ width: '2px', height: '100%', background: 'var(--card-border)', minHeight: '30px', marginTop: '4px' }} />}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <code style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>{node.sha}</code>
                  {node.refs.map(ref => (
                    <span key={ref} style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {ref}
                    </span>
                  ))}
                  {hasTime && (
                    <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.5rem', borderRadius: '12px', fontWeight: 'bold' }}>
                      ⏱️ {mins}m logged
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-color)' }}>
                  {node.message}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
