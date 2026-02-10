import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Sprint from '../models/Sprint.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * AI Service to interact with AI API (OpenAI or Gemini)
 */
class AIService {
  constructor() {
    // Lazy load the API key when first method is called
    this.initialized = false;
  }
  
  init() {
    if (!this.initialized) {
      this.provider = process.env.AI_PROVIDER || 'gemini'; // Default to Gemini
      
      if (this.provider === 'gemini') {
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        if (!this.geminiApiKey) {
          console.error('⚠️ GEMINI_API_KEY is not configured in environment variables');
        } else {
          this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
            // Allow overriding the model via env var if a different model is preferred.
            // Default to a currently supported model identifier. Avoid hardcoding an
            // unsupported name like 'gemini-pro' which may not exist for the
            // library/api version in use.
            // Default to a supported Gemini model; can be overridden with GEMINI_MODEL
            this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
            // Create a GenerativeModel instance for the chosen model name
            try {
              this.model = this.genAI.getGenerativeModel({ model: this.modelName });
              console.log('✅ Gemini API Key loaded successfully');
              console.log('ℹ️ Using Gemini model:', this.modelName);
            } catch (e) {
              console.error('Failed to create GenerativeModel:', e.message || e);
            }
        }
      } else {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
        
        if (!this.apiKey) {
          console.error('⚠️ OPENAI_API_KEY is not configured in environment variables');
        } else {
          console.log('✅ OpenAI API Key loaded successfully');
        }
      }
      
      this.initialized = true;
    }
  }

  async generateCompletion(prompt, systemMessage = 'You are a helpful project management assistant.') {
    this.init(); // Initialize on first use
    
    if (this.provider === 'gemini') {
      return this.generateGeminiCompletion(prompt, systemMessage);
    } else {
      return this.generateOpenAICompletion(prompt, systemMessage);
    }
  }
  
  async generateGeminiCompletion(prompt, systemMessage) {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.');
    }
    
    try {
      const fullPrompt = `${systemMessage}\n\n${prompt}`;
        // Use the GenerativeModel instance created during init()
        if (!this.model) {
          throw new Error('Generative model not initialized. Check GEMINI_MODEL and GEMINI_API_KEY.');
        }
        // Pass the prompt string directly (SDK will wrap it as contents)
        const result = await this.model.generateContent(fullPrompt);
        const response = result?.response;
        // If SDK provides a helper to extract text, use it
        if (response && typeof response.text === 'function') {
          return response.text();
        }
        // Otherwise, try to extract from candidates
        if (response && Array.isArray(response.candidates) && response.candidates[0]) {
          const candidate = response.candidates[0];
          const text = candidate?.content?.text || (Array.isArray(candidate?.content?.parts) ? candidate.content.parts.map(p => p.text || '').join('') : candidate?.text) || JSON.stringify(candidate);
          return typeof text === 'string' ? text : JSON.stringify(text);
        }
        // Last resort: return stringified response
        return JSON.stringify(result);
    } catch (error) {
      console.error('Gemini API Error:', error);
      console.error('Error details:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }
  
  async generateOpenAICompletion(prompt, systemMessage) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.');
    }
    
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('AI API Error:', error.response?.data || error.message);
      throw new Error('Failed to get AI response. Please check API configuration.');
    }
  }
}

const aiService = new AIService();

/**
 * @desc    Generate tasks from project description
 * @route   POST /api/ai/generate-tasks
 * @access  Private (Project Manager only)
 */
