# Development Setup using devenv

This guide explains how to set up a development environment for Vikunja using `devenv`.

## Prerequisites

Before you begin, make sure you have the following installed on your system:

1.  **Nix**: `devenv` is built on top of Nix. You can install it by following the official instructions at [https://nixos.org/download.html](https://nixos.org/download.html).

2.  **devenv**: Once Nix is installed, you can install `devenv` by following its official guide at [https://devenv.sh/getting-started/](https://devenv.sh/getting-started/).

## Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/vikunja/vikunja.git
    cd vikunja
    ```

2.  **Start the development environment**:
    Run the following command in the root of the project:
    ```bash
    devenv up
    ```
    This command will:
    -   Download all the necessary dependencies defined in `devenv.nix` (Go, Node.js, pnpm, etc.).
    -   Start background services like `mailpit`.
    -   Activate a shell with all the development tools in your path.

## Running the Application

Once your `devenv` shell is active, you can run the backend and frontend.

### Backend

1.  **Build the backend**:
    Use the `mage` build tool to compile the Go backend:
    ```bash
    mage build
    ```
    This will create a binary named `vikunja` in the project root.

2.  **Run the backend**:
    Start the API server:
    ```bash
    ./vikunja
    ```
    By default, the backend will be available at `http://localhost:3456`.

### Frontend

1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```

2.  **Install frontend dependencies**:
    `devenv` will have already installed `pnpm`. Use it to install the frontend dependencies:
    ```bash
    pnpm install
    ```

3.  **Start the frontend development server**:
    ```bash
    pnpm dev
    ```
    The frontend will be available at `http://localhost:4173`.

## Verification

-   Open your browser and navigate to `http://localhost:4173` to see the Vikunja web interface.
-   You can access the backend API at `http://localhost:3456/api/v1/info`.
-   The `mailpit` service (a local email testing tool) will be running at `http://localhost:8025`.
