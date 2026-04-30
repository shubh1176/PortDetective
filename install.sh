#!/bin/bash

# Port Detective - Professional Installer
# Usage: curl -fsSL https://... | bash

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BINARY_NAME="portmap"
INSTALL_DIR="/usr/local/bin"

echo -e "${BLUE}"
echo "  _____            _     _____       _            _   _             "
echo " |  __ \          | |   |  __ \     | |          | | (_)            "
echo " | |__) |__  _ __ | |_  | |  | | ___| |_ ___  ___| |_ ___   _____   "
echo " |  ___/ _ \| '__|| __| | |  | |/ _ \ __/ _ \/ __| __| \ \ / / _ \  "
echo " | |  | (_) | |   | |_  | |__| |  __/ ||  __/ (__| |_| |\ V /  __/  "
echo " |_|   \___/|_|    \__| |_____/ \___|\__\___|\___|\__|_| \_/ \___|  "
echo -e "${NC}"
echo -e "${CYAN}Initializing Port Detective Suite Installation...${NC}"

# 1. Dependency Check
echo -e "\n${BLUE}[1/3] Checking prerequisites...${NC}"

if ! command -v go >/dev/null 2>&1; then
    echo -e "${RED}Error: Go (1.22+) is required for the build.${NC}"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}Error: Node.js/NPM is required to build the dashboard.${NC}"
    exit 1
fi

# 2. Build Process
echo -e "\n${BLUE}[2/3] Compiling source & embedding dashboard...${NC}"
echo "This may take a minute (Next.js export in progress)..."

# Build dashboard and binary using the Makefile
make build

# 3. Installation
echo -e "\n${BLUE}[3/3] Installing binary to system path...${NC}"

if [ -w "$INSTALL_DIR" ]; then
    mv $BINARY_NAME "$INSTALL_DIR/$BINARY_NAME"
else
    echo -e "${CYAN}Requesting sudo permissions to move binary to $INSTALL_DIR...${NC}"
    sudo mv $BINARY_NAME "$INSTALL_DIR/$BINARY_NAME"
fi

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}  PORT DETECTIVE INSTALLED SUCCESSFULLY!${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "\nQuick Start:"
echo -e "  ${CYAN}$BINARY_NAME${NC}          - Launch interactive TUI"
echo -e "  ${CYAN}$BINARY_NAME web${NC}      - Launch premium web dashboard"
echo -e "  ${CYAN}$BINARY_NAME map${NC}      - Show ASCII connection graph"
echo -e "\nHappy hunting! 🕵️‍♂️"