export const generateTasks = asyncHandler(async (req, res) => {
  const { projectDescription, projectId } = req.body;

  if (!projectDescription) {
    return res.status(400).json({
      success: false,
      message: 'Project description is required'
    });
  }

  const prompt = `Based on the following project description, generate a list of 5-10 actionable tasks with titles, descriptions, and suggested priorities (Low/Medium/High).

Project Description: ${projectDescription}

Format the response as a JSON array with the following structure:
[
  {
    "title": "Task title",
    "description": "Detailed task description",
    "priority": "Medium"
  }
]

Only return the JSON array, no additional text.`;

  const systemMessage = 'You are an expert project manager who creates detailed, actionable tasks. Always respond with valid JSON only.';

  try {
    const aiResponse = await aiService.generateCompletion(prompt, systemMessage);
    
    // Parse the AI response
    let tasks;
    try {
      tasks = JSON.parse(aiResponse);
    } catch (parseError) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    res.status(200).json({
      success: true,
      message: 'Tasks generated successfully',
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate tasks',
      data: []
    });
  }
});

/**
 * @desc    Suggest task priorities
 * @route   POST /api/ai/suggest-priority
 * @access  Private
 */
export const suggestPriority = asyncHandler(async (req, res) => {
  const { taskTitle, taskDescription, dueDate } = req.body;

  const prompt = `Analyze the following task and suggest an appropriate priority level (Low, Medium, or High) with a brief explanation.

Task Title: ${taskTitle}
Description: ${taskDescription}
Due Date: ${dueDate}

Respond in JSON format:
{
  "priority": "Medium",
  "reasoning": "Brief explanation of why this priority was chosen"
}`;

  try {
    const aiResponse = await aiService.generateCompletion(prompt);
    const suggestion = JSON.parse(aiResponse.match(/\{[\s\S]*\}/)[0]);

    res.status(200).json({
      success: true,
      data: suggestion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to suggest priority',
      data: { priority: 'Medium', reasoning: 'Default priority assigned' }
    });
  }
});

/**
 * @desc    Generate sprint plan
 * @route   POST /api/ai/generate-sprint-plan
 * @access  Private (Project Manager only)
 */
export const generateSprintPlan = asyncHandler(async (req, res) => {
  const { projectId, sprintDuration, teamSize } = req.body;

  // Get project tasks
  const tasks = await Task.find({ project: projectId, isActive: true, sprint: null })
    .select('title description priority')
    .limit(20);

  if (tasks.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No unassigned tasks found for this project'
    });
  }

  const tasksList = tasks.map((t, i) => 
    `${i + 1}. ${t.title} (Priority: ${t.priority})`
  ).join('\n');

  const prompt = `Create a sprint plan for a team of ${teamSize} people with a ${sprintDuration}-day sprint.

Available Tasks:
${tasksList}

Provide:
1. A sprint goal
2. Recommended tasks for the sprint (select based on priority and capacity)
3. Suggested task distribution

Respond in JSON format:
{
  "sprintGoal": "Clear, achievable sprint goal",
  "recommendedTasks": ["Task 1", "Task 3", "Task 5"],
  "taskDistribution": "Brief suggestion on how to distribute tasks"
}`;

  try {
    const aiResponse = await aiService.generateCompletion(prompt);
    const sprintPlan = JSON.parse(aiResponse.match(/\{[\s\S]*\}/)[0]);

    res.status(200).json({
      success: true,
      data: sprintPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate sprint plan'
    });
  }
});

/**
 * @desc    Summarize project progress
 * @route   GET /api/ai/project-summary/:projectId
 * @access  Private
 */
export const getProjectSummary = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Get project details
  const project = await Project.findById(projectId)
    .populate('members.user', 'name');

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Get task statistics
  const totalTasks = await Task.countDocuments({ project: projectId, isActive: true });
  const completedTasks = await Task.countDocuments({ 
    project: projectId, 
    isActive: true, 
    status: 'Done' 
  });
  const delayedTasks = await Task.countDocuments({
    project: projectId,
    isActive: true,
    status: { $ne: 'Done' },
    dueDate: { $lt: new Date() }
  });

  const prompt = `Provide a concise project summary and recommendations based on the following data:

Project: ${project.name}
Total Tasks: ${totalTasks}
Completed Tasks: ${completedTasks}
Delayed Tasks: ${delayedTasks}
Team Size: ${project.members.length}

Provide:
1. Overall project health (Good/Fair/At Risk)
2. Key insights
3. Recommendations for improvement

Keep it concise (3-4 sentences).`;

  try {
    const aiResponse = await aiService.generateCompletion(prompt);

    res.status(200).json({
      success: true,
      data: {
        summary: aiResponse,
        statistics: {
          totalTasks,
          completedTasks,
          delayedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate project summary'
    });
  }
});

