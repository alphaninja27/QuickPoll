'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL, WS_URL } from './api';

// TypeScript interfaces
interface PollOption {
  id: number;
  option_text: string;
  votes: number;
}

interface Poll {
  id: number;
  title: string;
  created_at: string;
  likes: number;
  options: PollOption[];
}

export default function Home() {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [message, setMessage] = useState('');
  const [votedPolls, setVotedPolls] = useState<Set<number>>(new Set());
  const [likedPolls, setLikedPolls] = useState<Set<number>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch polls function
  const fetchPolls = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/polls/`);
      const data = await response.json();
      setPolls(data);
    } catch (err) {
      console.error('Error fetching polls:', err);
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    const loadPolls = async () => {
      await fetchPolls();
    };
    loadPolls();

    // Connect to WebSocket
    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'poll_created') {
        // Add new poll to the list
        setPolls((prevPolls) => [data.poll, ...prevPolls]);
      } else if (data.type === 'vote_updated') {
        // Update vote count for specific option
        setPolls((prevPolls) =>
          prevPolls.map((poll) => {
            if (poll.id === data.poll_id) {
              return {
                ...poll,
                options: poll.options.map((opt) =>
                  opt.id === data.option_id
                    ? { ...opt, votes: data.votes }
                    : opt
                ),
              };
            }
            return poll;
          })
        );
      } else if (data.type === 'like_updated') {
        // Update like count for specific poll
        setPolls((prevPolls) =>
          prevPolls.map((poll) =>
            poll.id === data.poll_id
              ? { ...poll, likes: data.likes }
              : poll
          )
        );
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [fetchPolls]);

  const addOption = () => {
    setOptions([...options, '']);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const createPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validOptions = options.filter(opt => opt.trim() !== '');
    
    if (!title.trim() || validOptions.length < 2) {
      setMessage('Please provide a title and at least 2 options');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/polls/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          options: validOptions,
        }),
      });

      if (response.ok) {
        setMessage('Poll created successfully!');
        setTitle('');
        setOptions(['', '']);
      } else {
        setMessage('Error creating poll');
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      setMessage('Error connecting to server');
    }
  };

  const handleVote = async (pollId: number, optionId: number) => {
    try {
      const response = await fetch(
        `${API_URL}/polls/${pollId}/vote/${optionId}`,
        { method: 'POST' }
      );

      if (response.ok) {
        setVotedPolls(new Set(votedPolls).add(pollId));
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleLike = async (pollId: number) => {
    try {
      const response = await fetch(
        `${API_URL}/polls/${pollId}/like`,
        { method: 'POST' }
      );

      if (response.ok) {
        setLikedPolls(new Set(likedPolls).add(pollId));
      }
    } catch (err) {
      console.error('Error liking poll:', err);
    }
  };

  const getTotalVotes = (poll: Poll) => {
    return poll.options.reduce((sum: number, opt: PollOption) => sum + opt.votes, 0);
  };

  const getVotePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with connection status */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-indigo-900">
            QuickPoll ⚡
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Create Poll Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create a Poll</h2>
          
          <form onSubmit={createPoll} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poll Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your question?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addOption}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-500 transition"
            >
              + Add Option
            </button>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Create Poll
            </button>
          </form>

          {message && (
            <p className="mt-4 text-center text-sm font-medium text-indigo-600">
              {message}
            </p>
          )}
        </div>

        {/* Display Polls */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">Active Polls</h2>
          
          {polls.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
              No polls yet. Create one above!
            </div>
          ) : (
            polls.map((poll: Poll) => {
              const totalVotes = getTotalVotes(poll);
              const hasVoted = votedPolls.has(poll.id);
              const hasLiked = likedPolls.has(poll.id);

              return (
                <div key={poll.id} className="bg-white rounded-lg shadow-lg p-6 transition-all hover:shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 flex-1">
                      {poll.title}
                    </h3>
                    
                    {/* Like Button */}
                    <button
                      onClick={() => handleLike(poll.id)}
                      disabled={hasLiked}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        hasLiked
                          ? 'bg-red-100 text-red-600 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 hover:scale-105'
                      }`}
                    >
                      <span className={`text-xl ${hasLiked ? 'animate-bounce' : ''}`}>
                        {hasLiked ? '❤️' : '🤍'}
                      </span>
                      <span className="font-semibold">{poll.likes}</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {poll.options.map((option: PollOption) => {
                      const percentage = getVotePercentage(option.votes, totalVotes);
                      
                      return (
                        <div key={option.id}>
                          <button
                            onClick={() => handleVote(poll.id, option.id)}
                            disabled={hasVoted}
                            className={`w-full text-left p-4 rounded-lg border-2 transition relative overflow-hidden ${
                              hasVoted
                                ? 'border-gray-300 cursor-not-allowed'
                                : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer'
                            }`}
                          >
                            {/* Progress bar background */}
                            {hasVoted && (
                              <div
                                className="absolute inset-0 bg-indigo-100 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            )}
                            
                            {/* Content */}
                            <div className="relative flex justify-between items-center">
                              <span className="font-medium text-gray-800">
                                {option.option_text}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">
                                  {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                                </span>
                                {hasVoted && (
                                  <span className="font-semibold text-indigo-600">
                                    {percentage}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
                    <span>Total votes: {totalVotes}</span>
                    <span className="text-xs">
                      Created {new Date(poll.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
