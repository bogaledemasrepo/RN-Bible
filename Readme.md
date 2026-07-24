# EOTC 81-Book Bible App

A high-performance, fully offline mobile application for the **Ethiopian Orthodox Tewahedo Church (EOTC) 81-Book Canon**, featuring a realistic, custom 3D page-curl reading interface powered by React Native, Skia, and GLSL shaders.

---

## Features

* **3D Skia Page Curl Engine**: Realistic, gesture-driven 3D page-peel animations running at 60+ FPS via `@shopify/react-native-skia` and custom GLSL shaders.
* **Dynamic Fidel Text Auto-Pagination**: Custom pagination engine tailored for Amharic Ge'ez (Fidel) script metrics to break long chapter text smoothly across screen dimensions.
* **Bidirectional Page Navigation**: Full interactive drag-and-flip support for both forward and backward reading modes.
* **Offline-First Storage**: Embedded SQLite database (`expo-sqlite`) containing the full 81-book EOTC canon for fast, instant offline access.
* **Modular & Scalable**: Clean architecture decoupling gesture math, GLSL runtime effects, dynamic view snapshotting, and database access.

---

## Tech Stack

* **Framework**: React Native / Expo
* **Graphics & Shaders**: `@shopify/react-native-skia` (GLSL Shaders)
* **Gestures & Animations**: `react-native-gesture-handler` & `react-native-reanimated`
* **Database**: `expo-sqlite`
* **Navigation**: `@react-navigation/native-stack`

---

## Getting Started

### Prerequisites

* Node.js (v18 or higher)
* npm or bun
* Expo Go or iOS / Android native development setup

### Installation

1. **Clone the repository:**

   ```bash
   git clone [https://github.com/bogaledemasrepo/RN-Bible.git](https://github.com/bogaledemasrepo/RN-Bible.git)
   cd RN-Bible

