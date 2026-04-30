# Port Detective

A real-time CLI tool that maps processes and their network connections on your machine.

## Features
- **Real-time Observability Mesh:** Visualize how processes talk to each other in a service-dependency graph.
- **Interactive Web Dashboard:** A premium, Next.js-powered dashboard for real-time process monitoring (`portmap web`).
- **Deep Connection Correlation:** Automatically links clients to servers by correlating local and foreign TCP addresses.
- **Process Discovery:** Uses native tools (`lsof` on macOS, `ss`/`netstat` on Linux) for maximum compatibility.
- **Smart Kill:** Intelligent termination that checks for dependencies (child processes) before killing.
- **Interactive TUI:** Full-screen Bubbletea-based terminal UI for a real-time, interactive experience.
- **Framework & Git Detection:** Automatically identifies web frameworks and Git branch status.

## Installation

### Single Binary (Zero Dependencies)
Port Detective now ships as a **Single Binary**. The entire web dashboard is embedded inside the Go executable.

**One-Liner Install (macOS/Linux):**
```bash
curl -fsSL https://raw.githubusercontent.com/portdetective/portdetective/main/install.sh | bash
```

### From Source
```bash
git clone https://github.com/portdetective/portdetective.git
cd portdetective
make install
```

### Go Install
```bash
go install github.com/portdetective/portdetective@latest
```

## Usage

Launch the interactive TUI:
```bash
portmap
```

Launch the premium web dashboard:
```bash
portmap web
```

Other commands:
```bash
portmap list         # Show all ports in table format
portmap find redis   # Find processes matching "redis" or running on a redis port
portmap kill 3000    # Kill process on port 3000 (with dependency warnings)
portmap map          # Show connection graph
```

## Development

Requires Go 1.22+

```bash
make build
./portmap
```

## License
MIT
