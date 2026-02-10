# Complete Setup Guide - THM System Frontend

## 📋 Prerequisites

Before starting, make sure you have:
- **Node.js** version 18 or higher ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- A code editor (VS Code recommended)
- Your backend running on `http://localhost:5000`

To check if Node.js is installed:
```bash
node --version
npm --version
```

---

## 🚀 Step-by-Step Setup

### Step 1: Navigate to the Project

```bash
cd thm-frontend
```

### Step 2: Install All Dependencies

This will install React, Vite, Tailwind CSS, and all other required packages:

```bash
npm install
```

**What gets installed:**
- ✅ React & React DOM
- ✅ Vite (build tool)
- ✅ Tailwind CSS
- ✅ PostCSS & Autoprefixer
- ✅ React Router DOM
- ✅ Axios

**Installation should take 1-2 minutes.**

### Step 3: Verify Tailwind CSS Setup

Your Tailwind CSS is already configured! Here's what's already set up:

#### ✅ 1. Tailwind Config (`tailwind.config.js`)
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          // Blue color scale for your app
        }
      }
    },
  },
  plugins: [],
}
```

#### ✅ 2. PostCSS Config (`postcss.config.js`)
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

#### ✅ 3. CSS File (`src/index.css`)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom component classes are already defined */
```

#### ✅ 4. Imported in main.jsx
```javascript
import './index.css'  // This loads Tailwind
```

**Everything is already wired up! No additional configuration needed.**

### Step 4: Start the Development Server

```bash
npm run dev
```

You should see:
```
  VITE v6.0.5  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 5: Open in Browser

Open your browser and go to:
```
http://localhost:3000
```

You should see the **Login page** with beautiful Tailwind styling! 🎉

---

## 🔧 Troubleshooting

### Issue 1: "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org/

### Issue 2: Port 3000 is already in use
**Solution:** The error will show an alternative port (like 3001). Use that, or stop the process using port 3000:
```bash
# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# On Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Issue 3: Tailwind styles not appearing
**Solution:** 
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Issue 4: "Cannot connect to backend"
**Solution:** Make sure your backend is running:
```bash
# In your backend directory
node index.js
# or
npm start
```

The backend should be running on `http://localhost:5000`

### Issue 5: CORS errors
**Solution:** Add CORS to your backend (`index.js`):
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000'
}));
```

---

## 🎨 Verifying Tailwind CSS is Working

### Test 1: Check the Login Page
The login page should have:
- ✅ Gradient background (blue/purple)
- ✅ Rounded white card
- ✅ Blue buttons
- ✅ Styled inputs with borders

### Test 2: Inspect Element
Right-click any element → Inspect → You should see Tailwind classes like:
- `bg-primary-600`
- `rounded-lg`
- `shadow-xl`
- `hover:bg-primary-700`

### Test 3: Check the Browser Console
Press F12 → Console tab → Should have NO errors about CSS or Tailwind

---

## 📁 Project File Structure

After `npm install`, your structure will be:

```
thm-frontend/
├── node_modules/           ← Created after npm install (DO NOT EDIT)
├── src/
│   ├── components/
│   ├── contexts/
│   ├── pages/
│   ├── services/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css           ← Tailwind is imported here
├── index.html
├── package.json            ← Dependencies list
├── package-lock.json       ← Created after npm install
├── vite.config.js          ← Vite configuration
├── tailwind.config.js      ← Tailwind configuration ⭐
├── postcss.config.js       ← PostCSS configuration ⭐
├── .gitignore
└── README.md
```

---

## 🎯 How Tailwind CSS Works in This Project

### 1. Tailwind Scans Your Files
Tailwind looks at all files specified in `tailwind.config.js`:
```javascript
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
]
```

### 2. It Finds Used Classes
When you use classes like `className="btn btn-primary"`, Tailwind includes only those styles.

### 3. Custom Components
I've created custom component classes for you in `src/index.css`:

```css
@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-colors;
  }
  
  .btn-primary {
    @apply bg-primary-600 text-white hover:bg-primary-700;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
  
  .input {
    @apply w-full px-4 py-2 border rounded-lg focus:ring-2;
  }
  
  .badge {
    @apply px-2 py-1 rounded-full text-xs font-semibold;
  }
}
```

These are ready to use throughout the app!

### 4. Usage Example

```jsx
// Using utility classes directly
<div className="bg-blue-500 text-white p-4 rounded-lg">
  Hello World
