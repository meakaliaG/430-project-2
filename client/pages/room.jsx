const helper = require('../utils/helper.js');
const React = require('react');
const { useState, useEffect, useRef } = React;
const { createRoot } = require('react-dom/client');

/* Component: Drawing Toolbar */
const Toolbar = ({ tool, setTool, color, setColor, lineWidth, setLineWidth, onClear }) => {
  const colors = [
    '#000000', '#EF4444', '#F59E0B', '#10B981', 
    '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'
  ];

  return (
    <div className="toolbar">
      <div className="tool-group">
        <button
          className={`tool-button ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => setTool('pen')}
          title="Pen"
        >
          ✏️
        </button>
        <button
          className={`tool-button ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => setTool('eraser')}
          title="Eraser"
        >
          🧹
        </button>
      </div>

      <div className="tool-group">
        <label className="tool-label">Size:</label>
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
          className="size-slider"
        />
        <span className="size-value">{lineWidth}px</span>
      </div>

      <div className="tool-group">
        <label className="tool-label">Color:</label>
        <div className="color-palette">
          {colors.map((c) => (
            <button
              key={c}
              className={`color-button ${color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="tool-group">
        <button
          className="tool-button clear-button"
          onClick={onClear}
          title="Clear Canvas"
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
};

/* Component: Canvas */
const Canvas = ({ tool, color, lineWidth, socketRef, roomCode }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to fill container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Redraw after resize (simplified - you might want to restore saved state)
      if (context) {
        context.lineCap = 'round';
        context.lineJoin = 'round';
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setContext(ctx);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;

    // Listen for drawing data from other users
    socketRef.current.on('draw-data', (data) => {
      if (!context) return;
      drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.lineWidth, data.tool);
    });

    socketRef.current.on('canvas-cleared', () => {
      clearCanvas();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('draw-data');
        socketRef.current.off('canvas-cleared');
      }
    };
  }, [context, socketRef]);

  const drawLine = (x0, y0, x1, y1, drawColor, drawWidth, drawTool) => {
    if (!context) return;

    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    
    if (drawTool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = 'rgba(0,0,0,1)';
      context.lineWidth = drawWidth * 2;
    } else {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = drawColor;
      context.lineWidth = drawWidth;
    }
    
    context.stroke();
    context.closePath();
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store the starting point
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const x0 = canvasRef.current.lastX;
    const y0 = canvasRef.current.lastY;

    // Draw locally
    drawLine(x0, y0, x, y, color, lineWidth, tool);

    // Emit to other users
    if (socketRef.current) {
      socketRef.current.emit('draw-move', {
        roomCode,
        x0,
        y0,
        x1: x,
        y1: y,
        color,
        lineWidth,
        tool,
      });
    }

    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
  };

  return (
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};

/* Component: Participants List */
const ParticipantsList = ({ participants }) => {
  return (
    <div className="participants-panel">
      <h3 className="participants-title">
        Participants ({participants.length})
      </h3>
      <div className="participants-list">
        {participants.length === 0 ? (
          <p className="empty-participants">No other participants yet</p>
        ) : (
          participants.map((participant) => (
            <div key={participant.userId} className="participant-item">
              <div className="participant-avatar">
                {participant.username.charAt(0).toUpperCase()}
              </div>
              <div className="participant-info">
                <span className="participant-name">{participant.username}</span>
                <span className="participant-contributions">
                  {participant.contributionCount} contributions
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* Component: Chat Panel */
const ChatPanel = ({ messages, onSendMessage, username }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    onSendMessage(message);
    setMessage('');
  };

  return (
    <div className="chat-panel">
      <h3 className="chat-title">Chat</h3>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="empty-chat">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`chat-message ${msg.username === username ? 'own-message' : ''}`}
            >
              <span className="chat-username">{msg.username}:</span>
              <span className="chat-text">{msg.text}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
          maxLength="200"
        />
        <button type="submit" className="chat-send-button">
          Send
        </button>
      </form>
    </div>
  );
};

/* Component: Room Info */
const RoomInfo = ({ room, isOwner }) => {
  return (
    <div className="room-info">
      <div className="room-info-item">
        <span className="room-info-label">Room:</span>
        <span className="room-info-value">{room.name}</span>
      </div>
      <div className="room-info-item">
        <span className="room-info-label">Code:</span>
        <span className="room-info-value room-code-display">{room.roomCode}</span>
      </div>
      <div className="room-info-item">
        <span className="room-info-label">Privacy:</span>
        <span className="room-info-value">
          {room.hasPassword ? '🔒 Private' : '🌐 Public'}
        </span>
      </div>
      {isOwner && (
        <div className="room-info-badge">
          You're the owner
        </div>
      )}
    </div>
  );
};

/* Main Room Component */
const Room = () => {
  const [room, setRoom] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  
  // Drawing state
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);

  const socketRef = useRef(null);
  const roomCode = window.location.pathname.split('/').pop();

  useEffect(() => {
    loadRoomData();
    
    // Get username from account
    helper.sendGet('/account').then((result) => {
      if (result.account) {
        setUsername(result.account.username);
      }
    });

    // Initialize socket after getting username
    setTimeout(() => {
      initializeSocket();
    }, 500);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-room', { roomCode });
        socketRef.current.disconnect();
      }
    };
  }, []);

  const loadRoomData = async () => {
    const result = await helper.sendGet(`/rooms/${roomCode}`);
    
    if (result.room) {
      setRoom(result.room);
      setIsOwner(result.isOwner);
      
      // Update page title and header
      document.title = `${result.room.name} - CoCanvas`;
      const roomNameEl = document.getElementById('roomName');
      const roomCodeEl = document.getElementById('roomCode');
      if (roomNameEl) roomNameEl.textContent = result.room.name;
      if (roomCodeEl) roomCodeEl.textContent = result.room.roomCode;

      // Join the room if not already in it
      if (!result.isParticipant) {
        const joinResult = await helper.sendPost(`/rooms/${roomCode}/join`, {});
        if (joinResult.room) {
          // Successfully joined, now load participants
          loadParticipants();
        }
      } else {
        // Already in room, load participants
        loadParticipants();
      }
    }
    
    setLoading(false);
  };

  const loadParticipants = async () => {
    try {
      const result = await helper.sendGet(`/api/rooms/${roomCode}/participants`);
      if (result.participants) {
        setParticipants(result.participants);
      }
    } catch (err) {
      console.log('Could not load participants:', err);
      // Don't show error to user - participants will just be empty
      setParticipants([]);
    }
  };

  const initializeSocket = () => {
    // Initialize Socket.IO connection
    socketRef.current = io();
    
    socketRef.current.on('connect', () => {
      console.log('Connected to Socket.IO');
      setConnected(true);
      
      // Join the room
      socketRef.current.emit('join-room', { 
        roomCode,
        username: username || 'User'
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from Socket.IO');
      setConnected(false);
    });

    socketRef.current.on('room-joined', (data) => {
      console.log('Successfully joined room:', data.roomCode);
    });

    socketRef.current.on('participant-joined', (data) => {
      console.log(`${data.username} joined the room`);
      loadParticipants();
      setMessages(prev => [...prev, {
        username: 'System',
        text: `${data.username} joined the room`,
        isSystem: true
      }]);
    });

    socketRef.current.on('participant-left', (data) => {
      console.log(`${data.username} left the room`);
      loadParticipants();
      setMessages(prev => [...prev, {
        username: 'System',
        text: `${data.username} left the room`,
        isSystem: true
      }]);
    });

    socketRef.current.on('participants-update', (data) => {
      console.log('Participants updated:', data.participants);
    });

    socketRef.current.on('chat-message', (data) => {
      setMessages(prev => [...prev, {
        username: data.username,
        text: data.text,
        timestamp: data.timestamp
      }]);
    });

    socketRef.current.on('room-error', (data) => {
      helper.handleError(data.error);
    });
  };

  const handleClearCanvas = () => {
    if (confirm('Are you sure you want to clear the canvas? This cannot be undone.')) {
      if (socketRef.current) {
        socketRef.current.emit('clear-canvas', { roomCode });
      }
    }
  };

  const handleSendMessage = (text) => {
    if (socketRef.current) {
      socketRef.current.emit('chat-message', {
        roomCode,
        text,
      });
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading room...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="error-container">
        <h2>Room not found</h2>
        <p>This room doesn't exist or you don't have access to it.</p>
        <a href="/dashboard" className="btn btn-primary">Back to Dashboard</a>
      </div>
    );
  }

  return (
    <div className="room-container">
      <div className="room-sidebar">
        <RoomInfo room={room} isOwner={isOwner} />
        <ParticipantsList participants={participants} />
        <ChatPanel 
          messages={messages} 
          onSendMessage={handleSendMessage}
          username={username}
        />
      </div>

      <div className="room-workspace">
        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          lineWidth={lineWidth}
          setLineWidth={setLineWidth}
          onClear={handleClearCanvas}
        />
        
        <div className="canvas-container">
          <Canvas
            tool={tool}
            color={color}
            lineWidth={lineWidth}
            socketRef={socketRef}
            roomCode={roomCode}
          />
        </div>

        {!connected && socketRef.current && (
          <div className="connection-warning">
            ⚠️ Disconnected from server. Trying to reconnect...
          </div>
        )}
      </div>
    </div>
  );
};

/* Initialize the room */
const init = () => {
  const root = createRoot(document.getElementById('app'));
  root.render(<Room />);
};

window.onload = init;