# ⚡ QuickPoll — Real-Time Opinion Polling Platform

**QuickPoll** is a real-time, full-stack polling application where users can create polls, vote, like polls, and view live updates as other users interact — all without needing to refresh the page or log in.

---

## 🚀 Key Features

- 🗳️ **Create Custom Polls** – Add any number of options instantly  
- 🔄 **Real-Time Updates** – Live results appear instantly using WebSockets  
- ❤️ **Like Polls** – Engage with polls through live “like” updates  
- 📊 **Dynamic Poll Visualization** – Vote counts and percentages update automatically  
- 🌍 **No Authentication Required** – Simple, frictionless user experience  
- 📱 **Fully Responsive** – Works smoothly on desktop and mobile  

---

## 🧠 Tech Stack

### **Frontend**
- **Next.js (React + TypeScript)** – For UI rendering and interactivity  
- **Tailwind CSS** – For responsive design and clean styling  
- **WebSocket Client** – Handles live updates in real-time  

### **Backend**
- **FastAPI (Python)** – High-performance API framework  
- **SQLAlchemy + SQLite** – Object-relational mapping and lightweight database  
- **WebSockets via FastAPI** – For broadcasting updates to all connected clients  
- **CORS Middleware** – For secure cross-origin communication between backend and frontend  

### **Hosting**
- **Render** – Deployed as separate services:
  - Backend → FastAPI Web Service  
  - Frontend → Next.js Static Site  

---

## 🏗️ Architecture Overview

- The **Frontend** interacts with the **Backend** through REST APIs for creating, reading, and updating polls.  
- A **WebSocket connection** ensures real-time syncing of new votes and likes across all connected users.  
- Each data update triggers an event on the backend, broadcasting the updated poll data to all active connections.  
- **SQLite** stores polls, options, votes, and like counts efficiently.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| `GET` | `/polls/` | Get all existing polls |
| `POST` | `/polls/` | Create a new poll |
| `POST` | `/polls/{poll_id}/vote/{option_id}` | Vote on an option |
| `POST` | `/polls/{poll_id}/like` | Like a poll |
| `GET` | `/polls/{poll_id}` | Retrieve a single poll |

---

## 🌐 Environment Variables

### **Frontend (`.env.local`)**
