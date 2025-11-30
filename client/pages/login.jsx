const helper = require('../utils/helper.js');
const React = require('react');
const { createRoot } = require('react-dom/client');

/* Handle login form submission */
const handleLogin = (e) => {
  e.preventDefault();
  helper.hideError();

  const username = e.target.querySelector('#user').value;
  const pass = e.target.querySelector('#pass').value;

  if (!username || !pass) {
    helper.handleError('Username or password is empty.');
    return false;
  }

  helper.sendPost(e.target.action, { username, pass });
  return false;
};

/* Handle signup form submission */
const handleSignup = (e) => {
  e.preventDefault();
  helper.hideError();

  const username = e.target.querySelector('#user').value;
  const email = e.target.querySelector('#email').value;
  const pass = e.target.querySelector('#pass').value;
  const pass2 = e.target.querySelector('#pass2').value;

  if (!username || !email || !pass || !pass2) {
    helper.handleError('All fields are required.');
    return false;
  }

  if (pass !== pass2) {
    helper.handleError('Passwords do not match.');
    return false;
  }

  helper.sendPost(e.target.action, { username, email, pass, pass2 });

  return false;
};

/* Login form component */
const LoginWindow = (props) => {
  return (
    <form
      id="loginForm"
      name="loginForm"
      onSubmit={handleLogin}
      action="/login"
      method="POST"
      className="mainForm"
    >
      <label htmlFor="username">Username</label>
      <input
        id="user"
        type="text"
        name="username"
        placeholder="Enter your username"
      />
      <label htmlFor="pass">Password</label>
      <input
        id="pass"
        type="password"
        name="pass"
        placeholder="Enter your password"
      />
      <input className="formSubmit" type="submit" value="Sign In" />
    </form>
  );
};

/* Signup form component */
const SignupWindow = (props) => {
  return (
    <form
      id="signupForm"
      name="signupForm"
      onSubmit={handleSignup}
      action="/signup"
      method="POST"
      className="mainForm"
    >
      <label htmlFor="username">Username</label>
      <input
        id="user"
        type="text"
        name="username"
        placeholder="Choose a username"
      />
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        name="email"
        placeholder="Enter your email"
      />
      <label htmlFor="pass">Password</label>
      <input
        id="pass"
        type="password"
        name="pass"
        placeholder="Choose a password"
      />
      <label htmlFor="pass2">Confirm Password</label>
      <input
        id="pass2"
        type="password"
        name="pass2"
        placeholder="Confirm your password"
      />
      <input className="formSubmit" type="submit" value="Sign Up" />
    </form>
  );
};

/* Initialize the page */
const init = () => {
  const loginButton = document.getElementById('loginButton');
  const signupButton = document.getElementById('signupButton');

  const root = createRoot(document.getElementById('content'));

  loginButton.addEventListener('click', (e) => {
    e.preventDefault();
    root.render(<LoginWindow />);
    return false;
  });

  signupButton.addEventListener('click', (e) => {
    e.preventDefault();
    root.render(<SignupWindow />);
    return false;
  });

  root.render(<LoginWindow />);
};

window.onload = init;