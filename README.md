# Project Management System - Backend

A comprehensive backend API for a Project Management System built with Node.js, Express, MongoDB, and Socket.IO.

## Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (RBAC)
  - Password hashing with bcrypt
  - Two roles: Project Manager and Team Member

- **Project Management**
  - Create, read, update, delete projects
  - Add/remove team members
  - Project statistics and analytics

- **Task Management**
  - CRUD operations for tasks
  - Drag-and-drop support with position tracking
  - Task status: To Do, In Progress, Review, Done
  - Priority levels: Low, Medium, High
  - Comments and attachments support
  - Assign tasks to team members

- **Sprint Management**
  - Create and manage sprints
  - Sprint progress tracking
  - Assign tasks to sprints

- **AI Assistant**
  - Generate tasks from project descriptions
  - Suggest task priorities
  - Generate sprint plans
  - Project progress summaries
  - Detect delayed/blocked tasks
  - AI-powered chat assistant

- **Analytics & Dashboard**
  - Project statistics
  - Team performance metrics
  - Task completion trends
  - Sprint analytics

- **Real-time Updates**
  - Socket.IO integration
  - Live task updates
  - Project collaboration features

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT + bcrypt
- **Real-time:** Socket.IO
- **Validation:** express-validator
- **AI Integration:** OpenAI API (or compatible)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and update the following:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/project_management
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   AI_API_KEY=your_openai_api_key
   AI_API_URL=https://api.openai.com/v1/chat/completions
   FRONTEND_URL=http://localhost:5173
   ```

3. **Start MongoDB:**
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

4. **Run the server:**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updateprofile` - Update user profile
- `PUT /api/auth/updatepassword` - Update password
- `GET /api/auth/users` - Get all users (PM only)

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project (PM only)
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id` - Update project (PM only)
- `DELETE /api/projects/:id` - Delete project (PM only)
- `POST /api/projects/:id/members` - Add member (PM only)
- `DELETE /api/projects/:id/members/:userId` - Remove member (PM only)
- `GET /api/projects/:id/stats` - Get project statistics

### Tasks
- `GET /api/tasks/my-tasks` - Get tasks assigned to me
- `GET /api/tasks/project/:projectId` - Get all tasks for project
- `POST /api/tasks/project/:projectId` - Create task (PM only)
- `GET /api/tasks/:id` - Get single task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task (PM only)
- `PATCH /api/tasks/:id/status` - Update task status
- `POST /api/tasks/:id/comments` - Add comment
- `PATCH /api/tasks/bulk-update-positions` - Bulk update positions

### Sprints
- `GET /api/sprints/project/:projectId` - Get all sprints for project
- `POST /api/sprints/project/:projectId` - Create sprint (PM only)
- `GET /api/sprints/:id` - Get single sprint
- `PUT /api/sprints/:id` - Update sprint (PM only)
- `DELETE /api/sprints/:id` - Delete sprint (PM only)
- `GET /api/sprints/:id/stats` - Get sprint statistics
- `GET /api/sprints/:id/tasks` - Get sprint tasks

### AI Assistant
- `POST /api/ai/generate-tasks` - Generate tasks from description (PM only)
- `POST /api/ai/suggest-priority` - Suggest task priority
- `POST /api/ai/generate-sprint-plan` - Generate sprint plan (PM only)
- `GET /api/ai/project-summary/:projectId` - Get AI project summary
- `GET /api/ai/detect-issues/:projectId` - Detect project issues
- `POST /api/ai/chat` - AI chat assistant

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/project/:projectId` - Get project analytics
- `GET /api/analytics/team-performance/:projectId` - Get team performance (PM only)

## Database Models

### User
- name, email, password, role, avatar, isActive

### Project
- name, description, createdBy, members, status, startDate, endDate

### Task
- title, description, project, sprint, status, priority, assignedTo, createdBy, dueDate, comments, position

### Sprint
- name, description, project, startDate, endDate, goal, status, createdBy

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Role-Based Access Control

- **Project Manager:**
  - Full CRUD on projects, tasks, sprints
  - Can add/remove team members
  - Access to all AI features
  - View team performance

- **Team Member:**
  - View assigned projects
  - Update task status
  - Add comments
  - Limited AI features

## Socket.IO Events

### Client -> Server
- `join-project` - Join project room
- `leave-project` - Leave project room

### Server -> Client
- `task-updated` - Task was created/updated/deleted
- `project-updated` - Project was updated
- `notification-{userId}` - User-specific notifications

## Error Handling

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

## Project Structure

```
backend/
├── config/
│   ├── database.js       # MongoDB connection
│   └── socket.js         # Socket.IO configuration
├── controllers/
│   ├── authController.js
│   ├── projectController.js
│   ├── taskController.js
│   ├── sprintController.js
│   ├── aiController.js
│   └── analyticsController.js
├── middleware/
│   ├── auth.js           # Authentication & authorization
│   ├── errorHandler.js   # Global error handler
│   └── validate.js       # Request validation
├── models/
│   ├── User.js
│   ├── Project.js
│   ├── Task.js
│   └── Sprint.js
├── routes/
│   ├── authRoutes.js
│   ├── projectRoutes.js
│   ├── taskRoutes.js
│   ├── sprintRoutes.js
│   ├── aiRoutes.js
│   └── analyticsRoutes.js
├── utils/
│   ├── auth.js           # Auth utilities
│   └── asyncHandler.js   # Async error wrapper
├── .env.example
├── .gitignore
├── package.json
└── server.js             # Entry point
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with nodemon)
npm run dev

# Run in production mode
npm start
```

## Testing API

Use tools like:
- Postman
- Thunder Client
- Insomnia
- cURL

Example registration:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "Project Manager"
  }'
```

## License

MIT