/**
 * @desc    Detect blocked or delayed tasks
 * @route   GET /api/ai/detect-issues/:projectId
 * @access  Private
 */
export const detectIssues = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Get delayed tasks
  const delayedTasks = await Task.find({
    project: projectId,
    isActive: true,
    status: { $ne: 'Done' },
    dueDate: { $lt: new Date() }
  })
    .select('title status dueDate priority')
    .populate('assignedTo', 'name');

  // Get tasks in review for too long
  const tasksInReview = await Task.find({
    project: projectId,
    isActive: true,
    status: 'Review',
    updatedAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // 3 days
  })
    .select('title status updatedAt')
    .populate('assignedTo', 'name');

  const issues = {
    delayedTasks: delayedTasks.map(t => ({
      id: t._id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      assignedTo: t.assignedTo?.name || 'Unassigned'
    })),
    stalledReviews: tasksInReview.map(t => ({
      id: t._id,
      title: t.title,
      daysSinceUpdate: Math.floor((Date.now() - new Date(t.updatedAt)) / (1000 * 60 * 60 * 24)),
      assignedTo: t.assignedTo?.name || 'Unassigned'
    }))
  };

  const prompt = `Analyze the following project issues and provide actionable recommendations:

Delayed Tasks (${delayedTasks.length}):
${delayedTasks.slice(0, 5).map(t => `- ${t.title} (Due: ${t.dueDate.toLocaleDateString()}, Priority: ${t.priority})`).join('\n')}

Stalled Reviews (${tasksInReview.length}):
${tasksInReview.slice(0, 5).map(t => `- ${t.title}`).join('\n')}

Provide 3-4 specific, actionable recommendations to address these issues.`;

  try {
    const aiResponse = await aiService.generateCompletion(prompt);

    res.status(200).json({
      success: true,
      data: {
        issues,
        recommendations: aiResponse
      }
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: {
        issues,
        recommendations: 'Review delayed tasks and reassign if necessary. Follow up on stalled reviews.'
      }
    });
  }
});

/**
 * @desc    General AI chat for project management advice
 * @route   POST /api/ai/chat
 * @access  Private
 */
export const aiChat = asyncHandler(async (req, res) => {
  console.log('📥 AI Chat request received');
  console.log('Request body:', req.body);
  console.log('User:', req.user?.email);
  
  const { message, context } = req.body;

  if (!message) {
    console.log('❌ No message provided');
    return res.status(400).json({
      success: false,
      message: 'Message is required'
    });
  }

  // Enhanced system message for better AI responses
  const systemMessage = `You are an expert Project Management Assistant with deep knowledge of:
- Agile and Scrum methodologies
- Task breakdown and estimation
- Sprint planning and execution
- Team collaboration and communication
- Project analytics and metrics
- Risk management and mitigation
- Resource allocation and workload balancing

Provide clear, actionable advice that helps users:
- Plan and organize their work effectively
- Make data-driven decisions
- Improve team productivity
- Follow project management best practices

Keep responses concise but comprehensive. Use bullet points for clarity when appropriate.`;
  
  // Use context if provided, otherwise just use the message
  const fullPrompt = context || message;

  console.log('🤖 Calling AI service...');
  
  try {
    const aiResponse = await aiService.generateCompletion(fullPrompt, systemMessage);
    console.log('✅ AI response received');

    res.status(200).json({
      success: true,
      data: {
        response: aiResponse
      }
    });
  } catch (error) {
    console.error('❌ AI Chat Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get AI response'
    });
  }
});
