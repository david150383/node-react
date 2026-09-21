## Advanced testing & DAST

Up to this point, your pipeline has only looked at static text. It has checked the formatting, scanned for secrets, and run isolated unit tests. However, a modern web application is not a static script; it is a live system of connected services.

In this section, you will bring your application to life inside the GitHub Actions runner. You will start temporary instances of your database, backend, and frontend to show that all the pieces work together well.

To do this, we will follow a clear order. First, you will set up backend integration tests to show that your API can talk to a live postgres database. Next, you will run end-to-end tests with Playwright to simulate a real user clicking through your website. Finally, you will use a dynamic security tool to scan your running application for vulnerabilities.

> [!NOTE]
> This section does not teach you how to write integration tests or end-to-end tests from scratch. Instead, it shows you how to take your existing tests and wire them into an automated pipeline so they run correctly inside GitHub Actions.

### Backend integration tests

Unit tests check individual parts of your code, but integration tests show that your backend can successfully work with other services. For this project, the Node.js backend relies heavily on postgres to handle db queries. If the backend cannot talk to postgres, the application will not work.

To test this in GitHub Actions, you cannot use a fake database. You need to download the real postgres program, start it up inside the Ubuntu runner, and run your tests against it.

Create a new file at `.github/workflows/backend-integration-tests.yml`:

```yaml
name: Backend integration tests

on:
  workflow_call:

env:
  NODE_ENV: test
  DB_HOST: localhost
  DB_USER: postgres
  DB_PASSWORD: test_password
  DB_NAME: test_db
  JWT_PRIVATE_KEY_PATH: ./keys/private.pem
  JWT_PUBLIC_KEY_PATH: ./keys/public.pem

jobs:
  tests:
    name: Run integration tests
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: ./backend

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run migrate

      - name: Run integration tests
        run: npm run test:integration
```

Let's break down the new concepts in this workflow. The first few steps are exactly the same as your other backend jobs: checking out the code, setting up Node.js, and installing dependencies.

But after that, the workflow changes. Because integration tests need a real database, we have to build that environment from scratch.

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: test_db
    ports:
      - 5432:5432
```

**services:**
This keyword tells GitHub Actions to start one or more background service containers before your job's steps begin execution.

**postgres**:
This is the user-defined hostname for the service. Inside your GitHub Actions runner, your application code can connect to this database using the hostname postgres (e.g., postgres://postgres:test_password@postgres:5432/test_db).

**image: postgres:15**
This instructs GitHub to pull the official PostgreSQL version 15 image directly from Docker Hub to run the database.

**env:**
This section defines the environment variables needed to configure the PostgreSQL container upon startup.
* `POSTGRES_USER: postgres`: Sets the default database admin username.
* `POSTGRES_PASSWORD: test_password`: Sets the password for that admin user.
* `POSTGRES_DB: test_db`: Automatically creates a fresh database named test_db when the container boots up.

**ports:**
`- 5432:5432`: This maps port 5432 inside the Docker container to port 5432 on the host runner. This is required if your application is running directly on the runner machine (outside of a container) so it can access the database at localhost:5432.

```yaml
options: >-
  --health-cmd pg_isready
  --health-interval 10s
  --health-timeout 5s
  --health-retries 5
```

Those `options` configure a **Docker health check** for the PostgreSQL service.

 Here's what each one means:

 - `--health-cmd pg_isready`
  - Runs PostgreSQL's `pg_isready` command inside the container.
  - It checks whether PostgreSQL is ready to accept connections.
  - If PostgreSQL is ready, the health check succeeds.
- `--health-interval 10s`
  - GitHub/Docker runs the health check **every 10 seconds**.
- `--health-timeout 5s`
  - Each health check is allowed to run for **up to 5 seconds**.
  - If it doesn't respond within 5 seconds, that check is considered failed.
- `--health-retries 5`
  - PostgreSQL can fail the health check **5 times** before Docker considers the container unhealthy.

 ### Why this matters here

 Your workflow has:

```
services:
  postgres:
    image: postgres:15
```

 Your migration and tests depend on PostgreSQL being ready:

```
- name: Run database migrations
  run: npm run migrate

- name: Run integration tests
  run: npm run test:integration
```

 The health-check options tell GitHub Actions to **wait for the PostgreSQL service to become healthy before proceeding with the job's steps that depend on it**.

 So, conceptually:

```
Start PostgreSQL container
        ↓
Run pg_isready
        ↓
Is PostgreSQL ready?
   ↓ Yes       ↓ No
 Healthy     Wait 10s
                ↓
          Try again (up to 5 failures)
