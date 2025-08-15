# Vikunja Development on Windows

This guide describes how to set up a development environment for Vikunja on a Windows machine. It provides instructions for installing the necessary tools, building the application from source, and running the test suites.

Vikunja is a to-do application that consists of a Go backend (API) and a Vue.js frontend. It also includes a desktop application. This guide focuses on the web application development setup.

## Prerequisites

You will need to install the following tools on your Windows machine to develop Vikunja.

- **Git:** Vikunja's source code is managed with Git. You can download it from the [official website](https://git-scm.com/download/win).

- **Go:** The backend is written in Go. You need version 1.21 or higher. You can download it from the [official website](https://golang.org/dl/).

- **Node.js and pnpm:** The frontend is a Vue.js application. You need Node.js version 20 or higher and the `pnpm` package manager.
  1. Download and install Node.js from the [official website](https://nodejs.org/en/download/).
  2. Install `pnpm` using `npm` (which is included with Node.js). Open a terminal (like PowerShell or Command Prompt) and run:
     ```bash
     npm install -g pnpm
     ```

- **Mage:** Mage is a build tool used for the Go backend. You can install it once you have Go set up. Open a terminal and run:
  ```bash
  go install github.com/magefile/mage@latest
  ```
  Ensure that your Go bin directory (usually `%USERPROFILE%\go\bin`) is in your system's `PATH` environment variable.

- **Docker Desktop:** Docker is required to run the end-to-end (E2E) tests for the frontend. Download and install it from the [official website](https://www.docker.com/products/docker-desktop/). Docker Desktop for Windows uses WSL 2 (Windows Subsystem for Linux), so make sure you have it enabled.

## Setup

1. **Clone the repository:**
   Open a terminal and run the following command to clone the Vikunja repository:
   ```bash
   git clone https://code.vikunja.io/vikunja
   cd vikunja
   ```

2. **Set the `VIKUNJA_SERVICE_ROOTPATH` environment variable:**
   The backend tests require the `VIKUNJA_SERVICE_ROOTPATH` environment variable to be set to the root of the repository. You can set this variable in your terminal session.

   In PowerShell:
   ```powershell
   $env:VIKUNJA_SERVICE_ROOTPATH = (Get-Location).Path
   ```

   In Command Prompt:
   ```cmd
   set VIKUNJA_SERVICE_ROOTPATH=%CD%
   ```

   For a more permanent solution, you can set this as a system-wide environment variable in Windows' settings.

## Building the Application

To run Vikunja, you need to build both the frontend and the backend. The backend serves the frontend files.

### Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install the dependencies using `pnpm`:
   ```bash
   pnpm install
   ```

3. Build the frontend:
   ```bash
   pnpm run build
   ```
   This will create a `dist` folder in the `frontend` directory with the compiled assets.

4. Navigate back to the root directory:
   ```bash
   cd ..
   ```

### Backend

Now that the frontend is built, you can build the backend. The backend will embed the frontend assets into the final binary.

1. Make sure you are in the root directory of the project.

2. Run the `mage build` command:
   ```bash
   mage build
   ```
   This will create a `vikunja.exe` file in the root directory. This is the main application binary.

	Build using docker:

	```bash
	docker run --rm -v c:/GitHub/aroige/vikunja:/app -w /app golang:1.23 go build -o vikunja.exe
	```

## Running for Development

For development, you can run the backend and the frontend separately. This allows for hot-reloading of the frontend when you make changes.

### Backend

To run the backend, you can execute the binary you built earlier. By default, it will use an SQLite database.
```bash
./vikunja.exe
```
You will see logs from the backend, and it will be running on `http://localhost:3456` by default.

### Frontend

To run the frontend in development mode with hot-reloading, you can use the Vite development server.

1.  Open a new terminal.
2.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
3.  Run the development server:
    ```bash
    pnpm run dev
    ```
    The frontend will be available at `http://localhost:8080`. It will automatically proxy API requests to the backend running on `http://localhost:3456`.

## Testing

Vikunja has a comprehensive test suite for both the backend and the frontend.

### Backend Tests

Make sure you have the `VIKUNJA_SERVICE_ROOTPATH` environment variable set as described in the "Setup" section.

- **Unit Tests:**
  ```bash
  mage test:unit
  ```

- **Integration Tests:**
  ```bash
  mage test:integration
  ```

### Frontend Tests

- **Unit Tests:**
  1. Navigate to the `frontend` directory.
  2. Run the following command:
     ```bash
     pnpm run test:unit
     ```

- **End-to-End (E2E) Tests:**
  The E2E tests use Cypress and run in a Docker container. Make sure you have Docker Desktop installed and running.

  1. In the `frontend/cypress` directory, there is a `docker-compose.yml` file. You may need to configure the `CYPRESS_TEST_SECRET` in this file or as an environment variable. Refer to the `frontend/cypress/README.md` for more details.
  2. Start the test environment:
     ```bash
     cd frontend/cypress
     docker-compose up -d
     ```
  3. Once the containers are running, execute the tests:
     ```bash
     docker-compose run cypress bash -c "pnpm run test:e2e"
     ```
  4. To open the Cypress Dashboard for interactive testing, you can run:
      ```bash
      cd frontend
      pnpm run test:e2e:dev
      ```

## Desktop Application

Vikunja also has a desktop application, which is a wrapper around the web application. The source code for the desktop application is located in the `desktop` directory. This guide does not cover the setup and build process for the desktop application. Please refer to the `README.md` file in the `desktop` directory for more information.
