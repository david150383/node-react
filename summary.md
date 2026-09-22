# Step 1:  Protect the default branch
Since you will be pushing code from your `main` or `master` branch, you should set up branch protection. This is an important practice to prevent broken code from making its way into production by mistake.

So we will only merge code in default branch by a pull request, so other team mates will create pull request for master or main (whatever your default branch)

# Step 2. Pre Commit Hooks
### First we will make sure ESLint and Prettier implemented or other similar.
They solve different problems:
* **ESLint** → finds code problems and questionable patterns.
* **Prettier** → automatically formats code consistently. 

#### Now for pre commit hooks we will install `Husky` and `lint-staged` as our project is node js/javascript (react/vue) we will install 

 Now whenever we run `git commit -m ""` command fisrt it will call pre commit hooks and as we setup both ESLint and Prettier for this, so it will check format issues or code issues, and as per setting it will auto fix or restrict to do manual.

# Step 3. Implement Unit Test, Integration Test and E2E test.
#### Unit test using jest
#### Integration test using jest and supertest
#### E2E test using playwright

For a production-grade project, keep them separated:

* `tests/unit/` → Vitest

* `tests/integration/` → Vitest

* `tests/e2e/` → Playwright

# Step 4. Continuous integration
Before writing the pipeline, we need to design a solid structure.

Many developers make the mistake of putting their entire CI/CD process into one massive file. When a step fails in a giant file, finding the exact error in the logs is frustrating.

Instead, you will use reusable workflows. GitHub Actions allows you to write small, focused configuration files that handle one specific job (like linting the frontend). You can then use the workflow_call trigger to allow a main orchestrator file to call these smaller files when needed.

1. - **Software Composition Analysis (SCA):** Auditing the third-party libraries you install for known vulnerabilities.
`frontend-vulnerability-check.yml` and `backend-vulnerability-check.yml` We run npm audit command in this, So we can get any third party package vulnerability

2. - **Static Application Security Testing (SAST):** Scanning the code you write yourself for dangerous patterns and security flaws.
`frontend-sast-check` and `backend-sast-check.yml` we scan our code using Semgrep library or we can use eslint plugin as well

3. - **Lint and Format check** 
`frontend-lint-format-check.yml` and `frontend-lint-format-check.yml` As in our code we already implemented both lint and format commands, So we run these in job to double secure as maybe someone can commit code by ignore these checks. 
Also in this we will use Github actions needs attribute for wait until other jobs done

```
frontend-lint-format-check:
    name: Frontend lint
    needs: [frontend-vulnerability-check, frontend-sast-check]
    uses: ./.github/workflows/frontend-lint-format-check.yml

backend-lint-format-check:
    name: Backend lint
    needs: [backend-vulnerability-check, backend-sast-check]
    uses: ./.github/workflows/backend-lint-format-check.yml
```
So it will not run until both successfully pass.

4. - **Unit-tests**
`frontend-unit-tests.yml` and `backend-unit-tests.yml` in these we will run only unit test cases but after `frontend-lint-format-check.yml` and `backend-lint-format-check` successfully pass

5. - **Integration-tests**
`backend-integration-tests.yml` in this we will run only backend integration test cases but after `backend-unit-tests` successfully pass.
> [!NOTE] I have note created any integration tests for frontend

6. - **End to End test**
`e2e-tests.yml` in this we will run only frontend e2e test cases but after `needs: [frontend-unit-tests, backend-integration-tests]` successfully pass.

7. - **Dynamic application security testing (DAST)** Earlier in your pipeline, you used Static Application Security Testing (SAST) to check your raw source code for security flaws. But some security issues only appear when your application is running. Dynamic Application Security Testing (DAST) interacts with your live application just like a real hacker would, testing your inputs and services for weaknesses.
For this pipeline, you will use the [OWASP ZAP](https://www.zaproxy.org/) (Zed Attack Proxy) API scan. OWASP ZAP is a highly trusted industry-standard tool.
`dast-scan.yml` in this we will scan our backend apis for security but after `backend-lint-format-check`  successfully pass.

> [!NOTE] I have note implemented this for frontend, but we can do