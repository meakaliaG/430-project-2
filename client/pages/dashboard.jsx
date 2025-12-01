const helper = require('../utils/helper.js');
const React = require('react');
const { useState, useEffect } = React;
const { createRoot } = require('react-dom/client');

/* Component: User Stats Card */
const StatsCard = ({ stats }) => {
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <h3 className="stat-value">{stats.roomsCreated || 0}</h3>
        <p className="stat-label">Rooms Created</p>
      </div>
    </div>
  );
};

/* Component: Subscription Panel */
const SubscriptionPanel = ({ account, onUpgrade }) => {
  const [loading, setLoading] = useState(false);

  const tierInfo = {
    free: { name: 'Free', color: '#6B7280', price: '$0' },
    pro: { name: 'Pro', color: '#10B981', price: '$1.99' },
    enterprise: { name: 'Enterprise', color: '#4F46E5', price: '$4.99' },
  };

  const currentTier = tierInfo[account.subscriptionTier] || tierInfo.free;
  const limits = account.limits || {};

  const handleUpgrade = async (tier) => {
    if (loading) return;
    setLoading(true);

    const result = await helper.sendPost('/upgrade', { tier });
    if (result.account) {
      onUpgrade(result.account);
    }
    setLoading(false);
  };

  return (
    <div className="subscription-panel">
      <div className="subscription-header">
        <h2>Subscription</h2>
        <span className="current-tier" style={{ backgroundColor: currentTier.color }}>
          {currentTier.name}
        </span>
      </div>
      
      <div className="subscription-limits">
        <div className="limit-item">
          <span className="limit-label">Rooms:</span>
          <span className="limit-value">
            {account.roomsCreated} / {limits.maxRooms === -1 ? '∞' : limits.maxRooms}
          </span>
        </div>
        <div className="limit-item">
          <span className="limit-label">Max Participants:</span>
          <span className="limit-value">
            {limits.maxParticipants === -1 ? '∞' : limits.maxParticipants}
          </span>
        </div>
      </div>

      {account.subscriptionTier !== 'enterprise' && (
        <div className="upgrade-section">
          <h3>Upgrade Your Plan</h3>
          <div className="tier-options">
            {account.subscriptionTier === 'free' && (
              <>
                <button 
                  className="tier-button tier-pro"
                  onClick={() => handleUpgrade('pro')}
                  disabled={loading}
                >
                  Upgrade to Pro - $1.99/mo
                </button>
                <button 
                  className="tier-button tier-enterprise"
                  onClick={() => handleUpgrade('enterprise')}
                  disabled={loading}
                >
                  Upgrade to Enterprise - $4.99/mo
                </button>
              </>
            )}
            {account.subscriptionTier === 'pro' && (
              <button 
                className="tier-button tier-enterprise"
                onClick={() => handleUpgrade('enterprise')}
                disabled={loading}
              >
                Upgrade to Enterprise - $4.99/mo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* Component: Create Room Form */
const CreateRoomForm = ({ onRoomCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      helper.handleError('Room name is required.');
      return;
    }

    setLoading(true);
    const result = await helper.sendPost('/rooms/create', {
      name,
      description,
      isPublic,
      password: password || null,
    });

    if (result.room) {
      setName('');
      setDescription('');
      setPassword('');
      setIsPublic(true);
      onRoomCreated(result.room);
    }
    setLoading(false);
  };

  return (
    <form className="create-room-form" onSubmit={handleSubmit}>
      <h2>Create New Room</h2>
      
      <div className="form-group">
        <label htmlFor="roomName">Room Name</label>
        <input
          id="roomName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Tardis"
          maxLength="50"
        />
      </div>

      <div className="form-group">
        <label htmlFor="roomDescription">Description (Optional)</label>
        <textarea
          id="roomDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this room for?"
          maxLength="200"
          rows="3"
        />
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span>Public Room (visible to all users)</span>
        </label>
      </div>

      {!isPublic && (
        <div className="form-group">
          <label htmlFor="roomPassword">Room Password</label>
          <input
            id="roomPassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set a password for private room"
          />
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Creating...' : 'Create Room'}
      </button>
    </form>
  );
};

/* Component: Room List Item */
const RoomListItem = ({ room, isOwnRoom }) => {
  const participantText = `${room.currentParticipantCount} / ${room.maxParticipants}`;
  const isFull = room.currentParticipantCount >= room.maxParticipants;

  return (
    <div className="room-item">
      <div className="room-item-header">
        <h3 className="room-item-name">{room.name}</h3>
        <span className="room-code">{room.roomCode}</span>
      </div>
      
      {room.description && (
        <p className="room-item-description">{room.description}</p>
      )}

      <div className="room-item-meta">
        <span className="room-meta-item">
          {room.hasPassword ? 'Private' : 'Public'}
        </span>
        <span className="room-meta-item">
            {participantText}
        </span>
        {isOwnRoom && (
          <span className="room-meta-badge">Your Room</span>
        )}
      </div>

      <div className="room-item-actions">
        <a href={`/room/${room.roomCode}`} className="btn btn-primary">
          {isFull ? 'View (Full)' : 'Join Room'}
        </a>
      </div>
    </div>
  );
};

/* Component: My Rooms List */
const MyRoomsList = ({ rooms, onRefresh }) => {
  if (rooms.length === 0) {
    return (
      <div className="empty-state">
        <p>You haven't created any rooms yet.</p>
        <p>Create your first room to get started!</p>
      </div>
    );
  }

  return (
    <div className="rooms-grid">
      {rooms.map((room) => (
        <RoomListItem key={room._id} room={room} isOwnRoom={true} />
      ))}
    </div>
  );
};

/* Component: Public Rooms List */
const PublicRoomsList = ({ rooms }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRooms, setFilteredRooms] = useState(rooms);

  useEffect(() => {
    setFilteredRooms(rooms);
  }, [rooms]);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    if (!term) {
      setFilteredRooms(rooms);
      return;
    }

    const filtered = rooms.filter((room) => 
      room.name.toLowerCase().includes(term) || 
      room.roomCode.toLowerCase().includes(term) ||
      (room.ownerUsername && room.ownerUsername.toLowerCase().includes(term))
    );
    setFilteredRooms(filtered);
  };

  return (
    <div className="public-rooms-section">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search rooms by name, code, or owner..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {filteredRooms.length === 0 ? (
        <div className="empty-state">
          <p>{searchTerm ? 'No rooms found matching your search.' : 'No public rooms available.'}</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {filteredRooms.map((room) => (
            <RoomListItem key={room._id} room={room} isOwnRoom={false} />
          ))}
        </div>
      )}
    </div>
  );
};

/* Main Dashboard Component */
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('myRooms');
  const [myRooms, setMyRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);

    // Load account info
    const accountResult = await helper.sendGet('/account');
    if (accountResult.account) {
      setAccount(accountResult.account);
    }

    // Load user stats
    const statsResult = await helper.sendGet('/api/stats');
    if (statsResult.stats) {
      setStats(statsResult.stats);
    }

    // Load my rooms
    const myRoomsResult = await helper.sendGet('/api/rooms/my');
    if (myRoomsResult.rooms) {
      setMyRooms(myRoomsResult.rooms);
    }

    // Load public rooms
    const publicRoomsResult = await helper.sendGet('/api/rooms/public');
    if (publicRoomsResult.rooms) {
      setPublicRooms(publicRoomsResult.rooms);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoomCreated = (room) => {
    setMyRooms([room, ...myRooms]);
    loadData(); // Refresh to update account limits
  };

  const handleUpgrade = (updatedAccount) => {
    setAccount(updatedAccount);
    helper.handleSuccess('Subscription upgraded successfully!');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <CreateRoomForm onRoomCreated={handleRoomCreated} />
        {account && (
          <SubscriptionPanel 
            account={account} 
            onUpgrade={handleUpgrade}
          />
        )}
      </div>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Welcome back, {account?.username}!</h1>
          <p className="welcome-subtitle">Get to real-time doodling with your round up!</p>
        </div>

        <StatsCard stats={stats} />

        <div className="tabs-container">
          <div className="tabs-header">
            <button
              className={`tab-button ${activeTab === 'myRooms' ? 'active' : ''}`}
              onClick={() => setActiveTab('myRooms')}
            >
              My Rooms ({myRooms.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'publicRooms' ? 'active' : ''}`}
              onClick={() => setActiveTab('publicRooms')}
            >
              Public Rooms ({publicRooms.length})
            </button>
          </div>

          <div className="tabs-content">
            {activeTab === 'myRooms' && (
              <MyRoomsList rooms={myRooms} onRefresh={loadData} />
            )}
            {activeTab === 'publicRooms' && (
              <PublicRoomsList rooms={publicRooms} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* Initialize the dashboard */
const init = () => {
  const root = createRoot(document.getElementById('app'));
  root.render(<Dashboard />);
};

window.onload = init;