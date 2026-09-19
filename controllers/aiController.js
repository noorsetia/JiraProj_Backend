import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Sprint from '../models/Sprint.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * AI Service to interact with AI APIs
 * Supported providers:
 * - Gemini
 * - Groq
 * - OpenAI
 */
class AIService {
  constructor() {
    // Lazy load API configuration when first method is called
    this.initialized = false;
  }

  /**
   * Initialize AI provider configuration
   */
  init() {
    if (this.initialized) {
      return;
    }

    this.provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

    console.log(`🤖 AI Provider: ${this.provider}`);

    // ============================================
    // GEMINI
    // ============================================
    if (this.provider === 'gemini') {
      this.geminiApiKey = process.env.GEMINI_API_KEY;

      if (!this.geminiApiKey) {
        console.error(
          '⚠️ GEMINI_API_KEY is not configured in environment variables'
        );
      } else {
        try {
          this.genAI = new GoogleGenerativeAI(this.geminiApiKey);

          this.modelName =
            process.env.GEMINI_MODEL || 'gemini-2.5-flash';

          this.model = this.genAI.getGenerativeModel({
            model: this.modelName
          });

          console.log('✅ Gemini API Key loaded successfully');
          console.log('ℹ️ Using Gemini model:', this.modelName);
        } catch (error) {
          console.error(
            '❌ Failed to initialize Gemini:',
            error.message || error
          );
        }
      }
    }

    // ============================================
    // GROQ
    // ============================================
    else if (this.provider === 'groq') {
      this.groqApiKey = process.env.GROQ_API_KEY;

      this.groqApiUrl =
        process.env.GROQ_API_URL ||
        'https://api.groq.com/openai/v1/chat/completions';

      this.groqModel =
        process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

      if (!this.groqApiKey) {
        console.error(
          '⚠️ GROQ_API_KEY is not configured in environment variables'
        );
      } else {
        console.log('✅ Groq API Key loaded successfully');
        console.log('ℹ️ Using Groq model:', this.groqModel);
      }
    }

    // ============================================
    // OPENAI
    // ============================================
    else if (this.provider === 'openai') {
      this.apiKey = process.env.OPENAI_API_KEY;

      this.apiUrl =
        process.env.OPENAI_API_URL ||
        'https://api.openai.com/v1/chat/completions';

      this.openaiModel =
        process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

      if (!this.apiKey) {
        console.error(
          '⚠️ OPENAI_API_KEY is not configured in environment variables'
        );
      } else {
        console.log('✅ OpenAI API Key loaded successfully');
        console.log('ℹ️ Using OpenAI model:', this.openaiModel);
      }
    }

    // ============================================
    // UNSUPPORTED PROVIDER
    // ============================================
    else {
      console.error(
        `❌ Unsupported AI provider: ${this.provider}`
      );

      console.error(
        'Supported providers: gemini, groq, openai'
      );
    }

    this.initialized = true;
  }

  /**
   * Generate AI completion using configured provider
   */
  async generateCompletion(
    prompt,
    systemMessage = 'You are a helpful project management assistant.'
  ) {
    this.init();

    // Gemini
    if (this.provider === 'gemini') {
      return this.generateGeminiCompletion(
        prompt,
        systemMessage
      );
    }

    // Groq
    if (this.provider === 'groq') {
      return this.generateGroqCompletion(
        prompt,
        systemMessage
      );
    }

    // OpenAI
    if (this.provider === 'openai') {
      return this.generateOpenAICompletion(
        prompt,
        systemMessage
      );
    }

    throw new Error(
      `Unsupported AI provider: ${this.provider}. ` +
      `Use gemini, groq, or openai.`
    );
  }

