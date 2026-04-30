"use client";

import React, { useEffect, useMemo } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import ProcessNode from './ProcessNode';
import { Process } from '@/hooks/useWebSocket';

const nodeTypes = {
  process: ProcessNode,
};

const STORAGE_KEY = 'port-detective-layout';

const getServiceId = (p: Process) => `${p.Name}-${p.GitBranch || 'no-branch'}`;

interface GraphProps {
  processes: Process[];
  onProcessSelect: (process: Process | null) => void;
}

export default function Graph({ processes, onProcessSelect }: GraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);

  // Load/Save layout from localStorage
  const saveLayout = (nodeId: string, position: { x: number, y: number }) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const layout = saved ? JSON.parse(saved) : {};
    layout[nodeId] = position;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  };

  const getSavedPosition = (nodeId: string) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const layout = JSON.parse(saved);
    return layout[nodeId] || null;
  };

  useEffect(() => {
    setNodes((nds) => {
      const nextNodes: Node[] = [];
      
      // Calculate connected nodes if one is hovered
      const connectedNodeIds = new Set<string>();
      if (hoveredNode) {
        connectedNodeIds.add(hoveredNode);
        edges.forEach(e => {
          if (e.source === hoveredNode) connectedNodeIds.add(e.target);
          if (e.target === hoveredNode) connectedNodeIds.add(e.source);
        });
      }

      processes.forEach((p, index) => {
        const serviceId = getServiceId(p);
        const existingNode = nds.find((n) => n.id === p.PID.toString() || n.data.serviceId === serviceId);
        const savedPos = getSavedPosition(serviceId);

        let position = savedPos || (existingNode?.position) || { 
          x: (index % 4) * 300, 
          y: Math.floor(index / 4) * 250 
        };

        const isDimmed = hoveredNode && !connectedNodeIds.has(p.PID.toString());

        nextNodes.push({
          id: p.PID.toString(),
          type: 'process',
          data: { 
            pid: p.PID, 
            name: p.Name, 
            listening: p.Listening || [], 
            framework: p.Framework,
            branch: p.GitBranch,
            cpu: p.CPU,
            mem: p.Mem,
            serviceId
          },
          position,
          style: { 
            opacity: isDimmed ? 0.2 : 1,
            transition: 'opacity 300ms ease',
            zIndex: connectedNodeIds.has(p.PID.toString()) ? 10 : 1
          },
        });
      });

      return nextNodes;
    });

    const newEdges: Edge[] = [];
    processes.forEach(p => {
      p.Connections?.forEach((conn, idx) => {
        if (conn.RemotePID && conn.RemotePID !== 0) {
          const edgeId = `e-${p.PID}-${conn.RemotePID}-${idx}`;
          const isRelated = hoveredNode && (p.PID.toString() === hoveredNode || conn.RemotePID.toString() === hoveredNode);
          const isDimmed = hoveredNode && !isRelated;

          newEdges.push({
            id: edgeId,
            source: p.PID.toString(),
            target: conn.RemotePID.toString(),
            animated: true,
            style: { 
              stroke: isRelated ? '#60a5fa' : '#3b82f6', 
              strokeWidth: isRelated ? 3 : 2,
              opacity: isDimmed ? 0.1 : 0.4,
              transition: 'opacity 300ms, stroke-width 300ms'
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isRelated ? '#60a5fa' : '#3b82f6',
            },
          });
        }
      });
    });

    setEdges(newEdges);
  }, [processes, setEdges, setNodes, hoveredNode, edges.length]);

  const onNodeDragStop = (_: any, node: Node) => {
    const serviceId = node.data.serviceId;
    if (serviceId) {
      saveLayout(serviceId, node.position);
    }
  };

  return (
    <div className="w-full h-full bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onNodeClick={(_, node) => {
          const proc = processes.find(p => p.PID.toString() === node.id);
          if (proc) onProcessSelect(proc);
        }}
        onPaneClick={() => onProcessSelect(null)}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#27272a" gap={20} />
        <Controls className="!bg-zinc-900 !border-zinc-800 !fill-zinc-400" />
        <MiniMap 
          nodeColor="#3b82f6" 
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-zinc-900 !border-zinc-800"
        />
      </ReactFlow>
    </div>
  );
}
