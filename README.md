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

MySQL is available on `localhost:3306` by default. Set `MYSQL_PORT` in the root `.env` if that port is occupied. The database, application user, and tables in `db/init.sql` are created when Docker initializes a fresh data volume. The named volume preserves data across restarts; changing `init.sql` later does not rerun it on an existing volume.

## Start the backend

In a separate terminal:

```sh
cd server
npm install
cp .env.example .env
npm run dev
```

The API listens on `http://localhost:3001` by default. Check it at `http://localhost:3001/api/health`. Set `PORT` in `server/.env` to use another port. The server reads database credentials from the root `.env` file created for Docker Compose, and connects to MySQL on `127.0.0.1` by default.

Set `JWT_SECRET` in `server/.env` to a long random value. Set the `SMTP_*` values and `ADMIN_EMAIL` to credentials and addresses from your SMTP provider; the values in `server/.env.example` are placeholders. The API includes `POST /api/auth/login` (JSON body with `email` and `password`), `GET /api/projects`, and `POST /api/leads`. The lead request body requires `client_name`, `client_email`, `phone`, and `service_type`; submissions are stored in MySQL and an admin notification is sent asynchronously.

## Start the frontend

In another terminal:

```sh
cd client
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). The client currently renders an empty page; routing, state management, and UI are ready to be implemented later.

To stop MySQL, run `docker compose down` from the repository root.