  /**
   * ============================================
   * GEMINI COMPLETION
   * ============================================
   */
  async generateGeminiCompletion(prompt, systemMessage) {
    if (!this.geminiApiKey) {
      throw new Error(
        'Gemini API key is not configured. ' +
        'Please set GEMINI_API_KEY in your environment variables.'
      );
    }

    try {
      const fullPrompt = `${systemMessage}\n\n${prompt}`;

      if (!this.model) {
        throw new Error(
          'Generative model not initialized. ' +
          'Check GEMINI_MODEL and GEMINI_API_KEY.'
        );
      }

      console.log('🤖 Calling Gemini API...');

      const result = await this.model.generateContent(
        fullPrompt
      );

      const response = result?.response;

      if (
        response &&
        typeof response.text === 'function'
      ) {
        return response.text();
      }

      if (
        response &&
        Array.isArray(response.candidates) &&
        response.candidates[0]
      ) {
        const candidate = response.candidates[0];

        const text =
          candidate?.content?.text ||
          (
            Array.isArray(candidate?.content?.parts)
              ? candidate.content.parts
                  .map((part) => part.text || '')
                  .join('')
              : candidate?.text
          ) ||
          JSON.stringify(candidate);

        return typeof text === 'string'
          ? text
          : JSON.stringify(text);
      }

      return JSON.stringify(result);
    } catch (error) {
      console.error(
        '❌ Gemini API Error:',
        error.message || error
      );

      if (error.response) {
        console.error(
          'Gemini Response:',
          error.response.data
        );
      }

      throw new Error(
        `Gemini API Error: ${error.message}`
      );
    }
  }

  /**
   * ============================================
   * GROQ COMPLETION
   * ============================================
   *
   * Groq provides an OpenAI-compatible API.
   */
  async generateGroqCompletion(prompt, systemMessage) {
    if (!this.groqApiKey) {
      throw new Error(
        'Groq API key is not configured. ' +
        'Please set GROQ_API_KEY in your environment variables.'
      );
    }

    try {
      console.log('🤖 Calling Groq API...');
      console.log('ℹ️ Groq model:', this.groqModel);

      const response = await axios.post(
        this.groqApiUrl,
        {
          model: this.groqModel,

          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            {
              role: 'user',
              content: prompt
            }
          ],

          temperature: 0.7,

          max_tokens: 1500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.groqApiKey}`
          },

          timeout: 30000
        }
      );

      const aiResponse =
        response?.data?.choices?.[0]?.message?.content;

      if (!aiResponse) {
        throw new Error(
          'Groq returned an empty response.'
        );
      }

      console.log('✅ Groq response received');

      return aiResponse;
    } catch (error) {
      console.error(
        '❌ Groq API Error:',
        error.response?.data || error.message
      );

      const groqMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message;

      throw new Error(
        `Groq API Error: ${groqMessage}`
      );
    }
  }

  /**
   * ============================================
   * OPENAI COMPLETION
   * ============================================
   */
  async generateOpenAICompletion(prompt, systemMessage) {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI API key is not configured. ' +
        'Please set OPENAI_API_KEY in your environment variables.'
      );
    }

    try {
      console.log('🤖 Calling OpenAI API...');
      console.log(
        'ℹ️ OpenAI model:',
        this.openaiModel
      );

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.openaiModel,

          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            {
              role: 'user',
              content: prompt
            }
          ],

          temperature: 0.7,

          max_tokens: 1500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`
          },

          timeout: 30000
        }
      );

      const aiResponse =
        response?.data?.choices?.[0]?.message?.content;

      if (!aiResponse) {
        throw new Error(
          'OpenAI returned an empty response.'
        );
      }

      console.log('✅ OpenAI response received');

      return aiResponse;
    } catch (error) {
      console.error(
        '❌ OpenAI API Error:',
        error.response?.data || error.message
      );

      throw new Error(
        error.response?.data?.error?.message ||
        'Failed to get AI response. Please check OpenAI configuration.'
      );
    }
  }
}

export const aiService = new AIService();

/**
 * ============================================
 * GENERATE TASKS
 * ============================================
 *
 * @desc    Generate tasks from project description
 * @route   POST /api/ai/generate-tasks
 * @access  Private (Project Manager only)
 */
export const generateTasks = asyncHandler(
  async (req, res) => {
    const {
      projectDescription,
      projectId
    } = req.body;

    if (!projectDescription) {
      return res.status(400).json({
        success: false,
        message: 'Project description is required'
      });
    }

    const prompt = `
Based on the following project description, generate
a list of 5-10 actionable tasks with titles,
descriptions, and suggested priorities
(Low/Medium/High).

Project Description:
${projectDescription}

Format the response as a JSON array with the
following structure:

[
  {
    "title": "Task title",
    "description": "Detailed task description",
    "priority": "Medium"
  }
]

Only return the JSON array, no additional text.
`;

    const systemMessage =
      'You are an expert project manager who creates ' +
      'detailed, actionable tasks. Always respond with valid JSON only.';

    try {
      const aiResponse =
        await aiService.generateCompletion(
          prompt,
          systemMessage
        );

      let tasks;

      try {
        tasks = JSON.parse(aiResponse);
      } catch (parseError) {
        const jsonMatch =
          aiResponse.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          tasks = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(
            'Invalid JSON response from AI'
          );
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
        message:
          error.message ||
          'Failed to generate tasks',
        data: []
      });
    }
  }
);

