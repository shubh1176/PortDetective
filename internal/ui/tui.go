package ui

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/table"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/shubh1176/PortDetective/internal/engine"
)

var (
	baseStyle = lipgloss.NewStyle().
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(lipgloss.Color("240"))
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#FAFAFA")).
			Background(lipgloss.Color("#3b82f6")).
			Padding(0, 1)
	statusStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#3b82f6"))
)

type tickMsg time.Time

type model struct {
	table    table.Model
	procs    []engine.Process
	cursor   int
	selected int
	killing  bool
}

func (m model) Init() tea.Cmd {
	return tick()
}

func tick() tea.Cmd {
	return tea.Tick(time.Second*2, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "k":
			if len(m.procs) > 0 {
				pid := m.procs[m.table.Cursor()].PID
				exec.Command("kill", "-TERM", strconv.Itoa(pid)).Run()
				m.killing = true
			}
		case "r":
			procs, _ := engine.GetListeningProcesses()
			m.procs = procs
			m.table.SetRows(generateRows(procs))
		}
	case tickMsg:
		procs, _ := engine.GetListeningProcesses()
		m.procs = procs
		m.table.SetRows(generateRows(procs))
		return m, tick()
	}
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

func (m model) View() string {
	s := "\n" + titleStyle.Render(" PORT DETECTIVE v2.3 ") + " " + statusStyle.Render("● LIVE") + "\n\n"
	s += baseStyle.Render(m.table.View()) + "\n\n"
	s += " " + lipgloss.NewStyle().Foreground(lipgloss.Color("241")).Render("↑/↓: navigate • k: kill • r: refresh • q: quit") + "\n"
	if m.killing {
		s += lipgloss.NewStyle().Foreground(lipgloss.Color("2")).Render("\n Signal sent to process.")
	}
	return s
}

func generateRows(procs []engine.Process) []table.Row {
	rows := []table.Row{}
	for _, p := range procs {
		ports := []string{}
		for _, port := range p.Listening {
			ports = append(ports, strconv.Itoa(port))
		}
		rows = append(rows, table.Row{
			strconv.Itoa(p.PID),
			p.Name,
			strings.Join(ports, ", "),
			p.Framework,
			p.GitBranch,
			fmt.Sprintf("%.1f%%", p.CPU),
			fmt.Sprintf("%.1f%%", p.Mem),
		})
	}
	return rows
}

func StartTUI() {
	columns := []table.Column{
		{Title: "PID", Width: 8},
		{Title: "Process", Width: 20},
		{Title: "Ports", Width: 15},
		{Title: "Framework", Width: 12},
		{Title: "Git Branch", Width: 15},
		{Title: "CPU", Width: 8},
		{Title: "MEM", Width: 8},
	}

	procs, _ := engine.GetListeningProcesses()
	t := table.New(
		table.WithColumns(columns),
		table.WithRows(generateRows(procs)),
		table.WithFocused(true),
		table.WithHeight(15),
	)

	s := table.DefaultStyles()
	s.Header = s.Header.
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(lipgloss.Color("240")).
		BorderBottom(true).
		Bold(false)
	s.Selected = s.Selected.
		Foreground(lipgloss.Color("229")).
		Background(lipgloss.Color("57")).
		Bold(false)
	t.SetStyles(s)

	m := model{table: t, procs: procs}
	if _, err := tea.NewProgram(m).Run(); err != nil {
		fmt.Println("Error running program:", err)
		os.Exit(1)
	}
}

func PrintList(procs []engine.Process) {
	fmt.Printf("%-8s %-20s %-15s %-12s %-15s %-8s %-8s\n", "PID", "PROCESS", "PORTS", "FRAMEWORK", "GIT BRANCH", "CPU", "MEM")
	fmt.Println(strings.Repeat("-", 95))
	for _, p := range procs {
		ports := []string{}
		for _, port := range p.Listening {
			ports = append(ports, strconv.Itoa(port))
		}
		fmt.Printf("%-8d %-20s %-15s %-12s %-15s %-8.1f %-8.1f\n",
			p.PID, p.Name, strings.Join(ports, ", "), p.Framework, p.GitBranch, p.CPU, p.Mem)
	}
}

func PrintMap(procs []engine.Process) {
	fmt.Println(titleStyle.Render(" SERVICE DEPENDENCY MESH "))
	fmt.Println()

	for _, p := range procs {
		ports := []string{}
		for _, port := range p.Listening {
			ports = append(ports, strconv.Itoa(port))
		}

		fmt.Printf("● %s [%d] (:%s)\n", p.Name, p.PID, strings.Join(ports, ","))
		for _, conn := range p.Connections {
			if conn.RemotePID != 0 {
				fmt.Printf("  └── → %s [%d]\n", conn.RemoteAddr, conn.RemotePID)
			}
		}
		fmt.Println()
	}
}
