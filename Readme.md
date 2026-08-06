# EOTC 81-Book Bible App

A high-performance, Fully offline mobile application for the **Ethiopian Orthodox Tewahedo Church (EOTC) 81-Book Canon**, featuring a realistic, custom 3D page-curl reading interface powered by React Native, Skia, and GLSL shaders.

---

## Features

- **3D Skia Page Curl Engine**: Realistic, gesture-driven 3D page-peel animations running at 60+ FPS via `@shopify/react-native-skia` and custom GLSL shaders.
- **Dynamic Fidel Text Auto-Pagination**: Custom pagination engine tailored for Amharic Ge'ez (Fidel) script metrics to break long chapter text smoothly across screen dimensions.
- **Bidirectional Page Navigation**: Full interactive drag-and-flip support for both forward and backward reading modes.
- **Fully Offline Storage**: Embedded SQLite database (`expo-sqlite`) containing the full 81-book EOTC canon for fast, instant offline access.
- **Modular & Scalable**: Clean architecture decoupling gesture math, GLSL runtime effects, dynamic view snapshotting, and database access.

---

## Tech Stack

- **Framework**: React Native / Expo
- **Graphics & Shaders**: `@shopify/react-native-skia` (GLSL Shaders)
- **Gestures & Animations**: `react-native-gesture-handler` & `react-native-reanimated`
- **Database**: `expo-sqlite`
- **Navigation**: `@react-navigation/native-stack`

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun
- Expo Go or iOS / Android native development setup

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/eotc-81-bible-app.git
   cd eotc-81-bible-app
   ```

2. **Install dependencies:**

   ```bash
   npx expo install
   ```

3. **Start the development server:**

   ```bash
   npx expo start -c
   ```

---

## Architecture Overview

```text
├── assets/                  # Fonts, images, and static resources
├── components/              # UI Components
│   ├── custom-drawer-content.tsx # Navigation drawer component
│   └── page.tsx             # Skia Canvas 3D page curl renderer
├── constants/
│   └── index.ts             # App-wide constants & configurations
├── hooks/
│   └── use-sqlite-context.tsx # SQLite context provider & database access
├── lib/                     # Helper libraries & core logic
│   ├── hadle-gusture.ts     # Gesture calculation engine for page flips
│   ├── paginateText.ts      # Fidel script pagination logic
│   └── services.ts          # External / database query services
├── screens/
│   └── PageScreen.tsx       # Main auto-paginated reader view screen
├── types/                   # TypeScript interfaces & type definitions
├── .gitignore
├── app.json                 # Expo configuration file
├── App.tsx                  # Application entry point & navigator setup
├── bun.lock                 # Bun lockfile
├── index.ts                 # Main registry file
├── metro.config.js          # Metro bundler configuration
├── package.json             # Project dependencies and scripts
├── Readme.md
└── tsconfig.json            # TypeScript compiler configuration

```

---

## License

This project is licensed under the MIT License.
