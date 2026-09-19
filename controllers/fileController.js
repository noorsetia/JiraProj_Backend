import asyncHandler from '../utils/asyncHandler.js';
import { aiService } from './aiController.js';

const ALLOWED_EXTENSIONS = [
  '.js',
  '.jsx',
  '.py',
  '.java',
  '.html',
  '.css',
  '.json'
];

export const explainCodeFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a code file'
    });
  }

  const file = req.file;

  const fileName = file.originalname;
  const extension = fileName
    .substring(fileName.lastIndexOf('.'))
    .toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return res.status(400).json({
      success: false,
      message: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    });
  }

  const code = file.buffer.toString('utf-8');

  if (!code.trim()) {
    return res.status(400).json({
      success: false,
      message: 'The uploaded file is empty'
    });
  }

  const prompt = `
Analyze and explain the following source code.

File name:
${fileName}

Programming language / file type:
${extension}

Code:
\`\`\`
${code}
\`\`\`

Provide the explanation using these sections:

1. Overview
Explain what this code does in simple terms.

2. How It Works
Explain the main flow step by step.

3. Important Components
Explain important functions, classes, variables, or sections.

4. Key Concepts
Mention important programming concepts used.

5. Potential Issues
Mention bugs, risks, or areas that could be improved.

6. Beginner Explanation
Explain the code in simple language suitable for a beginner.

Do not rewrite the complete code.
Focus on understanding the existing code.
`;

  try {
    const explanation = await aiService.generateCompletion(
      prompt,
      `You are an expert software engineer and code mentor.

Your job is to explain source code clearly and accurately.
Do not invent functionality that does not exist in the code.
Use Markdown headings and bullet points where appropriate.`
    );

    return res.status(200).json({
      success: true,
      message: 'Code explained successfully',
      data: {
        fileName,
        extension,
        fileSize: file.size,
        explanation
      }
    });
  } catch (error) {
    console.error('❌ Code explanation error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to explain code'
    });
  }
});