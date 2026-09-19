import asyncHandler from '../utils/asyncHandler.js';
import axios from 'axios';

/**
 * Call the existing AI service through
 * the /api/ai/chat endpoint internally.
 *
 * This keeps the Phase 8 /api/gemini endpoints
 * provider-independent.
 */
const callAI = async (message, authorization) => {
  const baseUrl =
    process.env.INTERNAL_API_URL ||
    `http://localhost:${process.env.PORT || 5000}`;

  const response = await axios.post(
    `${baseUrl}/api/ai/chat`,
    { message },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      timeout: 30000,
    }
  );

  return response.data?.data?.response || "";
};

/**
 * POST /api/gemini/explain
 *
 * Explain Markdown/code/content.
 */
export const explainContent = asyncHandler(
  async (req, res) => {
    const {
      content,
      type = 'markdown'
    } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const prompt = `
Explain the following ${type} content in simple,
clear language.

Content:

${content}

Provide:

1. What it means
2. Important points
3. Key concepts
4. Practical explanation

Keep the response concise and useful.
`;

    const result = await callAI(
      prompt,
      req.headers.authorization
    );

    res.status(200).json({
      success: true,
      data: {
        response: result,
      },
    });
  });

/**
 * POST /api/gemini/docs
 *
 * Generate documentation from content.
 */
export const generateDocs = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      message: "Content is required",
    });
  }

  const prompt = `
Generate clear Markdown documentation for the following content.

Use these sections:

# Overview
# Purpose
# How It Works
# Important Components
# Usage

Keep the documentation practical and easy to understand.

Content:

${content}
`;

  const result = await callAI(
    prompt,
    req.headers.authorization
  );

  res.status(200).json({
    success: true,
    data: {
      response: result,
    },
  });
});

/**
 * POST /api/gemini/readme
 *
 * Generate README content.
 */
export const generateReadme = asyncHandler(
  async (req, res) => {
    const {
      projectName,
      description,
      technologies,
      features
    } = req.body;

    if (!projectName || !description) {
      return res.status(400).json({
        success: false,
        message:
          'Project name and description are required'
      });
    }

    const prompt = `
Create a professional GitHub README.md.

Project Name:
${projectName}

Description:
${description}

Technologies:
${technologies || 'Not specified'}

Features:
${features || 'Not specified'}

Include:

# Project Name

## Description

## Features

## Tech Stack

## Installation

## Usage

## Future Improvements

Use clean Markdown.
`;

    const result = await callAI(
      prompt,
      req.headers.authorization
    );
    res.status(200).json({
      success: true,
      message: 'README generated successfully',
      data: {
        readme
      }
    });
  }
);