/**
 * ============================================
 * SUGGEST PRIORITY
 * ============================================
 *
 * @desc    Suggest task priorities
 * @route   POST /api/ai/suggest-priority
 * @access  Private
 */
export const suggestPriority = asyncHandler(
  async (req, res) => {
    const {
      taskTitle,
      taskDescription,
      dueDate
    } = req.body;

    const prompt = `
Analyze the following task and suggest an
appropriate priority level (Low, Medium, or High)
with a brief explanation.

Task Title:
${taskTitle}

Description:
${taskDescription}

Due Date:
${dueDate}

Respond in JSON format:

{
  "priority": "Medium",
  "reasoning": "Brief explanation of why this priority was chosen"
}
`;

    try {
      const aiResponse =
        await aiService.generateCompletion(
          prompt
        );

      const jsonMatch =
        aiResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error(
          'Invalid JSON response from AI'
        );
      }

      const suggestion =
        JSON.parse(jsonMatch[0]);

      res.status(200).json({
        success: true,
        data: suggestion
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to suggest priority',
        data: {
          priority: 'Medium',
          reasoning: 'Default priority assigned'
        }
      });
    }
  }
);

/**
 * ============================================
 * GENERATE SPRINT PLAN
 * ============================================
 *
 * @desc    Generate sprint plan
 * @route   POST /api/ai/generate-sprint-plan
 * @access  Private (Project Manager only)
 */
export const generateSprintPlan = asyncHandler(
  async (req, res) => {
    const {
      projectId,
      sprintDuration,
      teamSize
    } = req.body;

    const tasks = await Task.find({
      project: projectId,
      isActive: true,
      sprint: null
    })
      .select('title description priority')
      .limit(20);

    if (tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'No unassigned tasks found for this project'
      });
    }

    const tasksList = tasks
      .map(
        (task, index) =>
          `${index + 1}. ${task.title} ` +
          `(Priority: ${task.priority})`
      )
      .join('\n');

    const prompt = `
Create a sprint plan for a team of ${teamSize}
people with a ${sprintDuration}-day sprint.

Available Tasks:
${tasksList}

Provide:

1. A sprint goal
2. Recommended tasks for the sprint
   (select based on priority and capacity)
3. Suggested task distribution

Respond in JSON format:

{
  "sprintGoal": "Clear, achievable sprint goal",
  "recommendedTasks": ["Task 1", "Task 3", "Task 5"],
  "taskDistribution": "Brief suggestion on how to distribute tasks"
}
`;

    try {
      const aiResponse =
        await aiService.generateCompletion(
          prompt
        );

      const jsonMatch =
        aiResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error(
          'Invalid JSON response from AI'
        );
      }

      const sprintPlan =
        JSON.parse(jsonMatch[0]);

      res.status(200).json({
        success: true,
        data: sprintPlan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message ||
          'Failed to generate sprint plan'
      });
    }
  }
);

/**
 * ============================================
 * PROJECT SUMMARY
 * ============================================
 *
 * @desc    Summarize project progress
 * @route   GET /api/ai/project-summary/:projectId
 * @access  Private
 */
