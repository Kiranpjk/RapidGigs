# Payment Service (Java · Spring Boot)

Milestone-based escrow for RapidGigs. When a client hires a freelancer, they create a contract split into milestones. Each milestone moves through a fixed lifecycle, and money is only released when the client approves the work.

```
PENDING ──fund (client)──▶ FUNDED ──submit (freelancer)──▶ SUBMITTED ──approve (client)──▶ RELEASED
                              ▲                                 │
                              └────────reject (client)──────────┘
```

**Stack:** Java 21, Spring Boot 3.3, Spring Data MongoDB, Bean Validation, JUnit 5.

## How it fits in

```
Frontend ──▶ Node backend (/api/payments, checks JWT) ──X-Internal-Key + X-User-Id──▶ payment-service ──▶ MongoDB (contracts)
```

The Node backend handles login and checks that the caller posted the job and the applicant is `hired`. The Java service enforces the money rules: who may do each step, valid state order, positive amounts in cents, one contract per application, and optimistic locking (`@Version`) so two parallel approvals can't both release.

## API (via the Node backend)

| Method | Path | Who |
|---|---|---|
| POST | `/api/payments/contracts` `{ applicationId, currency, milestones: [{ title, amountCents }] }` | job poster |
| GET | `/api/payments/contracts` | my contracts |
| GET | `/api/payments/contracts/:id` | client or freelancer |
| POST | `/api/payments/contracts/:id/milestones/:index/{fund,submit,approve,reject}` | per lifecycle above |

## Run

```bash
export PAYMENT_SERVICE_KEY=$(openssl rand -hex 32)
docker compose up --build            # whole stack
# or alone:
cd payment-service && PAYMENT_SERVICE_KEY=dev mvn spring-boot:run
mvn test                             # state-machine unit tests
```

> Escrow is simulated: statuses change, but no real money moves. A real version would call Stripe Connect on `fund` and `approve`.
