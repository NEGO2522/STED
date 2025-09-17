import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { FiExternalLink } from 'react-icons/fi';

function Feed() {
  const [feedProjects, setFeedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    // Fetch all users and their completed Python projects
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setFeedProjects([]);
        setLoading(false);
        return;
      }
      const usersObj = snapshot.val();
      let allProjects = [];
      await Promise.all(Object.entries(usersObj).map(async ([uid, userData]) => {
        // Exclude current user
        if (user && uid === user.id) return;
        const name = userData.name || userData.fullName || userData.username || 'Student';
        const pythonProjects = userData.python?.PythonCompletedProjects || {};
        Object.entries(pythonProjects).forEach(([projectId, project]) => {
          allProjects.push({
            userId: uid,
            userName: name,
            projectId,
            projectTitle: project.projectTitle || project.title || 'Python Project',
            completedAt: project.completedAt || project.completedDate || null,
            publicUrl: project.publicUrl || '',
            conceptUsed: project.conceptUsed || null,
            userImage: userData.image || null, // Add userImage to the project object
          });
        });
      }));
      // Sort by completedAt descending (latest first)
      allProjects.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt) : new Date(0);
        const dateB = b.completedAt ? new Date(b.completedAt) : new Date(0);
        return dateB - dateA;
      });
      setFeedProjects(allProjects);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) return <div>Loading feed...</div>;
  if (feedProjects.length === 0) return <div>No projects to show yet.</div>;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {feedProjects.map((project, idx) => (
        <div key={project.projectId + project.userId} className="bg-white rounded-lg shadow p-8 flex flex-col gap-4 border border-slate-200 items-stretch relative">
          {/* Python badge at top right */}
          <div
            className="absolute top-0 right-18 mt-4 px-4 py-1 bg-purple-600 rounded-full text-sm font-bold shadow"
            style={{
              color: 'white',
              letterSpacing: 1,
              zIndex: 10,
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px #a21caf33',
            }}
          >
            Python
          </div>
          {/* Three-dot icon at top right, next to Python badge */}
          <button
            className="absolute top-0 right-4 mt-4 p-1 rounded-full hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-label="More options"
            style={{ display: 'flex', alignItems: 'center', background: 'white', border: 'none', zIndex: 11 }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="5" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="19" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </button>
          {/* Name and date/time full width at top */}
          <div className="flex items-center gap-3 mb-2 w-full">
            {/* User avatar */}
            {project.userImage ? (
              <img
                src={project.userImage}
                alt={project.userName + ' avatar'}
                className="w-9 h-9 rounded-full object-cover border border-slate-300"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border border-slate-300" style={{ fontSize: 18 }}>
                {project.userName ? project.userName[0].toUpperCase() : '?' }
              </div>
            )}
            <span className="font-semibold text-slate-700">{project.userName}</span>
            {project.completedAt && (
              <span className="text-xs text-slate-500">{new Date(project.completedAt).toLocaleString()}</span>
            )}
          </div>
          {/* Project title full width */}
          <div
            className="text-3xl font-bold text-slate-900 break-words w-full block mb-2"
            style={{ textAlign: 'left', fontFamily: 'Poppins, Montserrat, Fira Sans, Arial, sans-serif' }}
          >
            {project.projectTitle}
          </div>
          <div className="flex flex-row gap-8 w-full">
            {/* Left: Project info */}
            <div className="flex flex-col text-left justify-between flex-1 min-w-0">
              {/* Concept Used (if available) below title */}
              {project.conceptUsed && (
                <div className="text-base text-slate-600 mb-2 mt-1">
                  <span className="font-semibold text-slate-500">Concept Used:</span> <span className="text-yellow-600">{project.conceptUsed}</span>
                </div>
              )}
              {/* Centered project reflection text */}
              <div className="flex flex-col items-left justify-center flex-1 my-4">
                <div className="text-left text-slate-700 text-base italic px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 shadow-sm max-w-xs">
                  Made a project by using while loop and functions. It was hard for me because I made first project by my own.
                </div>
              </div>
              {/* Like and Comment buttons at the bottom */}
              <div className="flex gap-3 mt-2">
                <button className="flex items-center justify-center px-2 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 shadow-sm transition" aria-label="Like">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 20.25h10.734c1.285 0 2.333-1.048 2.333-2.333V11.25c0-1.285-1.048-2.333-2.333-2.333h-2.25l.75-3.75a2.25 2.25 0 0 0-4.406-.916l-1.125 4.666H6.633C5.348 8.917 4.3 9.965 4.3 11.25v6.667c0 1.285 1.048 2.333 2.333 2.333z" />
                  </svg>
                </button>
                <button className="flex items-center justify-center px-2 py-1 rounded-full bg-green-50 hover:bg-green-100 text-green-600 shadow-sm transition" aria-label="Comment">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 15.75a2.25 2.25 0 0 1-2.25 2.25H6.75l-4.5 4.5V6.75A2.25 2.25 0 0 1 4.5 4.5h15a2.25 2.25 0 0 1 2.25 2.25v9z" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Right: Project preview and button */}
            {project.publicUrl && (
              <div className="flex flex-col items-end justify-between w-[480px] max-w-[50%] min-w-[320px] relative">
                {/* Fullscreen icon at top right */}
                <button
                  className="absolute z-10 border"
                  title="Open fullscreen preview"
                  style={{
                    color: 'white',
                    backgroundColor: 'black',
                    borderRadius: '50%',
                    padding: 8,
                    boxShadow: '0 2px 8px #0002',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    top: 0,
                    right: 0,
                    transform: 'translate(50%,-50%)',
                  }}
                  onClick={() => {
                    window.open(project.publicUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  {/* Fullscreen four-arrow icon SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 9.75V6.75A2.25 2.25 0 0 1 6.75 4.5h3M19.5 9.75V6.75A2.25 2.25 0 0 0 17.25 4.5h-3M4.5 14.25v3a2.25 2.25 0 0 0 2.25 2.25h3m9-5.25v3a2.25 2.25 0 0 1-2.25 2.25h-3" />
                  </svg>
                </button>
                <iframe
                  id={`feed-iframe-${idx}`}
                  src={project.publicUrl.replace('/public/python-project/', '/python-project/') + '?preview=true'}
                  title={project.projectTitle}
                  className="w-full h-[350px] border rounded-3xl"
                  style={{ minHeight: '200px', maxHeight: '350px' }}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  scrolling="yes"
                />
                
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Feed;