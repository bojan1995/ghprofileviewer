import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FaGithub, FaArrowLeft } from 'react-icons/fa';
import { Puff } from 'react-loader-spinner';
import './App.css';

const App = () => {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userList, setUserList] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [displayProfile, setDisplayProfile] = useState(false);
  const [repositories, setRepositories] = useState([]);

  const handleSearch = useCallback(async (searchUsername) => {
    try {
      if (searchUsername.trim().length === 0) {
        setError('Please enter a GitHub username.');
        return;
      }

      setLoading(true);
      setError('');

      const [userResponse, repositoriesResponse] = await Promise.all([
        axios.get(`https://api.github.com/users/${searchUsername}`),
        axios.get(`https://api.github.com/users/${searchUsername}/repos`),
      ]);

      setUser(userResponse.data);
      setLocation(userResponse.data.location);
      setBio(userResponse.data.bio);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      setUsername(''); // Clear the username input
      setDisplayProfile(true); // Show the profile information
      setRepositories(repositoriesResponse.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setUser(null);
        setLocation('');
        setBio('');
        setError('The user does not exist!');
      } else {
        setError('An error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBack = () => {
    setDisplayProfile(false); // Hide the profile information
    setUsername(''); // Clear the username input
  };

  const handleInputChange = useCallback(
    (e) => {
      const { value } = e.target;
      setUsername(value);
      if (value.length >= 1) {
        setLoading(true);
        setShowSuggestions(false);
        setSelectedIndex(-1);

        axios
          .get(`https://api.github.com/search/users?q=${value}&per_page=10`)
          .then((response) => {
            setUserList(response.data.items);
            setShowSuggestions(true);
            setLoading(false);
          })
          .catch((error) => {
            console.error('Error fetching user list:', error);
            setLoading(false);
          });
      } else {
        setUserList([]);
        setShowSuggestions(false);
        setLoading(false);
      }
    },
    []
  );

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        if (showSuggestions && selectedIndex !== -1) {
          const selectedUsername = userList[selectedIndex].login;
          setUsername(selectedUsername);
          setShowSuggestions(false);
          handleSearch(selectedUsername);
        } else {
          handleSearch(username);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : userList.length - 1
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prevIndex) =>
          prevIndex < userList.length - 1 ? prevIndex + 1 : 0
        );
      }
    },
    [handleSearch, selectedIndex, showSuggestions, userList, username]
  );

  const handleUserClick = (selectedUsername) => {
    setUsername(selectedUsername);
    setShowSuggestions(false);
    handleSearch(selectedUsername);
  };

  const fetchUserDetails = useCallback(async () => {
    if (user) {
      try {
        setLoading(true);
        setError('');

        const response = await axios.get(`https://api.github.com/users/${user.login}`);

        setUser((prevUser) => ({
          ...prevUser,
          followers: response.data.followers,
          link: response.data.blog,
          twitter: response.data.twitter_username,
          email: response.data.email,
          verified: response.data.verified,
        }));
      } catch (error) {
        setError('An error occurred while fetching user details. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [user]);

  return (
    <div className="container">
      <h1 className="title">GitHub Profile Viewer</h1>
      {!displayProfile && (
        <div className="search-container">
          <div className="input-container">
            <input
              type="text"
              className="search-input"
              placeholder="Enter a GitHub username"
              value={username}
              onChange={handleInputChange}
            />
            {loading && username.length >= 1 && (
              <div className="loader-container">
                <Puff color="#999" height={50} width={50} />
              </div>
            )}
          </div>
          <button className="search-button" onClick={() => handleSearch(username)} disabled={loading}>
            Search
          </button>
        </div>
      )}
      {showSuggestions && (
        <ul className="suggestions-list">
          {userList.length > 0 ? (
            userList.map((user, index) => (
              <li
                key={user.id}
                className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleUserClick(user.login)}
              >
                <img
                  className="suggestion-profile-picture"
                  src={user.avatar_url}
                  alt="Profile"
                />
                <span className="suggestion-username">{user.login}</span>
              </li>
            ))
          ) : (
            <li className="no-results">No users found</li>
          )}
        </ul>
      )}
      {error && <p className="error-message">{error}</p>}
      {displayProfile && user && (
        <div className="user-details">
          <button className="back-button" onClick={handleBack}>
            <FaArrowLeft className="back-icon" />
          </button>
          <img className="profile-image" src={user.avatar_url} alt="Profile" />
          <h2 className="user-name">{user.name}</h2>
          <p className="user-location">{location}</p>
          <p className="user-bio">{bio}</p>
          {user.followers && (
            <p className="user-followers">
              <span className="label">Followers:</span> {user.followers}
            </p>
          )}
          {user.link && (
            <p className="user-link">
              <span className="label">Website:</span>{' '}
              <a href={user.link} target="_blank" rel="noopener noreferrer">
                {user.link}
              </a>
            </p>
          )}
          {user.twitter && (
            <p className="user-twitter">
              <span className="label">Twitter:</span>{' '}
              <a href={`https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer">
                {user.twitter}
              </a>
            </p>
          )}
          {user.email && (
            <p className="user-email">
              <span className="label">Email:</span> {user.email}
            </p>
          )}
          {user.verified && (
            <p className="user-verified">
              <span className="label">Verified:</span> {user.verified.toString()}
            </p>
          )}
          <h3 className="repositories-title">Repositories:</h3>
          {repositories.length > 0 ? (
            <ul className="repositories-list">
              {repositories.map((repo) => (
                <li key={repo.id} className="repository-item">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {repo.name} <FaGithub className="github-icon" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-repositories">No repositories found.</p>
          )}
        </div>
      )}
      <footer className="footer">
        <p>
          Powered by <FaGithub className="heart" /> GitHub API
        </p>
        <p>
          Developed by Bojan
        </p>
      </footer>
    </div>
  );
};

export default App;