export const getProjectSummary = asyncHandler(
  async (req, res) => {
    const { projectId } = req.params;

    const project =
      await Project.findById(projectId)
        .populate('members.user', 'name');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const totalTasks =
      await Task.countDocuments({
        project: projectId,
        isActive: true
      });

    const completedTasks =
      await Task.countDocuments({
        project: projectId,
        isActive: true,
        status: 'Done'
      });

    const delayedTasks =
      await Task.countDocuments({
        project: projectId,
        isActive: true,
        status: { $ne: 'Done' },
        dueDate: { $lt: new Date() }
      });

    const prompt = `
Provide a concise project summary and
recommendations based on the following data:

Project:
${project.name}

Total Tasks:
${totalTasks}

Completed Tasks:
${completedTasks}

Delayed Tasks:
${delayedTasks}

Team Size:
${project.members.length}

Provide:

1. Overall project health
   (Good/Fair/At Risk)
2. Key insights
3. Recommendations for improvement

Keep it concise (3-4 sentences).
`;

    try {
      const aiResponse =
        await aiService.generateCompletion(
          prompt
        );

      res.status(200).json({
        success: true,
        data: {
          summary: aiResponse,

          statistics: {
            totalTasks,
            completedTasks,
            delayedTasks,

            completionRate:
              totalTasks > 0
                ? Math.round(
                    (completedTasks /
                      totalTasks) *
                      100
                  )
                : 0
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message ||
          'Failed to generate project summary'
      });
    }
  }
);

/**
 * ============================================
 * DETECT ISSUES
 * ============================================
 *
 * @desc    Detect blocked or delayed tasks
 * @route   GET /api/ai/detect-issues/:projectId
 * @access  Private
 */
export const detectIssues = asyncHandler(
  async (req, res) => {
    const { projectId } = req.params;

    // Get delayed tasks
    const delayedTasks =
      await Task.find({
        project: projectId,
        isActive: true,
        status: { $ne: 'Done' },
        dueDate: { $lt: new Date() }
      })
        .select(
          'title status dueDate priority'
        )
        .populate(
          'assignedTo',
          'name'
        );

    // Get tasks in review for too long
    const tasksInReview =
      await Task.find({
        project: projectId,
        isActive: true,
        status: 'Review',
        updatedAt: {
          $lt: new Date(
            Date.now() -
              3 * 24 * 60 * 60 * 1000
          )
        }
      })
        .select(
          'title status updatedAt'
        )
        .populate(
          'assignedTo',
          'name'
        );

    const issues = {
      delayedTasks:
        delayedTasks.map((task) => ({
          id: task._id,
          title: task.title,
          dueDate: task.dueDate,
          priority: task.priority,
          assignedTo:
            task.assignedTo?.name ||
            'Unassigned'
        })),

      stalledReviews:
        tasksInReview.map((task) => ({
          id: task._id,
          title: task.title,

          daysSinceUpdate:
            Math.floor(
              (
                Date.now() -
                new Date(task.updatedAt)
              ) /
                (1000 * 60 * 60 * 24)
            ),

          assignedTo:
            task.assignedTo?.name ||
            'Unassigned'
        }))
    };

    const prompt = `
Analyze the following project issues and provide
actionable recommendations:

Delayed Tasks (${delayedTasks.length}):

${delayedTasks
  .slice(0, 5)
  .map(
    (task) =>
      `- ${task.title} ` +
      `(Due: ${task.dueDate.toLocaleDateString()}, ` +
      `Priority: ${task.priority})`
  )
  .join('\n')}

Stalled Reviews (${tasksInReview.length}):

${tasksInReview
  .slice(0, 5)
  .map(
    (task) =>
      `- ${task.title}`
  )
  .join('\n')}

Provide 3-4 specific, actionable
recommendations to address these issues.
`;

    try {
      const aiResponse =
        await aiService.generateCompletion(
          prompt
        );

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

          recommendations:
            'Review delayed tasks and reassign if necessary. ' +
            'Follow up on stalled reviews.'
        }
      });
    }
  }
);

/**
 * ============================================
 * GENERAL AI CHAT
 * ============================================
 *
 * @desc    General AI chat for project management advice
 * @route   POST /api/ai/chat
 * @access  Private
 */
export const aiChat = asyncHandler(
  async (req, res) => {
    console.log(
      '📥 AI Chat request received'
    );

    console.log(
      'Request body:',
      req.body
    );

    console.log(
      'User:',
      req.user?.email
    );

    const {
      message,
      context
    } = req.body;

    if (!message) {
      console.log(
        '❌ No message provided'
      );

      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const systemMessage = `
You are an expert Project Management Assistant
with deep knowledge of:

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

Keep responses concise but comprehensive.
Use bullet points for clarity when appropriate.
`;

    const fullPrompt =
      context
        ? `${message}\n\nAdditional Context:\n${context}`
        : message;

    console.log(
      '🤖 Calling AI service...'
    );

    try {
      const aiResponse =
        await aiService.generateCompletion(
          fullPrompt,
          systemMessage
        );

      console.log(
        '✅ AI response received'
      );

      res.status(200).json({
        success: true,
        data: {
          response: aiResponse
        }
      });
    } catch (error) {
      console.error(
        '❌ AI Chat Error:',
        error
      );

      console.error(
        'Error stack:',
        error.stack
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          'Failed to get AI response'
      });
    }
  }
);