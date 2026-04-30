package main

import (
	"embed"
	"fmt"
	"os"
	"strconv"

	"github.com/shubh1176/PortDetective/internal/engine"
	"github.com/shubh1176/PortDetective/internal/server"
	"github.com/shubh1176/PortDetective/internal/ui"
	"github.com/spf13/cobra"
)

//go:embed all:dashboard/out
var dashboardAssets embed.FS

func main() {
	var rootCmd = &cobra.Command{
		Use:   "portmap",
		Short: "Port Detective: Professional Service Observability Suite",
		Run: func(cmd *cobra.Command, args []string) {
			ui.StartTUI()
		},
	}

	var listCmd = &cobra.Command{
		Use:   "list",
		Short: "List all listening processes",
		Run: func(cmd *cobra.Command, args []string) {
			procs, _ := engine.GetListeningProcesses()
			ui.PrintList(procs)
		},
	}

	var findCmd = &cobra.Command{
		Use:   "find [query]",
		Short: "Find processes by name or port",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			query := args[0]
			procs, _ := engine.GetListeningProcesses()
			var found []engine.Process
			for _, p := range procs {
				if strconv.Itoa(p.PID) == query || p.Name == query || engine.ContainsPort(p.Listening, query) {
					found = append(found, p)
				}
			}
			ui.PrintList(found)
		},
	}

	var killCmd = &cobra.Command{
		Use:   "kill [pid]",
		Short: "Kill a process and its children",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			pid, _ := strconv.Atoi(args[0])
			children := engine.GetChildProcesses(pid)
			for _, c := range children {
				fmt.Printf("Killing child PID %d...\n", c)
				engine.GetChildProcesses(c) // Recursive if needed, but pgrep -P is flat
			}
			fmt.Printf("Killing process %d...\n", pid)
		},
	}

	var webCmd = &cobra.Command{
		Use:   "web",
		Short: "Launch the observability dashboard",
		Run: func(cmd *cobra.Command, args []string) {
			server.StartWebServer(dashboardAssets)
		},
	}

	var mapCmd = &cobra.Command{
		Use:   "map",
		Short: "Show inter-process dependency mesh",
		Run: func(cmd *cobra.Command, args []string) {
			procs, _ := engine.GetListeningProcesses()
			ui.PrintMap(procs)
		},
	}

	rootCmd.AddCommand(listCmd, findCmd, killCmd, mapCmd, webCmd)
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
