Chat Realtime App
Ứng dụng chat realtime được xây dựng bằng ReactJS + Firebase + Ant Design.

HƯỚNG DẪN CÀI ĐẶT

Bước 1: Clone project
git clone https://github.com/huysg136/chat-realtime.git

cd chat-realtime

Bước 2: Cài dependencies
Nếu dùng yarn (khuyên dùng):
yarn install

Hoặc nếu dùng npm:
npm install

Bước 3: Tạo file môi trường .env ở thư mục gốc
Thêm thông tin Firebase vào file .env:

REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

Lưu ý: File .env đã được bỏ qua trong .gitignore, KHÔNG commit lên GitHub.

Bước 4: Chạy dự án
yarn start
hoặc
npm start

Dự án sẽ chạy tại: http://localhost:3000

CÔNG NGHỆ SỬ DỤNG

ReactJS

Firebase (Auth, Firestore, Hosting)

Ant Design

Styled Components

React Router

Lodash

date-fns

GHI CHÚ

Bật Firebase Authentication (Google, Facebook, Email/Password) trong Firebase Console.

Nếu dùng Facebook Login, thêm http://localhost:3000/
 vào danh sách Valid OAuth Redirect URIs trong Facebook Developer.

SCRIPTS CÓ SẴN

yarn start → chạy project dev

yarn build → build production

yarn test → chạy test

yarn eject → eject CRA config

Author: huysg136