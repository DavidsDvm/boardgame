# Board Game Adventure

A modern, interactive 2-player board game built with React, featuring:

- **Animated 4x4 (desktop) or 3x3 (mobile) board**
- **Real-time chat with emoji shortcuts**
- **Player-to-player trading system**
- **Interactive onboarding tutorial**
- **Responsive design for desktop and mobile**
- **Framer Motion animations and beautiful UI**

---

## 🎮 How to Play

### Objective

- Be the first to reach the last square on the board **or** win if your opponent runs out of money.
- Each player starts with **$100**. Each game costs **$25** to play.

### Gameplay

1. **Roll the Dice**
   - Desktop: Click the "Roll Dice" button.
   - Mobile: Swipe up on the board or tap "Roll".
   - Move your piece forward by the dice value (1-6 desktop, 1-4 mobile).

2. **Collect Money**
   - Some squares have bonus money. Land on them to collect!

3. **Trading**
   - Click the "Trade" button on your opponent's panel to offer money.
   - You can send a message with your offer.
   - The other player can accept or decline on their turn.

4. **Chat**
   - Use the chat panel to communicate.
   - Type emoji shortcuts like `(dice)`, `(win)`, `(money)`, `(party)` for fun icons.

5. **Winning**
   - Reach the last square to win $20 bonus!
   - If a player can't pay the $25 entry fee for a rematch, the other wins the tournament.

---

## ✨ Features

- **Animated Board & Pieces:** Smooth transitions and effects.
- **Money Squares:** Random bonus squares each game.
- **Trading System:** Send/receive money offers with messages.
- **Chat System:** Emoji shortcuts, quick emoji panel, and full-screen chat on mobile.
- **Interactive Tutorial:** Step-by-step onboarding with highlights and arrows.
- **Responsive Design:** Optimized for both desktop and mobile.
- **Rematch & Restart:** Play again or restart from scratch.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- yarn

### Installation

```bash
yarn install
```

### Running the App

```bash
yarn dev
```

- Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📝 Emoji Shortcuts

Type these in chat for fun icons:

| Shortcut      | Emoji | Shortcut      | Emoji |
|---------------|-------|--------------|-------|
| (dice)        | 🎲    | (win)        | 🏆    |
| (trade)       | 🤝    | (money)      | 💰    |
| (sad)         | 😢    | (happy)      | 😊    |
| (fire)        | 🔥    | (heart)      | ❤️    |
| (laugh)       | 😂    | (cool)       | 😎    |
| (think)       | 🤔    | (wow)        | 😮    |
| (party)       | 🎉    | (rocket)     | 🚀    |
| (star)        | ⭐    | (thumbs)     | 👍    |
| (clap)        | 👏    | (boom)       | 💥    |
| (sparkle)     | ✨    | (gem)        | 💎    |

---

## 🛠️ Tech Stack

- **React** (TypeScript)
- **Framer Motion** (animations)
- **React Icons**
- **Vite** (build tool)

---

## 📚 Code Structure

- `src/App.tsx` – Main app logic and all components
- `src/assets/` – Images and SVGs
- `public/` – Static files

---

## �� License

MIT

---