```

 Without a health check, PostgreSQL's container could be running while the **PostgreSQL server inside it is still starting up**, potentially causing `npm run migrate` to fail with a connection error.

 Also, this part:

```
options: >-
```

 is just YAML syntax for folding the following lines into **one string**. So it is effectively equivalent to:

```
options: "--health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5"
```

```yaml
- name: Run database migrations
  run: npm run migrate

- name: Run integration tests
  run: npm run test:integration
```

Finally, we run `jest`.


##### As integration test communicating with database, there is two approach for handle this
1. In-Memory Database (pg-mem, SQLite)
* **Blazing Fast Test Execution:** Because reading and writing data occurs completely inside volatile system RAM, tests complete in milliseconds. There are no slow disk read/write cycles.
* *Instant Infrastructure Startup:* There is no need to wait for a database to download, spin up, or pass health checks. The database exists the exact microsecond your test script starts.
* **Zero Host Requirements:** Anyone can run the test suite immediately upon cloning the project. Developers do not need to install Docker, PostgreSQL, or manage local port conflicts on their laptops.
**Isolated State per Test:** It is incredibly easy to reset, drop, or completely recreate a clean database state between individual test blocks because destroying it simply means clearing a JavaScript variable.

2. Real Docker Container (GitHub Services)
* **100% Production Parity:** You are testing against the actual, official PostgreSQL engine binaries. If a complex query, constraint, or indexing strategy works in your test container, it is guaranteed to work exactly the same way in production.
* **Full Native Feature Support:** Built-in simulation tools like pg-mem do not support 100% of advanced PostgreSQL features. A real container perfectly supports elements like triggers, stored procedures, complex aggregations, window functions, and specialized data types (such as JSONB or UUID).

* **Tests Your Real Migration Scripts:** Running a real container lets you run your actual npm run migrate workflow in CI exactly how it will execute on production deployment day. This helps catch broken SQL migration files before they reach live servers.

* **Accurate Performance & Concurrency Testing:** If you want to run integration tests that simulate multiple users hitting the database at the exact same time (concurrency checking), a real container handles connection pooling, row-locking, and query queues precisely like your production server.

Both npm run test and npm run migrate need environment variables that's why i created it global.

### Updating the orchestrator

Update your main `ci.yml` file and put blow job after `backend-unit-tests`. Open the file and include the new jobs:

```yaml
# ...

jobs:
  backend-integration-tests:
    name: Backend
    needs: backend-unit-tests
    uses: ./.github/workflows/backend-integration-tests.yml
```

Finally, scroll down to the very bottom of your `ci.yml` file and update your `pipeline-success` job. You must add `backend-integration-tests` to the `needs` list so the pipeline knows to check them before finishing:

```yaml
  pipeline-success:
    name: Pipeline success
    needs:
      [
        frontend-vulnerability-check,
        backend-vulnerability-check,
        backend-sast-check,
        frontend-lint-format-check,
        backend-lint-format-check,
        frontend-unit-tests,
        backend-unit-tests,
        backend-integration-tests,
      ]
    runs-on: ubuntu-latest
    if: always()

# ...
```

Save and commit your changes. Your GitHub Actions pipeline is now fully equipped to handle integration testing on every single commit.


### End to end tests

Now that your API is tested, you can add end to end (E2E) tests. These tests rely on a tool like Playwright to open a real browser and simulate how users actually interact with your application.

Because a user needs to see the user interface (UI) and load data, end-to-end tests require the frontend, backend, and database to all run at the same time. With just one end-to-end test, you can make sure that the entire system works together perfectly.

You can install Playwright inside your frontend directory:

```bash
npm init playwright@latest
```

During installation, Playwright will create a configuration file. Let's update it to include clean settings for your GitHub pipeline, such as retries on failure, GitHub error markers, and an automatic development server.

Create or update your `frontend/playwright.config.ts` file:

```javascript
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["github"]] : "html",
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

Let's break down how this file changes its behavior automatically when it runs inside GitHub Actions.

```javascript
forbidOnly: !!process.env.CI,
retries: process.env.CI ? 2 : 0,
```

When you write tests on your computer, you might use `test.only` to focus on a single test. If you accidentally commit that line, `forbidOnly` will make the GitHub pipeline fail. This stops you from saving code that skips most of your tests. Also, we set `retries` to 2 only in GitHub Actions to retry any tests that fail by mistake due to slow runner environments.

```javascript
reporter: process.env.CI ? [["list"], ["github"]] : "html",
```

