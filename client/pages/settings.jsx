const helper = require('../utils/helper.js');
const React = require('react');
const { useState } = React;
const { createRoot } = require('react-dom/client');

/* 
* Component: Password Change Form 
*/
const PasswordChangeForm = () => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    helper.hideError();

    if (!currentPass || !newPass || !newPass2) {
      helper.handleError('All fields are required.');
      return;
    }

    if (newPass !== newPass2) {
      helper.handleError('New passwords do not match.');
      return;
    }

    if (newPass.length < 4) {
      helper.handleError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    const result = await helper.sendPost('/change-password', {
      currentPass,
      newPass,
      newPass2,
    });

    if (result.message) {
      setCurrentPass('');
      setNewPass('');
      setNewPass2('');
    }
    
    setLoading(false);
  };

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Change Password</h3>
        <p className="form-description">
          Enter your current password and choose a new one.
        </p>

        <div className="form-group">
          <label htmlFor="currentPass">Current Password</label>
          <input
            id="currentPass"
            type="password"
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            placeholder="Enter current password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="newPass">New Password</label>
          <input
            id="newPass"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Enter new password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="newPass2">Confirm New Password</label>
          <input
            id="newPass2"
            type="password"
            value={newPass2}
            onChange={(e) => setNewPass2(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </div>
    </form>
  );
};

/* 
* Component: Account Info Display 
*/
const AccountInfo = ({ account }) => {
  const tierColors = {
    free: '#6B7280',
    pro: '#10B981',
    enterprise: '#4F46E5',
  };

  return (
    <div className="account-info-section">
      <h3>Account Information</h3>
      
      <div className="info-grid">
        <div className="info-item">
          <span className="info-label">Username: </span>
          <span className="info-value">{account.username}</span>
        </div>
        
        <div className="info-item">
          <span className="info-label">Email: </span>
          <span className="info-value">{account.email}</span>
        </div>
        
        <div className="info-item">
          <span className="info-label">Subscription: </span>
          <span 
            className="info-value tier-badge"
            style={{ backgroundColor: tierColors[account.subscriptionTier] }}
          >
            {account.subscriptionTier.charAt(0).toUpperCase() + account.subscriptionTier.slice(1)}
          </span>
        </div>
        
        <div className="info-item">
          <span className="info-label">Member Since: </span>
          <span className="info-value">
            {new Date(account.createdDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

/* 
* Main Settings Component 
*/
const Settings = () => {
  const [account, setAccount] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    const result = await helper.sendGet('/account');
    if (result.account) {
      setAccount(result.account);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-content">
      {account && <AccountInfo account={account} />}
      <PasswordChangeForm />
    </div>
  );
};

/* 
* Initialize the settings page 
*/
const init = () => {
  const root = createRoot(document.getElementById('app'));
  root.render(<Settings />);
};

window.onload = init;