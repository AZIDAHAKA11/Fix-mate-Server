# FixMate – Server

FixMate Server is the backend REST API for the FixMate repair service booking platform. It is built with Node.js, Express.js, and MongoDB. It handles service management, bookings, authentication verification, payment processing, and administrator operations.



## API Routes

| Route | Purpose |
|---|---|
| `/api/services` | Service management |
| `/api/bookings` | Booking management |
| `/api/payments` | Payment operations |
| `/api/admin` | Administrator operations |



The backend will run at:

[http://localhost:5000](http://localhost:5000)



## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server using Nodemon |
| `npm start` | Start server using Node.js |
| `npm test` | Run tests (currently a placeholder script) |

## Dependencies

| Package | Purpose |
|---|---|
| `express` | Backend web framework |
| `mongodb` | MongoDB database connection |
| `cors` | Cross-origin resource sharing |
| `dotenv` | Environment variable management |
| `jose` | JWT verification using JWKS |
| `jsonwebtoken` | JWT utility package |
| `stripe` | Payment processing |
| `nodemon` | Development server auto-restart |

## Database

**Database Name:** `fixmate_db`

The application uses MongoDB collections to manage users, services, bookings, and payment records.

## Frontend

The FixMate frontend is built with Next.js and communicates with this backend through REST API requests.

## Project Purpose

The purpose of FixMate is to provide a convenient and reliable repair service management system connecting customers, technicians, and administrators through a single platform.