On your computer, Playwright opens a webpage to show your test results. In a GitHub runner, there is no screen to open that page. Instead, we use the `github` reporter when running in CI. This setting shows errors directly inside the GitHub Actions interface, making mistakes very easy to find.

```javascript
webServer: {
  command: 'npm run dev -- --host 127.0.0.1',
  url: 'http://127.0.0.1:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
},
```

Instead of writing complex scripts to start your frontend server before running tests, Playwright handles it for you. It runs your startup command and checks the URL until the page responds. The `reuseExistingServer` line means that on your computer, it will use your already running server, but in GitHub Actions, it will start a brand new one.

With the configuration ready, you can create the CI workflow. This workflow will take the most time because it starts the entire system.

Create a new file at `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E tests

on:
  workflow_call:

env:
  NODE_ENV: test
  DB_HOST: localhost
  DB_USER: postgres
  DB_PASSWORD: test_password
  DB_NAME: test_db
  JWT_PRIVATE_KEY_PATH: ./keys/private.pem
  JWT_PUBLIC_KEY_PATH: ./keys/public.pem

jobs:
  tests:
    name: Run E2E tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run database migrations
        working-directory: ./backend
        run: npm run migrate

      - name: Start backend server
        working-directory: ./backend
        run: |
          npm run dev &
          echo "Waiting for backend server on port 3000..."
          for i in {1..30}; do
            if curl -s -f http://localhost:3000/health/live > /dev/null 2>&1; then
              echo "Backend server is up and healthy!"
              break
            fi
            sleep 1
          done

      - name: Seed E2E test data
        working-directory: ./backend
        run: npm run seed:users

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Get Playwright version
        id: playwright-version
        working-directory: ./frontend
        run: |
          echo "version=$(npm list @playwright/test --depth=0 --json | jq -r '.dependencies["@playwright/test"].version')" >> $GITHUB_OUTPUT

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        id: playwright-cache
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ steps.playwright-version.outputs.version }}
          restore-keys: |
            ${{ runner.os }}-playwright-

      - name: Install Playwright browsers (if no cache)
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        working-directory: ./frontend
        run: npx playwright install --with-deps chromium firefox

      - name: Install Playwright dependencies (if cache hit)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        working-directory: ./frontend
        run: npx playwright install-deps chromium firefox

      - name: Run E2E tests
        working-directory: ./frontend
        run: npm run test:e2e
        env:
          CI: true

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30
```

Let's look at the new concepts introduced in this workflow.

```yaml
- name: Seed E2E test data
  working-directory: ./backend
  run: npm run seed:users
```

Before running Playwright, the application cannot be empty. If a test tries to Sign in a user that is not there, it will fail. This step runs a Node script to fill the temporary Postgres database with test data so the browser has something to interact with.

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ steps.playwright-version.outputs.version }}
```
Every time Playwright runs, it downloads large browser programs. Doing this on every commit wastes time. By using `actions/cache@v4`, we save the downloaded browsers. The extra steps make sure we only download the browsers if the saved ones are missing, saving you a minute or more of waiting time.

```yaml
- name: Upload Playwright report
  uses: actions/upload-artifact@v4
  if: ${{ !cancelled() }}
  with:
    name: playwright-report
    path: frontend/playwright-report/
```

If an E2E test fails, it is hard to know why just by looking at text files. Playwright creates a helpful report with screenshots and recordings. The `upload-artifact` step takes this folder and attaches it to the GitHub Actions page. You can download it to see exactly what the browser saw when the test failed. Using `if: ${{ !cancelled() }}` guarantees that the report saves even when your tests fail.


### Updating the orchestrator

Update your main `ci.yml` file and put blow job after `backend-integration-tests`. Open the file and include the new jobs:

```yaml
# ...

jobs:
  e2e-tests:
    name: E2E
    needs: [frontend-unit-tests, backend-integration-tests]
    uses: ./.github/workflows/e2e-tests.yml
```

Finally, scroll down to the very bottom of your `ci.yml` file and update your `pipeline-success` job. You must add `e2e-tests` to the `needs` list so the pipeline knows to check them before finishing:

```yaml
  pipeline-success:
    name: Pipeline success
    needs:
      [
        frontend-vulnerability-check,
        backend-vulnerability-check,
        backend-sast-check,
        frontend-lint-format-check,
        backend-lint-format-check,
        frontend-unit-tests,
        backend-unit-tests,
        backend-integration-tests,
        e2e-tests,
      ]
    runs-on: ubuntu-latest
    if: always()

