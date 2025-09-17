import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { get, ref } from 'firebase/database';
import { db } from '../firebase';
import CodeEditor from './CodeEditor';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const PublicPythonProject = () => {
  const { projectId, userId } = useParams();
  const location = useLocation();
  const isPreview = new URLSearchParams(location.search).get('preview') === 'true';
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openPanel, setOpenPanel] = useState('code'); // 'code' or 'terminal'
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const projectRef = ref(db, `users/${userId}/python/PythonCompletedProjects/${projectId}`);
        const snap = await get(projectRef);
        if (snap.exists()) {
          setProject(snap.val());
        } else {
          setError('Project not found.');
        }
      } catch (e) {
        setError('Failed to load project.');
      }
      setLoading(false);
    };
    fetchProject();
  }, [projectId, userId]);

  if (loading) return <div style={{ color: '#fff', background: '#1e1e1e', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  if (error) return <div style={{ color: 'red', background: '#1e1e1e', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{error}</div>;
  if (!project) return null;


  return (
    <div style={{
      minHeight: '100vh',
      minWidth: '100vw',
      background: '#18181b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'JetBrains Mono', 'Fira Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace"
    }}>
      <div style={{
        width: '1600px',
        height: '800px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        background: '#1e1e1e',
        borderRadius: '18px',
        boxShadow: '0 8px 40px #000a, 0 1.5px 0 #23272e',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1.5px solid #23272e',
      }}>
        {/* VS Code style header bar (removed in preview mode) */}
        {!isPreview && (
          <div style={{
            height: 44,
            background: '#23272e',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            fontWeight: 600,
            fontSize: 17,
            borderBottom: '1px solid #222',
            letterSpacing: 0.2
          }}>
            <button
              onClick={() => window.history.back()}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 22,
                marginRight: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
              title="Back"
            >
              <span style={{ fontSize: 22, marginRight: 2, display: 'inline-block', transform: 'translateY(1px)' }}>&larr;</span>
            </button>
            <span style={{ color: '#6ee7b7', marginRight: 16 }}>🐍 Python Project</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>{project.projectTitle || 'Untitled Project'}</span>
            <span style={{ marginLeft: 32, color: '#a1a1aa', fontSize: 14 }}>
              Concepts Used: <span style={{ color: '#facc15' }}>{project.conceptUsed || 'N/A'}</span>
            </span>
          </div>
        )}
        {/* Dropdown/Dropup toggle in preview mode */}
        {isPreview ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Code Editor with dropdown in header */}
            <div style={{ height: openPanel === 'code' ? 'calc(100% - 60px)' : 60, minHeight: 0, transition: 'height 0.3s' }}>
              <div style={{
                background: '#23272e',
                color: '#fff',
                padding: '6px 24px',
                fontWeight: 600,
                fontSize: 15,
                borderBottom: '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                userSelect: 'none',
                cursor: 'pointer',
              }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Code Editor
                </span>
                <span
                  onClick={() => setOpenPanel(openPanel === 'code' ? 'terminal' : 'code')}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 18, marginLeft: 8 }}
                  title={openPanel === 'code' ? 'Show Terminal' : 'Show Code Editor'}
                >
                  {openPanel === 'code' ? <FaChevronDown /> : <FaChevronUp />}
                </span>
              </div>
              <div style={{ height: openPanel === 'code' ? 'calc(100% - 44px)' : 0, overflow: 'hidden', transition: 'height 0.3s' }}>
                <CodeEditor
                  value={project.code || ''}
                  readOnly={true}
                  hideTerminal={true}
                />
              </div>
            </div>
            {/* Terminal with dropup in header */}
            <div style={{
              background: '#18181b',
              color: '#d4d4d4',
              borderTop: '1.5px solid #222',
              height: openPanel === 'terminal' ? 'calc(100% - 60px)' : 60,
              minHeight: 60,
              maxHeight: 'calc(100% - 60px)',
              textAlign: "left",
              fontSize: 15,
              fontFamily: 'inherit',
              padding: '0 0 0 0',
              display: 'flex',
              flexDirection: 'column',
              transition: 'height 0.3s',
              overflow: 'hidden',
            }}>
              <div style={{
                background: '#23272e',
                color: '#fff',
                padding: '6px 24px',
                fontWeight: 600,
                fontSize: 15,
                borderBottom: '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                userSelect: 'none',
                cursor: 'pointer',
              }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  Terminal
                </span>
                <span
                  onClick={() => setOpenPanel(openPanel === 'terminal' ? 'code' : 'terminal')}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: 18, marginLeft: 8 }}
                  title={openPanel === 'terminal' ? 'Show Code Editor' : 'Show Terminal'}
                >
                  {openPanel === 'terminal' ? <FaChevronUp /> : <FaChevronDown />}
                </span>
              </div>
              <div style={{ height: openPanel === 'terminal' ? 'calc(100% - 44px)' : 0, overflow: 'hidden', transition: 'height 0.3s' }}>
                <CodeEditor
                  value={project.code || ''}
                  readOnly={true}
                  hideTerminal={false}
                />
              </div>
            </div>
          </div>
        ) : (
          // Normal mode: original layout
          <div style={{ flex: 1, minHeight: 0 }}>
            <CodeEditor
              value={project.code || ''}
              readOnly={true}
              hideTerminal={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicPythonProject; 