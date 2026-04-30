package engine

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"sort"
	"strconv"
	"strings"
)

func GetListeningProcesses() ([]Process, error) {
	if runtime.GOOS == "darwin" {
		return getDarwinProcesses()
	} else if runtime.GOOS == "linux" {
		return getLinuxProcesses()
	}
	return nil, fmt.Errorf("unsupported OS: %s", runtime.GOOS)
}

func getDarwinProcesses() ([]Process, error) {
	cmd := exec.Command("lsof", "-iTCP", "-P", "-n")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(string(output), "\n")
	procMap := make(map[int]*Process)

	for i := 1; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 9 {
			continue
		}

		name := fields[0]
		pid, _ := strconv.Atoi(fields[1])
		addressField := fields[8]
		status := ""
		if len(fields) > 9 {
			status = strings.Trim(fields[9], "()")
		}

		p, ok := procMap[pid]
		if !ok {
			p = &Process{
				PID:       pid,
				Name:      name,
				Framework: detectFramework(name, pid),
				GitBranch: detectGitInfo(pid),
				CPU:       0,
				Mem:       0,
			}
			p.CPU, p.Mem = getProcessStats(pid)
			procMap[pid] = p
		}

		if status == "LISTEN" {
			parts := strings.Split(addressField, ":")
			if len(parts) >= 2 {
				port, _ := strconv.Atoi(parts[len(parts)-1])
				p.Listening = append(p.Listening, port)
			}
		} else {
			parts := strings.Split(addressField, "->")
			if len(parts) == 2 {
				p.Connections = append(p.Connections, Connection{
					LocalAddr:  parts[0],
					RemoteAddr: parts[1],
					Status:     status,
				})
			}
		}
	}

	return correlateProcesses(procMap), nil
}

func getLinuxProcesses() ([]Process, error) {
	cmd := exec.Command("ss", "-tlnp")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(string(output), "\n")
	procMap := make(map[int]*Process)

	for i := 1; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}

		addressField := fields[3]
		processField := fields[len(fields)-1]

		parts := strings.Split(addressField, ":")
		if len(parts) < 2 {
			continue
		}
		port, _ := strconv.Atoi(parts[len(parts)-1])

		var pid int
		var name string
		if strings.Contains(processField, "pid=") {
			pidStart := strings.Index(processField, "pid=") + 4
			pidEnd := strings.Index(processField[pidStart:], ",")
			if pidEnd == -1 {
				pidEnd = strings.Index(processField[pidStart:], ")")
			}
			if pidEnd != -1 {
				pid, _ = strconv.Atoi(processField[pidStart : pidStart+pidEnd])
			}

			nameStart := strings.Index(processField, "\"")
			if nameStart != -1 {
				nameEnd := strings.Index(processField[nameStart+1:], "\"")
				if nameEnd != -1 {
					name = processField[nameStart+1 : nameStart+1+nameEnd]
				}
			}
		}

		if pid == 0 {
			continue
		}

		p, ok := procMap[pid]
		if !ok {
			p = &Process{
				PID:       pid,
				Name:      name,
				Framework: detectFramework(name, pid),
				GitBranch: detectGitInfo(pid),
			}
			p.CPU, p.Mem = getProcessStats(pid)
			procMap[pid] = p
		}
		p.Listening = append(p.Listening, port)
	}

	var result []Process
	for _, p := range procMap {
		result = append(result, *p)
	}
	return result, nil
}

func correlateProcesses(procMap map[int]*Process) []Process {
	portToPID := make(map[int]int)
	for pid, p := range procMap {
		for _, port := range p.Listening {
			portToPID[port] = pid
		}
	}

	var result []Process
	for _, p := range procMap {
		for i, conn := range p.Connections {
			parts := strings.Split(conn.RemoteAddr, ":")
			if len(parts) >= 2 {
				port, _ := strconv.Atoi(parts[len(parts)-1])
				if remotePID, ok := portToPID[port]; ok {
					p.Connections[i].RemotePID = remotePID
				}
			}
		}
		result = append(result, *p)
	}

	sort.Slice(result, func(i, j int) bool {
		if len(result[i].Listening) > 0 && len(result[j].Listening) > 0 {
			return result[i].Listening[0] < result[j].Listening[0]
		}
		return result[i].PID < result[j].PID
	})

	return result
}

