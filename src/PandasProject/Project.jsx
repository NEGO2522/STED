import React, { useState } from 'react';
import Statement from './Statement';
import AI from './AI';
import Colab from './Colab';

function Project() {
  const [rightPanel, setRightPanel] = useState('statement');
  const [chatMessages, setChatMessages] = useState([]);
  const [userCode, setUserCode] = useState(''); // Will be populated from Colab
  const [taskCheckStatus, setTaskCheckStatus] = useState({});
  const [subtaskCheckResults, setSubtaskCheckResults] = useState({});
  const [expandedTask, setExpandedTask] = useState(null);

  return (
    <div className="flex h-screen pt-12 p-3 bg-[#0F0F0F] w-screen">
      {/* Left side - Colab Panel */}
      <div className="w-280 border border-white h-full text-white border-white">
        <Colab setUserCode={setUserCode}/>
        </div>
      {/* Right side - Statement / AI Panel */}
      <div
        className="flex-1 h-full text-white p-5 border border-white"
        style={{ backgroundColor: "rgb(24, 24, 27)", minWidth: 0, borderRadius: 0 }}
      >
        {/* Toggle Buttons */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setRightPanel('statement')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              rightPanel === 'statement'
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
          >
            Statement
          </button>
          <button
            onClick={() => setRightPanel('ai')}
            className={`px-4 py-2 rounded-md font-medium transition ${
              rightPanel === 'ai'
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
          >
            AI
          </button>
        </div>
        {/* Content Section */}
        <div className="mt-2">
          {rightPanel === 'statement' && (
            <Statement
              userCode={userCode}
              taskCheckStatus={taskCheckStatus}
              setTaskCheckStatus={setTaskCheckStatus}
              subtaskCheckResults={subtaskCheckResults}
              setSubtaskCheckResults={setSubtaskCheckResults}
              expandedTask={expandedTask}
              setExpandedTask={setExpandedTask}
            />
          )}
          {rightPanel === 'ai' && (
            <AI
              userCode={userCode}
              messages={chatMessages}
              setMessages={setChatMessages}
              terminalOutput={[]} // No terminal output
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Project;
