package engine

type Connection struct {
	LocalAddr  string
	RemoteAddr string
	Status     string
	RemotePID  int
}

type Process struct {
	PID         int
	Name        string
	Listening   []int
	Framework   string
	GitBranch   string
	GitDirty    bool
	CPU         float64
	Mem         float64
	Connections []Connection
}