</div>

// Using custom components
<button className="btn btn-primary">
  Click Me
</button>

<div className="card">
  <h2 className="text-xl font-bold">Card Title</h2>
</div>

<input className="input" type="text" />

<span className="badge badge-success">Active</span>
```

---

## 🎨 Customizing Tailwind

### Change Primary Color

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#f0f9ff',   // Lightest
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',  // Base color
        600: '#0284c7',  // Default used in app
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',  // Darkest
      }
    }
  }
}
```

After changing, Vite will auto-reload!

### Add Custom Fonts

1. Add font to `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

2. Update `tailwind.config.js`:
```javascript
theme: {
  extend: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    }
  }
}
```

### Add Custom Utilities

In `src/index.css`:
```css
@layer utilities {
  .text-shadow {
    text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
  }
}
```

Use it: `<h1 className="text-shadow">Title</h1>`

---

## 🔥 Development Workflow

### 1. Start Development Server
```bash
npm run dev
```
- Hot reload enabled (changes appear instantly)
- Vite is super fast!

### 2. Make Changes
Edit any `.jsx` file → Browser auto-updates!

### 3. Build for Production
```bash
npm run build
```
- Creates optimized files in `dist/` folder
- Removes unused Tailwind classes
- Minifies everything

### 4. Preview Production Build
```bash
npm run preview
```

---

## 📦 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🌐 Connecting to Backend

### Backend Setup Required

Your backend (`backend/index.js`) needs:

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Your routes
const routes = require('./routes/routes');
app.use('/api', routes);

app.listen(5000, () => {
  console.log('Backend running on http://localhost:5000');
});
```

### Testing the Connection

1. Start backend: `node index.js` (in backend folder)
2. Start frontend: `npm run dev` (in thm-frontend folder)
3. Open browser: `http://localhost:3000`
4. Try to login!

---

## ✅ Checklist - Is Everything Working?

- [ ] `npm install` completed without errors
- [ ] `npm run dev` starts the server
- [ ] Browser shows login page at `http://localhost:3000`
- [ ] Login page has blue gradient background
- [ ] Buttons are styled (blue, rounded)
- [ ] Input fields have borders and focus effects
- [ ] No errors in browser console (F12)
- [ ] Backend is running on port 5000
- [ ] Can login successfully

---

## 🎓 Learning Resources

### Tailwind CSS
- [Official Docs](https://tailwindcss.com/docs)
- [Tailwind UI Components](https://tailwindui.com/)
- [Tailwind Color Reference](https://tailwindcss.com/docs/customizing-colors)

### React
- [React Docs](https://react.dev)
- [React Router](https://reactrouter.com)

### Vite
- [Vite Docs](https://vitejs.dev)

---

## 🆘 Getting Help

### Common Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Clear npm cache
npm cache clean --force

# Reinstall everything
rm -rf node_modules package-lock.json
npm install

# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Kill process on port 3000 (Mac/Linux)
lsof -ti:3000 | xargs kill -9
```

### Browser DevTools

- **F12** - Open DevTools
- **Console tab** - See JavaScript errors
- **Network tab** - See API calls
- **Elements tab** - Inspect HTML/CSS

### Still Having Issues?

1. Make sure Node.js 18+ is installed
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again
4. Clear browser cache (Ctrl+Shift+Delete)
5. Try a different browser

---

## 🎉 You're All Set!

Your THM System frontend is now running with:
- ✅ React 18
- ✅ Vite for lightning-fast development
- ✅ Tailwind CSS for beautiful styling
- ✅ All components ready to use

**Next Steps:**
1. Test the login (make sure backend is running)
2. Explore all the pages
3. Customize colors if needed
4. Start building! 🚀

---

**Happy Coding! 💻✨**

If you have any questions, refer back to this guide!
