# Harvester UI Tests with Cypress 

This repository is dedicated to developing Cypress automation test scripts for frontend testing. The primary focus is on testing the frontend UI of Harvester and Rancher integration

## Contribution

### Setup Environment

#### Prerequisites

- **Node.js version**: `>=16`, `14.13`, or `12.22`
- **Installed Harvester version**: `>=v1.0.0`

Follow these steps to set up your environment:

```bash
# Install dependencies
npm ci

# Configure environment variables
mv cypress.env.json.example cypress.env.json
vim cypress.env.json  # Update the relevant variables accordingly
```

### Development

To open the Cypress Test Runner for development:

```bash
npx cypress open
```

### Execute Test Cases

To run all test cases:

```bash
npx cypress run
```

To run specific test file

```
npx cypress run --reporter mochawesome --browser chrome --spec "./testcases/dashboard/0_FirstTimeLogin.spec.ts"
```

To run specific test folder
```
npx cypress run --reporter mochawesome --spec "./testcases/dashboard/*.spec.ts"
```

### Generate HTML test report on local 

1.Generate merged report from json files

```
$ npx mochawesome-merge cypress/results/*.json > merge-report.json

$ npx mochawesome-merge ./*.json > merge-report.json

# Generate merged json report
../tests/cypress/merge-report.json
```

2. Generate the mochaawesome report in html format
```
$ npx mochawesome-report-generator merge-report.json

```

3. Then we can find the generated HTML report under `/tests/cypress/mochawesome-report/merge-report.html` 


---

## Convention

### Frontend Test Skeletons

Frontend tests are implemented using [Cypress](https://cypress.io), with test cases located in the [`cypress/testcases`](cypress/testcases/) directory. The tests follow the [Behavior-Driven Development (BDD)](https://en.wikipedia.org/wiki/Behavior-driven_development) pattern, utilizing `describe` and `it` blocks provided by [Mocha](https://mochajs.org/):

- **`describe`**\*\* block\*\*: Defines a suite of tests.
- **`it`**\*\* block\*\*: Represents individual test cases.

#### Example Test Skeleton

Test skeletons include JSDoc comments to outline steps. Place these methods outside `describe` or `it` blocks for visibility in static site generators. Below is an example for logging in:

```typescript
/**
 * 1. Load login page
 * 2. Enter username and password
 * 3. Click Login
 * 4. Verify that the dashboard loads
 * @notImplemented
 */
export function loginTest() {}
```

### Creating Test Skeletons for New Features or Tickets

Frontend Tests
Further info placed in `cypress/README.md`.

There is a test skeleton spec to use as a template in `tests/cypress/skel/`.

- If you are adding a test to an existing suite like `tests/integration/login.spec.ts`, you can use the template JSDoc and function call, then add the test steps.
- If you are creating a new logical group of tests, copy the `skel.spec.ts` file into `integration` or a subdirectory where it fits better, and rename it appropriately.
- Add the `@notImplemented` tag to the test case if it hasn't been implemented yet. This will have it shown with that tag on the static site.

#### Complete Test Spec Examples

1. **Single ********************************************`it`******************************************** block** (from `settings.spec.ts`):

```typescript
/**
 * 1. Login
 * 2. Navigate to the Advanced Settings Page via the sidebar
 */
it('should navigate to the Advanced Settings Page', () => {
    login.login();
    sidebar.advancedSettings();
});
```

2. **With ********************************************`describe`******************************************** block** (from `login.spec.ts`):

```typescript
/**
 * This is the login spec
 * 1. Login for first time
 * 2. Login with already set password
 */
describe('Login page for Harvester', () => {
    it('should login the first time', () => {
        const login = new LoginPage();
        login.firstLogin();
    });
    
    it('should login successfully', () => {
        const login = new LoginPage();
        login.login();
    });
});
```

3. **With both ********************************************`describe`******************************************** and ********************************************`it`******************************************** blocks** (from `support.spec.ts`):

```typescript
/**
 * 1. Login
 * 2. Navigate to the support page
 * 3. Validate the URL
 */
export function checkSupportPage() {}
describe('Support Page', () => {
    it('Check support page', () => {
        login.login();
        support.visitSupportPage();
    });
});

/**
 * 1. Login
 * 2. Navigate to the support page
 * 3. Generate Support Bundle
 * 4. Input Description
 * 5. Click Generate
 * 6. Wait for download
 * 7. Verify Download
 * @notImplementedFully
 */
export function generateSupportBundle() {}
it('Generate Support Bundle', () => {
    login.login();
    support.generateSupportBundle('this is a test description');
});
```

---

## Docker Image

### Build Docker Image

Build the Cypress E2E Docker image:

```bash
docker build . -t harvester/cypress-e2e
```

### Run Docker Image

The following environment variables are required to run the Docker image:

- `MINIO_ENDPOINT`: The endpoint of the MinIO server
- `MINIO_ACCESS_KEY`: The access key of the MinIO server
- `MINIO_SECRET_KEY`: The secret key of the MinIO server

#### Example Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cypress-e2e
  namespace: harvester
spec:
  template:
    spec:
      containers:
      - env:
        - name: MINIO_ENDPOINT
          value: <MINIO_ENDPOINT>
        - name: MINIO_ACCESS_KEY
          value: <MINIO_ACCESS_KEY>
        - name: MINIO_SECRET_KEY
          value: <MINIO_SECRET_KEY>
        image: harvester/cypress-e2e
        imagePullPolicy: Always
        name: container-0
        volumeMounts:
        - mountPath: /tests/cypress/cypress.env.json
          name: vol-e2e
          subPath: cypress.env.json
      volumes:
      - configMap:
          defaultMode: 420
          name: cypress-config
        name: vol-e2e
```

#### Example ConfigMap

```yaml
apiVersion: v1
data:
  cypress.env.json: |-
    {
      "username": "admin",
      "password": "password1234",
      "baseUrl": "https://192.0.0.1"
    }
kind: ConfigMap
metadata:
  name: cypress-config
  namespace: harvester
```

---

## View Test Results

The Docker image automatically runs Cypress tests and uploads the results to the MinIO server.

- **Default bucket name**: `cypress-test-report`
- **Default directory path**: `cypress/results/`

### Access Test Results

1. Use the following command to list reporters:

```bash
./scripts/list-reporters
```

---