# ...
```

Save and commit your changes. Your GitHub Actions pipeline is now fully equipped to handle End to End testing on every single commit.

> [!NOTE]
> as we are using both Vitest for unit test and playwright for e2e test, if you run npm run test now you may get some error like e2e test get failed, because vitest by default include all test files, but for playwright we need to use different command so in produciton system we need to consider few options


Both frameworks use `*.spec.ts` by default, so you need to separate their test discovery.

## Option 1 (recommended): Exclude Playwright tests from Vitest

In your `vitest.config.ts`:

TypeScript

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**'
    ]
  }
})
```

Now:

Bash

```
npm run test      # Runs only Vitest
npm run test:e2e  # Runs only Playwright
```

## Option 2: Use separate folders with explicit include

A cleaner production setup is:

```
tests/
  unit/
    home.spec.ts
  integration/
    api.spec.ts
  e2e/
    home.spec.ts
```

Then configure Vitest:

TypeScript

```
export default defineConfig({
  test: {
    include: [
      'tests/unit/**/*.spec.ts',
      'tests/integration/**/*.spec.ts'
    ]
  }
})
```

And Playwright (`playwright.config.ts`):

TypeScript

```
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e'
})
```

## Option 3: Different file suffixes

Some teams use:

* `*.test.ts` → Vitest

* `*.spec.ts` → Playwright

Then configure Vitest:

TypeScript

```
test: {
  include: ['**/*.test.ts']
}
```

### Production recommendation

Since you're building a production-grade project, I'd keep:

* `tests/unit/` → Vitest

* `tests/integration/` → Vitest

* `tests/e2e/` → Playwright

with explicit `include`/`testDir` settings. This avoids accidental cross-execution in local development and CI.



### Dynamic application security testing (DAST)

Earlier in your pipeline, you used Static Application Security Testing (SAST) to check your raw source code for security flaws. But some security issues only appear when your application is running. Dynamic Application Security Testing (DAST) interacts with your live application just like a real hacker would, testing your inputs and services for weaknesses.

To run a DAST scan in GitHub Actions, you need to start the backend system. Once the backend is running, you can point a scanner tool at your local URL to analyze the system.

