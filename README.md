# 🔔 SkyFlow Airline Reminder & Notification Service

[![Production Reminder Service](https://img.shields.io/badge/Production-Live%20on%20Render-success?style=for-the-badge&logo=render)](https://skyflow-reminder-service.onrender.com/health)
[![Node.js](https://img.shields.io/badge/Node.js-v18.0.0+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.0-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Sequelize ORM](https://img.shields.io/badge/Sequelize-v6.0-52B0E7?style=for-the-badge&logo=sequelize)](https://sequelize.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-AMQP%20Consumer-FF6600?style=for-the-badge&logo=rabbitmq)](https://www.rabbitmq.com/)
[![Nodemailer](https://img.shields.io/badge/Nodemailer-SMTP%20Dispatcher-blue?style=for-the-badge)](https://nodemailer.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Multi--Dialect-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

The **SkyFlow Airline Reminder Service** is the asynchronous communication and notification microservice of the platform. It handles the scheduling, queue processing, and dispatch of email reminders (e-ticket confirmations, boarding alerts, and cancellation notices). It operates an event-driven **RabbitMQ consumer** alongside a recurring **cron scheduler** that delivers emails through SMTP.

---

## 🏗️ System Architecture & Notification Lifecycle

The Reminder Service combines asynchronous message consumption with a scheduled background cron worker:

```mermaid
flowchart TD
    subgraph EventSources ["Notification Event Ingestion Sources"]
        RabbitMQ[("RabbitMQ Message Broker<br/>Exchange: AIRLINE_BUS<br/>Routing Key: REMINDER_SERVICE")]
        APIClient(["API Gateway / REST Client (:3005)"])
    end

    subgraph ReminderServiceBoundary ["Airline Reminder Service (:3004 / Render)"]
        Routes["Express Router (/api/v1/tickets)"]
        MQConsumer["RabbitMQ Consumer (amqplib)<br/>• Subscribes to booking events<br/>• Auto-acknowledges messages"]
        TicketCtrl["Ticket Controller"]
        TicketSvc["Ticket Service<br/>• Creates Notification Records<br/>• Queries Pending & Due Tickets"]
        TicketRepo["Ticket Repository<br/>(Sequelize Data Access Layer)"]

        subgraph BackgroundCronEngine ["Cron Scheduling Subsystem"]
            CronWorker["node-cron Engine<br/>• Schedule: */1 * * * * (Every Minute)<br/>• Queries PENDING where notificationTime <= NOW"]
            MailerEngine["Nodemailer SMTP Transporter<br/>• TLS Authentication (Gmail SMTP)<br/>• Dispatches HTML/Text Email"]
        end
    end

    subgraph RelationalDB ["Relational Store (PostgreSQL / MySQL)"]
        TicketsTable[("NotificationTickets Table<br/>• subject, content, recipientEmail<br/>• status: PENDING / SUCCESS / FAILED<br/>• notificationTime")]
    end

    PassengerMailbox(["Passenger Email Inbox<br/>(e.g. passenger@skyflow.com)"])

    RabbitMQ -->|Consume Booking Event| MQConsumer
    APIClient -->|POST /tickets| Routes
    Routes --> TicketCtrl
    MQConsumer --> TicketSvc
    TicketCtrl --> TicketSvc
    TicketSvc --> TicketRepo
    TicketRepo <--> RelationalDB

    CronWorker -->|Scan Due Tickets| TicketSvc
    CronWorker --> MailerEngine
    MailerEngine -->|Send Email via SMTP| PassengerMailbox
    MailerEngine -->|Update status: SUCCESS| TicketSvc

    classDef srcStyle fill:#1e1b4b,stroke:#8b5cf6,stroke-width:2px,color:#f8fafc;
    classDef svcStyle fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#f8fafc;
    classDef dbStyle fill:#1e293b,stroke:#10b981,stroke-width:2px,color:#f8fafc;
    classDef userStyle fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#ffffff;

    class EventSources,RabbitMQ,APIClient srcStyle;
    class ReminderServiceBoundary,Routes,MQConsumer,TicketCtrl,TicketSvc,TicketRepo,BackgroundCronEngine,CronWorker,MailerEngine svcStyle;
    class RelationalDB,TicketsTable dbStyle;
    class PassengerMailbox userStyle;
```

---

## 📊 Database Domain Model (ER Diagram)

The Reminder Service persists notification states in the `NotificationTickets` table:

```mermaid
erDiagram
    NOTIFICATION_TICKET {
        int id PK "Auto Increment"
        string subject "Email Subject Line"
        text content "Body text / Booking Details"
        string recipientEmail "Target Passenger Email"
        string status "PENDING | SUCCESS | FAILED"
        datetime notificationTime "Scheduled Delivery Timestamp"
        datetime createdAt
        datetime updatedAt
    }
```

---

## ⚡ Core Capabilities

1. **Dual Ingestion (AMQP + REST)**:
   - Consumes booking events published asynchronously to RabbitMQ by peer services.
   - Exposes REST endpoints (`POST /api/v1/tickets`) for manual ticket generation or testing.
2. **Deterministic Cron Dispatching**:
   - Runs every 60 seconds (`*/1 * * * *`) via `node-cron`.
   - Locates all tickets with status `PENDING` whose `notificationTime` has arrived, delivers them, and marks them `SUCCESS`.
3. **Resilient Broker Handling**:
   - Connection guard ensures the service starts cleanly and functions even when RabbitMQ is not configured or temporarily unavailable.
4. **Production Cloud Database Support**:
   - Multi-dialect Sequelize ORM configuration connecting seamlessly to local MySQL and Render PostgreSQL with SSL encryption.

---

## 🛠️ Tech Stack & Dependencies

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18+) | Server execution runtime |
| **Framework** | Express 5 | REST API web framework |
| **ORM** | Sequelize v6 | Relational Object-Relational Mapping |
| **Message Broker** | `amqplib` | RabbitMQ AMQP consumer |
| **Task Scheduler** | `node-cron` | Cron-like recurring task execution |
| **Email Transporter**| `nodemailer` | SMTP client for email delivery |
| **Databases** | PostgreSQL & MySQL | Relational engines via `pg` and `mysql2` |

---

## 🌐 API Endpoints & Request Contract

### 1. Create Notification Ticket (REST)
- **Endpoint**: `POST /api/v1/tickets`
- **Access**: Internal / Gateway
- **Request Body**:
  ```json
  {
    "subject": "Flight AI-999 Booking Confirmed",
    "content": "Dear Passenger, your flight AI-999 has been confirmed with 2 seats reserved.",
    "recipientEmail": "passenger@skyflow.com",
    "notificationTime": "2026-10-13T10:00:00.000Z"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Successfully registered a reminder",
    "data": {
      "id": 1,
      "subject": "Flight AI-999 Booking Confirmed",
      "recipientEmail": "passenger@skyflow.com",
      "status": "PENDING",
      "notificationTime": "2026-10-13T10:00:00.000Z"
    },
    "err": {}
  }
  ```

### 2. Retrieve All Tickets
- **Endpoint**: `GET /api/v1/tickets`
- **Access**: Internal / Gateway
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Successfully fetched reminder tickets",
    "data": [
      {
        "id": 1,
        "subject": "Flight AI-999 Booking Confirmed",
        "recipientEmail": "passenger@skyflow.com",
        "status": "SUCCESS"
      }
    ],
    "err": {}
  }
  ```

### 3. Health Probe
- **Endpoint**: `GET /health`
- **Response** (`200 OK`):
  ```json
  {
    "service": "Airline_Reminder_Service",
    "status": "UP",
    "database": "CONNECTED",
    "timestamp": "2026-10-13T06:09:52.345Z"
  }
  ```

---

## ⚙️ Environment Variables

Create a `.env` file in `Airline_Reminder_Service`:

| Variable | Required | Default / Example | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | **Yes** | `3004` (Local) / `10000` (Render) | Server listening port. |
| `EMAIL_ID` | **Yes** | `noreply.skyflow@gmail.com` | Sender email address for SMTP authentication. |
| `EMAIL_PASSWORD` | **Yes** | `abcd efgh ijkl mnop` | 16-character Google App Password (see below). |
| `DATABASE_URL` | Optional | `postgres://user:pass@host/db` | Connection URI for cloud databases (Render PostgreSQL). |
| `MESSAGE_BROKER_URL` | Optional | `amqp://localhost:5672` | RabbitMQ connection URI. |
| `EXCHANGE_NAME` | Optional | `AIRLINE_BUS` | RabbitMQ exchange name. |
| `REMINDER_BINDING_KEY`| Optional | `REMINDER_SERVICE` | RabbitMQ routing key for notification events. |
| `NODE_ENV` | Optional | `development` | Operating environment (`development`, `production`). |

> [!TIP]
> **Generating a Google App Password**:
> 1. Open your [Google Account](https://myaccount.google.com/) -> **Security**.
> 2. Ensure **2-Step Verification** is turned ON.
> 3. Search for **App passwords**, create an entry (e.g. `SkyFlow-Mailer`), and paste the generated 16-character key into `EMAIL_PASSWORD`.

---

## 🚀 Local Development & Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **MySQL**: Running on `127.0.0.1:3306` (or PostgreSQL)
- **RabbitMQ**: Running on `127.0.0.1:5672` (optional)
- Valid SMTP credentials

### Step-by-Step Instructions

1. **Navigate to Service:**
   ```bash
   cd Airline_Reminder_Service
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment & Database:**
   ```bash
   cp .env.example .env
   cp src/config/config.json.example src/config/config.json
   ```

4. **Apply Schema Migrations:**
   ```bash
   npx sequelize db:create
   npx sequelize db:migrate
   ```

5. **Start Service:**
   ```bash
   npm start
   ```
   Service will listen on `http://localhost:3004`. The cron scheduler begins running immediately upon start.

---

## 🐳 Docker Setup

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . ./
EXPOSE 3004
CMD ["node", "src/index.js"]
```

```bash
docker build -t skyflow-reminder-service .
docker run -p 3004:3004 --env-file .env skyflow-reminder-service
```

---

## 📄 License
This project is licensed under the MIT License.
