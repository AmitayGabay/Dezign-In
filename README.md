# Architecture & Interior Design

Initial full stack setup with a MySQL database, Express API, and React/Vite client.

## Requirements

- Node.js and npm
- Docker with Docker Compose

## Start MySQL

From the repository root, create your local database environment file and set your own passwords:

```sh
cp .env.example .env
docker compose up -d db
```

MySQL is available on `localhost:3307` by default. Set `MYSQL_PORT` in the root `.env` if that port is occupied. The container still uses MySQL's internal port `3306`; Docker maps host port `3307` to it. The database, application user, and tables in `db/init.sql` are created when Docker initializes a fresh data volume. The named volume preserves data across restarts; changing `init.sql` later does not rerun it on an existing volume.

## Start the backend

In a separate terminal:

```sh
cd server
npm install
cp .env.example .env
npm run dev
```

The API listens on `http://localhost:3001` by default. Check it at `http://localhost:3001/api/health`. Set `PORT` in `server/.env` to use another port. The server reads database credentials from the root `.env` file created for Docker Compose, and connects to MySQL on `127.0.0.1` by default.

Set `JWT_SECRET` in `server/.env` to a long random value. The SMTP example sends through `yqwm678@gmail.com` and delivers new lead notifications to `amitaygabay2@gmail.com`. For Nodemailer's SMTP login, set `SMTP_PASSWORD` to a Google App Password created for `yqwm678@gmail.com`; Google requires 2-Step Verification for app passwords, and availability depends on the account. Keep that password only in `server/.env`. Lead submissions are stored in MySQL, then the admin receives a formatted notification containing the submitted client name, email, phone, service, and submission time. The API includes `POST /api/auth/login`, `GET /api/projects`, and `POST /api/leads`.

The lead API waits for Gmail to accept the notification and responds with `email_sent: true` or `false`. A saved lead can therefore be reported separately from an email failure. If Gmail accepts the message but it is not in Inbox, check Spam and mark the message as not spam; Gmail controls final delivery and classification.

Set `CLIENT_BASE_URL` in `server/.env` to the URL where you open the local React app, normally `http://localhost:5173`. New lead submissions still email the admin. When the admin opens the first project for a lead, the server creates a client account and emails the client its login address and randomly generated password. Additional leads or projects using the same email reuse that account; login details are not sent again. If the first email fails, the admin dashboard can generate and email new credentials. Client passwords are hashed in MySQL; the generated password itself is shown only in the welcome email. Because email carries a password, protect access to that mailbox and use HTTPS before hosting the app publicly.

When a client project changes to `Completed`, the client receives a styled review request linking to `/client`. The client signs in to view all projects linked to their account and can review completed projects. Admins can delete public reviews. The former lead-handled and temporary review-link flow is retired. If a completion email fails, the dashboard offers a resend action.

For an existing MySQL volume, run `npm run migrate-reviews` and then `npm run migrate-workspace` from `server`. These scripts add the review and client workspace tables without deleting existing leads or projects. The workspace migration publishes legacy standalone projects so they remain visible on Home. Fresh volumes get the complete schema from `db/init.sql`.

For an existing volume, also apply `db/migrations/20261014_one_review_per_project.sql` once before starting the updated API. Check its duplicate-review query first; if it returns rows, decide which existing review to retain before adding the index. The migration records which projects have already been reviewed, so deleting a public review does not reopen review submission. Fresh volumes already include these fields and the index in `db/init.sql`.

To create the first admin account, set a temporary `ADMIN_PASSWORD` (at least 8 characters) in the shell environment, then run `npm run create-admin` from `server`. The script uses `ADMIN_EMAIL` as the login address and hashes the password in MySQL. Remove `ADMIN_PASSWORD` from the shell environment after the account is created. The command refuses to overwrite an existing account.

## Start the frontend

In another terminal:

```sh
cd client
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). The frontend has Home, About, Contact, Client area, and Admin pages. The Home gallery displays only projects explicitly marked for publication; an empty gallery means nothing has been published yet.

The admin dashboard can delete leads, open multiple projects for one client, edit project descriptions, add text updates, upload multiple images, publish selected projects, change statuses, and delete reviews. A separate portfolio form creates a public project with an image, marks it Completed automatically, and sends no client email. Completed projects are styled differently in both dashboards and the public gallery. Private client images require the admin or linked client's JWT even when their image URL is known. Uploaded files are stored in `server/uploads`; back up this folder along with the database.

## Languages

The language menu in the header offers English, French, Hebrew, Russian, and Arabic. React's `LanguageProvider` in `client/src/i18n.jsx` stores the choice in `localStorage`, sets the document's `lang` and `dir`, and supplies translated interface text from `client/src/translations.js`. Hebrew and Arabic use right-to-left layout rules in `client/src/index.css`; the gallery controls also reverse their scroll direction. Dates and the ILS estimate use the browser's `Intl` locale formatting. Project statuses and service types keep their English API values while their labels are translated. Text entered by clients or admins, such as project descriptions and reviews, remains in the language in which it was written.

## Postman API collection

Import [`postman/DezignIn.postman_collection.json`](postman/DezignIn.postman_collection.json) into Postman. The collection covers every Express route, including uploaded files and the retired routes that return HTTP 410. It uses collection variables, so no separate environment import is needed.

Set `baseUrl` if the API is not running at `http://localhost:3001`. Set `adminEmail` and `adminPassword` to the credentials created with `npm run create-admin`, then run **Login as admin**; its response automatically saves `adminToken`. For a full client workflow, set `clientEmail` to a mailbox you can access, run **Create lead**, then **Open client project from lead**. The welcome email contains the generated client password. Set `clientPassword` and run **Login as client** to save `clientToken`. Successful creation requests also save the IDs needed by later requests.

Choose an image file in each multipart request after importing the collection. Supported formats are JPG, PNG, WebP, and GIF, up to 10 MB per file. To submit a review, first change the linked client project to `Completed`; that project accepts one review only. Run requests individually in the order you need: write requests can create or delete records and some send emails.

To stop MySQL, run `docker compose down` from the repository root.