For this pipeline, you will use the [OWASP ZAP](https://www.zaproxy.org/) (Zed Attack Proxy) API scan. OWASP ZAP is a highly trusted industry-standard tool. By pointing it directly at FastAPI's automatically generated `openapi.json` file, ZAP immediately understands every route your API has and tests them one by one.

> [!NOTE]
> We are using this fast, lightweight DAST scan so it can easily run inside our regular GitHub pipeline without slowing you down. However, this only covers the API. Later in this book, we will set up a separate, rigorous daily scan that runs overnight to check the entire frontend application.

Create a new file at `.github/workflows/dast-scan.yml`:

```yaml
name: DAST scan

on:
  workflow_call:

env:
  NODE_ENV: test
  PORT: 3000
  DB_HOST: localhost
  DB_USER: postgres
  DB_PASSWORD: test_password
  DB_NAME: test_db
  JWT_PRIVATE_KEY_PATH: ./keys/private.pem
  JWT_PUBLIC_KEY_PATH: ./keys/public.pem

jobs:
  zap_scan:
    name: OWASP ZAP Baseline Scan
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run migrate

      - name: Seed test data
        run: npm run seed:users

      - name: Start backend server
        run: |
          npm run dev &
          echo "Waiting for backend server on port 3000..."
          for i in {1..30}; do
            if curl -s -f http://localhost:3000/health/live > /dev/null 2>&1; then
              echo "Backend server is up and healthy!"
              break
            fi
            sleep 1
          done

      - name: OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.14.0
        with:
          target: "http://localhost:3000"
          rules_file_name: ".github/zap-rules.tsv"
          allow_issue_writing: false
          fail_action: false
```

this is copy of `e2e-tests.yml` till `Start backend server` only change is as below
* added OWASP ZAP Scan for scan backend application urls
```
- name: OWASP ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.14.0
  with:
    target: "http://localhost:3000"
    rules_file_name: ".github/zap-rules.tsv"
    allow_issue_writing: false
    fail_action: false
```
* added PORT 3000 in global env because in above target url we have used port 3000

Also in backend api we have created a root route with just static page url, so OWASP can get api urls for scan

> [!NOTE] Instead of making the scanner guess how to find your API links by clicking through a webpage, we give it the exact list. Because FastAPI/Nest.JS automatically creates an `openapi.json` file, ZAP can read this file to immediately understand every route and setting your backend supports. It then tests those specific links directly.

we just need to use `zaproxy/action-api-scan@v0.10.0` instead of `zaproxy/action-baseline@v0.14.0` with below settings, but as we don't have OpenApi integrated so not used.
```
- name: ZAP API scan
  uses: zaproxy/action-api-scan@v0.10.0
  with:
    target: "http://localhost:8000/openapi.json"
    format: openapi
    rules_file_name: ".github/zap-rules.tsv"
    allow_issue_writing: false
    fail_action: true
```
Let's break down this workflow into manageable pieces.

```yaml
allow_issue_writing: false
fail_action: true
```

By default, the OWASP ZAP GitHub Action tries to open a new GitHub Issue in your project for every single weakness it finds. While this is helpful for daily scheduled scans, it is not ideal for code reviews. If you leave this setting on, one bad update could fill your project with dozens of issues. Setting `allow_issue_writing: false` stops this spam, and `fail_action: true` guarantees the pipeline still fails if a problem is found.

```yaml
rules_file_name: ".github/zap-rules.tsv"
```

Security scanners are very strict and often flag things that are not actually dangerous in your specific project (false alarms). By creating a `zap-rules.tsv` file, you can tell the scanner to ignore specific warnings. This makes sure your pipeline only fails when there is a real threat, preventing developers from getting tired of useless alerts.

If you run the scan right now, your pipeline might turn red and fail, even if your code is secure. This happens because the DAST scanner is testing your local, basic development server instead of a real live website.

In a real production environment, you likely use a tool like `Nginx` or `Cloudflare` to handle SSL certificates and add security headers (like CORS, Cache-Control, and Strict-Transport-Security). Because your temporary GitHub runner does not use Nginx, ZAP will panic and flag these missing headers as dangerous vulnerabilities.

To prevent the pipeline from failing because of these environment differences, you can create a TSV (Tab-Separated Values) file to quiet specific alerts.

Create a new file at `.github/zap-rules.tsv` and add the following lines:

```tsv
10096   IGNORE  (Timestamp Disclosure - Unix)
10106   IGNORE  (HTTP Only Site)
10021   IGNORE  (X-Content-Type-Options - Handled by Nginx)
90004   IGNORE  (Insufficient Site Isolation / CORP - Handled by Nginx)
10020   IGNORE  (X-Frame-Options - Handled by Nginx)
10035   IGNORE  (Strict-Transport-Security - Handled by Nginx)
10038   IGNORE  (Content Security Policy - Handled by Nginx)
10063   IGNORE  (Permissions Policy - Handled by Nginx)
10055   IGNORE  (CSP Wildcards and Unsafe - Handled by Nginx)
40040   IGNORE  (CORS Header - Handled by Nginx)
10049   IGNORE  (Cache Headers - Handled by Nginx)
10027   IGNORE  (Suspicious Comments - False alarms in outside libraries)
```

The format of this file is: `<Rule ID>  <ACTION>  <Comment>`.

By marking these specific IDs as `IGNORE`, you are telling ZAP: "We know these headers are missing right now, but Nginx handles them in production, so do not fail our pipeline". You also tell it to ignore the fact that the test site does not use HTTPS, since you are testing on `localhost`.

Your rules file will change as your project grows. When you first add a DAST scanner, you will spend a few hours or days reviewing the results and adding `IGNORE` rules for false alarms.

Over time, this file will stabilize. Once it stops changing, you can completely trust your pipeline: if the DAST scan fails, it means you have a real security issue that needs your immediate attention.

### Updating the orchestrator

Now you can bring everything together by updating your main `ci.yml` file. Open the file and include the new jobs:

```yaml
# ...

jobs:
  dast-check:
    name: Backend
    needs: backend-lint-format-check
    uses: ./.github/workflows/dast-scan.yml
    secrets: inherit
```

Finally, scroll down to the very bottom of your `ci.yml` file and update your `pipeline-success` job. You must add the three new jobs to the `needs` list so the pipeline knows to check them before finishing:

```yaml
  pipeline-success:
    name: Pipeline success
    needs:
      [
        frontend-vulnerability-check,
        backend-vulnerability-check,
        backend-sast-check,
        frontend-lint-format-check,
        backend-lint-format-check,
        frontend-unit-tests,
        backend-unit-tests,
        backend-integration-tests,
        e2e-tests,
        dast-check,
      ]
    runs-on: ubuntu-latest
    if: always()

# ...
```

Save and commit your changes. Your GitHub Actions pipeline is now fully equipped to handle integration testing, end-to-end user browser simulations, and live security scans automatically on every single commit.
