# 🤝 Barter App: Connect, Exchange, Thrive!

The Barter App is a modern web application designed to facilitate the exchange of goods and services within a community. Moving beyond traditional monetary transactions, this platform empowers users to list items they want to trade or skills they can offer, and discover needs from others. It fosters a vibrant community where value is exchanged directly, promoting sustainability and resourcefulness.

---

## ✨ Features

### 🔐 User Authentication & Profiles
- Secure registration and login powered by Firebase Authentication.
- Comprehensive profiles: `displayName`, `location`, `bio`, `skillsOffered`, `needs`, and `profileImageUrl`.
- Public profiles for all users and a personal "My Profile" page.
- Profile editing capabilities for each user.

### 📦 Listing Management
- Create, view, update, and delete listings for items or services.
- Listings support descriptions, images, and categories.

### 🌟 Review and Reputation System
- Users can review others after exchanges.
- A reputation system calculates and displays user ratings.
- View received reviews on profile pages.

### 💬 Real-Time Messaging (Chat)
- Direct messaging from user profiles.
- Real-time chat updates and notifications.
- Chat list sorted by most recent activity.
- Dedicated chat room views.

### 📱 Responsive Design
- Optimized across devices: mobile, tablet, desktop.

### 🔐 Robust Backend
- RESTful API with secure endpoints for all functionality.

---

## 🚀 Technologies Used

### Frontend
- **React** – UI Library
- **TypeScript** – Type safety
- **Tailwind CSS** – Styling
- **Shadcn/ui** – Prebuilt UI components
- **React Router DOM** – Routing
- **Axios** – HTTP client
- **Sonner** – Notifications
- **Lucide React** – Icons

### Backend
- **Spring Boot** – Java backend framework
- **Java** – Main backend language
- **Firebase Admin SDK** – Auth + Firestore access
- **Lombok** – (optional) Reduce Java boilerplate
- **Google Cloud Firestore** – NoSQL real-time DB
- **Google Cloud Storage** – Store images

### Authentication & Database
- **Firebase Authentication**
- **Google Cloud Firestore**

### Deployment
- **Render** – Frontend + backend deployment

---

## 🛠️ Getting Started

### 🔧 Prerequisites

- Node.js (LTS)
- npm or Yarn
- Java JDK 17+
- Maven
- A Firebase project with:
  - Firebase Auth (Email/Password)
  - Firestore (Native mode)
  - Cloud Storage
  - A service account key (JSON)

---

## 🔥 Firebase Project Setup

1. **Create Firebase project** on [Firebase Console](https://console.firebase.google.com).
2. **Enable services:**
   - Auth → Sign-in method → Email/Password
   - Firestore Database → Start in production mode
   - Cloud Storage → Setup default bucket
3. **Generate Service Account Key:**
   - Project settings → Service accounts → Generate private key
   - Download the JSON file

4. **Frontend Firebase Config:**
   - From Project Settings → General → Web App SDK snippet
   - Use in `src/firebase.ts`

```ts
// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
🖥️ Backend Setup (Spring Boot)
bash
Copy
Edit
git clone <your-backend-repo-url>
cd barter-backend
Rename Firebase JSON to serviceAccountKey.json and place in src/main/resources/.

Create or update application.properties:

properties
Copy
Edit
# Firebase Configuration
firebase.sdk.path=serviceAccountKey.json
firebase.project.id=your-firebase-project-id
firebase.storage.bucket=your-firebase-storage-bucket-name.appspot.com

# Server Port
server.port=8081

# CORS Configuration
app.cors.allowed-origins=http://localhost:5173
Build and run:

bash
Copy
Edit
mvn clean install
mvn spring-boot:run
Your backend should run at http://localhost:8081.

💻 Frontend Setup (React)
bash
Copy
Edit
cd barter-frontend
npm install   # or yarn install
npm run dev   # or yarn dev
Frontend will be live at http://localhost:5173.

🚀 Deployment
🔧 Backend on Render
Connect GitHub repo

Set build command: mvn clean install

Set start command: java -jar target/*.jar

Add Firebase service account (via secret file or env var)

Set environment variables matching application.properties

🧩 Frontend on Render
Connect GitHub repo

Set build command: npm run build

Set publish directory: dist

Ensure all API_BASE_URL references point to your deployed backend

📚 API Endpoints (Summary)
🔐 User Profiles
GET /api/users

GET /api/users/{id}

POST /api/users (protected)

PUT /api/users/{firebaseUid} (protected, owner only)

DELETE /api/users/{id} (protected, owner only)

📦 Barter Posts
GET /api/posts

GET /api/posts/{id}

POST /api/posts (protected)

PUT /api/posts/{id} (protected, owner only)

DELETE /api/posts/{id} (protected, owner only)

🌟 Reviews
GET /api/reviews/received/{userId}

GET /api/reviews/written/{userId}

POST /api/reviews (protected)

DELETE /api/reviews/{id} (protected, owner only)

💬 Chats
POST /api/chats (protected)

GET /api/chats/{chatId} (protected)

GET /api/chats/user/{userId} (protected)

POST /api/chats/{chatId}/messages (protected)

GET /api/chats/{chatId}/messages (protected)

DELETE /api/chats/{chatId} (protected)

🤝 Contributing
Contributions are welcome! Please fork the repository and create a pull request.

📄 License
This project is licensed under the MIT License. See the LICENSE file for more details.

yaml
Copy
Edit

---

✅ **Copy and paste** this into your `README.md` — it’s styled with clean markdown and GitHub-ready formatting.

Let me know if you want to add:
- Badges (build passing, license, deploy links)
- Screenshots
- Demo links  
- Table of contents

Happy coding ✨
