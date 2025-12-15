# Memory Coordination Protocol

## MANDATORY Requirements for ALL Agents

Every agent in the swarm MUST follow these memory coordination rules:

### 1. Initial Status Write (Required on Start)
```
namespace: coordination
key: swarm/[agent-name]/status
value: {
  "agentId": "agent-xxx",
  "status": "active",
  "startTime": "ISO-8601",
  "capabilities": ["list", "of", "capabilities"]
}
```

### 2. Progress Updates (After Each Step)
```
namespace: coordination
key: swarm/[agent-name]/progress
value: {
  "currentTask": "task description",
  "completedSteps": 3,
  "totalSteps": 10,
  "lastUpdate": "ISO-8601"
}
```

### 3. Artifact Sharing (When Creating Sharable Output)
```
namespace: coordination
key: swarm/shared/[component-name]
value: {
  "type": "code|config|schema|doc",
  "content": "actual content",
  "dependencies": ["dep1", "dep2"],
  "createdBy": "agent-xxx",
  "timestamp": "ISO-8601"
}
```

### 4. Dependency Checking (Before Using Shared Resources)
```
// First retrieve
namespace: coordination
key: swarm/shared/[required-component]

// If not found, wait and retry
// Log waiting status to swarm/[agent-name]/waiting
```

### 5. Completion Signal (When Done)
```
namespace: coordination
key: swarm/[agent-name]/complete
value: {
  "agentId": "agent-xxx",
  "tasksCompleted": ["task1", "task2"],
  "artifacts": ["artifact1", "artifact2"],
  "completionTime": "ISO-8601"
}
```

## Enforcement
The coordinator agent will monitor compliance and warn/restart agents that don't follow the protocol.