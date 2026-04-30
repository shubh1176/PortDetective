package server

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os/exec"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shubh1176/PortDetective/internal/engine"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func StartWebServer(dashboardAssets embed.FS) {
	// dashboardAssets contains dashboard/out/...
	// We want to serve from the root of the 'out' folder
	sub, err := fs.Sub(dashboardAssets, "dashboard/out")
	if err != nil {
		fmt.Printf("Error accessing embedded assets: %v\n", err)
		// Fallback for debugging path issues in dev
		fmt.Println("Attempting fallback to root assets...")
		sub = dashboardAssets
	}

	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/api/kill", handleKill)
	http.Handle("/", http.FileServer(http.FS(sub)))

	fmt.Println("Dashboard starting on http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Printf("Error starting server: %v\n", err)
	}
}

func handleKill(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pidStr := r.URL.Query().Get("pid")
	if pidStr == "" {
		http.Error(w, "PID required", http.StatusBadRequest)
		return
	}

	pid, err := strconv.Atoi(pidStr)
	if err != nil {
		http.Error(w, "Invalid PID", http.StatusBadRequest)
		return
	}

	fmt.Printf("Web Dashboard request: Killing PID %d\n", pid)
	err = exec.Command("kill", "-TERM", strconv.Itoa(pid)).Run()
	if err != nil {
		http.Error(w, "Failed to kill process", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	for {
		procs, _ := engine.GetListeningProcesses()
		if err := conn.WriteJSON(procs); err != nil {
			break
		}
		time.Sleep(2 * time.Second)
	}
}