func GetChildProcesses(pid int) []int {
	cmd := exec.Command("pgrep", "-P", strconv.Itoa(pid))
	output, err := cmd.Output()
	if err != nil {
		return nil
	}
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	var children []int
	for _, l := range lines {
		if c, err := strconv.Atoi(l); err == nil {
			children = append(children, c)
		}
	}
	return children
}

func detectFramework(name string, pid int) string {
	n := strings.ToLower(name)
	if strings.Contains(n, "node") {
		cmdline := getCmdline(pid)
		if strings.Contains(cmdline, "next") { return "Next.js" }
		if strings.Contains(cmdline, "vite") { return "Vite" }
		if strings.Contains(cmdline, "remix") { return "Remix" }
		if strings.Contains(cmdline, "express") { return "Express" }
		return "Node.js"
	}
	if strings.Contains(n, "python") {
		cmdline := getCmdline(pid)
		if strings.Contains(cmdline, "django") { return "Django" }
		if strings.Contains(cmdline, "fastapi") { return "FastAPI" }
		return "Python"
	}
	if strings.Contains(n, "postgres") { return "PostgreSQL" }
	if strings.Contains(n, "redis") { return "Redis" }
	if strings.Contains(n, "nginx") { return "Nginx" }
	return "-"
}

func getCmdline(pid int) string {
	cmd := exec.Command("ps", "-p", strconv.Itoa(pid), "-o", "command=")
	out, _ := cmd.Output()
	return strings.ToLower(strings.TrimSpace(string(out)))
}

func detectGitInfo(pid int) string {
	cwd := getCwd(pid)
	if cwd == "" { return "-" }

	cmd := exec.Command("git", "branch", "--show-current")
	cmd.Dir = cwd
	out, err := cmd.Output()
	if err != nil { return "-" }
	branch := strings.TrimSpace(string(out))
	if branch == "" { return "-" }

	cmdStatus := exec.Command("git", "status", "--porcelain")
	cmdStatus.Dir = cwd
	outStatus, _ := cmdStatus.Output()
	if len(strings.TrimSpace(string(outStatus))) > 0 {
		branch += "*"
	}
	return branch
}

func getCwd(pid int) string {
	if runtime.GOOS == "darwin" {
		cmd := exec.Command("lsof", "-p", strconv.Itoa(pid))
		out, err := cmd.Output()
		if err != nil { return "" }
		for _, line := range strings.Split(string(out), "\n") {
			if strings.Contains(line, " cwd ") {
				fields := strings.Fields(line)
				if len(fields) >= 9 { return strings.Join(fields[8:], " ") }
			}
		}
	} else if runtime.GOOS == "linux" {
		link, _ := os.Readlink(fmt.Sprintf("/proc/%d/cwd", pid))
		return link
	}
	return ""
}

func getProcessStats(pid int) (float64, float64) {
	cmd := exec.Command("ps", "-p", strconv.Itoa(pid), "-o", "%cpu,%mem")
	out, err := cmd.Output()
	if err != nil { return 0, 0 }
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) < 2 { return 0, 0 }
	fields := strings.Fields(lines[1])
	if len(fields) >= 2 {
		cpu, _ := strconv.ParseFloat(fields[0], 64)
		mem, _ := strconv.ParseFloat(fields[1], 64)
		return cpu, mem
	}
	return 0, 0
}

func ContainsPort(ports []int, query string) bool {
	for _, p := range ports {
		if strconv.Itoa(p) == query { return true }
	}
	return false
}
