# 99draft

An experimenter into making a text editor. 

## Overview

The architecture is split into three distinct layers:

### 📦 Project Structure

This is a **monorepo** containing three main packages:

#### **`@99draft/editor-core`** - Core Editor Engine

The framework-agnostic editor engine that handles all text editing logic. While it depends on the Canvas API for rendering, it's otherwise independent of UI frameworks. This package includes:

- Piece table data structure for efficient text manipulation
- Cursor and selection management
- Text parsing and formatting
- Document rendering (DOCX, PDF, Canvas)

#### **`@99draft/editor-react`** - React Component Library

React components that provide a complete UI for the editor, styled with Tailwind CSS. This layer wraps the core engine with a modern, responsive interface including:

- Page and paragraph components
- Debug panel for development
- Ruler
- Export handlers and hooks

#### **`apps/desktop`** - Electron Desktop Application

A cross-platform desktop application that consumes the React library

---

## 🚧 Project Status

**This project is currently under active development and is incomplete.**

---

## 📄 License

This project is licensed under the [Creative Commons Attribution-Non Commercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/).

**What this means:**

- ✅ You can use, modify, and share this project
- ✅ You must give appropriate credit
- ✅ Any derivative works must use the same license
- ❌ You cannot use this project for commercial purposes
