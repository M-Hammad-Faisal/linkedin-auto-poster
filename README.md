# 🚀 LinkedIn Auto Poster

An automated content scheduling and immediate publishing tool for LinkedIn, built using Node.js, TypeScript, and
Playwright.

This project follows professional software development practices, utilizing a modular, class-based architecture, Git
hooks, and GitHub Actions for continuous quality control.

---

## ✨ Features

* **Headless & Headed Modes:** Easily switch between background execution and visible browser mode.
* **Robust Authentication:** Uses environment variables for secure login credentials.
* **Advanced Scheduling:** Supports precise scheduling of posts with intelligent validation (checks for past
  dates/times, automatically adjusts if needed).
* **External Content Loading:** Reads post content from a separate external file (e.g., `.md` or `.txt`) for easy
  content management.
* **Reliable Submission:** Implements robust retry logic for submitting posts, ensuring maximum success rates against
  transient network errors.
* **Professional Tooling:** Integrated with **ESLint** (Flat Config), **Prettier**, **Husky** (Git Hooks), and **GitHub
  Actions** for high-quality, maintainable code.

---

## 📂 Project Structure

The code is organized into a clean, reusable, and modular class structure:

```text
linkedin-auto-poster/
├── .github/              # GitHub Actions Workflow
├── src/
│   ├── config/           # Configuration files (Selectors, Types)
│   ├── utils/            # Reusable utilities (File reading, Time validation)
│   ├── linkedInPoster.ts # The core automation class (Logic encapsulation)
│   └── index.ts          # Main entry point (Configuration loading, Class instantiation)
├── .env                  # Local Environment Variables
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🛠️ Project Setup

### Prerequisites

* Node.js (v18 or higher recommended)
* npm (or yarn/pnpm)
* Git

### 1. Installation

```bash
# Clone the repository
git clone [YOUR_REPO_URL]
cd linkedin-auto-poster

# Install Node dependencies
npm install

# Install Playwright browser dependencies
npx playwright install --with-deps
```

### 2. Configure Environment Variables

Create a file named `.env` in the root directory and populate it based on the `env.example` file.

- `.env` Example:

```dotenv
# --- AUTHENTICATION ---
LINKEDIN_USERNAME=your_email@example.com
LINKEDIN_PASSWORD=your_secure_password

# --- SCHEDULING ---
# Set to true to schedule, false to post immediately
SCHEDULE_POST=true
SCHEDULE_DATE=12/31/2026
SCHEDULE_TIME="04:30 PM"

# --- CONTENT CONFIGURATION ---
# Path to the file containing your post content (e.g., ./content/post_001.txt)
POST_FILE_PATH=./content/post_001.txt
```

### 3. Create Content File

Ensure the file specified by `POST_FILE_PATH` exists.

- Example: `content/post_001.txt`

```markdown
This is the content for my automated post! 🤖
It will be loaded and published directly to LinkedIn.

#Automation #TypeScript #Playwright
```

## 🚀 Usage

**Starting the Poster**

The project uses `tsx` to execute the TypeScript code directly without a pre-compilation step for easy local
development.

```bash
npm run start
```

**Building for Production**

To compile the TypeScript source into clean JavaScript in the dist/ directory, run the `build` script. This command also
runs all quality checks (lint and prettier) first.

```bash
npm run build
```
