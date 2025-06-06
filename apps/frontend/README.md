# MedLab Chat

A lean, Scout-style chat UI scaffold for medical research conversations, specifically designed for sickle cell disease research workflows.

## Overview

MedLab Chat by Angstrom AI provides a minimal starting point for research-centric chat features with medical literature integration, citation management, and multi-threaded conversations.

## Features

### 🏥 Header & Branding
- Logo and product branding ("MedLab Chat" by Angstrom AI)
- Workspace selector with dropdown to switch between "Global," "Project X," "My Papers"

### 📋 Sidebar (Collapsible)
- **Thread Index**: Active conversation branches (Main, Hb F Induction, VOE Risk, etc.)
- **Quick Actions**:
  - 🔍 New Literature Search
  - 📁 Upload PDF / CSV
  - 🧰 Claims Matrix
- **Recent Alerts**:
  - 🚨 VOE risk warnings
  - 📬 New PubMed hits notifications

### 💬 Main Chat Pane
- **Chat Bubble Stream**: Alternating user and AI messages
- **Inline Citations**: Clickable 📑 [1] citation badges that expand to show source snippets
- **Branch Button**: "Fork this thread as..." option to create new conversation branches

### ✏️ Composer
- **Prompt Bar**: "Ask MedLab Chat..." placeholder
- **Tool Buttons** (left of send):
  - 📎 Attach (PDF, CSV, image)
  - 🔗 Cite (auto-insert PMID/DOI)
  - ⚙️ Mode selector: Research → Create → Analyze → Plan → Learn
- **Send + Tone Dropdown** (right): Default tone with options for "Formal," "Bullet Points," "Lay Summary"

### 📊 Footer Widgets
- **"What's New?" Ticker**: One-sentence summary of new literature or data imports
- **Status Indicators**: Vector-DB sync status and FHIR sandbox connection

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd AngstromSCD

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production  
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API

## Project Structure

```
src/
├── components/
│   ├── chat/           # Chat-related components
│   └── layout/         # Header, Sidebar, Footer
├── context/            # React Context providers
├── data/              # Mock data for development
├── types/             # TypeScript type definitions
└── main.tsx           # Application entry point
```

## Medical Domain Features

This scaffold is specifically designed for sickle cell disease research with:

- **Medical Literature Citations**: PMID/DOI reference handling
- **Research Modes**: Multiple conversation modes for different research tasks
- **Workspace Organization**: Project-based conversation management
- **Clinical Alerts**: VOE risk monitoring and literature updates
- **FHIR Integration**: Ready for clinical data connections

## Development Notes

- Uses mock data for development (`src/data/mockData.ts`)
- All medical terminology and workflows are examples for sickle cell disease research
- Chat state is managed through React Context for easy extension
- Component architecture supports adding research-specific features

## License

[License information]